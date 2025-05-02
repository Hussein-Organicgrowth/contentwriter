import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website, PlatformConfig } from "@/models/Website";

// Define more specific types for Shopify collection objects
interface ShopifyCollectionBase {
  id: number;
  handle: string;
  title: string;
  updated_at: string;
  body_html: string | null;
  published_at: string | null;
  sort_order: string;
  template_suffix: string | null;
  published_scope: string;
  admin_graphql_api_id: string;
  // Add other common fields if necessary
}

// Define a basic structure for smart collection rules
interface ShopifyRule {
  column: string;
  relation: string;
  condition: string;
}

// Specific type for Smart Collections
interface SmartCollection extends ShopifyCollectionBase {
  rules?: ShopifyRule[];
  disjunctive?: boolean;
}

interface ShopifyCollectionResponse {
  // Use the base type directly for custom collections
  custom_collection?: ShopifyCollectionBase;
  smart_collection?: SmartCollection;
}

export async function POST(req: Request) {
  try {
    const { collectionId, description, company } = await req.json();

    if (!company || !collectionId || typeof description !== "string") {
      // Check description type
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const website = await Website.findOne({ name: company });
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    const shopifyIntegration = website.platformIntegrations.find(
      (p: PlatformConfig) => p.platform === "shopify" && p.enabled
    );

    if (!shopifyIntegration) {
      return NextResponse.json(
        { error: "Shopify integration not found or disabled" },
        { status: 404 }
      );
    }

    const { storeName, accessToken } = shopifyIntegration.credentials;

    const formattedStoreName = storeName.includes(".myshopify.com")
      ? storeName
      : `${storeName}.myshopify.com`;

    let shopifyResponse: Response | null = null;
    let updatedCollectionData: ShopifyCollectionResponse | null = null;
    let updateError: Error | null = null;

    // --- Try updating as Custom Collection ---
    try {
      shopifyResponse = await fetch(
        `https://${formattedStoreName}/admin/api/2024-01/custom_collections/${collectionId}.json`,
        {
          method: "PUT",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            custom_collection: {
              id: collectionId,
              body_html: description,
            },
          }),
        }
      );

      if (shopifyResponse.ok) {
        updatedCollectionData = await shopifyResponse.json();
      } else if (shopifyResponse.status !== 404) {
        // If it's not OK and not a 404, it's an actual error
        const errorText = await shopifyResponse.text();
        console.error("Shopify API error (Custom Collection):", {
          status: shopifyResponse.status,
          statusText: shopifyResponse.statusText,
          body: errorText,
        });
        updateError = new Error(
          `Failed to update custom collection: ${errorText}`
        );
      }
      // If it's a 404, we'll proceed to try Smart Collection
    } catch (e) {
      console.error("Fetch error updating custom collection:", e);
      updateError = e instanceof Error ? e : new Error(String(e));
    }

    // --- If Custom Collection failed with 404 (or wasn't found), try Smart Collection ---
    if (
      !updatedCollectionData &&
      (!shopifyResponse || shopifyResponse.status === 404)
    ) {
      console.log(
        `Custom collection ${collectionId} not found (404), trying smart collection...`
      );
      try {
        shopifyResponse = await fetch(
          `https://${formattedStoreName}/admin/api/2024-01/smart_collections/${collectionId}.json`,
          {
            method: "PUT",
            headers: {
              "X-Shopify-Access-Token": accessToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              smart_collection: {
                id: collectionId,
                body_html: description,
              },
            }),
          }
        );

        if (shopifyResponse.ok) {
          updatedCollectionData = await shopifyResponse.json();
          updateError = null; // Clear previous error if smart collection update succeeds
        } else {
          const errorText = await shopifyResponse.text();
          console.error("Shopify API error (Smart Collection):", {
            status: shopifyResponse.status,
            statusText: shopifyResponse.statusText,
            body: errorText,
          });
          // If this also fails, set the error
          updateError = new Error(
            `Failed to update smart collection after custom collection failed: ${errorText}`
          );
        }
      } catch (e) {
        console.error("Fetch error updating smart collection:", e);
        updateError = e instanceof Error ? e : new Error(String(e));
      }
    }

    // --- Handle final result ---
    if (updatedCollectionData) {
      return NextResponse.json({
        success: true,
        // Return the correct collection type based on which one was updated
        collection:
          updatedCollectionData.custom_collection ||
          updatedCollectionData.smart_collection,
      });
    } else {
      // If we reach here, both attempts failed or an error occurred
      throw (
        updateError ||
        new Error(
          "Failed to update collection - collection not found as custom or smart."
        )
      );
    }
  } catch (error: unknown) {
    console.error("Error updating collection:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Internal server error during collection update";
    // Determine appropriate status code based on error type if possible
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
