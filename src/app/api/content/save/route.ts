import { NextResponse } from "next/server";
import { Website } from "@/models/Website";
import { getServerSession } from "next-auth";
import connectToDatabase from "@/lib/mongodb";
import { currentUser } from "@clerk/nextjs/server";

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

		// Add new content to the website's content array
		website.content.push({
			title,
			html,
			date: new Date(),
			status,
			contentType,
			mainKeyword,
			relatedKeywords,
		});

		await website.save();

		return new NextResponse(JSON.stringify({ success: true }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (error) {
		console.error("Error saving content:", error);
		return new NextResponse(
			JSON.stringify({ error: "Failed to save content" }),
			{ status: 500 }
		);
	}
}
