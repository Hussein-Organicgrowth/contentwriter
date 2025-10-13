import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { PendingProductDescription } from "@/models/ProductDescription";

// Request deduplication to prevent concurrent duplicate saves
const pendingRequests = new Map<string, Promise<unknown>>();

function dedupedSave<T>(key: string, saveFn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    console.log(`[Dedup] Reusing existing request for key: ${key}`);
    return pendingRequests.get(key) as Promise<T>;
  }

  console.log(`[Dedup] Creating new request for key: ${key}`);
  const promise = saveFn().finally(() => {
    pendingRequests.delete(key);
    console.log(`[Dedup] Cleaned up request for key: ${key}`);
  });

  pendingRequests.set(key, promise);
  return promise;
}

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

    // Use deduplication to prevent concurrent duplicate saves
    const deduplicationKey = `${company}:${productId}`;

    const result = await dedupedSave(deduplicationKey, async () => {
      console.log("Connecting to database...");
      await connectToDatabase();
      console.log("Database connected successfully");

      // Archive any existing pending description for this product by setting isActive to false
      const existingDescriptions = await PendingProductDescription.find({
        websiteName: company,
        productId,
        isActive: true,
      });

      if (existingDescriptions.length > 0) {
        console.log(
          `Found ${existingDescriptions.length} existing active descriptions, archiving them`
        );
        await PendingProductDescription.updateMany(
          {
            websiteName: company,
            productId,
            isActive: true,
          },
          {
            $set: { isActive: false },
          }
        );
      }

      // Get the next version number
      const maxVersion = existingDescriptions.reduce(
        (max, desc) => Math.max(max, desc.version || 0),
        0
      );

      // Create the new pending description
      const newPendingDescription = await PendingProductDescription.create({
        websiteName: company,
        productId,
        oldDescription: oldDescription || "",
        newDescription,
        oldSeoTitle: oldSeoTitle || "",
        oldSeoDescription: oldSeoDescription || "",
        newSeoTitle: newSeoTitle || "",
        newSeoDescription: newSeoDescription || "",
        summaryHtml: summaryHtml || "",
        generatedAt: new Date(),
        isActive: true,
        version: maxVersion + 1,
      });

      console.log(
        "Pending description saved successfully:",
        newPendingDescription._id
      );

      // Get total pending count for this website
      const totalPending = await PendingProductDescription.countDocuments({
        websiteName: company,
        isActive: true,
      });

      return {
        success: true,
        message: "Pending description saved successfully",
        productId,
        totalPending,
      };
    });

    return NextResponse.json(result);
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

    if (productId) {
      // Get the active pending description for a specific product
      const pendingDescription = await PendingProductDescription.findOne({
        websiteName: company,
        productId,
        isActive: true,
      })
        .select(
          "productId oldDescription newDescription oldSeoTitle oldSeoDescription newSeoTitle newSeoDescription summaryHtml generatedAt"
        )
        .lean();

      return NextResponse.json({ pendingDescription });
    }

    // Get all active pending descriptions for this website
    const pendingDescriptions = await PendingProductDescription.find({
      websiteName: company,
      isActive: true,
    })
      .select(
        "productId oldDescription newDescription oldSeoTitle oldSeoDescription newSeoTitle newSeoDescription summaryHtml generatedAt"
      )
      .lean();

    // Transform to match the expected format
    const formattedDescriptions = pendingDescriptions.map((desc) => ({
      productId: desc.productId,
      oldDescription: desc.oldDescription,
      newDescription: desc.newDescription,
      oldSeoTitle: desc.oldSeoTitle,
      oldSeoDescription: desc.oldSeoDescription,
      newSeoTitle: desc.newSeoTitle,
      newSeoDescription: desc.newSeoDescription,
      summaryHtml: desc.summaryHtml,
      generatedAt: desc.generatedAt,
    }));

    return NextResponse.json({
      pendingDescriptions: formattedDescriptions,
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

    // Soft delete by setting isActive to false to maintain history
    const result = await PendingProductDescription.updateMany(
      {
        websiteName: company,
        productId,
        isActive: true,
      },
      {
        $set: { isActive: false },
      }
    );

    console.log(`Soft deleted ${result.modifiedCount} pending descriptions`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pending description:", error);
    return NextResponse.json(
      { error: "Failed to delete pending description" },
      { status: 500 }
    );
  }
}
