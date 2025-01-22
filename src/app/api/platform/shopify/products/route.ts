import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website, PlatformConfig } from "@/models/Website";

interface ShopifyProduct {
	id: string;
	title: string;
	body_html: string;
	vendor: string;
	status: string;
	images: { src: string }[];
}

interface ShopifyProductCount {
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

		// First, get the total count of products
		const countResponse = await fetch(
			`https://${formattedStoreName}/admin/api/2024-01/products/count.json`,
			{
				headers: {
					"X-Shopify-Access-Token": accessToken,
					"Content-Type": "application/json",
				},
			}
		);

		if (!countResponse.ok) {
			throw new Error("Failed to fetch product count");
		}

		const { count: totalProducts } =
			(await countResponse.json()) as ShopifyProductCount;
		console.log("Total products in store:", totalProducts);

		// Call Shopify API to get products with pagination
		let allProducts: ShopifyProduct[] = [];
		let hasNextPage = true;
		let nextPageUrl = `https://${formattedStoreName}/admin/api/2024-10/products.json?limit=250`;
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
				throw new Error(`Failed to fetch products from Shopify: ${errorText}`);
			}

			const responseData = await shopifyResponse.json();

			// Log progress
			console.log("Progress:", {
				page: pageCount,
				productsReceived: responseData.products?.length || 0,
				totalProductsFetched:
					allProducts.length + (responseData.products?.length || 0),
				totalProducts,
				rateLimit: shopifyResponse.headers.get("X-Shopify-Shop-Api-Call-Limit"),
			});

			if (!responseData.products) {
				console.error("Unexpected response format:", responseData);
				throw new Error("Unexpected response format from Shopify API");
			}

			allProducts = allProducts.concat(responseData.products);

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
			totalProductsFetched: allProducts.length,
			expectedTotal: totalProducts,
		});

		// Sort products by title for consistency
		allProducts.sort((a, b) => a.title.localeCompare(b.title));

		return NextResponse.json({
			products: allProducts,
			total: allProducts.length,
			totalPages: pageCount,
		});
	} catch (error: unknown) {
		console.error("Error fetching Shopify products:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 }
		);
	}
}
