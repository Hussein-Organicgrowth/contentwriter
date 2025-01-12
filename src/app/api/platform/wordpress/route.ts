import { NextResponse } from "next/server";
import { Website } from "@/models/Website";
import connectToDatabase from "@/lib/mongodb";

interface WordPressCredentials {
	apiUrl: string;
	apiKey: string;
	username?: string;
}

async function testWordPressConnection(credentials: WordPressCredentials) {
	const { apiUrl, apiKey } = credentials;
	const baseUrl = apiUrl.replace(/\/$/, "");

	try {
		// Test connection by fetching site info
		const response = await fetch(`${baseUrl}/wp-json/wp/v2/`, {
			headers: {
				Authorization: `Basic ${Buffer.from(`admin:${apiKey}`).toString(
					"base64"
				)}`,
			},
		});

		if (!response.ok) {
			throw new Error("Failed to connect to WordPress");
		}

		const data = await response.json();
		return { success: true, data };
	} catch (error) {
		console.error("WordPress connection error:", error);
		throw new Error("Failed to connect to WordPress");
	}
}

async function getWordPressCategories(credentials: WordPressCredentials) {
	const { apiUrl, apiKey } = credentials;
	const baseUrl = apiUrl.replace(/\/$/, "");

	try {
		const response = await fetch(`${baseUrl}/wp-json/wp/v2/categories`, {
			headers: {
				Authorization: `Basic ${Buffer.from(`admin:${apiKey}`).toString(
					"base64"
				)}`,
			},
		});

		if (!response.ok) {
			throw new Error("Failed to fetch WordPress categories");
		}

		const categories = await response.json();
		return categories;
	} catch (error) {
		console.error("WordPress categories error:", error);
		throw new Error("Failed to fetch WordPress categories");
	}
}

async function getWordPressPostTypes(credentials: WordPressCredentials) {
	const { apiUrl, apiKey, username = "admin" } = credentials;
	const baseUrl = apiUrl.replace(/\/$/, "");

	try {
		const response = await fetch(`${baseUrl}/wp-json/wp/v2/types`, {
			headers: {
				Authorization: `Basic ${Buffer.from(
					`${username}:${apiKey.replace(/\s+/g, "")}`
				).toString("base64")}`,
			},
		});

		if (!response.ok) {
			throw new Error("Failed to fetch WordPress post types");
		}

		const postTypes = await response.json();
		// Filter out built-in post types and format the response
		const customPostTypes = Object.entries(postTypes)
			.filter(
				([key]) =>
					![
						"post",
						"page",
						"attachment",
						"nav_menu_item",
						"wp_block",
						"wp_template",
						"wp_template_part",
					].includes(key)
			)
			.map(([key, value]: [string, any]) => ({
				slug: key,
				name: value.name,
				description: value.description,
				rest_base: value.rest_base,
			}));

		return customPostTypes;
	} catch (error) {
		console.error("WordPress post types error:", error);
		throw new Error("Failed to fetch WordPress post types");
	}
}

export async function POST(req: Request) {
	try {
		await connectToDatabase();
		const body = await req.json();
		const { action, websiteName, credentials } = body;

		const website = await Website.findOne({ name: websiteName });
		if (!website) {
			return NextResponse.json({ error: "Website not found" }, { status: 404 });
		}

		switch (action) {
			case "test-connection":
				try {
					const result = await testWordPressConnection(credentials);
					return NextResponse.json(result);
				} catch (error) {
					return NextResponse.json(
						{ error: "Connection test failed" },
						{ status: 400 }
					);
				}

			case "get-categories":
				try {
					const categories = await getWordPressCategories(credentials);
					return NextResponse.json({ categories });
				} catch (error) {
					return NextResponse.json(
						{ error: "Failed to fetch categories" },
						{ status: 400 }
					);
				}

			case "get-post-types":
				try {
					const postTypes = await getWordPressPostTypes(credentials);
					return NextResponse.json({ postTypes });
				} catch (error) {
					return NextResponse.json(
						{ error: "Failed to fetch post types" },
						{ status: 400 }
					);
				}

			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}
	} catch (error) {
		console.error("WordPress API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
