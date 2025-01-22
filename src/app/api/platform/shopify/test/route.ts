import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { PlatformConfig, Website } from "@/models/Website";

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const company = searchParams.get("company");

		if (!company) {
			return NextResponse.json(
				{ error: "Company name is required" },
				{ status: 400 }
			);
		}

		await connectToDatabase();

		const website = await Website.findOne({ name: company });
		if (!website) {
			return NextResponse.json({ connected: false });
		}

		const shopifyIntegration = website.platformIntegrations.find(
			(p: PlatformConfig) => p.platform === "shopify"
		);

		return NextResponse.json({
			connected: Boolean(shopifyIntegration?.enabled),
		});
	} catch (error) {
		console.error("Error checking Shopify connection:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
