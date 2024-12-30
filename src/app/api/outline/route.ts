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
			da: "Write in Danish using formal language.",
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
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: `You are a professional content strategist who creates detailed, well-structured outlines.
            ${languageInstructions[language] || languageInstructions["en-US"]}
            ${countryContext[targetCountry]}

            I will provide you with:

            A keyword
            A title
            Detailed analysis of the top 4 competing articles, including their outline structures
            Your task is to create a comprehensive outline that:

            Aligns with the structure appropriate for the target language and country.
            Incorporates the best structural elements observed in competitor outlines.
            Introduces topics or angles competitors might have missed.
            Follows a logical, reader-friendly flow.
            Balances SEO optimization with readability.
            Adheres strictly to the target language.
            Remains concise and to the point.
            Formatting Guidelines:

            Use numbered sections (1., 2., etc.) for main headings.
            Use lettered subsections (a., b., etc.) for subtopics.
            Follow this format:
            Section 1
            a. Subsection 1
            b. Subsection 2
            c. Subsection 3
            Section 2
            a. Subsection 1
            b. Subsection 2
            c. Subsection 3
            Rules:

            DO NOT add any empty lines (/n) or tabs (/t).
            Follow the content type specified in ${contentType}.
            Use the content type to determine the number of sections and subsections.
            Keep the outline limited to 5-6 sections with subsections.
            Output Example (Strictly Follow This Style):

            Introduction
            a. Overview of the Topic
            b. Importance of the Topic
            Key Concepts
            a. Concept 1
            b. Concept 2
            Focus on clarity, structure, and alignment with the specified content type.`,
				},
				{
					role: "user",
					content: `Keyword: ${keyword}
          Title: ${title}
          
          Competitor Analysis:
          ${competitorAnalysis}
          
          Please create a comprehensive outline based on this information, improving upon the competitor structures while maintaining what works well.
          KEEP THE OUTLINE TO MAX 5-6 SECTIONS AND SUBSECTIONS.`,
				},
			],
			temperature: 0.5,
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
