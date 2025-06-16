import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const { websiteId, businessAnalysis, contentStructureAnalysis, keyUrls } =
      await request.json();

    if (!websiteId) {
      return NextResponse.json({ error: "Missing websiteId" }, { status: 400 });
    }

    const update: {
      businessAnalysis?: string;
      contentStructureAnalysis?: string;
      keyUrls?: string[];
    } = {};
    if (typeof businessAnalysis === "string") {
      update.businessAnalysis = businessAnalysis;
    }
    if (typeof contentStructureAnalysis === "string") {
      update.contentStructureAnalysis = contentStructureAnalysis;
    }
    if (
      Array.isArray(keyUrls) &&
      keyUrls.every((url) => typeof url === "string")
    ) {
      update.keyUrls = keyUrls;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No analysis data provided" },
        { status: 400 }
      );
    }

    const website = await Website.findByIdAndUpdate(
      websiteId,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, website });
  } catch (error) {
    console.error("Error saving analysis:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
