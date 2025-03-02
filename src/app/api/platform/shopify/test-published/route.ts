import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const company = searchParams.get("company");

		if (!company) {
			return NextResponse.json(
				{ error: "Company name is required" },
				{ status: 400 }
			);
		}

		await connectToDatabase();

		// Find the website
		const website = await Website.findOne({ name: company });
		if (!website) {
			return NextResponse.json({ error: "Website not found" }, { status: 404 });
		}

		// Return the current state of publishedProducts
		return NextResponse.json({
			message: "Current state of publishedProducts",
			hasPublishedProductsField: website.publishedProducts !== undefined,
			publishedProducts: website.publishedProducts || [],
			websiteId: website._id,
		});
	} catch (error) {
		console.error("Error in test endpoint:", error);
		return NextResponse.json(
			{ error: "Failed to test published products" },
			{ status: 500 }
		);
	}
}

export async function POST(req: Request) {
	try {
		const { company } = await req.json();

		if (!company) {
			return NextResponse.json(
				{ error: "Company name is required" },
				{ status: 400 }
			);
		}

		await connectToDatabase();

		// Find the website
		const website = await Website.findOne({ name: company });
		if (!website) {
			return NextResponse.json({ error: "Website not found" }, { status: 404 });
		}

		// Create a test published product
		const testProductId = "test-product-" + Date.now();

		// Initialize publishedProducts if it doesn't exist
		if (!website.publishedProducts) {
			website.publishedProducts = [];
		}

		// Add a test product
		website.publishedProducts.push({
			productId: testProductId,
			publishedAt: new Date().toISOString(),
		});

		// Save the website
		await website.save();

		// Fetch it again to verify it was saved
		const updatedWebsite = await Website.findOne({ name: company });

		return NextResponse.json({
			message: "Test product added to publishedProducts",
			testProductId,
			publishedProducts: updatedWebsite?.publishedProducts || [],
			wasSaved:
				updatedWebsite?.publishedProducts?.some(
					(p: { productId: string }) => p.productId === testProductId
				) || false,
		});
	} catch (error) {
		console.error("Error in test endpoint:", error);
		return NextResponse.json(
			{ error: "Failed to test published products" },
			{ status: 500 }
		);
	}
}
