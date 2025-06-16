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
  model: string;
}

// Config for text extraction (can be shared or adjusted)
const MAX_CONTENT_LENGTH_PER_URL = 20000;
const MAX_TOTAL_CONTENT_LENGTH = 100000;

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
      console.error(
        "OpenAI API key not configured for content structure analysis."
      );
      return NextResponse.json(
        { error: "AI service not configured." },
        { status: 500 }
      );
    }

    let combinedTextContent = "";
    let crawledUrlCount = 0;
    const errors: string[] = [];

    console.log(
      `Starting crawl for content structure analysis: ${keyUrls.length} URLs, websiteId ${websiteId}`
    );

    for (const url of keyUrls) {
      if (combinedTextContent.length >= MAX_TOTAL_CONTENT_LENGTH) {
        console.log(
          "Reached max total content length for structure analysis, stopping further crawling."
        );
        break;
      }
      try {
        console.log(`Fetching content for structure analysis from: ${url}`);
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
        let crawlErrorMessage =
          "Unknown error during crawling for structure analysis.";
        if (error instanceof Error) {
          crawlErrorMessage = error.message;
        }
        console.error(
          `Error fetching/parsing for structure analysis on URL ${url}:`,
          crawlErrorMessage
        );
        errors.push(
          `Failed to process ${url} for structure: ${crawlErrorMessage}`
        );
      }
    }

    if (crawledUrlCount === 0 && combinedTextContent.trim() === "") {
      return NextResponse.json(
        {
          error: "Could not extract any content for structure analysis.",
          details: errors,
        },
        { status: 500 }
      );
    }

    console.log(
      `Extracted content for structure analysis from ${crawledUrlCount} URLs. Total length: ${combinedTextContent.length} chars.`
    );

    const systemPrompt = `You are an expert content strategist and editor AI. Your task is to analyze the provided website content and identify patterns in its structure, style, and tone.
Present your findings in a well-organized Markdown format. Cover the following aspects based on the text:

1.  **Headline Analysis:**
    *   Common headline structures or patterns (e.g., use of numbers, questions, keywords, length).
    *   Typical tone of headlines (e.g., benefit-driven, curiosity-driven, direct).

2.  **Sentence & Paragraph Structure:**
    *   Typical sentence length and complexity.
    *   Common sentence starters or syntactical patterns.
    *   Average paragraph length and structure (e.g., topic sentences, transitions).
    *   Use of active vs. passive voice.

3.  **Formatting & Readability:**
    *   Common use of formatting elements (e.g., bold, italics, bullet points, numbered lists, blockquotes).
    *   Any notable approaches to enhancing readability (e.g., short sentences, white space).

4.  **Tone of Voice & Writing Style:**
    *   Describe the overall tone (e.g., formal, informal, professional, friendly, technical, academic, persuasive, humorous).
    *   Identify any recurring stylistic elements, jargon, or specific vocabulary choices.

5.  **Call to Actions (CTAs):**
    *   Common phrasing or types of CTAs observed.
    *   Typical placement or emphasis of CTAs (if discernible from text structure).

6.  **Overall Content Strategy Insights (Optional):**
    *   If possible, infer any overarching content strategies (e.g., focus on storytelling, data-driven articles, thought leadership).

If the provided text is insufficient for a specific point, state that clearly. Base your analysis strictly on the provided content and avoid making assumptions beyond the text.`;

    const userPrompt = `Please analyze the content structure, writing style, and tone from the following combined text, crawled from key pages of website ID "${websiteId}".
Focus on identifying patterns as outlined in the system prompt.

Crawled content:
---
${combinedTextContent.substring(0, MAX_TOTAL_CONTENT_LENGTH)}
---

Present your analysis in well-structured Markdown.`;

    console.log(
      `Requesting OpenAI ${model} for content structure analysis of websiteId ${websiteId}.`
    );

    try {
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Slightly lower for more focused analysis on patterns
      });

      const analysisContent = completion.choices[0]?.message?.content;

      if (!analysisContent) {
        console.error(
          "OpenAI content structure analysis response is null or undefined."
        );
        return NextResponse.json(
          { error: "Failed to get a valid structure analysis from AI." },
          { status: 500 }
        );
      }

      console.log(`Content structure analysis generated for ${websiteId}.`);
      return NextResponse.json({
        analysis: analysisContent,
        crawledUrls: crawledUrlCount,
        extractionErrors: errors.length > 0 ? errors : undefined,
      });
    } catch (aiError: unknown) {
      let aiErrorMessage =
        "Unknown AI processing error for structure analysis.";
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
        "Error during OpenAI API call for content structure analysis:",
        aiErrorMessage
      );
      return NextResponse.json(
        {
          error: "AI processing failed for content structure analysis.",
          details: aiErrorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Error in /api/ai/analyze-content-structure:", error);
    let errorMessage =
      "An unknown error occurred during content structure analysis.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
