import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website, PlatformConfig } from "@/models/Website";

// Helper function to extract numeric ID from Shopify Global ID
function extractNumericId(gid: string): string {
  const match = gid.match(/\/(\d+)$/);
  if (!match) {
    throw new Error("Invalid Shopify Global ID format");
  }
  return match[1];
}

export async function POST(req: Request) {
  try {
    const { productId, description, company } = await req.json();

    if (!company || !productId || !description) {
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

    // Extract numeric ID from Global ID
    const numericId = extractNumericId(String(productId));

    // Update product in Shopify
    const shopifyResponse = await fetch(
      `https://${formattedStoreName}/admin/api/2024-01/products/${numericId}.json`,
      {
        method: "PUT",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          product: {
            id: numericId,
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
        url: `https://${formattedStoreName}/admin/api/2024-01/products/${numericId}.json`,
        originalGid: productId,
        extractedId: numericId,
      });
      throw new Error(`Failed to update product: ${errorText}`);
    }

    const updatedProduct = await shopifyResponse.json();
    return NextResponse.json({
      success: true,
      product: updatedProduct.product,
    });
  } catch (error: unknown) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
