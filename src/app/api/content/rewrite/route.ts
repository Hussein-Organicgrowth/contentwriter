import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { section, mainKeyword } = await req.json();

    if (!section || !mainKeyword) {
      return NextResponse.json(
        { error: "Section and main keyword are required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert content writer and HTML formatting specialist. Your task is to rewrite and optimize the provided HTML content while:

1. HTML Structure:
   - Maintain proper HTML structure and formatting
   - Use semantic HTML tags appropriately
   - Preserve existing HTML elements and attributes
   - Ensure proper heading hierarchy
   - Keep consistent formatting

2. Content Quality:
   - Improve readability and engagement
   - Optimize for SEO
   - Maintain the original meaning
   - Add relevant examples or explanations
   - Use active voice

3. Formatting Guidelines:
   - Use appropriate heading levels (h1, h2, h3)
   - Break up long paragraphs
   - Use lists (ul, ol) where appropriate
   - Add emphasis (strong, em) to important points
   - Maintain consistent spacing

Always preserve the HTML structure while improving the content.`;

    const userPrompt = `Rewrite and optimize the following HTML content:

MAIN KEYWORD: "${mainKeyword}"

ORIGINAL HTML CONTENT:
${section}

REQUIREMENTS:
1. Maintain all HTML tags and structure
2. Improve content while keeping the same HTML elements
3. Optimize for the main keyword
4. Enhance readability with proper formatting
5. Keep the original meaning and key points
6. Ensure proper heading hierarchy
7. Use lists where appropriate
8. Add emphasis to important points
9. Keep paragraphs focused
10. Maintain consistent HTML formatting

Please rewrite the content while preserving the HTML structure and improving the overall quality.`;

    const response = await openai.chat.completions.create({
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
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 2000,
    });

    const rewrittenContent = response.choices[0].message.content;

    return NextResponse.json({ rewrittenContent });
  } catch (error) {
    console.error("Error rewriting content:", error);
    return NextResponse.json(
      { error: "Failed to rewrite content" },
      { status: 500 }
    );
  }
}
