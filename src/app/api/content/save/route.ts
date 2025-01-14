import { NextResponse } from "next/server";
import { Website } from "@/models/Website";
import { getServerSession } from "next-auth";
import connectToDatabase from "@/lib/mongodb";
import { currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const {
      title,
      html,
      status,
      contentType,
      mainKeyword,
      relatedKeywords,
      websiteId,
    } = await req.json();

    await connectToDatabase();

    const website = await Website.findById(websiteId);
    if (!website) {
      return new NextResponse("Website not found", { status: 404 });
    }

    // Create new content with _id
    const newContent = {
      _id: new mongoose.Types.ObjectId().toString(),
      title,
      html,
      date: new Date().toISOString(),
      status,
      contentType,
      mainKeyword,
      relatedKeywords,
      folderId: null,
      platformPublishStatus: {},
    };

    // Add new content to the website's content array
    website.content.push(newContent);
    await website.save();

    return new NextResponse(
      JSON.stringify({ success: true, content: newContent }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error saving content:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to save content" }),
      { status: 500 }
    );
  }
}
