import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Initialize the Google AI client
const ai = new GoogleGenAI({
	apiKey: process.env.GOOGLE_API_KEY || "",
});

export async function POST(req: Request) {
	try {
		// Parse the request body
		const body = await req.json();
		const { prompt, systemInstruction } = body;

		if (!prompt) {
			return NextResponse.json(
				{ error: "Prompt is required" },
				{ status: 400 }
			);
		}

		// Generate content using Gemini
		const response = await ai.models.generateContent({
			model: "gemini-2.0-flash",
			contents: prompt,
			config: {
				systemInstruction: systemInstruction,
			},
		});

		// Extract the generated text
		const generatedText = response.text;

		return NextResponse.json({ text: generatedText });
	} catch (error) {
		console.error("Error generating content:", error);
		return NextResponse.json(
			{ error: "Failed to generate content" },
			{ status: 500 }
		);
	}
}
