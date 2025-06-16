import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { language } = await req.json();
    if (!language || typeof language !== "string") {
      return NextResponse.json(
        { error: "Language is required." },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a professional linguist, grammar expert, and writing coach. Your job is to help content creators write in perfect, natural, and idiomatic ${language}. You know all the grammar rules, stylistic conventions, and common mistakes for this language. You provide clear, actionable, and language-specific advice for writing high-quality, correct, and engaging content.`;

    const userPrompt = `Summarize the most important grammar rules, stylistic conventions, and writing tips for creating high-quality, natural, and idiomatic content in ${language}. Focus on:
- Key grammar rules and sentence structure
- Typical tone and style for professional or web content
- Common mistakes to avoid (especially for non-native speakers)
- Punctuation, capitalization, and formatting conventions
- Any unique features of ${language} writing that are important for content creators

Respond in clear, actionable bullet points. Do not include generic advice that applies to all languages; focus on what is unique or especially important for ${language}.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini-2025-04-14",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      // temperature: 0.5,
      // max_tokens: 500,
    });

    const profile = completion.choices[0]?.message?.content || "";
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error generating language profile:", error);
    return NextResponse.json(
      { error: "Failed to generate language profile." },
      { status: 500 }
    );
  }
}
