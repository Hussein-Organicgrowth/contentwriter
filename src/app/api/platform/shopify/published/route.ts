import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";

export async function POST(req: Request) {
  try {
    const { productId, company, isPublished, publishedAt } = await req.json();

    console.log("POST /api/platform/shopify/published - Request body:", {
      productId,
      company,
      isPublished,
      publishedAt,
    });

    if (!productId || !company) {
      console.log("Missing required fields:", { productId, company });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const website = await Website.findOne({ name: company });
    if (!website) {
      console.log(`Website not found for company: ${company}`);
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    console.log("Website found:", {
      name: website.name,
      hasPublishedProducts: !!website.publishedProducts,
      publishedProductsCount: website.publishedProducts
        ? website.publishedProducts.length
        : 0,
    });

    // Initialize publishedProducts array if it doesn't exist
    if (!website.publishedProducts) {
      console.log("Initializing publishedProducts array");
      website.publishedProducts = [];
    }

    // Check if product is already in the published list
    const existingIndex = website.publishedProducts.findIndex(
      (pub: { productId: string }) => pub.productId === productId
    );

    console.log("Existing product index:", existingIndex);

    if (existingIndex !== -1) {
      // Update existing entry
      if (isPublished) {
        console.log("Updating existing published product");
        website.publishedProducts[existingIndex] = {
          productId,
          publishedAt: publishedAt || new Date().toISOString(),
        };
      } else {
        // Remove from published list if isPublished is false
        console.log("Removing product from published list");
        website.publishedProducts.splice(existingIndex, 1);
      }
    } else if (isPublished) {
      // Add new entry only if isPublished is true
      console.log("Adding new published product");
      website.publishedProducts.push({
        productId,
        publishedAt: publishedAt || new Date().toISOString(),
      });
    }

    await website.save();
    console.log("Website saved successfully");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving published status:", error);
    return NextResponse.json(
      { error: "Failed to save published status" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company");
    const productId = searchParams.get("productId");

    console.log("GET /api/platform/shopify/published - Request params:", {
      company,
      productId,
    });

    if (!company) {
      console.log("Company name is missing");
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const website = await Website.findOne({ name: company });
    if (!website) {
      console.log(`Website not found for company: ${company}`);
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    console.log("Website found:", {
      name: website.name,
      hasPublishedProducts: !!website.publishedProducts,
      publishedProductsCount: website.publishedProducts
        ? website.publishedProducts.length
        : 0,
    });

    // Initialize publishedProducts array if it doesn't exist
    if (!website.publishedProducts) {
      console.log("Initializing publishedProducts array");
      website.publishedProducts = [];
      await website.save();
    }

    if (productId) {
      // Return information for a specific product
      const publishedProduct = website.publishedProducts.find(
        (pub: { productId: string }) => pub.productId === productId
      );
      console.log("Returning specific published product:", publishedProduct);
      return NextResponse.json({ publishedProduct });
    }

    return NextResponse.json({
      publishedProducts: website.publishedProducts || [],
    });
  } catch (error) {
    console.error("Error fetching published products:", error);
    return NextResponse.json(
      { error: "Failed to fetch published products" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company");
    const productId = searchParams.get("productId");

    if (!company || !productId) {
      return NextResponse.json(
        { error: "Company name and product ID are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const website = await Website.findOne({ name: company });
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    // Remove the product from published list
    if (website.publishedProducts) {
      website.publishedProducts = website.publishedProducts.filter(
        (pub: { productId: string }) => pub.productId !== productId
      );
      await website.save();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing published status:", error);
    return NextResponse.json(
      { error: "Failed to remove published status" },
      { status: 500 }
    );
  }
}
