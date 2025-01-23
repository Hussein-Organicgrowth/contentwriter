import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";
import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

type LanguageKeys =
	| "en-US"
	| "en-GB"
	| "es"
	| "fr"
	| "de"
	| "it"
	| "pt"
	| "nl"
	| "pl"
	| "sv"
	| "da"
	| "no"
	| "fi";

type CountryKeys =
	| "US"
	| "GB"
	| "CA"
	| "AU"
	| "DE"
	| "FR"
	| "ES"
	| "IT"
	| "NL"
	| "SE"
	| "NO"
	| "DK"
	| "FI"
	| "PL"
	| "BR"
	| "MX";

export async function POST(req: Request) {
	try {
		const {
			title,
			company,
			existingDescription,
			language = "en-US",
			targetCountry = "US",
		} = await req.json();

		if (!title || !company) {
			return NextResponse.json(
				{ error: "Title and company are required" },
				{ status: 400 }
			);
		}

		const languageInstructions: { [key in LanguageKeys]: string } = {
			"en-US": "Use American English spelling and terminology.",
			"en-GB": "Use British English spelling and terminology.",
			es: "Write in Spanish using formal language.",
			fr: "Write in French using formal language.",
			de: "Write in German using formal language.",
			it: "Write in Italian using formal language.",
			pt: "Write in Portuguese using formal language.",
			nl: "Write in Dutch using formal language.",
			pl: "Write in Polish using formal language.",
			sv: "Write in Swedish using formal language.",
			da: "Write in Danish using formal language.",
			no: "Write in Norwegian using formal language.",
			fi: "Write in Finnish using formal language.",
		};

		const countryContext: { [key in CountryKeys]: string } = {
			US: "Target audience is in the United States.",
			GB: "Target audience is in the United Kingdom.",
			CA: "Target audience is in Canada.",
			AU: "Target audience is in Australia.",
			DE: "Target audience is in Germany.",
			FR: "Target audience is in France.",
			ES: "Target audience is in Spain.",
			IT: "Target audience is in Italy.",
			NL: "Target audience is in the Netherlands.",
			SE: "Target audience is in Sweden.",
			NO: "Target audience is in Norway.",
			DK: "Target audience is in Denmark.",
			FI: "Target audience is in Finland.",
			PL: "Target audience is in Poland.",
			BR: "Target audience is in Brazil.",
			MX: "Target audience is in Mexico.",
		};

		const languageKey = language as LanguageKeys;
		const targetCountryKey = targetCountry as CountryKeys;

		const languageInstructionsValue =
			languageInstructions[languageKey] ||
			"Use American English spelling and terminology.";
		const countryContextValue =
			countryContext[targetCountryKey] ||
			"Target audience is in the United States.";

		await connectToDatabase();

		// Get the website document to access company information
		const website = await Website.findOne({ name: company });
		if (!website) {
			return NextResponse.json({ error: "Website not found" }, { status: 404 });
		}

		// Create the prompt using website information
		const systemPrompt = `System Prompt: Professional Copywriter and SEO Specialist

You are a professional copywriter and SEO specialist. Your primary task is to create engaging, scannable, and SEO-optimized product descriptions that balance user appeal and search engine visibility. Follow these detailed guidelines:

Language and Locale Instructions:
${languageInstructionsValue}
${countryContextValue}
Make sure to follow proper language conventions, including:
- Appropriate currency formats and symbols
- Date and number formatting for the target locale
- Cultural references and idioms appropriate for the target market
- Local measurement units and sizing conventions

Role and Tone
Write in a ${website.toneofvoice} voice that resonates with ${
			website.targetAudience
		}.
Reflect the brand's identity as described: ${website.description}
Your writting the product description for the company: ${website.name}
Content Structure
- Begin with a compelling sentence that addresses a relatable problem, need, or aspiration to immediately engage the reader.
- Highlight the product's features by transforming them into benefits.
- Use bullet points or concise paragraphs for easy readability and scannability.
- End with a strong, action-oriented Call-to-Action (CTA) appropriate for the target locale.

SEO Optimization
- Primary Keyword: ${title}
- Incorporate the primary keyword naturally within the first 100 words, subheadings, and 2-3 times throughout the description.
- Include secondary keywords from the product name and category.
- Avoid keyword stuffing and ensure that content flows naturally.
- Consider local SEO practices and search patterns for the target market.

Required Inputs
- Product Name: ${title}
- Target Audience: ${website.targetAudience}
- Brand Summary: ${website.summary}
- Previous Description (for reference): ${
			existingDescription || "No previous description"
		}
- Target Language: ${languageKey}
- Target Country: ${targetCountryKey}

Writing Style Rules
- Keep sentences concise (under 25 words each).
- Use active voice to create an engaging tone.
- Maintain a balance between readability and sophistication.
- Ensure the tone matches: ${website.toneofvoice}
- Follow local writing conventions and style guides.

IMPORTANT: Return ONLY the HTML formatted description. Do not include any other text, explanations, or code fence markers.
Use these HTML tags directly (without markdown code fences):
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
					content: `Create a compelling product description for "${title}" in ${languageKey} for the ${targetCountryKey} market. Return only the HTML formatted description, no other text.`,
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
