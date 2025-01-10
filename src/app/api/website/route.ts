import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";
import { currentUser } from "@clerk/nextjs/server";

interface WebsiteContent {
  _id: string;
  folderId: string | null;
}

interface WebsiteFolder {
  id: string;
  name: string;
  createdAt: string;
}

export async function GET() {
  try {
    await connectToDatabase();
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmails = user.emailAddresses.map((email) => email.emailAddress);
    console.log("Checking access for emails:", userEmails);

    // Get websites owned by the user with all fields
    const websites = await Website.find(
      { userId: user.id },
      { name: 1, content: 1, folders: 1, toneofvoice: 1, sharedUsers: 1 }
    );

    // Get websites shared with any of the user's emails with all fields
    const sharedWebsites = await Website.find(
      { sharedUsers: { $in: userEmails } },
      { name: 1, content: 1, folders: 1, toneofvoice: 1, sharedUsers: 1 }
    );

    console.log("Found shared websites:", sharedWebsites);
    console.log(
      "Shared websites content:",
      sharedWebsites.map((w) => w.content?.length || 0)
    );

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
    const userEmails = user.emailAddresses.map((email) => email.emailAddress);

    await connectToDatabase();

    // Find website where user is either owner or has shared access using $in
    const website = await Website.findOne({
      name: websiteName,
      $or: [{ userId: user.id }, { sharedUsers: { $in: userEmails } }],
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
        website.content = website.content.map((item: WebsiteContent) =>
          item.folderId === folderId ? { ...item, folderId: null } : item
        );
        website.folders = website.folders.filter(
          (f: WebsiteFolder) => f.id !== folderId
        );
        break;

      case "moveContent":
        website.content = website.content.map((item: WebsiteContent) =>
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
