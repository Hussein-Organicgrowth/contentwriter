import { NextResponse } from "next/server";
import OpenAI from "openai";

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

		const prompt = `Analyze the following content and provide specific suggestions for improvement. Focus on:
1. Headline optimization for SEO
2. Missing sections or topics that would enhance the content
3. Content structure and flow
4. Keyword placement and density
5. Readability and engagement

Main Keyword: ${mainKeyword}
Content: ${content}

Provide suggestions in the following JSON format:
{
  "headlines": [
    {
      "original": "original headline",
      "suggestion": "improved headline",
      "reason": "explanation"
    }
  ],
  "sections": [
    {
      "title": "suggested section title",
      "description": "what should be included",
      "reason": "why this section would help"
    }
  ],
  "improvements": [
    {
      "type": "structure|readability|engagement|seo",
      "suggestion": "specific improvement",
      "reason": "explanation"
    }
  ]
}`;

		const completion = await openai.chat.completions.create({
			model: "o3-mini-2025-01-31",
			messages: [
				{
					role: "system",
					content:
						"You are an expert content strategist and SEO specialist. Provide specific, actionable suggestions for content improvement.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			response_format: { type: "json_object" },
		});

		const analysis = JSON.parse(completion.choices[0].message.content || "{}");
		console.log(JSON.stringify(analysis, null, 2));
		return NextResponse.json(analysis);
	} catch (error) {
		console.error("Error analyzing content:", error);
		return NextResponse.json(
			{ error: "Failed to analyze content" },
			{ status: 500 }
		);
	}
}
