import OpenAI from "openai";
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

const SERPER_API_KEY = process.env.SERPER_API_KEY;

type LanguageCode =
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
type CountryCode =
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

interface Competitor {
	title: string;
	url: string;
	headings: string[];
	content?: string;
}

async function fetchAndParseUrl(
	url: string
): Promise<{ headings: string[]; content: string } | null> {
	try {
		const response = await fetch(url);
		const html = await response.text();
		const $ = cheerio.load(html);

		// Remove script tags, style tags, and comments
		$("script").remove();
		$("style").remove();
		$("comments").remove();

		// Get all headings
		const headings = $("h1, h2, h3")
			.map((_, el) => $(el).text().trim())
			.get()
			.filter((heading) => heading.length > 0);

		// Get main content (focusing on article or main content areas)
		const contentSelectors = [
			"article",
			"main",
			".content",
			".post-content",
			".entry-content",
		];
		let content = "";

		for (const selector of contentSelectors) {
			const element = $(selector);
			if (element.length > 0) {
				content = element.text().trim();
				break;
			}
		}

		// If no content found through selectors, get body content
		if (!content) {
			content = $("body").text().trim();
		}

		return { headings, content };
	} catch (error) {
		console.error(`Error fetching ${url}:`, error);
		return null;
	}
}

async function getCompetitorContent(
	keyword: string,
	targetCountry: CountryCode
): Promise<Competitor[]> {
	try {
		const response = await fetch("https://google.serper.dev/search", {
			method: "POST",
			headers: {
				"X-API-KEY": SERPER_API_KEY!,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				q: keyword,
				gl: targetCountry.toLowerCase(),
				num: 4,
			}),
		});

		const data = await response.json();
		const competitors = data.organic || [];

		// Fetch and parse each competitor's content
		const competitorData: Competitor[] = await Promise.all(
			competitors.slice(0, 4).map(async (comp: any) => {
				const result = await fetchAndParseUrl(comp.link);
				return {
					title: comp.title,
					url: comp.link,
					headings: result?.headings || [],
					content: result?.content || "",
				};
			})
		);

		return competitorData.filter((comp) => comp.headings.length > 0);
	} catch (error) {
		console.error("Error fetching competitor content:", error);
		return [];
	}
}

