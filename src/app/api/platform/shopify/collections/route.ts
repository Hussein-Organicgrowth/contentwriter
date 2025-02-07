import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website, PlatformConfig } from "@/models/Website";

interface ShopifyCollection {
  id: string;
  title: string;
  body_html: string;
  handle: string;
  published_at: string;
  updated_at: string;
  sort_order: string;
  template_suffix: string | null;
  products_count: number;
  collection_type: string;
  published_scope: string;
  admin_graphql_api_id: string;
}

interface ShopifyCollectionCount {
  count: number;
}

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

    // Get the website document to access Shopify credentials
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

    // Ensure storeName is properly formatted
    const formattedStoreName = storeName.includes(".myshopify.com")
      ? storeName
      : `${storeName}.myshopify.com`;

    // First, get the total count of collections
    const countResponse = await fetch(
      `https://${formattedStoreName}/admin/api/2024-01/custom_collections/count.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!countResponse.ok) {
      throw new Error("Failed to fetch collection count");
    }

    const { count: totalCollections } =
      (await countResponse.json()) as ShopifyCollectionCount;
    console.log("Total collections in store:", totalCollections);

    // Call Shopify API to get collections with pagination
    let allCollections: ShopifyCollection[] = [];
    let hasNextPage = true;
    let nextPageUrl = `https://${formattedStoreName}/admin/api/2024-01/custom_collections.json?limit=250`;
    let pageCount = 0;

    while (hasNextPage) {
      pageCount++;
      console.log(`Fetching page ${pageCount}...`);

      const shopifyResponse = await fetch(nextPageUrl, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!shopifyResponse.ok) {
        const errorText = await shopifyResponse.text();
        console.error("Shopify API error:", {
          status: shopifyResponse.status,
          statusText: shopifyResponse.statusText,
          body: errorText,
          url: nextPageUrl,
          rateLimit: shopifyResponse.headers.get(
            "X-Shopify-Shop-Api-Call-Limit"
          ),
        });
        throw new Error(
          `Failed to fetch collections from Shopify: ${errorText}`
        );
      }

      const responseData = await shopifyResponse.json();

      // Log progress
      console.log("Progress:", {
        page: pageCount,
        collectionsReceived: responseData.custom_collections?.length || 0,
        totalCollectionsFetched:
          allCollections.length +
          (responseData.custom_collections?.length || 0),
        totalCollections,
        rateLimit: shopifyResponse.headers.get("X-Shopify-Shop-Api-Call-Limit"),
      });

      if (!responseData.custom_collections) {
        console.error("Unexpected response format:", responseData);
        throw new Error("Unexpected response format from Shopify API");
      }

      allCollections = allCollections.concat(responseData.custom_collections);

      // Check for next page using Link header
      const linkHeader = shopifyResponse.headers.get("Link");
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const nextLink = linkHeader
          .split(",")
          .find((link) => link.includes('rel="next"'));
        if (nextLink) {
          nextPageUrl = nextLink.split(";")[0].trim().slice(1, -1);
        } else {
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }

      // Add a small delay between requests to respect rate limits
      if (hasNextPage) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log("Fetching complete:", {
      totalPagesFetched: pageCount,
      totalCollectionsFetched: allCollections.length,
      expectedTotal: totalCollections,
    });

    // Sort collections by title for consistency
    allCollections.sort((a, b) => a.title.localeCompare(b.title));

    return NextResponse.json({
      collections: allCollections,
      total: allCollections.length,
      totalPages: pageCount,
    });
  } catch (error: unknown) {
    console.error("Error fetching Shopify collections:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
