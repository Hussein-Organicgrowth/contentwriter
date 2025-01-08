import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { websiteId, email } = await req.json();

    if (!websiteId || !email) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    await connectToDatabase();

    // Find the website and verify ownership
    const website = await Website.findById(websiteId);
    if (!website) {
      return new NextResponse("Website not found", { status: 404 });
    }

    if (website.userId !== user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Add the email to sharedUsers if not already present
    if (!website.sharedUsers.includes(email)) {
      website.sharedUsers.push(email);
      await website.save();
    }

    return NextResponse.json({ message: "Website shared successfully" });
  } catch (error) {
    console.error("[WEBSITE_SHARE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { websiteId, email } = await req.json();

    if (!websiteId || !email) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    await connectToDatabase();

    // Find the website and verify ownership
    const website = await Website.findById(websiteId);
    if (!website) {
      return new NextResponse("Website not found", { status: 404 });
    }

    if (website.userId !== user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Remove the email from sharedUsers
    website.sharedUsers = website.sharedUsers.filter((e) => e !== email);
    await website.save();

    return NextResponse.json({ message: "User removed successfully" });
  } catch (error) {
    console.error("[WEBSITE_SHARE_REMOVE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
