import { NextResponse } from "next/server";
import { Website, IWebsite, PlatformConfig } from "@/models/Website";
import connectToDatabase from "@/lib/mongodb";

interface WordPressCredentials {
	apiUrl: string;
	apiKey: string;
	username?: string;
}

interface PublishContentPayload {
	title: string;
	content: string;
	status: "draft" | "publish";
	categories?: number[];
	tags?: number[];
	postType?: "post" | "page" | "custom";
	customPostType?: string;
	featuredImage?: {
		url: string;
	};
	author?: number;
	customFields?: Array<{
		key: string;
		value: any;
		type: "text" | "number" | "boolean";
	}>;
}

async function publishToWordPress(
	credentials: WordPressCredentials,
	payload: PublishContentPayload
) {
	const { apiUrl, apiKey, username = "admin" } = credentials;
	const baseUrl = apiUrl.replace(/\/$/, "");

	// Format the content for WordPress
	const formattedContent = {
		raw: payload.content, // Send as raw HTML
	};

	// Determine the endpoint based on post type
	let endpoint = "posts";
	if (payload.postType === "page") {
		endpoint = "pages";
	} else if (payload.postType === "custom" && payload.customPostType) {
		endpoint = payload.customPostType;
	}

	try {
		// Prepare the post data
		const postData: any = {
			title: {
				raw: payload.title,
			},
			content: formattedContent,
			status: payload.status,
		};

		// Add categories and tags if provided
		if (payload.categories?.length) {
			postData.categories = payload.categories;
		}
		if (payload.tags?.length) {
			postData.tags = payload.tags;
		}

		// Add author if provided
		if (payload.author) {
			postData.author = payload.author;
		}

		// Add featured image if provided
		if (payload.featuredImage?.url) {
			// First, upload the image
			const imageResponse = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Basic ${Buffer.from(
						`${username}:${apiKey.replace(/\s+/g, "")}`
					).toString("base64")}`,
				},
				body: JSON.stringify({
					url: payload.featuredImage.url,
				}),
			});

			if (!imageResponse.ok) {
				console.error("Failed to upload featured image");
			} else {
				const image = await imageResponse.json();
				postData.featured_media = image.id;
			}
		}

		// Add custom fields if provided
		if (payload.customFields?.length) {
			postData.meta = {};
			for (const field of payload.customFields) {
				let value = field.value;
				if (field.type === "number") {
					value = parseFloat(field.value);
				} else if (field.type === "boolean") {
					value = field.value === "true";
				}
				postData.meta[field.key] = value;
			}
		}

		const response = await fetch(`${baseUrl}/wp-json/wp/v2/${endpoint}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Basic ${Buffer.from(
					`${username}:${apiKey.replace(/\s+/g, "")}`
				).toString("base64")}`,
			},
			body: JSON.stringify(postData),
		});

		if (!response.ok) {
			const errorData = await response.text();
			console.error("WordPress API error:", {
				status: response.status,
				statusText: response.statusText,
				error: errorData,
				request: {
					url: `${baseUrl}/wp-json/wp/v2/${endpoint}`,
					title: payload.title,
					contentLength: payload.content.length,
					status: payload.status,
				},
			});
			throw new Error(`Failed to publish to WordPress: ${response.statusText}`);
		}

		const post = await response.json();
		return {
			success: true,
			postId: post.id,
			postUrl: post.link,
			status: post.status,
		};
	} catch (error) {
		console.error("WordPress publish error:", error);
		throw error;
	}
}

export async function POST(req: Request) {
	try {
		await connectToDatabase();
		const body = await req.json();
		const { websiteName, contentId, status, credentials } = body;

		// Find the website and content
		const website = await Website.findOne({ name: websiteName });
		if (!website) {
			return NextResponse.json({ error: "Website not found" }, { status: 404 });
		}

		const content = website.content.find(
			(c: IWebsite["content"][0]) => c._id === contentId
		);
		if (!content) {
			return NextResponse.json({ error: "Content not found" }, { status: 404 });
		}

		// Get WordPress integration settings
		const wordpressIntegration = website.platformIntegrations.find(
			(p: PlatformConfig) => p.platform === "wordpress" && p.enabled
		);

		if (!wordpressIntegration || !credentials) {
			return NextResponse.json(
				{ error: "WordPress integration not configured" },
				{ status: 400 }
			);
		}

		// Extract first image URL from content if needed
		let featuredImageUrl = undefined;
		if (wordpressIntegration.settings?.featuredImage?.enabled) {
			if (wordpressIntegration.settings.featuredImage.useFirstImage) {
				const imgMatch = content.html.match(/<img[^>]+src="([^">]+)"/);
				if (imgMatch) {
					featuredImageUrl = imgMatch[1];
				}
			} else if (wordpressIntegration.settings.featuredImage.defaultImage) {
				featuredImageUrl =
					wordpressIntegration.settings.featuredImage.defaultImage;
			}
		}

		// Prepare content for WordPress
		const publishPayload: PublishContentPayload = {
			title: content.title,
			content: content.html,
			status: status || wordpressIntegration.settings.defaultStatus || "draft",
			postType: wordpressIntegration.settings.postType || "post",
			customPostType: wordpressIntegration.settings.customPostType,
			...(featuredImageUrl && {
				featuredImage: {
					url: featuredImageUrl,
				},
			}),
			...(wordpressIntegration.settings.author?.useDefault && {
				author: wordpressIntegration.settings.author.defaultAuthorId,
			}),
			customFields: wordpressIntegration.settings.customFields,
		};

		// Publish to WordPress using the passed credentials
		const result = await publishToWordPress(
			credentials as WordPressCredentials,
			publishPayload
		);

		// Update content with publish status
		const platformStatus = {
			published: result.status === "publish",
			publishedUrl: result.postUrl,
			lastSynced: new Date().toISOString(),
		};

		await Website.updateOne(
			{
				name: websiteName,
				"content._id": contentId,
			},
			{
				$set: {
					"content.$.platformPublishStatus.wordpress": platformStatus,
				},
			}
		);

		return NextResponse.json(result);
	} catch (error) {
		console.error("WordPress publish API error:", error);
		return NextResponse.json(
			{
				error: "Failed to publish content",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
