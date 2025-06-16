import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import connectToDatabase from "@/lib/mongodb"; // Import DB connection utility
import { Website } from "@/models/Website"; // Import Website model

// Define a type for the loc field which can be a string or an object from the parser
interface LocValue {
  "#text"?: string; // Standard field for text content when attributes are present
  [key: string]: unknown; // Allow for other attributes, using unknown for better type safety than any
}

interface SitemapUrl {
  loc: string | LocValue; // loc can be a string or an object
  // Potentially other sitemap tags like lastmod, changefreq, etc., could be added here
}

interface SitemapEntry {
  loc: string | LocValue; // loc can be a string or an object
}

interface StandardSitemap {
  urlset?: {
    url: SitemapUrl[] | SitemapUrl; // Parser might return single object or array
  };
}

interface SitemapIndex {
  sitemapindex?: {
    sitemap: SitemapEntry[] | SitemapEntry; // Parser might return single object or array
  };
}

type Sitemap = StandardSitemap & SitemapIndex;

// Configuration options
const MAX_URLS_TO_PROCESS = 25000; // Maximum number of URLs to extract and return
const SITEMAP_INDEX_BATCH_SIZE = 20; // Batch size for processing sitemaps within a sitemap index

/**
 * Extracts the string value from a loc field, which might be a string or an object.
 */
function extractLocString(
  locField: string | LocValue | undefined
): string | null {
  if (typeof locField === "string") {
    return locField.trim();
  }
  if (
    typeof locField === "object" &&
    locField !== null &&
    typeof locField["#text"] === "string"
  ) {
    return locField["#text"].trim();
  }
  return null;
}

/**
 * Caps the URL list to MAX_URLS_TO_PROCESS.
 */
function applyUrlSampling(urls: string[]): string[] {
  if (urls.length > MAX_URLS_TO_PROCESS) {
    console.log(
      `Capping URL list from ${urls.length} to ${MAX_URLS_TO_PROCESS} URLs.`
    );
    return urls.slice(0, MAX_URLS_TO_PROCESS);
  }
  return urls;
}

