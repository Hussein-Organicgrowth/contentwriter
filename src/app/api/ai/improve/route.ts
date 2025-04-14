import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
	try {
		const { text } = await req.json();

		if (!text) {
			return NextResponse.json({ error: "Text is required" }, { status: 400 });
		}

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						"You are a helpful writing assistant. Improve the given text by making it more professional, clear, and engaging while maintaining its original meaning.",
				},
				{
					role: "user",
					content: text,
				},
			],
			temperature: 0.7,
			max_tokens: 500,
		});

		const improvedText = completion.choices[0].message.content;

		return NextResponse.json({ improvedText });
	} catch (error) {
		console.error("Error improving text:", error);
		return NextResponse.json(
			{ error: "Failed to improve text" },
			{ status: 500 }
		);
	}
}
