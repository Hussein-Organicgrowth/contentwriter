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
		const { name, website, description, summary, toneofvoice, targetAudience } =
			await request.json();

		const websiteDoc = await Website.create({
			name,
			website,
			description,
			summary,
			content: [], // Initialize with empty content
			toneofvoice, // Add tone of voice
			targetAudience, // Add target audience
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

export async function DELETE(request: Request) {
	try {
		const user = await currentUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await connectToDatabase();
		const { searchParams } = new URL(request.url);
		const websiteId = searchParams.get("id");

		if (!websiteId) {
			return NextResponse.json(
				{ error: "Website ID is required" },
				{ status: 400 }
			);
		}

		// Find and delete the website, ensuring it belongs to the current user
		const deletedWebsite = await Website.findOneAndDelete({
			_id: websiteId,
			userId: user.id,
		});

		if (!deletedWebsite) {
			return NextResponse.json({ error: "Website not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error deleting website:", error);
		return NextResponse.json(
			{ error: "Failed to delete website" },
			{ status: 500 }
		);
	}
}