export async function POST(req: Request) {
	try {
		const {
			keyword,
			title,
			language = "en-US",
			targetCountry,
			contentType,
		}: {
			keyword: string;
			title: string;
			language?: LanguageCode;
			targetCountry: CountryCode;
			contentType: string;
		} = await req.json();

		const languageInstructions: Record<LanguageCode, string> = {
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
			da: `Write in Danish using formal language. 
			When writing in Danish, ensure the following rules are adhered to:
	   
	   Verb Conjugation in Present Tense:
	   
	   Add "-r" to the infinitive form of verbs to form the present tense.
	   Example: "at lære" becomes "jeg lærer."
	   Distinguishing "nogle" and "nogen":
	   
	   Use "nogle" when referring to multiple people or things. Example: "Nogle mennesker har nemt ved grammatik."
	   Use "nogen" in questions, negatives, or conditionals. Example: "Er der nogen, der kan forklare mig reglerne?"
	   Compound Words:
	   
	   Combine words if the emphasis is on the first part (e.g., "Dansklærer" for a Danish teacher).
	   Keep them separate if the emphasis is on the second part (e.g., "dansk lærer" for a teacher from Denmark).
	   Endings "-ende" vs. "-ene":
	   
	   Use "-ende" for present participles (verbs), e.g., "løbende."
	   Use "-ene" for definite plural nouns, e.g., "løbene."
	   Pronoun Usage:
	   
	   Use "jeg" as the subject. Example: "Laura og jeg spiser aftensmad."
	   Use "mig" as the object. Example: "Mads bad Laura og mig om at spise aftensmad."
	   Noun Genders and Articles:
	   
	   Common gender nouns use "en," and neuter nouns use "et."
	   Examples: "en bil" (a car) and "et hus" (a house).
	   Definite Nouns:
	   
	   Add "-en" for common gender nouns and "-et" for neuter nouns to make them definite.
	   Examples: "bilen" (the car) and "huset" (the house).
	   Adjective Agreement:
	   
	   Match adjectives to the gender and number of the noun they describe.
	   Examples: "en stor dreng" (a big boy) vs. "et stort hus" (a big house).
	   Word Order:
	   
	   Follow Subject-Verb-Object order, but ensure the verb is in the second position in main clauses (V2 word order).
	   Capitalization:
	   
	   Capitalize only proper nouns and the first word of a sentence.
	   Example: Days, months, and nationalities are lowercase: "mandag," "juli," "dansk."
			 `,
			no: "Write in Norwegian using formal language.",
			fi: "Write in Finnish using formal language.",
		};

		const countryContext: Record<CountryCode, string> = {
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

		// Get competitor content
		const competitors = await getCompetitorContent(keyword, targetCountry);

		// Format competitor data for the prompt
		const competitorAnalysis = competitors
			.map(
				(comp, index) => `
      Competitor ${index + 1}: ${comp.title}
      URL: ${comp.url}
      Outline Structure:
      ${comp.headings.map((h, i) => `${i + 1}. ${h}`).join("\n")}
    `
			)
			.join("\n\n");

		console.log("ANALYSIS:", competitorAnalysis);

		const completion = await openai.chat.completions.create({
			model: "o3-mini-2025-01-31",
			messages: [
				{
					role: "developer",
					content: `You are an expert SEO content strategist who creates highly optimized, user-focused content outlines.
					${languageInstructions[language] || languageInstructions["en-US"]}
					${countryContext[targetCountry]}

					I will provide you with:
					- A primary keyword
					- A title
					- Competitor analysis from top-ranking content

					Your task is to create an SEO-optimized outline that:
					- Follows the skyscraper technique to outperform competitor content
					- Implements strategic keyword placement in headers
					- Addresses user search intent comprehensively
					- Creates a content hierarchy that search engines can easily understand
					- Includes semantic SEO elements and related topics
					- Maintains optimal content depth for the target keyword
					- Ensures proper keyword distribution across sections

					SEO Optimization Guidelines:
					- H2 headers should include primary or secondary keywords when natural
					- H3 headers should target long-tail variations and related questions
					- Include sections for featured snippet opportunities
					- Structure content to target "People Also Ask" opportunities
					- Add sections for key statistics and data points
					- Include comparison sections when relevant
					- Plan for rich media placement (images, videos, tables)

					Formatting Requirements:
					- Use H2 for main sections (primary keyword focus)
					- Use H3 for subsections (secondary keyword focus)
					- Follow this format exactly:
					  H2: Main Section (with keyword)
					  H3: Subsection (with related term)
					  H4: Detailed Point (with specific focus)

					Content Structure Rules:
					- Each line must start with the header level (H2:, H3:)
					- H3 sections must follow an H2 section
					- Include an FAQ section for featured snippet targeting
					- Add comparison sections when relevant
					- Include data/statistics sections for backlink potential
					- Maintain proper keyword density in headers
					- Follow E-E-A-T principles in structure

					Required Sections:
					- Introduction (with featured snippet target)
					- Main topic sections (with keyword variations)
					- Practical examples or case studies
					- Expert insights or analysis
					- FAQ section (targeting "People Also Ask")
					- Conclusion with key takeaways

					Output Example (Strictly Follow This Format):
					H2: [Primary Keyword]: Complete Guide for [Current Year]
					H3: Understanding [Primary Keyword]: Key Concepts
					H3: Why [Primary Keyword] Matters in [Industry/Context]
					H2: [Secondary Keyword]: Essential Components
					H3: Top [Number] [Related Keyword] Strategies
					H3: Common [Primary Keyword] Challenges and Solutions
					H2: Expert Tips for [Primary Keyword] Optimization
					H3: Best Practices from Industry Leaders
					H2: Frequently Asked Questions About [Primary Keyword]
					H3: [Common Question 1]
					H3: [Common Question 2]
					H2: [Primary Keyword] Success Stories and Examples`,
				},
				{
					role: "user",
					content: `Primary Keyword: ${keyword}
					Title: ${title}
					is very important to use the content type to determine the appropriate header structure
					Content Type: ${contentType}
					
					Competitor Analysis:
					${competitorAnalysis}
					
					Create a comprehensive, SEO-optimized outline that outperforms competitor content while maintaining readability and user value.
					Focus on featured snippet opportunities and "People Also Ask" potential.
					KEEP THE OUTLINE TO MAX 5-6 MAIN SECTIONS (H2) WITH RELEVANT SUBSECTIONS.
					ONLY OUTPUT THE OUTLINE, NO OTHER TEXT
					DO NOT INCLUDE FAQ AND A CONCLUSION.
					`,
				},
			],
			//temperature: 0.4,
		});

		const outline =
			completion.choices[0]?.message?.content?.trim().split("\n") || [];
		return NextResponse.json({ outline });
	} catch (error) {
		console.error("Error:", error);
		return NextResponse.json(
			{ error: "Failed to generate outline" },
			{ status: 500 }
		);
	}
}
