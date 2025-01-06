import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: Request) {
	try {
		const { url } = await req.json();

		if (!url) {
			return NextResponse.json({ error: "URL is required" }, { status: 400 });
		}

		// Fetch the webpage content
		const response = await fetch(url);
		const html = await response.text();

		// Parse HTML and extract main content
		const $ = cheerio.load(html);

		// Remove unwanted elements
		$("script").remove();
		$("style").remove();
		$("nav").remove();
		$("header").remove();
		$("footer").remove();
		$("iframe").remove();
		$("noscript").remove();
		$("svg").remove();
		$(".cookie-banner").remove();
		$("[class*='cookie']").remove();
		$("[class*='popup']").remove();
		$("[class*='modal']").remove();

		// Find the main content container
		let mainContent = $(
			"article, main, .content, .main-content, #content, #main-content, .post-content, .entry-content"
		).first();

		// If no specific content container found, use body
		if (!mainContent.length) {
			mainContent = $("body");
		}

		// Process the content
		let processedHtml = "";

		// Process headings
		mainContent.find("h1, h2, h3, h4, h5, h6").each((_, elem) => {
			// Convert all headings to h2 or h3
			const level = $(elem).get(0).tagName.toLowerCase() === "h1" ? "h2" : "h3";
			$(elem).replaceWith(`<${level}>${$(elem).text()}</${level}>`);
		});

		// Process paragraphs and divs
		mainContent.find("div, p").each((_, elem) => {
			const $elem = $(elem);
			const text = $elem.text().trim();
			if (text) {
				// Convert divs to paragraphs
				processedHtml += `<p>${text}</p>\n`;
			}
		});

		// Process lists
		mainContent.find("ul, ol").each((_, elem) => {
			const $elem = $(elem);
			const listType = elem.tagName.toLowerCase();
			processedHtml += `<${listType}>\n`;
			$elem.find("li").each((_, li) => {
				processedHtml += `  <li>${$(li).text().trim()}</li>\n`;
			});
			processedHtml += `</${listType}>\n`;
		});

		// Clean up the processed HTML
		processedHtml = processedHtml
			.replace(/\n\s*\n/g, "\n") // Remove extra line breaks
			.replace(/<p>\s*<\/p>/g, "") // Remove empty paragraphs
			.trim();

		// Ensure content starts with a paragraph if no other tag
		if (!processedHtml.startsWith("<")) {
			processedHtml = `<p>${processedHtml}</p>`;
		}

		return NextResponse.json({
			content: processedHtml,
			contentType: "html",
		});
	} catch (error) {
		console.error("Error fetching URL:", error);
		return NextResponse.json(
			{ error: "Failed to fetch content from URL" },
			{ status: 500 }
		);
	}
}
