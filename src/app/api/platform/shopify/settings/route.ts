import { NextResponse } from "next/server";
import { Website, PlatformConfig } from "@/models/Website";
import connectToDatabase from "@/lib/mongodb";

export async function GET(req: Request) {
	try {
		await connectToDatabase();

		// Get company name from query params
		const url = new URL(req.url);
		const company = url.searchParams.get("company");

		if (!company) {
			return NextResponse.json(
				{ error: "Company name is required" },
				{ status: 400 }
			);
		}

		// Find the website by company name
		const website = await Website.findOne({ name: company });
		if (!website) {
			return NextResponse.json({ error: "Website not found" }, { status: 404 });
		}

		// Find Shopify integration
		const shopifyIntegration = website.platformIntegrations?.find(
			(p: PlatformConfig) => p.platform === "shopify"
		);

		if (!shopifyIntegration) {
			return NextResponse.json(
				{ error: "Shopify integration not found" },
				{ status: 404 }
			);
		}

		// Return settings without exposing the full access token
		const settings = {
			...shopifyIntegration,
			credentials: {
				storeName: shopifyIntegration.credentials?.storeName || "",
				// Don't return the full access token for security
				accessToken: shopifyIntegration.credentials?.accessToken
					? "••••••••"
					: "",
			},
		};

		return NextResponse.json({
			success: true,
			settings,
		});
	} catch (error) {
		console.error("Error fetching Shopify settings:", error);
		return NextResponse.json(
			{ error: "Failed to fetch settings" },
			{ status: 500 }
		);
	}
}

export async function POST(req: Request) {
	try {
		await connectToDatabase();
		const {
			credentials,
			enabled,
			company: websiteName,
			keepExistingToken,
		} = await req.json();

		console.log("Received request body:", {
			credentials,
			enabled,
			websiteName,
			keepExistingToken,
		});

		if (!websiteName) {
			return NextResponse.json(
				{ error: "Website name is required" },
				{ status: 400 }
			);
		}

		const website = await Website.findOne({ name: websiteName });
		if (!website) {
			return NextResponse.json({ error: "Website not found" }, { status: 404 });
		}

		// Update or add Shopify integration settings
		const platformIntegrations = website.platformIntegrations || [];
		const shopifyIndex = platformIntegrations.findIndex(
			(p: PlatformConfig) => p.platform === "shopify"
		);

		// If we need to keep the existing token and there's an existing integration
		let existingAccessToken = "";
		if (keepExistingToken && shopifyIndex >= 0) {
			existingAccessToken =
				platformIntegrations[shopifyIndex]?.credentials?.accessToken || "";
		}

		if (shopifyIndex >= 0) {
			// Update existing integration
			const updateFields: any = {
				"platformIntegrations.$.platform": "shopify",
				"platformIntegrations.$.enabled": Boolean(enabled),
				"platformIntegrations.$.credentials.storeName":
					credentials.storeName || "",
			};

			// Only update the access token if provided or if we're not keeping the existing one
			if (credentials.accessToken || !keepExistingToken) {
				updateFields["platformIntegrations.$.credentials.accessToken"] =
					credentials.accessToken || "";
			} else if (keepExistingToken) {
				// If keeping existing token, use the one we retrieved
				updateFields["platformIntegrations.$.credentials.accessToken"] =
					existingAccessToken;
			}

			// Log if we're disabling the integration
			if (enabled === false) {
				console.log("Disabling Shopify integration for website:", websiteName);
			}

			const result = await Website.findOneAndUpdate(
				{
					name: websiteName,
					"platformIntegrations.platform": "shopify",
				},
				{
					$set: updateFields,
				},
				{ new: true }
			);
			if (!result) {
				throw new Error("Failed to update Shopify integration");
			}
		} else {
			// Add new integration
			const newIntegration = {
				platform: "shopify",
				enabled: Boolean(enabled),
				credentials: {
					storeName: credentials.storeName || "",
					accessToken: credentials.accessToken || "",
				},
				settings: {
					autoPublish: false,
					defaultStatus: "draft",
				},
			};

			const result = await Website.findOneAndUpdate(
				{ name: websiteName },
				{
					$push: { platformIntegrations: newIntegration },
				},
				{ new: true }
			);
			if (!result) {
				throw new Error("Failed to add Shopify integration");
			}
		}

		// Fetch the updated document
		const updatedWebsite = await Website.findOne({ name: websiteName });
		if (!updatedWebsite) {
			throw new Error("Failed to fetch updated website");
		}

		const savedIntegration = updatedWebsite.platformIntegrations.find(
			(p: PlatformConfig) => p.platform === "shopify"
		);

		// Add detailed logging
		console.log(
			"Complete updated website:",
			JSON.stringify(updatedWebsite, null, 2)
		);
		console.log(
			"Saved integration:",
			JSON.stringify(savedIntegration, null, 2)
		);
		console.log("Saved credentials:", savedIntegration?.credentials);

		return NextResponse.json({
			success: true,
			savedSettings: savedIntegration,
		});
	} catch (error) {
		console.error("Shopify settings API error:", error);
		return NextResponse.json(
			{ error: "Failed to save settings" },
			{ status: 500 }
		);
	}
}