async function fetchAndParseSitemap(
  sitemapUrl: string
): Promise<{ urls: string[]; isSitemapIndex: boolean }> {
  console.log(`Fetching sitemap from: ${sitemapUrl}`);
  const sitemapResponseController = new AbortController();
  const sitemapTimeoutId = setTimeout(
    () => sitemapResponseController.abort(),
    20000 // Sitemap fetch timeout remains
  );

  try {
    const sitemapResponse = await fetch(sitemapUrl, {
      headers: {
        "User-Agent": "SitemapUrlExtractor/1.0", // Updated User-Agent
        Accept: "text/xml, application/xml",
      },
      signal: sitemapResponseController.signal,
    });

    if (!sitemapResponse.ok) {
      console.error(`Failed to fetch sitemap: ${sitemapResponse.status}`);
      throw new Error(
        `Failed to fetch sitemap. Status: ${sitemapResponse.status}`
      );
    }

    const sitemapXml = await sitemapResponse.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      isArray: (name) => ["url", "sitemap"].includes(name),
      trimValues: true,
    });

    const parsedSitemap: Sitemap = parser.parse(sitemapXml);
    let extractedUrls: string[] = [];
    let isIndex = false;

    if (parsedSitemap.sitemapindex && parsedSitemap.sitemapindex.sitemap) {
      console.log("Detected a sitemap index");
      isIndex = true;
      const sitemapNodesRaw = parsedSitemap.sitemapindex.sitemap;
      const sitemapNodesArray = Array.isArray(sitemapNodesRaw)
        ? sitemapNodesRaw
        : [sitemapNodesRaw];
      extractedUrls = sitemapNodesArray
        .map((sitemapNode: SitemapEntry) => extractLocString(sitemapNode.loc))
        .filter(
          (loc: string | null): loc is string => loc !== null && loc !== ""
        );
    } else if (parsedSitemap.urlset && parsedSitemap.urlset.url) {
      console.log("Detected a standard sitemap");
      const urlNodesRaw = parsedSitemap.urlset.url;
      const urlNodesArray = Array.isArray(urlNodesRaw)
        ? urlNodesRaw
        : [urlNodesRaw];
      extractedUrls = urlNodesArray
        .map((urlNode: SitemapUrl) => extractLocString(urlNode.loc))
        .filter(
          (loc: string | null): loc is string => loc !== null && loc !== ""
        );
    } else {
      console.warn("Invalid sitemap structure:", parsedSitemap);
      throw new Error(
        "Invalid sitemap structure. Missing urlset/url or sitemapindex/sitemap."
      );
    }
    return { urls: extractedUrls, isSitemapIndex: isIndex };
  } finally {
    clearTimeout(sitemapTimeoutId);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sitemapUrl, websiteId } = body;

    if (!sitemapUrl) {
      return NextResponse.json(
        { error: "sitemapUrl is required" },
        { status: 400 }
      );
    }
    if (!websiteId) {
      return NextResponse.json(
        { error: "websiteId is required" },
        { status: 400 }
      );
    }

    console.log(
      `Starting URL extraction for: ${sitemapUrl}, websiteId: ${websiteId}`
    );

    let allDiscoveredUrls: string[] = [];

    try {
      const { urls: rootSitemapUrls, isSitemapIndex } =
        await fetchAndParseSitemap(sitemapUrl);

      if (isSitemapIndex) {
        console.log(
          `Found ${rootSitemapUrls.length} sitemaps in the sitemap index`
        );
        allDiscoveredUrls.push(...rootSitemapUrls);

        const processedSubSitemapUrls: string[] = [];
        for (
          let i = 0;
          i < allDiscoveredUrls.length &&
          processedSubSitemapUrls.length < MAX_URLS_TO_PROCESS;
          i += SITEMAP_INDEX_BATCH_SIZE
        ) {
          const batchSubSitemapLocs = allDiscoveredUrls.slice(
            i,
            i + SITEMAP_INDEX_BATCH_SIZE
          );
          console.log(
            `Processing sitemap index batch ${
              Math.floor(i / SITEMAP_INDEX_BATCH_SIZE) + 1
            } of ${Math.ceil(
              allDiscoveredUrls.length / SITEMAP_INDEX_BATCH_SIZE
            )}`
          );

          const sitemapResultsPromises = batchSubSitemapLocs.map(
            async (subSitemapLoc) => {
              try {
                const { urls: subUrls } = await fetchAndParseSitemap(
                  subSitemapLoc
                );
                return subUrls;
              } catch (error) {
                console.error(
                  `Error processing sub-sitemap ${subSitemapLoc}:`,
                  error
                );
                return [];
              }
            }
          );
          const batchResults = await Promise.all(sitemapResultsPromises);
          batchResults.forEach((urlsFromSub) =>
            processedSubSitemapUrls.push(...urlsFromSub)
          );

          if (processedSubSitemapUrls.length >= MAX_URLS_TO_PROCESS) {
            console.log("Reached MAX_URLS_TO_PROCESS processing sub-sitemaps.");
            break;
          }
        }
        allDiscoveredUrls = processedSubSitemapUrls;
      } else {
        allDiscoveredUrls = rootSitemapUrls;
      }
    } catch (error: unknown) {
      console.error("Error fetching/parsing sitemap:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during sitemap processing";
      return NextResponse.json(
        { error: "Error processing sitemap", details: message },
        { status: 500 }
      );
    }

    const discoveredUrlCount = allDiscoveredUrls.length;
    const finalUrls = applyUrlSampling(allDiscoveredUrls);

    console.log(
      `URL extraction completed. Discovered: ${discoveredUrlCount}, Returned: ${finalUrls.length}`
    );

    // --- Save to Database ---
    try {
      await connectToDatabase();
      const website = await Website.findById(websiteId);

      if (!website) {
        console.error(`Website not found with ID: ${websiteId}`);
        return NextResponse.json(
          {
            error: "Website not found",
            details: `No website found with ID ${websiteId}`,
          },
          { status: 404 }
        );
      }

      website.sitemapUrls = finalUrls;
      await website.save();
      console.log(`Sitemap URLs saved for websiteId: ${websiteId}`);
    } catch (dbError: unknown) {
      console.error("Database error while saving sitemap URLs:", dbError);
      const message =
        dbError instanceof Error
          ? dbError.message
          : "Failed to save sitemap URLs to database";
      // Decide if you want to return an error to the client if DB save fails,
      // or if the URL extraction is still considered a success.
      // For now, let's return an error specific to the DB operation.
      return NextResponse.json(
        {
          error: "Failed to save sitemap URLs",
          details: message,
          // Optionally, still return the URLs if extraction was successful
          // urls: finalUrls,
          // stats: { discoveredUrlCount, returnedUrlCount, capped: discoveredUrlCount > finalUrls.length }
        },
        { status: 500 }
      );
    }
    // --- End Save to Database ---

    if (finalUrls.length === 0 && discoveredUrlCount === 0) {
      return NextResponse.json(
        { error: "No valid URLs found in the sitemap(s)." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: "Sitemap URLs extracted and saved successfully.",
        urls: finalUrls,
        stats: {
          discoveredUrlCount: discoveredUrlCount,
          returnedUrlCount: finalUrls.length,
          capped: discoveredUrlCount > finalUrls.length,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "General error in POST /api/index-sitemap:",
      error instanceof Error ? error.name : "UnknownError",
      error instanceof Error ? error.message : "Unknown error message",
      error instanceof Error ? error.stack : "No stack available"
    );
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: "An unexpected error occurred", details: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "This endpoint expects a POST request with a sitemapUrl." },
    { status: 405 }
  );
}
