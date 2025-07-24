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

    console.log("🚀 Collection Update Request:", {
      collectionId,
      company,
      descriptionLength: description?.length,
      hasDescription: !!description,
    });

    if (!company || !collectionId || typeof description !== "string") {
      console.error("❌ Invalid request data:", {
        company: !!company,
        collectionId: !!collectionId,
        descriptionType: typeof description,
      });
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const website = await Website.findOne({ name: company });
    if (!website) {
      console.error("❌ Website not found:", company);
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    console.log("✅ Website found:", website.name);

    const shopifyIntegration = website.platformIntegrations.find(
      (p: PlatformConfig) => p.platform === "shopify" && p.enabled
    );

    if (!shopifyIntegration) {
      console.error(
        "❌ Shopify integration not found or disabled for:",
        company
      );
      return NextResponse.json(
        { error: "Shopify integration not found or disabled" },
        { status: 404 }
      );
    }

    const { storeName, accessToken } = shopifyIntegration.credentials;
    console.log("✅ Shopify integration found:", {
      storeName,
      hasAccessToken: !!accessToken,
    });

    const formattedStoreName = storeName.includes(".myshopify.com")
      ? storeName
      : `${storeName}.myshopify.com`;

    console.log("🔧 Formatted store name:", formattedStoreName);

    let shopifyResponse: Response | null = null;
    let updatedCollectionData: ShopifyCollectionResponse | null = null;
    let updateError: Error | null = null;

    // First, let's fetch the current collection to see its current state
    console.log("🔍 Fetching current collection state...");

    // Try to fetch as custom collection first
    let currentCollection: ShopifyCollectionBase | null = null;
    let collectionType: "custom" | "smart" | null = null;

    try {
      const fetchCustomResponse = await fetch(
        `https://${formattedStoreName}/admin/api/2024-01/custom_collections/${collectionId}.json`,
        {
          method: "GET",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (fetchCustomResponse.ok) {
        const data = await fetchCustomResponse.json();
        currentCollection = data.custom_collection;
        collectionType = "custom";
        console.log("✅ Found as custom collection:", {
          id: currentCollection?.id,
          title: currentCollection?.title,
          published_at: currentCollection?.published_at,
          published_scope: currentCollection?.published_scope,
          current_body_html_length: currentCollection?.body_html?.length || 0,
        });
      } else if (fetchCustomResponse.status === 404) {
        console.log(
          "⚠️ Not found as custom collection, trying smart collection..."
        );

        // Try smart collection
        const fetchSmartResponse = await fetch(
          `https://${formattedStoreName}/admin/api/2024-01/smart_collections/${collectionId}.json`,
          {
            method: "GET",
            headers: {
              "X-Shopify-Access-Token": accessToken,
              "Content-Type": "application/json",
            },
          }
        );

        if (fetchSmartResponse.ok) {
          const data = await fetchSmartResponse.json();
          currentCollection = data.smart_collection;
          collectionType = "smart";
          console.log("✅ Found as smart collection:", {
            id: currentCollection?.id,
            title: currentCollection?.title,
            published_at: currentCollection?.published_at,
            published_scope: currentCollection?.published_scope,
            current_body_html_length: currentCollection?.body_html?.length || 0,
          });
        } else {
          console.error("❌ Collection not found as smart collection either:", {
            status: fetchSmartResponse.status,
            statusText: fetchSmartResponse.statusText,
          });
        }
      }
    } catch (error) {
      console.error("❌ Error fetching current collection:", error);
    }

    if (!currentCollection || !collectionType) {
      console.error("❌ Collection not found:", collectionId);
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Prepare update payload - ensure collection gets published
    const updatePayload = {
      id: collectionId,
      body_html: description,
      // Ensure the collection is published
      published_at: currentCollection.published_at || new Date().toISOString(),
      published_scope: "web", // Make sure it's published to web
    };

    console.log("📝 Update payload:", {
      ...updatePayload,
      body_html_length: updatePayload.body_html.length,
      will_publish: !currentCollection.published_at
        ? "YES - will publish now"
        : "Already published",
    });

    // --- Update based on collection type ---
    if (collectionType === "custom") {
      console.log("🔄 Updating custom collection...");
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
              custom_collection: updatePayload,
            }),
          }
        );

        console.log("📡 Shopify response status:", shopifyResponse.status);

        if (shopifyResponse.ok) {
          updatedCollectionData = await shopifyResponse.json();
          console.log("✅ Custom collection updated successfully:", {
            id: updatedCollectionData.custom_collection?.id,
            title: updatedCollectionData.custom_collection?.title,
            published_at: updatedCollectionData.custom_collection?.published_at,
            published_scope:
              updatedCollectionData.custom_collection?.published_scope,
            body_html_length:
              updatedCollectionData.custom_collection?.body_html?.length || 0,
          });
        } else {
          const errorText = await shopifyResponse.text();
          console.error("❌ Shopify API error (Custom Collection):", {
            status: shopifyResponse.status,
            statusText: shopifyResponse.statusText,
            body: errorText,
          });
          updateError = new Error(
            `Failed to update custom collection: ${errorText}`
          );
        }
      } catch (e) {
        console.error("❌ Fetch error updating custom collection:", e);
        updateError = e instanceof Error ? e : new Error(String(e));
      }
    } else if (collectionType === "smart") {
      console.log("🔄 Updating smart collection...");
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
              smart_collection: updatePayload,
            }),
          }
        );

        console.log("📡 Shopify response status:", shopifyResponse.status);

        if (shopifyResponse.ok) {
          updatedCollectionData = await shopifyResponse.json();
          console.log("✅ Smart collection updated successfully:", {
            id: updatedCollectionData.smart_collection?.id,
            title: updatedCollectionData.smart_collection?.title,
            published_at: updatedCollectionData.smart_collection?.published_at,
            published_scope:
              updatedCollectionData.smart_collection?.published_scope,
            body_html_length:
              updatedCollectionData.smart_collection?.body_html?.length || 0,
          });
        } else {
          const errorText = await shopifyResponse.text();
          console.error("❌ Shopify API error (Smart Collection):", {
            status: shopifyResponse.status,
            statusText: shopifyResponse.statusText,
            body: errorText,
          });
          updateError = new Error(
            `Failed to update smart collection: ${errorText}`
          );
        }
      } catch (e) {
        console.error("❌ Fetch error updating smart collection:", e);
        updateError = e instanceof Error ? e : new Error(String(e));
      }
    }

    // --- Handle final result ---
    if (updatedCollectionData) {
      const finalCollection =
        updatedCollectionData.custom_collection ||
        updatedCollectionData.smart_collection;

      console.log("🎉 Collection update completed:", {
        success: true,
        collectionType,
        id: finalCollection?.id,
        title: finalCollection?.title,
        isPublished: !!finalCollection?.published_at,
        published_at: finalCollection?.published_at,
        published_scope: finalCollection?.published_scope,
      });

      return NextResponse.json({
        success: true,
        collection: finalCollection,
        collectionType,
        debug: {
          wasAlreadyPublished: !!currentCollection.published_at,
          isNowPublished: !!finalCollection?.published_at,
          published_at: finalCollection?.published_at,
          published_scope: finalCollection?.published_scope,
        },
      });
    } else {
      console.error("❌ Final update failed:", updateError?.message);
      throw (
        updateError ||
        new Error(
          "Failed to update collection - collection not found as custom or smart."
        )
      );
    }
  } catch (error: unknown) {
    console.error("❌ Error updating collection:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Internal server error during collection update";
    const status = message.includes("not found") ? 404 : 500;

    console.error("❌ Returning error response:", {
      message,
      status,
      originalError: error,
    });

    return NextResponse.json({ error: message }, { status });
  }
}
