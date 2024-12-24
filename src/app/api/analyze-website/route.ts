import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import * as cheerio from "cheerio"; // Updated import statement

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    console.log(url);

    const response = await fetch(url);
    const html = await response.text();

    // Use Cheerio to load the HTML and extract text
    const $ = cheerio.load(html);
    $("img, iframe, script, style, noscript").remove();

    // Extract text from the body
    const text = $("body")
      .contents()
      .filter(function () {
        return this.type === "text" || this.type === "tag";
      })
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    console.log(text);

    // Use OpenAI to summarize the content
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that summarizes company websites. Focus on key business information, products/services, and unique value propositions.",
        },
        {
          role: "user",
          content: `Please provide a concise summary of this company website content: ${text}`,
        },
      ],
      model: "gpt-4o-mini",
    });

    const summary = completion.choices[0].message.content;

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze website" },
      { status: 500 }
    );
  }
}
