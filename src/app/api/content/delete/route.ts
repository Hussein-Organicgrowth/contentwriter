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

		const { contentId } = await req.json();

		if (!contentId) {
			return new NextResponse("Missing content ID", { status: 400 });
		}

		await connectToDatabase();

		const website = await Website.findOne({
			"content._id": contentId,
		});

		if (!website) {
			return new NextResponse("Content not found", { status: 404 });
		}

		// Remove the content from the website's content array
		await Website.updateOne(
			{ "content._id": contentId },
			{ $pull: { content: { _id: contentId } } }
		);

		return new NextResponse(JSON.stringify({ success: true }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (error) {
		console.error("Error deleting content:", error);
		return new NextResponse(
			JSON.stringify({ error: "Failed to delete content" }),
			{ status: 500 }
		);
	}
}
