import OpenAI from 'openai';
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { keyword } = await req.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates relevant keywords for content creation. Generate 5-7 related keywords that would be valuable for an article.",
        },
        {
          role: "user",
          content: `Generate a list of relevant keywords for an article about "${keyword}". 
          The keywords should:
          1. Be closely related to the main topic
          2. Include long-tail variations
          3. Cover different aspects of the topic
          4. Be natural and commonly used
          
          Return only the keywords as a comma-separated list, without numbering or bullets.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const keywordText = completion.choices[0]?.message?.content || '';
    const keywords = keywordText.split(',').map(k => k.trim()).filter(k => k);

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to generate keywords" },
      { status: 500 }
    );
  }
}
