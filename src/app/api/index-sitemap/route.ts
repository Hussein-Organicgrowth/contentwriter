import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";

interface SitemapUrl {
	loc: string;
}

interface SitemapEntry {
	loc: string;
}

interface StandardSitemap {
	urlset?: {
		url: SitemapUrl[] | SitemapUrl;
	};
}

interface SitemapIndex {
	sitemapindex?: {
		sitemap: SitemapEntry[] | SitemapEntry;
	};
}

type Sitemap = StandardSitemap & SitemapIndex;

interface IndexedPageData {
	url: string;
	h1: string | null;
	summary: string;
	toneOfVoice: string;
	status:
		| "Processed"
		| "Error fetching page"
		| "Error parsing page"
		| "Missing URL in sitemap entry";
	error?: string;
}

// Configuration options
const BATCH_SIZE = 100; // Process 100 URLs concurrently at a time
const MAX_URLS_TO_PROCESS = 4000; // Maximum number of URLs to process across all sitemaps
const ENABLE_SAMPLING = true; // Enable sampling for large datasets
const SAMPLING_RATE = 0.1; // 10% sampling rate for very large sitemaps (over MAX_URLS_TO_PROCESS)
const FETCH_TIMEOUT = 10000; // 10-second timeout for each page fetch

// Cache to store previously processed URLs (would be lost on server restart - use Redis or similar for production)
const processedUrlsCache = new Map<string, IndexedPageData>();

/**
 * Optimized page processing function that:
 * 1. Uses HEAD request first to check content type
 * 2. Only fetches HTML text content
 * 3. Uses a shorter timeout
 * 4. Optimizes Cheerio usage
 * 5. Utilizes caching
 */
async function processPage(pageUrl: string): Promise<IndexedPageData> {
	// Check cache first
	if (processedUrlsCache.has(pageUrl)) {
		console.log(`Using cached result for ${pageUrl}`);
		return processedUrlsCache.get(pageUrl)!;
	}

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

		// Try a HEAD request first to check if it's HTML and get content type
		try {
			const headResponse = await fetch(pageUrl, {
				method: "HEAD",
				headers: {
					"User-Agent": "SitemapIndexer/1.0 (Batch Processor)",
					Accept: "text/html",
				},
				signal: controller.signal,
			});

			if (!headResponse.ok) {
				clearTimeout(timeoutId);
				const result: IndexedPageData = {
					url: pageUrl,
					h1: null,
					summary: "N/A",
					toneOfVoice: "N/A",
					status: "Error fetching page",
					error: `HEAD request failed: ${headResponse.status} ${
						headResponse.statusText || ""
					}`,
				};
				processedUrlsCache.set(pageUrl, result);
				return result;
			}

			// Check content type - only proceed if it's HTML
			const contentType = headResponse.headers.get("content-type") || "";
			if (!contentType.includes("text/html")) {
				clearTimeout(timeoutId);
				const result: IndexedPageData = {
					url: pageUrl,
					h1: null,
					summary: `Not HTML content (${contentType})`,
					toneOfVoice: "N/A",
					status: "Processed",
					error: `Skipped non-HTML content: ${contentType}`,
				};
				processedUrlsCache.set(pageUrl, result);
				return result;
			}
		} catch (headError) {
			// If HEAD request fails, we'll still try a GET request
			console.warn(
				`HEAD request failed for ${pageUrl}, falling back to GET:`,
				headError
			);
		}

		// Fetch only the HTML content with optimized headers
		let pageResponse;
		try {
			pageResponse = await fetch(pageUrl, {
				headers: {
					"User-Agent": "SitemapIndexer/1.0 (Batch Processor)",
					Accept: "text/html",
					"Accept-Encoding": "gzip, deflate, br",
				},
				signal: controller.signal,
			});
		} finally {
			clearTimeout(timeoutId);
		}

		if (!pageResponse.ok) {
			const result: IndexedPageData = {
				url: pageUrl,
				h1: null,
				summary: "N/A",
				toneOfVoice: "N/A",
				status: "Error fetching page",
				error: `Status: ${pageResponse.status}${
					pageResponse.statusText ? ` - ${pageResponse.statusText}` : ""
				}`,
			};
			processedUrlsCache.set(pageUrl, result);
			return result;
		}

		const pageHtml = await pageResponse.text();

		// Use a more efficient Cheerio loading strategy
		// We're only extracting H1, so we can use a simpler Cheerio loading with minimal options
		const $ = cheerio.load(pageHtml, { xmlMode: false });
		const h1 = $("h1").first().text().trim() || null;

		// --- Placeholder for AI-driven summary and tone of voice analysis ---
		// For speed optimization, this is using very basic placeholder data
		const summary = `Content from ${pageUrl}`;
		const toneOfVoice = "Not analyzed";
		// --- End of placeholder ---

		const result: IndexedPageData = {
			url: pageUrl,
			h1,
			summary,
			toneOfVoice,
			status: "Processed",
		};

		// Store in cache
		processedUrlsCache.set(pageUrl, result);
		return result;
	} catch (error: any) {
		console.error(
			`Error processing page ${pageUrl}:`,
			error.name,
			error.message
		);
		let statusType: IndexedPageData["status"] = "Error parsing page";
		if (error.name === "AbortError") {
			statusType = "Error fetching page"; // More specific for timeouts
		}
		const result: IndexedPageData = {
			url: pageUrl,
			h1: null,
			summary: "N/A",
			toneOfVoice: "N/A",
			status: statusType,
			error: error.message,
		};
		processedUrlsCache.set(pageUrl, result);
		return result;
	}
}

