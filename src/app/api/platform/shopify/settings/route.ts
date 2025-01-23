import { NextResponse } from "next/server";
import { Website, PlatformConfig } from "@/models/Website";
import connectToDatabase from "@/lib/mongodb";

export async function POST(req: Request) {
	try {
		await connectToDatabase();
		const { credentials, enabled, company: websiteName } = await req.json();

		console.log("Received request body:", {
			credentials,
			enabled,
			websiteName,
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

		if (shopifyIndex >= 0) {
			// Update existing integration
			const result = await Website.findOneAndUpdate(
				{
					name: websiteName,
					"platformIntegrations.platform": "shopify",
				},
				{
					$set: {
						"platformIntegrations.$.platform": "shopify",
						"platformIntegrations.$.enabled": Boolean(enabled),
						"platformIntegrations.$.credentials.storeName":
							credentials.storeName || "",
						"platformIntegrations.$.credentials.accessToken":
							credentials.accessToken || "",
					},
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
