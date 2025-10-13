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
      console.log(`[Shopify Test] Website not found: ${company}`);
      return NextResponse.json({ connected: false });
    }

    console.log(`[Shopify Test] Found website: ${company}`);
    console.log(
      `[Shopify Test] Platform integrations:`,
      website.platformIntegrations?.length
    );

    const shopifyIntegration = website.platformIntegrations?.find(
      (p: PlatformConfig) => p.platform === "shopify"
    );

    console.log(
      `[Shopify Test] Shopify integration found:`,
      !!shopifyIntegration
    );
    console.log(`[Shopify Test] Shopify enabled:`, shopifyIntegration?.enabled);

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
