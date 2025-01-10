import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";

import { currentUser } from "@clerk/nextjs/server";

export async function GET() {
  try {
    await connectToDatabase();
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const websites = await Website.find({ userId: user.id });
    const sharedWebsites = await Website.find({
      sharedWith: user.emailAddresses[0]?.emailAddress,
    });

    return NextResponse.json({ websites, sharedWebsites });
  } catch (error) {
    console.error("Error fetching websites:", error);
    return NextResponse.json(
      { error: "Failed to fetch websites" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, websiteName, folderId, folderName, content } =
      await req.json();

    await connectToDatabase();
    const website = await Website.findOne({
      name: websiteName,
      $or: [
        { userId: user.id },
        { sharedWith: user.emailAddresses[0]?.emailAddress },
      ],
    });

    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    switch (action) {
      case "createFolder":
        const newFolder = {
          id: Date.now().toString(),
          name: folderName,
          createdAt: new Date().toISOString(),
        };
        website.folders.push(newFolder);
        break;

      case "deleteFolder":
        // Move all content from this folder back to "All Content"
        website.content = website.content.map((item: any) =>
          item.folderId === folderId ? { ...item, folderId: null } : item
        );
        website.folders = website.folders.filter((f: any) => f.id !== folderId);
        break;

      case "moveContent":
        website.content = website.content.map((item: any) =>
          content.includes(item._id) ? { ...item, folderId } : item
        );
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await website.save();
    return NextResponse.json({ success: true, website });
  } catch (error) {
    console.error("Error updating website:", error);
    return NextResponse.json(
      { error: "Failed to update website" },
      { status: 500 }
    );
  }
}
