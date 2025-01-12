import { NextResponse } from "next/server";
import { Website, PlatformConfig } from "@/models/Website";
import connectToDatabase from "@/lib/mongodb";

export async function POST(req: Request) {
	try {
		await connectToDatabase();
		const body = await req.json();
		const { websiteName, settings } = body;

		console.log("Received request body:", JSON.stringify(body, null, 2));
		console.log("Received settings:", JSON.stringify(settings, null, 2));
		console.log(
			"Received credentials:",
			JSON.stringify(settings.credentials, null, 2)
		);
		console.log("Username in credentials:", settings.credentials?.username);

		const website = await Website.findOne({ name: websiteName });
		if (!website) {
			return NextResponse.json({ error: "Website not found" }, { status: 404 });
		}

		// Update or add WordPress integration settings
		const platformIntegrations = website.platformIntegrations || [];
		const wordpressIndex = platformIntegrations.findIndex(
			(p: PlatformConfig) => p.platform === "wordpress"
		);

		if (wordpressIndex >= 0) {
			// Update existing integration
			const result = await Website.findOneAndUpdate(
				{
					name: websiteName,
					"platformIntegrations.platform": "wordpress",
				},
				{
					$set: {
						"platformIntegrations.$.platform": "wordpress",
						"platformIntegrations.$.enabled": Boolean(settings.enabled),
						"platformIntegrations.$.credentials.apiUrl":
							settings.credentials?.apiUrl || "",
						"platformIntegrations.$.credentials.apiKey":
							settings.credentials?.apiKey || "",
						"platformIntegrations.$.credentials.username":
							settings.credentials?.username || "admin",
						"platformIntegrations.$.settings.autoPublish": Boolean(
							settings.settings?.autoPublish
						),
						"platformIntegrations.$.settings.defaultStatus":
							settings.settings?.defaultStatus || "draft",
					},
				},
				{ new: true }
			);
			if (!result) {
				throw new Error("Failed to update WordPress integration");
			}
		} else {
			// Add new integration
			const newIntegration = {
				platform: "wordpress",
				enabled: Boolean(settings.enabled),
				credentials: {
					apiUrl: settings.credentials?.apiUrl || "",
					apiKey: settings.credentials?.apiKey || "",
					username: settings.credentials?.username || "admin",
				},
				settings: {
					autoPublish: Boolean(settings.settings?.autoPublish),
					defaultStatus: settings.settings?.defaultStatus || "draft",
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
				throw new Error("Failed to add WordPress integration");
			}
		}

		// Fetch the updated document
		const updatedWebsite = await Website.findOne({ name: websiteName });
		if (!updatedWebsite) {
			throw new Error("Failed to fetch updated website");
		}

		const savedIntegration = updatedWebsite.platformIntegrations.find(
			(p: PlatformConfig) => p.platform === "wordpress"
		);

		// Add more detailed logging
		console.log(
			"Complete updated website:",
			JSON.stringify(updatedWebsite, null, 2)
		);
		console.log(
			"Saved integration:",
			JSON.stringify(savedIntegration, null, 2)
		);
		console.log("Saved credentials:", savedIntegration?.credentials);
		console.log("Saved username:", savedIntegration?.credentials?.username);

		return NextResponse.json({
			success: true,
			savedSettings: savedIntegration,
		});
	} catch (error) {
		console.error("WordPress settings API error:", error);
		return NextResponse.json(
			{ error: "Failed to save settings" },
			{ status: 500 }
		);
	}
}
