import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";

interface PendingCollectionDescription {
  collectionId: string;
  oldDescription: string;
  newDescription: string;
  generatedAt: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Received request body:", body);

    const { collectionId, oldDescription, newDescription, company } = body;

    if (!collectionId || !company || !newDescription) {
      console.log("Missing required fields:", {
        collectionId,
        company,
        newDescription,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    console.log("Looking for website with name:", company);

    const website = await Website.findOne({ name: company });
    if (!website) {
      console.log("Website not found for company:", company);
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    console.log(
      "Current pendingCollectionDescriptions:",
      website.pendingCollectionDescriptions
    );

    // Initialize pendingCollectionDescriptions if it doesn't exist
    if (!website.pendingCollectionDescriptions) {
      console.log("Initializing empty pendingCollectionDescriptions array");
      website.pendingCollectionDescriptions = [];
    }

    // Remove any existing pending description for this collection
    website.pendingCollectionDescriptions =
      website.pendingCollectionDescriptions.filter(
        (desc: { collectionId: string }) => desc.collectionId !== collectionId
      );

    const newPendingDescription = {
      collectionId,
      oldDescription: oldDescription || "",
      newDescription: newDescription.replace(/```html\n|```/g, ""),
      generatedAt: new Date().toISOString(),
    };

    console.log("Adding new pending description:", newPendingDescription);
    console.log("Website:", website);
    // Add the new pending description
    website.pendingCollectionDescriptions.push(newPendingDescription);

    console.log(
      "Updated pendingCollectionDescriptions:",
      website.pendingCollectionDescriptions
    );

    const savedWebsite = await website.save();
    console.log(
      "Saved website pendingCollectionDescriptions:",
      savedWebsite.pendingCollectionDescriptions
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving pending description:", error);
    return NextResponse.json(
      { error: "Failed to save pending description" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company");
    const collectionId = searchParams.get("collectionId");

    console.log("GET request params:", { company, collectionId });

    if (!company) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const website = await Website.findOne({ name: company });
    if (!website) {
      console.log("Website not found for company:", company);
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    console.log(
      "Found website pendingCollectionDescriptions:",
      website.pendingCollectionDescriptions
    );

    // Initialize pendingCollectionDescriptions if it doesn't exist
    if (!website.pendingCollectionDescriptions) {
      console.log("Initializing empty pendingCollectionDescriptions array");
      website.pendingCollectionDescriptions = [];
      await website.save();
    }

    if (collectionId) {
      const pendingDescription = website.pendingCollectionDescriptions.find(
        (desc: PendingCollectionDescription) =>
          desc.collectionId === collectionId
      );
      console.log(
        "Found pending description for collection:",
        pendingDescription
      );
      return NextResponse.json({ pendingDescription });
    }

    console.log(
      "Returning all pending descriptions:",
      website.pendingCollectionDescriptions
    );
    return NextResponse.json({
      pendingDescriptions: website.pendingCollectionDescriptions,
    });
  } catch (error) {
    console.error("Error fetching pending descriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending descriptions" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company");
    const collectionId = searchParams.get("collectionId");

    if (!company || !collectionId) {
      return NextResponse.json(
        { error: "Company name and collection ID are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const website = await Website.findOne({ name: company });
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    // Initialize pendingCollectionDescriptions if it doesn't exist
    if (!website.pendingCollectionDescriptions) {
      website.pendingCollectionDescriptions = [];
    }

    website.pendingCollectionDescriptions =
      website.pendingCollectionDescriptions.filter(
        (desc: PendingCollectionDescription) =>
          desc.collectionId !== collectionId
      );

    await website.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pending description:", error);
    return NextResponse.json(
      { error: "Failed to delete pending description" },
      { status: 500 }
    );
  }
}
