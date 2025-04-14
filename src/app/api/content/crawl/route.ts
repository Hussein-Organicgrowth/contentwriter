import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import axios from "axios";

export async function POST(req: Request) {
	try {
		const { url, mainKeyword } = await req.json();

		if (!url) {
			return NextResponse.json({ error: "URL is required" }, { status: 400 });
		}

		// Fetch the webpage content
		const response = await axios.get(url);
		const html = response.data;
		const $ = cheerio.load(html);

		// Remove unwanted elements
		$("script").remove();
		$("style").remove();
		$("nav").remove();
		$("header").remove();
		$("footer").remove();
		$("iframe").remove();
		$("noscript").remove();
		$("meta").remove();
		$("link").remove();

		// Extract main content with formatting
		let content = "";

		// Try to find the main content area
		const mainContent = $(
			"main, article, .content, #content, .main-content, #main-content"
		);

		if (mainContent.length > 0) {
			// Preserve HTML structure but clean it up
			content = mainContent
				.find("p, h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote")
				.map((_, el) => {
					const $el = $(el);
					// Clean up any inline styles
					$el.removeAttr("style");
					$el.removeAttr("class");
					return $el.toString();
				})
				.get()
				.join("\n");
		} else {
			// Fallback to body content
			content = $("body")
				.find("p, h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote")
				.map((_, el) => {
					const $el = $(el);
					// Clean up any inline styles
					$el.removeAttr("style");
					$el.removeAttr("class");
					return $el.toString();
				})
				.get()
				.join("\n");
		}

		// If we have a main keyword, try to focus on relevant sections
		if (mainKeyword) {
			const $temp = cheerio.load(content);
			const elements = $temp(
				"p, h1, h2, h3, h4, h5, h6, ul, ol, li, blockquote"
			);

			const relevantElements = elements
				.filter((_, el) => {
					const text = $(el).text().toLowerCase();
					return text.includes(mainKeyword.toLowerCase());
				})
				.map((_, el) => $(el).toString())
				.get();

			if (relevantElements.length > 0) {
				content = relevantElements.join("\n");
			}
		}

		// Clean up the content while preserving structure
		content = content
			.replace(/\n{3,}/g, "\n\n") // Replace multiple newlines with double newlines
			.trim();

		return NextResponse.json({ content });
	} catch (error) {
		console.error("Error crawling website:", error);
		return NextResponse.json(
			{ error: "Failed to crawl website" },
			{ status: 500 }
		);
	}
}
