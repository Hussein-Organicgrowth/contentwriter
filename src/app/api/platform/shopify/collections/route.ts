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
  rules?: Array<{
    column: string;
    condition: string;
    relation: string;
  }>;
}

interface ShopifyCollectionCount {
  count: number;
}

const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY = 1000; // 1 second
const BATCH_SIZE = 250;

async function fetchWithRetry(
  url: string,
  accessToken: string,
  retryCount = 0
): Promise<Response> {
  try {
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const rateLimit = response.headers.get("X-Shopify-Shop-Api-Call-Limit");
      const retryAfter = response.headers.get("Retry-After");

      console.error("Shopify API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        rateLimit,
        retryAfter,
      });

      if (response.status === 429 && retryCount < MAX_RETRIES) {
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : RATE_LIMIT_DELAY;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(url, accessToken, retryCount + 1);
      }

      throw new Error(`Failed to fetch from Shopify: ${errorText}`);
    }

    return response;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
      return fetchWithRetry(url, accessToken, retryCount + 1);
    }
    throw error;
  }
}

async function fetchCollectionsByType(
  storeName: string,
  accessToken: string,
  type: "custom" | "smart"
): Promise<ShopifyCollection[]> {
  const collections: ShopifyCollection[] = [];
  let hasNextPage = true;
  let nextPageUrl = `https://${storeName}/admin/api/2024-01/${type}_collections.json?limit=${BATCH_SIZE}`;
  let pageCount = 0;

  while (hasNextPage) {
    pageCount++;
    console.log(`Fetching ${type} collections page ${pageCount}...`);

    const shopifyResponse = await fetchWithRetry(nextPageUrl, accessToken);
    const responseData = await shopifyResponse.json();

    const collectionKey = `${type}_collections`;
    if (!responseData[collectionKey]) {
      console.error("Unexpected response format:", responseData);
      throw new Error(
        `Unexpected response format from Shopify API for ${type} collections`
      );
    }

    const currentBatch = responseData[collectionKey];
    collections.push(...currentBatch);

    // Log progress
    console.log(`Progress for ${type} collections:`, {
      page: pageCount,
      collectionsReceived: currentBatch.length,
      totalCollectionsFetched: collections.length,
      rateLimit: shopifyResponse.headers.get("X-Shopify-Shop-Api-Call-Limit"),
    });

    // Check for next page
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

    // Add a small delay between requests
    if (hasNextPage) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return collections;
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

    // Get total counts for both types
    const [customCountResponse, smartCountResponse] = await Promise.all([
      fetchWithRetry(
        `https://${formattedStoreName}/admin/api/2024-01/custom_collections/count.json`,
        accessToken
      ),
      fetchWithRetry(
        `https://${formattedStoreName}/admin/api/2024-01/smart_collections/count.json`,
        accessToken
      ),
    ]);

    const [customCount, smartCount] = await Promise.all([
      customCountResponse.json() as Promise<ShopifyCollectionCount>,
      smartCountResponse.json() as Promise<ShopifyCollectionCount>,
    ]);

    const totalCollections = customCount.count + smartCount.count;
    console.log("Total collections in store:", {
      custom: customCount.count,
      smart: smartCount.count,
      total: totalCollections,
    });

    // Fetch both types of collections
    const [customCollections, smartCollections] = await Promise.all([
      fetchCollectionsByType(formattedStoreName, accessToken, "custom"),
      fetchCollectionsByType(formattedStoreName, accessToken, "smart"),
    ]);

    const allCollections = [...customCollections, ...smartCollections];

    console.log("Fetching complete:", {
      customCollectionsFetched: customCollections.length,
      smartCollectionsFetched: smartCollections.length,
      totalCollectionsFetched: allCollections.length,
      expectedTotal: totalCollections,
    });

    // Sort collections by title for consistency
    allCollections.sort((a, b) => a.title.localeCompare(b.title));

    return NextResponse.json({
      collections: allCollections,
      total: allCollections.length,
      expectedTotal: totalCollections,
      breakdown: {
        custom: customCollections.length,
        smart: smartCollections.length,
      },
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
