import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website, PlatformConfig } from "@/models/Website";
import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CACHE_KEY_PREFIX = "shopify:products:";
const CACHE_DURATION = 3600; // 1 hour

interface ShopifyProduct {
  id: string;
  title: string;
  body_html: string;
  vendor: string;
  status: string;
  images: { src: string }[];
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface GraphQLResponse {
  data: {
    products: {
      pageInfo: PageInfo;
      edges: Array<{
        node: {
          id: string;
          title: string;
          bodyHtml: string;
          vendor: string;
          status: string;
          images: {
            edges: Array<{
              node: {
                url: string;
              };
            }>;
          };
        };
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

// Optimized GraphQL query with only necessary fields
const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: ID) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          bodyHtml
          vendor
          status
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
        }
      }
    }
  }
`;

function parseRateLimit(headers: Headers): RateLimitInfo {
  const limit = headers.get("X-Shopify-Shop-Api-Call-Limit");
  const [current, max] = limit ? limit.split("/").map(Number) : [0, 0];
  const reset = Number(headers.get("X-Shopify-Shop-Api-Call-Reset") || 0);

  return {
    limit: max,
    remaining: max - current,
    reset,
  };
}

async function fetchWithRetry(
  url: string,
  headers: HeadersInit,
  retryCount = 0,
  options?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(url, { ...options, headers });
    const rateLimit = parseRateLimit(response.headers);

    if (rateLimit.remaining < 5) {
      const waitTime = rateLimit.reset * 1000 - Date.now();
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return fetchWithRetry(url, headers, retryCount, options);
      }
    }

    if (response.status === 429 && retryCount < 3) {
      const retryAfter = response.headers.get("Retry-After");
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : 1000 * Math.pow(2, retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, headers, retryCount + 1, options);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorBody}`
      );
    }

    return response;
  } catch (error) {
    if (retryCount < 3) {
      const delay = 1000 * Math.pow(2, retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, headers, retryCount + 1, options);
    }
    throw error;
  }
}

async function fetchProductsBatch(
  storeName: string,
  accessToken: string,
  cursor: string | null
): Promise<{ products: ShopifyProduct[]; pageInfo: PageInfo }> {
  const headers = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };

  // Always request 250 products, regardless of the total count
  const variables = {
    first: 250, // Always fetch maximum allowed
    after: cursor,
  };

  console.log("Fetching products batch:", {
    storeName,
    cursor,
    requestedSize: variables.first,
  });

  const response = await fetchWithRetry(
    `https://${storeName}/admin/api/2024-01/graphql.json`,
    headers,
    0,
    {
      method: "POST",
      body: JSON.stringify({
        query: PRODUCTS_QUERY,
        variables,
      }),
    }
  );

  const data = (await response.json()) as GraphQLResponse;

  if (data.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(data.errors)}`);
  }

  const products = data.data.products.edges.map((edge) => ({
    id: edge.node.id,
    title: edge.node.title,
    body_html: edge.node.bodyHtml,
    vendor: edge.node.vendor,
    status: edge.node.status,
    images: edge.node.images.edges.map((img) => ({
      src: img.node.url,
    })),
  }));

  console.log("Fetched products batch:", {
    productsCount: products.length,
    hasNextPage: data.data.products.pageInfo.hasNextPage,
    endCursor: data.data.products.pageInfo.endCursor,
  });

  return {
    products,
    pageInfo: data.data.products.pageInfo,
  };
}

async function fetchProductsInParallel(
  storeName: string,
  accessToken: string,
  cursor: string | null
): Promise<{ products: ShopifyProduct[]; pageInfo: PageInfo }> {
  // Always fetch 250 products
  const result = await fetchProductsBatch(storeName, accessToken, cursor);

  return {
    products: result.products,
    pageInfo: result.pageInfo,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");
    const cursor = searchParams.get("cursor");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "250"),
      250
    );

    if (!company) {
      return NextResponse.json(
        { error: "Company parameter is required" },
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

    if (
      !shopifyIntegration?.credentials?.storeName ||
      !shopifyIntegration?.credentials?.accessToken
    ) {
      return NextResponse.json(
        { error: "Shopify integration not properly configured" },
        { status: 400 }
      );
    }

    const { storeName, accessToken } = shopifyIntegration.credentials;

    // Fetch total count first to determine if we should use caching
    const countResponse = await fetchWithRetry(
      `https://${storeName}/admin/api/2024-01/products/count.json`,
      {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      }
    );

    const { count: totalProducts } = await countResponse.json();

    // Only use caching if we have more than 1000 products
    const shouldUseCache = totalProducts > 1000;

    if (shouldUseCache) {
      // Check cache first
      const cacheKey = `${CACHE_KEY_PREFIX}${company}:${
        cursor || "initial"
      }:${pageSize}`;
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        // Start background revalidation if cache is older than 30 minutes
        const cacheAge = await redis.ttl(cacheKey);
        if (cacheAge < CACHE_DURATION - 1800) {
          // Trigger background revalidation
          revalidateCache(company, cursor, pageSize).catch(console.error);
        }

        return NextResponse.json(cachedData, {
          headers: {
            "Cache-Control":
              "public, s-maxage=3600, stale-while-revalidate=7200",
          },
        });
      }
    }

    // Fetch products using parallel processing
    const { products, pageInfo } = await fetchProductsInParallel(
      storeName,
      accessToken,
      cursor
    );

    const response = {
      products,
      total: totalProducts,
      pagination: {
        hasNextPage: pageInfo.hasNextPage,
        endCursor: pageInfo.endCursor,
      },
      progress: {
        current: products.length,
        total: totalProducts,
        percentage: (products.length / totalProducts) * 100,
      },
    };

    // Only cache if we have more than 1000 products
    if (shouldUseCache) {
      const cacheKey = `${CACHE_KEY_PREFIX}${company}:${
        cursor || "initial"
      }:${pageSize}`;
      await redis.set(cacheKey, response, { ex: CACHE_DURATION });
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": shouldUseCache
          ? "public, s-maxage=3600, stale-while-revalidate=7200"
          : "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/platform/shopify/products:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status =
      error instanceof Error && error.message.includes("status: 401")
        ? 401
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

// Background revalidation function
async function revalidateCache(
  company: string,
  cursor: string | null,
  pageSize: number
) {
  try {
    // Check if we should still use caching
    const countResponse = await fetch(
      `/api/platform/shopify/products/count?company=${company}`
    );
    const { count: totalProducts } = await countResponse.json();

    if (totalProducts <= 1000) {
      return; // Don't revalidate if we have 1000 or fewer products
    }

    const cacheKey = `${CACHE_KEY_PREFIX}${company}:${
      cursor || "initial"
    }:${pageSize}`;
    const response = await fetch(
      `/api/platform/shopify/products?company=${company}&cursor=${
        cursor || ""
      }&pageSize=${pageSize}`
    );
    const data = await response.json();
    await redis.set(cacheKey, data, { ex: CACHE_DURATION });
  } catch (error) {
    console.error("Error revalidating cache:", error);
  }
}
