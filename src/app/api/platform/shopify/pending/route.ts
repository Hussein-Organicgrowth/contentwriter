import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";

export async function POST(req: Request) {
  try {
    console.log("Received POST request to save pending description");

    const requestBody = await req.json();
    console.log("Request body:", requestBody);

    const {
      productId,
      oldDescription,
      newDescription,
      company,
      oldSeoTitle,
      oldSeoDescription,
      newSeoTitle,
      newSeoDescription,
      summaryHtml,
    } = requestBody;

    if (!productId || !company || !newDescription) {
      console.error("Missing required fields:", {
        productId: !!productId,
        company: !!company,
        newDescription: !!newDescription,
      });
      return NextResponse.json(
        {
          error:
            "Missing required fields: productId, company, and newDescription are required",
        },
        { status: 400 }
      );
    }

    console.log(
      `Saving pending description for product ${productId} in company ${company}`
    );

    console.log("Connecting to database...");
    await connectToDatabase();
    console.log("Database connected successfully");

    const website = await Website.findOne({ name: company });
    if (!website) {
      console.error(`Website not found for company: ${company}`);
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    console.log(`Found website for company: ${company}`);

    // Remove any existing pending description for this product
    const existingCount = website.pendingProductDescriptions?.length || 0;
    website.pendingProductDescriptions = (
      website.pendingProductDescriptions || []
    ).filter((desc: { productId: string }) => desc.productId !== productId);
    const afterFilterCount = website.pendingProductDescriptions.length;
    console.log(
      `Filtered existing descriptions: ${existingCount} -> ${afterFilterCount}`
    );

    // Add the new pending description
    const newPendingDescription = {
      productId,
      oldDescription: oldDescription || "",
      newDescription,
      generatedAt: new Date().toISOString(),
      oldSeoTitle: oldSeoTitle || "",
      oldSeoDescription: oldSeoDescription || "",
      newSeoTitle: newSeoTitle || "",
      newSeoDescription: newSeoDescription || "",
      summaryHtml: summaryHtml || "",
    };

    console.log("Adding new pending description:", newPendingDescription);
    website.pendingProductDescriptions.push(newPendingDescription);

    console.log("Saving website to database...");
    await website.save();
    console.log("Website saved successfully");

    return NextResponse.json({
      success: true,
      message: "Pending description saved successfully",
      productId,
      totalPending: website.pendingProductDescriptions.length,
    });
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
