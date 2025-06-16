import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const websiteId = searchParams.get("websiteId");

  if (!websiteId) {
    return NextResponse.json(
      { error: "websiteId is required" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
    const website = await Website.findById(websiteId).select(
      "sitemapUrls name keyUrls businessAnalysis contentStructureAnalysis"
    ); // Also fetch name and analysis fields for context

    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    // Assuming sitemapUrls is an array of strings.
    // The stats here are based on the stored URLs.
    const sitemapUrls = website.sitemapUrls || [];
    const discoveredUrlCount = sitemapUrls.length; // Simplistic, actual discovered might have been higher if capped before save.
    // For more accuracy, these stats should be stored alongside sitemapUrls.
    const returnedUrlCount = sitemapUrls.length;
    const capped = false; // We don't know from just the list if it was capped by API during last fetch.
    // This could be stored as a boolean field alongside sitemapUrls if needed.

    return NextResponse.json(
      {
        message: `Sitemap URLs retrieved for ${website.name}`,
        urls: sitemapUrls,
        stats: {
          discoveredUrlCount,
          returnedUrlCount,
          capped, // This is a simplified representation
        },
        keyUrls: website.keyUrls || [],
        businessAnalysis: website.businessAnalysis || null,
        contentStructureAnalysis: website.contentStructureAnalysis || null,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching sitemap URLs from DB:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: "Failed to retrieve sitemap URLs", details: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const websiteId = searchParams.get("websiteId");

  if (!websiteId) {
    return NextResponse.json(
      { error: "websiteId is required" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
    const website = await Website.findByIdAndUpdate(
      websiteId,
      {
        $set: {
          sitemapUrls: [],
          keyUrls: [],
          businessAnalysis: "",
          contentStructureAnalysis: "",
        },
      },
      { new: true }
    );
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting analysis data:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: "Failed to delete analysis data", details: message },
      { status: 500 }
    );
  }
}
