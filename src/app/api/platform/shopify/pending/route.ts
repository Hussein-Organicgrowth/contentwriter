import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";

export async function POST(req: Request) {
  try {
    const { productId, oldDescription, newDescription, company } =
      await req.json();

    if (!productId || !company || !newDescription) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const website = await Website.findOne({ name: company });
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    // Remove any existing pending description for this product
    website.pendingProductDescriptions =
      website.pendingProductDescriptions.filter(
        (desc: { productId: string }) => desc.productId !== productId
      );

    // Add the new pending description
    website.pendingProductDescriptions.push({
      productId,
      oldDescription: oldDescription || "",
      newDescription,
      generatedAt: new Date().toISOString(),
    });

    await website.save();

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
    const productId = searchParams.get("productId");

    if (!company) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const website = await Website.findOne({ name: company });
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    if (productId) {
      const pendingDescription = website.pendingProductDescriptions.find(
        (desc) => desc.productId === productId
      );
      return NextResponse.json({ pendingDescription });
    }

    return NextResponse.json({
      pendingDescriptions: website.pendingProductDescriptions,
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
    const productId = searchParams.get("productId");

    if (!company || !productId) {
      return NextResponse.json(
        { error: "Company name and product ID are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const website = await Website.findOne({ name: company });
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    website.pendingProductDescriptions =
      website.pendingProductDescriptions.filter(
        (desc) => desc.productId !== productId
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
