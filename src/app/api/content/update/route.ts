import { NextResponse } from "next/server";
import { Website } from "@/models/Website";
import connectToDatabase from "@/lib/mongodb";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request) {
	try {
		const user = await currentUser();
		if (!user) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const { contentId, html } = await req.json();

		if (!contentId || !html) {
			return new NextResponse("Missing required fields", { status: 400 });
		}

		await connectToDatabase();

		const website = await Website.findOne({
			"content._id": contentId,
		});

		if (!website) {
			return new NextResponse("Content not found", { status: 404 });
		}

		// Update the HTML of the specific content item
		await Website.updateOne(
			{ "content._id": contentId },
			{ $set: { "content.$.html": html } }
		);

		return new NextResponse(JSON.stringify({ success: true }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (error) {
		console.error("Error updating content:", error);
		return new NextResponse(
			JSON.stringify({ error: "Failed to update content" }),
			{ status: 500 }
		);
	}
}
