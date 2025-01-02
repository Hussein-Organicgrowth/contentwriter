import { NextResponse } from "next/server";
import { Website } from "@/models/Website";
import connectToDatabase from "@/lib/mongodb";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(request: Request) {
	try {
		const user = await currentUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectToDatabase();
		const { name, website, description, summary } = await request.json();

		const websiteDoc = await Website.create({
			name,
			website,
			description,
			summary,
			content: [], // Initialize with empty content
			toneofvoice: "", // Initialize with empty tone of voice
			userId: user.id, // Add the authenticated user's ID
		});

		return NextResponse.json({ website: websiteDoc }, { status: 201 });
	} catch (error) {
		console.error("Error creating website:", error);
		return NextResponse.json(
			{ error: "Failed to create website" },
			{ status: 500 }
		);
	}
}

export async function GET(request: Request) {
	try {
		const user = await currentUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectToDatabase();

		// Get all websites for the authenticated user
		const websites = await Website.find({ userId: user.id }).sort({
			createdAt: -1,
		});

		return NextResponse.json({ websites }, { status: 200 });
	} catch (error) {
		console.error("Error fetching websites:", error);
		return NextResponse.json(
			{ error: "Failed to fetch websites" },
			{ status: 500 }
		);
	}
}
