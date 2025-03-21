import { OpenAI } from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { content, mainKeyword } = await req.json();

    if (!content || !mainKeyword) {
      return NextResponse.json(
        { error: "Content and main keyword are required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a content optimization expert specializing in HTML content analysis. Your task is to analyze the provided HTML content and suggest improvements based on the main keyword. Focus on:

1. HTML Structure Analysis:
   - Heading hierarchy (h1, h2, h3)
   - Paragraph structure
   - List formatting
   - Text emphasis (bold, italic)
   - Content organization

2. SEO Optimization:
   - Keyword placement in headings
   - Content structure for better readability
   - Semantic HTML usage
   - Internal linking opportunities
   - Meta information

3. Content Quality:
   - Paragraph length and structure
   - Heading distribution
   - List usage and formatting
   - Text emphasis and formatting
   - Content flow and transitions

Provide 3 specific, actionable suggestions that include HTML formatting recommendations. Each suggestion should be detailed and include specific HTML elements or attributes to modify.`;

    const userPrompt = `Analyze the following HTML content and provide 3 specific improvements:

MAIN KEYWORD: "${mainKeyword}"

HTML CONTENT:
${content}

Please provide 3 detailed suggestions that include:
1. Specific HTML elements to modify
2. How to improve the structure
3. SEO optimization recommendations
4. Content formatting improvements

Format each suggestion as a clear, actionable item with specific HTML recommendations.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const suggestions =
      response.choices[0].message.content
        ?.split("\n")
        .filter((s) => s.trim()) || [];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error analyzing content:", error);
    return NextResponse.json(
      { error: "Failed to analyze content" },
      { status: 500 }
    );
  }
}
