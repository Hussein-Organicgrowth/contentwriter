import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { PublishedProductDescription } from "@/models/ProductDescription";

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

    if (isPublished) {
      // Upsert the published status
      const result = await PublishedProductDescription.findOneAndUpdate(
        {
          websiteName: company,
          productId,
        },
        {
          $set: {
            publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
            isActive: true,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      console.log("Published status saved:", result._id);
    } else {
      // Remove published status by setting isActive to false
      await PublishedProductDescription.updateOne(
        {
          websiteName: company,
          productId,
        },
        {
          $set: { isActive: false },
        }
      );
      console.log("Published status removed");
    }

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

    if (productId) {
      // Return information for a specific product
      const publishedProduct = await PublishedProductDescription.findOne({
        websiteName: company,
        productId,
        isActive: true,
      })
        .select("productId publishedAt")
        .lean();

      console.log("Returning specific published product:", publishedProduct);
      return NextResponse.json({ publishedProduct });
    }

    // Get all published products for this website
    const publishedProducts = await PublishedProductDescription.find({
      websiteName: company,
      isActive: true,
    })
      .select("productId publishedAt")
      .lean();

    console.log(
      `Found ${publishedProducts.length} published products for ${company}`
    );

    return NextResponse.json({
      publishedProducts: publishedProducts || [],
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

    // Soft delete by setting isActive to false to maintain history
    const result = await PublishedProductDescription.updateOne(
      {
        websiteName: company,
        productId,
      },
      {
        $set: { isActive: false },
      }
    );

    console.log(`Soft deleted published status:`, result.modifiedCount);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing published status:", error);
    return NextResponse.json(
      { error: "Failed to remove published status" },
      { status: 500 }
    );
  }
}
