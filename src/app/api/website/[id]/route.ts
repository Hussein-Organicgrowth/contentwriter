import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";
import { currentUser } from "@clerk/nextjs/server";

export async function PATCH(
	req: Request,
	{ params }: { params: { id: string } }
) {
	try {
		const user = await currentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const websiteId = params.id;
		if (!websiteId) {
			return NextResponse.json(
				{ error: "Website ID is required" },
				{ status: 400 }
			);
		}

		const body = await req.json();
		await connectToDatabase();

		// Find the website and check if the user is the owner
		const website = await Website.findOne({ _id: websiteId, userId: user.id });
		if (!website) {
			return NextResponse.json(
				{ error: "Website not found or unauthorized" },
				{ status: 404 }
			);
		}

		// Update the website fields
		const updatedFields = {
			name: body.name,
			website: body.website,
			description: body.description,
			toneofvoice: body.toneofvoice,
			targetAudience: body.targetAudience,
		};

		// Update the website
		const updatedWebsite = await Website.findByIdAndUpdate(
			websiteId,
			{ $set: updatedFields },
			{ new: true }
		);

		return NextResponse.json({ success: true, website: updatedWebsite });
	} catch (error) {
		console.error("Error updating website:", error);
		return NextResponse.json(
			{ error: "Failed to update website" },
			{ status: 500 }
		);
	}
}
