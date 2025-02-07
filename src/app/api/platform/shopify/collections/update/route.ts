import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website, PlatformConfig } from "@/models/Website";

export async function POST(req: Request) {
  try {
    const { collectionId, description, company } = await req.json();

    if (!company || !collectionId || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get the website document to access Shopify credentials
    const website = await Website.findOne({ name: company });
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    const shopifyIntegration = website.platformIntegrations.find(
      (p: PlatformConfig) => p.platform === "shopify" && p.enabled
    );

    if (!shopifyIntegration) {
      return NextResponse.json(
        { error: "Shopify integration not found or disabled" },
        { status: 404 }
      );
    }

    const { storeName, accessToken } = shopifyIntegration.credentials;

    // Ensure storeName is properly formatted
    const formattedStoreName = storeName.includes(".myshopify.com")
      ? storeName
      : `${storeName}.myshopify.com`;

    // Update collection in Shopify
    const shopifyResponse = await fetch(
      `https://${formattedStoreName}/admin/api/2024-01/custom_collections/${collectionId}.json`,
      {
        method: "PUT",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          custom_collection: {
            id: collectionId,
            body_html: description,
          },
        }),
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error("Shopify API error:", {
        status: shopifyResponse.status,
        statusText: shopifyResponse.statusText,
        body: errorText,
      });
      throw new Error(`Failed to update collection: ${errorText}`);
    }

    const updatedCollection = await shopifyResponse.json();
    return NextResponse.json({
      success: true,
      collection: updatedCollection.custom_collection,
    });
  } catch (error: unknown) {
    console.error("Error updating collection:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
