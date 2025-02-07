import { NextRequest, NextResponse } from "next/server";
import { getShopifyClient } from "@/utils/shopify";
import { PlatformConfig, Website } from "@/models/Website";
import connectToDatabase from "@/lib/mongodb";

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  handle: string;
  updated_at: string;
  published_at: string;
  status: string;
  images: Array<{
    id: number;
    alt: string;
    position: number;
    product_id: number;
    created_at: string;
    updated_at: string;
    width: number;
    height: number;
    src: string;
  }>;
  image: {
    id: number;
    alt: string;
    position: number;
    product_id: number;
    created_at: string;
    updated_at: string;
    width: number;
    height: number;
    src: string;
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ collectionId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");
    const params = await context.params;
    const { collectionId } = params;

    if (!company) {
      return NextResponse.json(
        { error: "Company parameter is required" },
        { status: 400 }
      );
    }
    console.log("Company:", company);
    console.log("Collection ID:", collectionId);
    await connectToDatabase();

    // Get website settings for the company
    const website = await Website.findOne({ name: company });
    if (!website) {
      return NextResponse.json(
        { error: "Shopify settings not found" },
        { status: 404 }
      );
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

    const shopify = getShopifyClient(storeName, accessToken);

    // Fetch products in the collection
    const response = await shopify.collection.products(collectionId);
    console.log("Response:", JSON.stringify(response, null, 2));

    return NextResponse.json({
      products: response.map((product: ShopifyProduct) => ({
        id: product.id,
        title: product.title,
        body_html: product.body_html,
        vendor: product.vendor,
        status: product.status,
        image: product.image
          ? {
              src: product.image.src,
              alt: product.image.alt,
            }
          : undefined,
        images: product.images.map((img) => ({
          src: img.src,
          alt: img.alt,
        })),
      })),
    });
  } catch (error) {
    console.error("Error fetching collection products:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection products" },
      { status: 500 }
    );
  }
}
