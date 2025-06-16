import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as cheerio from "cheerio";

// Ensure your OpenAI API key is set in your environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RequestBody {
  keyUrls: string[];
  websiteId: string;
  model: string; // e.g., gpt-4.1-mini-2025-04-14 or a more advanced one for analysis
}

// Simple text extraction config
const MAX_CONTENT_LENGTH_PER_URL = 20000; // Max characters to extract from a single URL
const MAX_TOTAL_CONTENT_LENGTH = 100000; // Max total characters from all URLs to send to OpenAI

/**
 * @swagger
 * /api/ai/analyze-business-from-urls:
 *   post:
 *     summary: Analyzes business content from a list of key URLs.
 *     description: Fetches content from the provided URLs, extracts text, and then uses an AI model to generate a business analysis.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               keyUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: An array of key URLs to crawl and analyze.
 *               websiteId:
 *                 type: string
 *                 description: The ID of the website for context.
 *               model:
 *                 type: string
 *                 description: The OpenAI model to use for analysis.
 *             required:
 *               - keyUrls
 *               - websiteId
 *               - model
 *     responses:
 *       200:
 *         description: Successfully generated business analysis.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analysis:
 *                   type: string
 *                   description: The AI-generated business analysis.
 *       400:
 *         description: Bad request due to missing or invalid parameters.
 *       500:
 *         description: Internal server error, error during crawling, or error during AI processing.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const { keyUrls, websiteId, model } = body;

    if (!keyUrls || !Array.isArray(keyUrls) || keyUrls.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid keyUrls list." },
        { status: 400 }
      );
    }
    if (!websiteId || typeof websiteId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid websiteId." },
        { status: 400 }
      );
    }
    if (!model || typeof model !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid AI model name." },
        { status: 400 }
      );
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not configured for business analysis.");
      return NextResponse.json(
        { error: "AI service not configured." },
        { status: 500 }
      );
    }

    let combinedTextContent = "";
    let crawledUrlCount = 0;
    const errors: string[] = [];

    console.log(
      `Starting crawl for ${keyUrls.length} URLs for websiteId ${websiteId}`
    );

    for (const url of keyUrls) {
      if (combinedTextContent.length >= MAX_TOTAL_CONTENT_LENGTH) {
        console.log(
          "Reached max total content length, stopping further crawling."
        );
        break;
      }
      try {
        console.log(`Fetching content from: ${url}`);
        const response = await fetch(url, {
          headers: { "User-Agent": "ContentWriterAI-Bot/1.0" },
        });
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status} for ${url}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);

        $(
          "script, style, nav, footer, header, aside, form, noscript, svg, img, picture, video, audio, iframe, canvas, map, object, embed"
        ).remove();

        let pageText =
          $("main").text() || $("article").text() || $("body").text();

        pageText = pageText.replace(/\s\s+/g, " ").trim();

        if (pageText.length > MAX_CONTENT_LENGTH_PER_URL) {
          pageText =
            pageText.substring(0, MAX_CONTENT_LENGTH_PER_URL) +
            "... [truncated]";
        }

        combinedTextContent += `Content from ${url}:\n${pageText}\n\n---\n\n`;
        crawledUrlCount++;
      } catch (error: unknown) {
        let crawlErrorMessage = "Unknown error during crawling.";
        if (error instanceof Error) {
          crawlErrorMessage = error.message;
        }
        console.error(
          `Error fetching or parsing URL ${url}:`,
          crawlErrorMessage
        );
        errors.push(`Failed to process ${url}: ${crawlErrorMessage}`);
      }
    }

    if (crawledUrlCount === 0 && combinedTextContent.trim() === "") {
      return NextResponse.json(
        {
          error: "Could not extract any content from the provided URLs.",
          details: errors,
        },
        { status: 500 }
      );
    }

    console.log(
      `Extracted content from ${crawledUrlCount} URLs. Total length: ${combinedTextContent.length} chars.`
    );

    const systemPrompt = `You are an expert business analyst AI. Your task is to provide a comprehensive understanding of a company based on the crawled content from its key website pages.
The analysis should be well-structured, insightful, and cover the following aspects if possible from the provided text:
1.  **Core Business & Value Proposition:** What does the company do? What are its main products/services? What unique value does it offer?
2.  **Target Audience:** Who are the primary customers or users?
3.  **Key Offerings/Features:** Highlight specific products, services, or features mentioned.
4.  **Business Model (Implied):** How does the company likely make money (e.g., direct sales, subscriptions, ads)? (If inferable)
5.  **Overall Tone & Messaging:** What is the general style of communication? (e.g., formal, informal, technical)

Present the analysis as a clear, concise, and easy-to-read summary. Use markdown for formatting if it helps readability (e.g., headings, bullet points).
If the provided text is insufficient or too fragmented to draw meaningful conclusions for any section, explicitly state that.
Do not invent information not present in the text. Base your analysis strictly on the provided content.`;

    const userPrompt = `Please analyze the following combined text content crawled from the key pages of website ID "${websiteId}".
Provide a detailed business understanding based on this information.

Crawled content:
---
${combinedTextContent.substring(0, MAX_TOTAL_CONTENT_LENGTH)}
---

Remember to structure your analysis clearly and focus on the aspects mentioned in the system prompt.`;

    console.log(
      `Requesting OpenAI ${model} for business analysis of websiteId ${websiteId}.`
    );

    try {
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
      });

      const analysisContent = completion.choices[0]?.message?.content;

      if (!analysisContent) {
        console.error(
          "OpenAI business analysis response content is null or undefined."
        );
        return NextResponse.json(
          { error: "Failed to get a valid analysis from AI." },
          { status: 500 }
        );
      }

      console.log(`Business analysis generated for ${websiteId}.`);
      return NextResponse.json({
        analysis: analysisContent,
        crawledUrls: crawledUrlCount,
        extractionErrors: errors.length > 0 ? errors : undefined,
      });
    } catch (aiError: unknown) {
      let aiErrorMessage = "Unknown AI processing error.";
      if (aiError instanceof Error) {
        aiErrorMessage = aiError.message;
      } else if (typeof aiError === "string") {
        aiErrorMessage = aiError;
      } else if (
        typeof aiError === "object" &&
        aiError !== null &&
        "message" in aiError &&
        typeof (aiError as { message: string }).message === "string"
      ) {
        aiErrorMessage = (aiError as { message: string }).message;
      }
      console.error(
        "Error during OpenAI API call for business analysis:",
        aiErrorMessage
      );
      return NextResponse.json(
        {
          error: "AI processing failed for business analysis.",
          details: aiErrorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Error in /api/ai/analyze-business-from-urls:", error);
    let errorMessage = "An unknown error occurred during business analysis.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
