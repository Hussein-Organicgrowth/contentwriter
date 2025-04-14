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
						"You are a helpful writing assistant. Expand the given text by adding more details, examples, and explanations while maintaining its original meaning and style.",
				},
				{
					role: "user",
					content: text,
				},
			],
			temperature: 0.7,
			max_tokens: 1000,
		});

		const expandedText = completion.choices[0].message.content;

		return NextResponse.json({ expandedText });
	} catch (error) {
		console.error("Error expanding text:", error);
		return NextResponse.json(
			{ error: "Failed to expand text" },
			{ status: 500 }
		);
	}
}
