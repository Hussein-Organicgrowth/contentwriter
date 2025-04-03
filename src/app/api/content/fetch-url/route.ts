import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    console.log("Fetching content from URL:", url);

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Fetch the webpage content
    const response = await fetch(url);
    const html = await response.text();
    console.log("Received HTML content length:", html.length);

    // Parse HTML and extract main content
    const $ = cheerio.load(html);

    // First, let's find the main content container
    console.log("Looking for main content container...");
    let mainContent = $(
      "article, main, .content, .main-content, #content, #main-content, .post-content, .entry-content, .article-content, .blog-post, .article, .post, .main, .content-wrapper, .content-area, .site-content, .page-content, .tax-content, .post-body, .post-content, .entry, .post-entry, .post-body-content, .post-inner, .post-main, .post-text, .post-body-text, .post-content-text, .post-entry-content, .post-body-entry, .post-content-entry, .post-text-content, .post-entry-text, .post-body-text-content, .post-content-text-content, .post-entry-text-content"
    ).first();

    // If no specific content container found, use body
    if (!mainContent.length) {
      console.log("No specific content container found, using body");
      mainContent = $("body");
    } else {
      console.log("Found content container:", mainContent.prop("tagName"));
    }

    // Now, let's remove only the most problematic elements within the main content
    console.log("Removing problematic elements...");
    mainContent.find("script, style, iframe, noscript, svg").remove();
    mainContent
      .find(
        "[class*='cookie'], [class*='popup'], [class*='modal'], [class*='advertisement'], [class*='ad-'], [id*='ad-']"
      )
      .remove();
    mainContent
      .find(
        "[class*='social-share'], [class*='related-posts'], [class*='comments']"
      )
      .remove();
    mainContent.find("[class*='newsletter'], [class*='subscribe']").remove();

    // Process the content
    let processedHtml = "";

    // Function to process a single element
    const processElement = ($elem: cheerio.Cheerio) => {
      const tagName = $elem.prop("tagName")?.toLowerCase() || "";
      const text = $elem.text().trim();

      if (!text) return "";

      // Handle headings
      if (tagName.match(/^h[1-6]$/)) {
        const level = parseInt(tagName[1]);
        const newLevel = level === 1 ? 2 : Math.min(level + 1, 3);
        return `<h${newLevel}>${text}</h${newLevel}>\n`;
      }

      // Handle paragraphs and divs
      if (tagName === "p" || tagName === "div") {
        // Preserve original HTML structure for paragraphs and divs
        const html = $elem.html() || "";
        if (html.includes("<") && html.includes(">")) {
          // If the element contains HTML tags, preserve them
          return `<p>${html}</p>\n`;
        } else {
          // Otherwise, just use the text
          return `<p>${text}</p>\n`;
        }
      }

      // Handle lists
      if (tagName === "ul" || tagName === "ol") {
        return $elem.prop("outerHTML") + "\n";
      }

      // Handle blockquotes
      if (tagName === "blockquote") {
        return `<blockquote>${text}</blockquote>\n`;
      }

      return "";
    };

    // First try to process direct children of mainContent
    mainContent.children().each((index, elem) => {
      const $elem = $(elem);
      processedHtml += processElement($elem);
    });

    // If we don't have enough content, try processing all content elements
    if (!processedHtml || processedHtml.length < 100) {
      console.log(
        "Not enough content found, trying to process all content elements..."
      );
      mainContent
        .find("p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote")
        .each((index, elem) => {
          const $elem = $(elem);
          processedHtml += processElement($elem);
        });
    }

    // Clean up the processed HTML
    console.log("Cleaning up processed HTML...");
    processedHtml = processedHtml
      .replace(/\n\s*\n/g, "\n") // Remove extra line breaks
      .replace(/<p>\s*<\/p>/g, "") // Remove empty paragraphs
      .replace(/<li>\s*<\/li>/g, "") // Remove empty list items
      .replace(/<blockquote>\s*<\/blockquote>/g, "") // Remove empty blockquotes
      .replace(/<h[1-6]>\s*<\/h[1-6]>/g, "") // Remove empty headings
      .replace(/<p><br\s*\/?><\/p>/g, "") // Remove empty paragraphs with just a line break
      .replace(/<br\s*\/?>/g, "\n") // Convert <br> tags to newlines
      .trim();

    console.log("Final processed HTML length:", processedHtml.length);
    console.log(
      "First 200 characters of processed HTML:",
      processedHtml.substring(0, 200)
    );

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
