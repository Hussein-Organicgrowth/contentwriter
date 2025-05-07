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
			targetWordCount = 1000, // Default to 1000 words if not specified
		}: {
			keyword: string;
			title: string;
			language?: LanguageCode;
			targetCountry: CountryCode;
			contentType: string;
			targetWordCount?: number;
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

		let systemPrompt = `You are an expert SEO content strategist who creates highly optimized, user-focused content outlines.
					${languageInstructions[language] || languageInstructions["en-US"]}
					${countryContext[targetCountry]}

					Target Word Count: ${targetWordCount} words
					Average Words per Section: ${Math.round(targetWordCount / 5)} words

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
					- Stays within the target word count by creating an appropriate number of sections

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
					- Create an outline that will result in approximately ${targetWordCount} words total
					- Limit the number of sections based on the target word count
					- For ${targetWordCount} words, create 4-5 main sections with 2-3 subsections each
          - Do not include a conclusion section
          - Do not include an FAQ section
          - Do not include an expert recommendation section`;

		// If this is a collection page, use a specialized prompt
		if (contentType === "collection") {
			systemPrompt = `
			You are an expert e-commerce SEO content strategist specializing in collection page optimization.
					${languageInstructions[language] || languageInstructions["en-US"]}
					${countryContext[targetCountry]}

					I will provide you with:
					- A collection name/primary keyword
					- Competitor analysis from top-ranking collection pages

					Your task is to create an SEO-optimized outline for an e-commerce collection page that:
					- Follows a proven collection page structure that converts browsers to buyers
					- Implements strategic keyword placement in headers
					- Addresses commercial search intent comprehensively
					- Creates a content hierarchy that both users and search engines can easily understand
					- Includes semantic SEO elements and related product terms
					- Maintains optimal content depth for collection pages (not too long, not too short)

					Collection Page SEO Optimization Guidelines:
					- H2 headers should include primary or secondary keywords when natural
					- H3 headers should target specific product benefits, features or use cases
					- Include sections that highlight unique selling points
					- Structure content to address common customer questions
					- Add sections for product highlights and key features
					- Include comparison sections when relevant (e.g., product types, materials, etc.)
					- Plan for product showcase elements

					Formatting Requirements:
					- Use H2 for main sections (primary keyword focus)
					- Use H3 for subsections (benefits, features, use cases)
					- Follow this format exactly:
					  H2: Main Section (with keyword)
					  H3: Subsection (with benefit or feature)

					Collection Page Structure Rules:
					- Each line must start with the header level (H2:, H3:)
					- H3 sections must follow an H2 section
					- Include an introduction section that clearly explains what the collection offers
					- Add sections highlighting key benefits and features
					- Include sections addressing common customer questions
					- Maintain proper keyword density in headers
					- Follow a logical flow that guides customers toward purchase

					IMPORTANT RESTRICTIONS:
					- DO NOT create sections that would require expert insights or opinions
					- DO NOT include sections about "expert recommendations" or "professional advice"
					- DO NOT create sections that would require scientific or technical expertise
					- DO NOT include sections about "research findings" or "studies show"
					- Focus ONLY on product features, benefits, and factual information
					- Avoid creating sections that would require the AI to invent facts or statistics

					Required Sections for Collection Pages:
					- Introduction (with primary keyword and collection overview)
					- Key benefits or unique selling points
					- Product features or highlights
					- Use cases or applications
					- Quality or materials section (if applicable)
					- Why choose this collection (focus on product features, not expert claims)
					- Call to action section`;
		}

		let userPrompt = `Primary Keyword: ${keyword}
					Title: ${title}
					Content Type: ${contentType}
					
					Competitor Analysis:
					${competitorAnalysis}
					
					Create a comprehensive, SEO-optimized outline that outperforms competitor content while maintaining readability and user value.
					Focus on featured snippet opportunities and "People Also Ask" potential.
					KEEP THE OUTLINE TO MAX 5-6 MAIN SECTIONS (H2) WITH RELEVANT SUBSECTIONS.
					ONLY OUTPUT THE OUTLINE, NO OTHER TEXT
					DO NOT INCLUDE FAQ AND A CONCLUSION.`;

		// If this is a collection page, use a specialized user prompt
		if (contentType === "collection") {
			userPrompt = `
			Collection Name/Primary Keyword: ${keyword}
					Title: ${title}
					Content Type: ${contentType}
					
					Competitor Analysis:
					${competitorAnalysis}
					
					Create a comprehensive, SEO-optimized outline for this collection page that will:
					1. Engage shoppers immediately with compelling benefits
					2. Highlight key product features and unique selling points
					3. Address common customer questions and objections
					4. Guide customers toward making a purchase decision
					5. Outperform competitor collection pages in both conversion and SEO
					
					IMPORTANT RESTRICTIONS:
					- DO NOT create sections that would require expert insights or opinions
					- DO NOT include sections about "expert recommendations" or "professional advice"
					- DO NOT create sections that would require scientific or technical expertise
					- DO NOT include sections about "research findings" or "studies show"
					- Focus ONLY on product features, benefits, and factual information
					- Avoid creating sections that would require the AI to invent facts or statistics
					
					KEEP THE OUTLINE TO 5-6 MAIN SECTIONS (H2) WITH 2-3 RELEVANT SUBSECTIONS (H3) EACH.
					ENSURE THE STRUCTURE FOLLOWS A LOGICAL FLOW FROM INTRODUCTION TO CALL-TO-ACTION.
					ONLY OUTPUT THE OUTLINE, NO OTHER TEXT.`;
		}

		const completion = await openai.chat.completions.create({
			model: "gpt-4.1-mini-2025-04-14",
			messages: [
				{
					role: "developer",
					content: systemPrompt,
				},
				{
					role: "user",
					content: userPrompt,
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
