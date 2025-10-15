import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website, PlatformConfig } from "@/models/Website";

// In-memory cache for product data
interface CacheEntry {
  data: ProductsResponse;
  timestamp: number;
  cursor?: string;
}

interface ProductsResponse {
  products: ShopifyProduct[];
  total: number;
  pagination: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
}

const productCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(company: string, cursor?: string | null): string {
  return `${company}:${cursor || "initial"}`;
}

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_DURATION;
}

function getCachedData(
  company: string,
  cursor?: string | null
): ProductsResponse | null {
  const key = getCacheKey(company, cursor);
  const entry = productCache.get(key);

  if (entry && isCacheValid(entry)) {
    console.log(`Cache hit for ${key}`);
    return entry.data;
  }

  console.log(`Cache miss for ${key}`);
  return null;
}

function setCachedData(
  company: string,
  cursor: string | null,
  data: ProductsResponse
): void {
  const key = getCacheKey(company, cursor);
  productCache.set(key, {
    data,
    timestamp: Date.now(),
    cursor: cursor || undefined,
  });

  // Clean up old cache entries (keep only last 10 entries per company)
  const companyKeys = Array.from(productCache.keys()).filter((k) =>
    k.startsWith(company)
  );
  if (companyKeys.length > 10) {
    const sortedKeys = companyKeys.sort((a, b) => {
      const entryA = productCache.get(a)!;
      const entryB = productCache.get(b)!;
      return entryA.timestamp - entryB.timestamp;
    });

    // Remove oldest entries
    for (let i = 0; i < sortedKeys.length - 10; i++) {
      productCache.delete(sortedKeys[i]);
    }
  }
}

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
          seo {
            title
            description
          }
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

  console.log("GraphQL Response debug:", {
    hasErrors: !!data.errors,
    errors: data.errors,
    hasData: !!data.data,
    productsCount: data.data?.products?.edges?.length || 0,
    pageInfo: data.data?.products?.pageInfo,
  });

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
    seoTitle: (edge.node as { seo?: { title?: string } }).seo?.title || "",
    seoDescription:
      (edge.node as { seo?: { description?: string } }).seo?.description || "",
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
): Promise<{
  products: ShopifyProduct[];
  pageInfo: PageInfo;
  totalFetched: number;
}> {
  // For now, simplify to single batch fetching to avoid complexity
  // The parallel logic was causing issues and Shopify's cursor-based pagination
  // doesn't really benefit from parallel requests for subsequent pages
  console.log("Fetching products batch with cursor:", cursor);

  const result = await fetchProductsBatch(storeName, accessToken, cursor);

  return {
    products: result.products,
    pageInfo: result.pageInfo,
    totalFetched: result.products.length,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");
    const cursor = searchParams.get("cursor");
    // pageSize parameter for future use
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "250"),
      250
    );
    console.log("Page size requested:", pageSize);
    const bypassCache = searchParams.get("bypassCache") === "true";

    if (!company) {
      return NextResponse.json(
        { error: "Company parameter is required" },
        { status: 400 }
      );
    }

    // Check cache first (unless bypassing)
    if (!bypassCache) {
      const cachedData = getCachedData(company, cursor);
      if (cachedData) {
        return NextResponse.json(cachedData, {
          headers: {
            "Cache-Control": "no-store",
            "X-Cache": "HIT",
          },
        });
      }
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

    // Fetch products using single batch processing
    const { products, pageInfo, totalFetched } = await fetchProductsInParallel(
      storeName,
      accessToken,
      cursor
    );

    // Calculate cumulative progress if cursor is provided
    const currentProgress = cursor
      ? Math.min(totalProducts, totalFetched)
      : totalFetched;

    const response = {
      products,
      total: totalProducts,
      pagination: {
        hasNextPage: pageInfo.hasNextPage,
        endCursor: pageInfo.endCursor,
      },
      progress: {
        current: currentProgress,
        total: totalProducts,
        percentage: Math.min(100, (currentProgress / totalProducts) * 100),
      },
    };

    console.log("API Response debug:", {
      company,
      cursor,
      productsCount: products.length,
      totalProducts,
      hasNextPage: pageInfo.hasNextPage,
      endCursor: pageInfo.endCursor,
      currentProgress,
      responseSize: JSON.stringify(response).length,
    });

    // Cache the response
    setCachedData(company, cursor, response);

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store",
        "X-Cache": "MISS",
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
