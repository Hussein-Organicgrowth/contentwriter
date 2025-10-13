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

    // Get websites owned by the user with essential fields only
    // IMPORTANT: Exclude large arrays that aren't needed for this endpoint
    const websites = await Website.find(
      { userId: user.id },
      {
        name: 1,
        website: 1,
        description: 1,
        summary: 1,
        content: 1, // Include content for now (used by some pages)
        folders: 1,
        toneofvoice: 1,
        targetAudience: 1,
        sharedUsers: 1,
        platformIntegrations: 1,
        pendingProductDescriptions: 0, // Exclude - migrated to separate collection
        publishedProducts: 0, // Exclude - migrated to separate collection
        pendingCollectionDescriptions: 0, // Exclude - not commonly used
      }
    );

    // Get websites shared with any of the user's emails with essential fields only
    // IMPORTANT: Exclude large arrays that aren't needed for this endpoint
    const sharedWebsites = await Website.find(
      { sharedUsers: { $in: userEmails } },
      {
        name: 1,
        website: 1,
        description: 1,
        summary: 1,
        content: 1, // Include content for now (used by some pages)
        folders: 1,
        toneofvoice: 1,
        targetAudience: 1,
        sharedUsers: 1,
        platformIntegrations: 1,
        pendingProductDescriptions: 0, // Exclude - migrated to separate collection
        publishedProducts: 0, // Exclude - migrated to separate collection
        pendingCollectionDescriptions: 0, // Exclude - not commonly used
      }
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

    const body = await req.json();
    await connectToDatabase();

    // If no action is specified, treat it as a website creation request
    if (!body.action) {
      console.log("Creating new website:", body);
      const newWebsite = new Website({
        name: body.name,
        website: body.website,
        description: body.description,
        summary: body.summary,
        toneofvoice: body.toneofvoice,
        targetAudience: body.targetAudience,
        userId: user.id,
        content: [],
        folders: [],
        sharedUsers: [],
        platformIntegrations: [],
      });

      const savedWebsite = await newWebsite.save();
      console.log("New website saved:", JSON.stringify(savedWebsite, null, 2));

      return NextResponse.json({ success: true, website: savedWebsite });
    }

    // Handle existing actions for folder management
    const { action, websiteName, folderId, folderName, content } = body;
    const userEmails = user.emailAddresses.map((email) => email.emailAddress);

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

export async function DELETE(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get("id");

    if (!websiteId) {
      return NextResponse.json(
        { error: "Website ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the website and check if the user is the owner
    const website = await Website.findOne({ _id: websiteId, userId: user.id });
    if (!website) {
      return NextResponse.json(
        { error: "Website not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete the website
    await Website.findByIdAndDelete(websiteId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting website:", error);
    return NextResponse.json(
      { error: "Failed to delete website" },
      { status: 500 }
    );
  }
}
