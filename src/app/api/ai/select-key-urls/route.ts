import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Ensure your OpenAI API key is set in your environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RequestBody {
  urls: string[];
  websiteId: string;
  model: string;
}

interface OpenAIResponse {
  selectedUrls: string[];
}

/**
 * @swagger
 * /api/ai/select-key-urls:
 *   post:
 *     summary: Selects key URLs from a list using an AI model.
 *     description: Receives a list of URLs, a websiteId, and an AI model name. It then uses the specified OpenAI model to identify and return the most important URLs for understanding the business.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: A list of URLs to analyze.
 *               websiteId:
 *                 type: string
 *                 description: The ID of the website for context.
 *               model:
 *                 type: string
 *                 description: The OpenAI model to use (e.g., gpt-4.1-mini-2025-04-14).
 *             required:
 *               - urls
 *               - websiteId
 *               - model
 *     responses:
 *       200:
 *         description: Successfully selected key URLs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 keyUrls:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: An array of selected key URLs.
 *       400:
 *         description: Bad request due to missing or invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error or error during AI processing.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const { urls, websiteId, model } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid URLs list." },
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
      console.error("OpenAI API key not configured");
      return NextResponse.json(
        { error: "AI service not configured." },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an AI assistant specialized in business analysis. Your task is to identify the most strategically important URLs from a given list that would help someone quickly understand the core aspects of a company's business, its products, services, target audience, and overall mission.
The output MUST be a JSON object with a single key "selectedUrls", and its value must be an array of strings. For example: {"selectedUrls": ["https://example.com/about", "https://example.com/products"]}.`;

    const userPrompt = `From the following list of website URLs, please select up to 50 URLs (but no more than 50 even for very large sites, and fewer if only a few are truly key) that are most critical for understanding the company's business.
Prioritize pages such as 'About Us', 'Products', 'Services', 'Solutions', 'Pricing', 'Contact Us', and main landing pages that clearly showcase what the company offers.
Avoid selecting generic blog posts (unless they are cornerstone content summarizing products/services), utility pages (like privacy policy, terms of service, unless specifically central to understanding the business model e.g. a legal tech company), or an excessive number of similar product/service detail pages (prefer a category page if available).
Return your response strictly as a JSON object with a single key "selectedUrls", where the value is an array of the chosen URL strings.
If no URLs seem strategically important from the provided list, or if the list is empty or clearly irrelevant to typical business content, return an empty array for "selectedUrls".

Here is the list of URLs:
${urls.join("\\n")}
`;

    console.log(
      `Requesting OpenAI ${model} for websiteId ${websiteId} with ${urls.length} URLs.`
    );

    const completion = await openai.chat.completions.create({
      model: model,
      response_format: { type: "json_object" },
      messages: [
        { role: "developer", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error(
        "OpenAI response content is null or undefined.",
        completion
      );
      return NextResponse.json(
        { error: "Failed to get a valid response from AI." },
        { status: 500 }
      );
    }

    try {
      const parsedResponse = JSON.parse(content) as OpenAIResponse;
      if (!parsedResponse || !Array.isArray(parsedResponse.selectedUrls)) {
        console.error(
          "Failed to parse selectedUrls from AI response or it is not an array:",
          content
        );
        // Try to salvage if the AI returned a list of strings directly, not wrapped in an object
        // This is a fallback and ideally the model follows the prompt.
        let salvagedUrls: string[] | null = null;
        try {
          const directList = JSON.parse(content);
          if (
            Array.isArray(directList) &&
            directList.every((item) => typeof item === "string")
          ) {
            salvagedUrls = directList as string[];
          }
        } catch {
          // Attempt to parse directly as an array failed, proceed to check structured response.
        }

        if (salvagedUrls) {
          console.warn(
            "Salvaged URLs directly from AI response as it did not follow JSON object structure."
          );
          return NextResponse.json({ keyUrls: salvagedUrls });
        }
        return NextResponse.json(
          {
            error:
              "AI response was not in the expected format (JSON object with selectedUrls array).",
          },
          { status: 500 }
        );
      }
      console.log(
        `OpenAI returned ${parsedResponse.selectedUrls.length} key URLs for ${websiteId}.`
      );
      return NextResponse.json({ keyUrls: parsedResponse.selectedUrls });
    } catch (parseError) {
      console.error(
        "Error parsing OpenAI response JSON:",
        parseError,
        "Raw content:",
        content
      );
      return NextResponse.json(
        { error: "Error processing AI response.", rawResponse: content },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Error in /api/ai/select-key-urls:", error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
