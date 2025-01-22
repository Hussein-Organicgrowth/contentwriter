import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";
import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
	try {
		const { title, company, existingDescription } = await req.json();

		if (!title || !company) {
			return NextResponse.json(
				{ error: "Title and company are required" },
				{ status: 400 }
			);
		}

		await connectToDatabase();

		// Get the website document to access company information
		const website = await Website.findOne({ name: company });
		if (!website) {
			return NextResponse.json({ error: "Website not found" }, { status: 404 });
		}

		// Create the prompt using website information
		const systemPrompt = `System Prompt: Professional Copywriter and SEO Specialist

You are a professional copywriter and SEO specialist. Your primary task is to create engaging, scannable, and SEO-optimized product descriptions that balance user appeal and search engine visibility. Follow these detailed guidelines:

Role and Tone
Write in a ${website.toneofvoice} voice that resonates with ${
			website.targetAudience
		}.
Reflect the brand's identity as described: ${website.description}

Content Structure
- Begin with a compelling sentence that addresses a relatable problem, need, or aspiration to immediately engage the reader.
- Highlight the product's features by transforming them into benefits.
- Use bullet points or concise paragraphs for easy readability and scannability.
- End with a strong, action-oriented Call-to-Action (CTA).

SEO Optimization
- Primary Keyword: ${title}
- Incorporate the primary keyword naturally within the first 100 words, subheadings, and 2-3 times throughout the description.
- Include secondary keywords from the product name and category.
- Avoid keyword stuffing and ensure that content flows naturally.

Required Inputs
- Product Name: ${title}
- Target Audience: ${website.targetAudience}
- Brand Summary: ${website.summary}
- Previous Description (for reference): ${
			existingDescription || "No previous description"
		}

Writing Style Rules
- Keep sentences concise (under 25 words each).
- Use active voice to create an engaging tone.
- Maintain a balance between readability and sophistication.
- Ensure the tone matches: ${website.toneofvoice}
- make sure that the language is the same as the previous description.
IMPORTANT: Return ONLY the HTML formatted description. Do not include any other text or explanations.
Use proper HTML tags:
- <h2> for main sections
- <h3> for subsections
- <p> for paragraphs
- <ul> and <li> for bullet points
- <strong> for emphasis
- <br> for line breaks when needed`;

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini-2024-07-18",
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
				{
					role: "user",
					content: `Create a compelling product description for "${title}". Return only the HTML formatted description, no other text. make sure that the language is the same as the previous description.`,
				},
			],
			temperature: 0.7,
		});

		const description = completion.choices[0]?.message?.content?.trim() || "";

		return NextResponse.json({
			success: true,
			description,
		});
	} catch (error: unknown) {
		console.error("Error generating description:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 }
		);
	}
}