/**
 * Applies a sampling strategy to a list of URLs if it's too large
 */
function applyUrlSampling(urls: string[]): string[] {
	if (!ENABLE_SAMPLING || urls.length <= MAX_URLS_TO_PROCESS) {
		// If under the limit or sampling disabled, return all URLs (up to MAX_URLS_TO_PROCESS)
		return urls.slice(0, MAX_URLS_TO_PROCESS);
	}

	console.log(
		`Applying ${SAMPLING_RATE * 100}% sampling to ${urls.length} URLs`
	);

	// For very large sets, return a representative sample
	const sampled: string[] = [];
	const step = Math.round(1 / SAMPLING_RATE);

	for (
		let i = 0;
		i < urls.length && sampled.length < MAX_URLS_TO_PROCESS;
		i += step
	) {
		sampled.push(urls[i]);
	}

	console.log(`Sampled ${sampled.length} URLs from ${urls.length} total`);
	return sampled;
}

async function fetchAndParseSitemap(
	sitemapUrl: string
): Promise<{ urls: string[]; isSitemapIndex: boolean }> {
	console.log(`Fetching sitemap from: ${sitemapUrl}`);
	const sitemapResponseController = new AbortController();
	const sitemapTimeoutId = setTimeout(
		() => sitemapResponseController.abort(),
		20000
	);

	try {
		const sitemapResponse = await fetch(sitemapUrl, {
			headers: {
				"User-Agent": "SitemapIndexer/1.0 (Batch Processor)",
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
			isArray: (name) => ["url", "sitemap"].includes(name), // Force these elements to always be arrays
		});

		const parsedSitemap: Sitemap = parser.parse(sitemapXml);

		// Check if it's a sitemap index
		if (parsedSitemap.sitemapindex && parsedSitemap.sitemapindex.sitemap) {
			console.log("Detected a sitemap index");
			const sitemaps = parsedSitemap.sitemapindex.sitemap as SitemapEntry[];
			const sitemapUrls = sitemaps.map((sitemap: SitemapEntry) => sitemap.loc);
			return { urls: sitemapUrls, isSitemapIndex: true };
		}

		// It's a standard sitemap
		if (parsedSitemap.urlset && parsedSitemap.urlset.url) {
			console.log("Detected a standard sitemap");
			const urls = (parsedSitemap.urlset.url as SitemapUrl[]).map(
				(url: SitemapUrl) => url.loc
			);
			return { urls, isSitemapIndex: false };
		}

		console.warn("Invalid sitemap structure:", parsedSitemap);
		throw new Error(
			"Invalid sitemap structure. Missing urlset/url or sitemapindex/sitemap."
		);
	} finally {
		clearTimeout(sitemapTimeoutId);
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { sitemapUrl, sampleSize } = body;

		// Allow custom sample size from the request if provided
		const effectiveSamplingRate = sampleSize
			? parseInt(sampleSize) / 100
			: SAMPLING_RATE;

		if (!sitemapUrl) {
			return NextResponse.json(
				{ error: "sitemapUrl is required" },
				{ status: 400 }
			);
		}

		console.log(`Starting sitemap processing for: ${sitemapUrl}`);

		// Step 1: Fetch the main sitemap
		let pageUrls: string[] = [];

		try {
			const { urls, isSitemapIndex } = await fetchAndParseSitemap(sitemapUrl);

			// If it's a sitemap index, fetch each of the linked sitemaps
			if (isSitemapIndex) {
				console.log(`Found ${urls.length} sitemaps in the sitemap index`);

				// Process each sitemap in the index (in batches to avoid overwhelming the server)
				// Increased sitemap batch size from 5 to 10 for faster processing
				for (let i = 0; i < urls.length; i += 10) {
					const batchSitemapUrls = urls.slice(i, i + 10);
					console.log(
						`Processing sitemap batch ${Math.floor(i / 10) + 1} of ${Math.ceil(
							urls.length / 10
						)}`
					);

					const sitemapResultsPromises = batchSitemapUrls.map(
						async (subSitemapUrl) => {
							try {
								const { urls: subUrls } = await fetchAndParseSitemap(
									subSitemapUrl
								);
								return subUrls;
							} catch (error) {
								console.error(
									`Error processing sub-sitemap ${subSitemapUrl}:`,
									error
								);
								return []; // Return empty array if the sub-sitemap couldn't be processed
							}
						}
					);

					const batchResults = await Promise.all(sitemapResultsPromises);
					batchResults.forEach((urls) => pageUrls.push(...urls));

					// Early sampling check - if we already have a lot of URLs, apply sampling
					if (pageUrls.length > MAX_URLS_TO_PROCESS * 2) {
						console.log(
							`Already collected ${pageUrls.length} URLs, applying early sampling`
						);
						pageUrls = applyUrlSampling(pageUrls);
					}
				}
			} else {
				// It's a standard sitemap, use the URLs directly
				pageUrls = urls;
			}
		} catch (error: any) {
			console.error("Error fetching/parsing sitemap:", error);
			return NextResponse.json(
				{ error: "Error processing sitemap", details: error.message },
				{ status: 500 }
			);
		}

		// Apply sampling to the collected URLs if needed
		if (pageUrls.length > MAX_URLS_TO_PROCESS) {
			pageUrls = applyUrlSampling(pageUrls);
		}

		console.log(`Processing ${pageUrls.length} URLs`);

		if (pageUrls.length === 0) {
			return NextResponse.json(
				{ error: "No valid URLs found in the sitemap" },
				{ status: 400 }
			);
		}

		const allProcessedPages: IndexedPageData[] = [];
		const totalBatches = Math.ceil(pageUrls.length / BATCH_SIZE);

		// Process page URLs in batches
		for (let i = 0; i < pageUrls.length; i += BATCH_SIZE) {
			const batchUrls = pageUrls.slice(i, i + BATCH_SIZE);
			const currentBatch = Math.floor(i / BATCH_SIZE) + 1;

			console.log(
				`Processing page batch ${currentBatch} of ${totalBatches}, size: ${batchUrls.length}`
			);

			const pageProcessingPromises: Promise<IndexedPageData>[] = batchUrls.map(
				(pageUrl) => {
					if (!pageUrl) {
						console.warn("Malformed URL found:", pageUrl);
						return Promise.resolve({
							url: pageUrl || "Unknown URL - Malformed Entry",
							h1: null,
							summary: "N/A",
							toneOfVoice: "N/A",
							status: "Missing URL in sitemap entry",
							error: "URL was malformed or empty",
						} as IndexedPageData);
					}
					return processPage(pageUrl);
				}
			);

			const batchResults = await Promise.all(pageProcessingPromises);
			allProcessedPages.push(...batchResults);

			// Progress tracking statistics
			const processedCount = allProcessedPages.length;
			const successCount = allProcessedPages.filter(
				(p) => p.status === "Processed"
			).length;
			const errorCount = processedCount - successCount;

			console.log(
				`Batch ${currentBatch}/${totalBatches} completed. Progress: ${processedCount}/${
					pageUrls.length
				} URLs (${Math.round(
					(processedCount / pageUrls.length) * 100
				)}%). Success: ${successCount}, Errors: ${errorCount}`
			);
		}

		// Final statistics
		const finalSuccessCount = allProcessedPages.filter(
			(p) => p.status === "Processed"
		).length;
		const finalErrorCount = allProcessedPages.length - finalSuccessCount;

		console.log(
			`Sitemap processing completed. Total pages processed: ${allProcessedPages.length}. Success: ${finalSuccessCount}, Errors: ${finalErrorCount}`
		);

		return NextResponse.json(
			{
				pages: allProcessedPages,
				stats: {
					total: allProcessedPages.length,
					success: finalSuccessCount,
					errors: finalErrorCount,
					originalUrlCount: pageUrls.length,
					sampled: ENABLE_SAMPLING && pageUrls.length < MAX_URLS_TO_PROCESS,
				},
			},
			{ status: 200 }
		);
	} catch (error: any) {
		console.error(
			"General error in POST /api/index-sitemap:",
			error.name,
			error.message,
			error.stack
		);
		return NextResponse.json(
			{ error: "An unexpected error occurred", details: error.message },
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
