import { NextResponse } from "next/server";
import OpenAI from "openai";
import axios from "axios";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN;
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD;

// Language codes mapping for DataForSEO API
const LANGUAGE_MAPPING = {
	en: { name: "English", code: 2840 }, // USA
	"en-gb": { name: "English", code: 2826 }, // UK
	es: { name: "Spanish", code: 2724 }, // Spain
	fr: { name: "French", code: 2250 }, // France
	de: { name: "German", code: 2276 }, // Germany
	it: { name: "Italian", code: 2380 }, // Italy
	pt: { name: "Portuguese", code: 2076 }, // Brazil
	ru: { name: "Russian", code: 2643 }, // Russia
	ja: { name: "Japanese", code: 2392 }, // Japan
	zh: { name: "Chinese", code: 2156 }, // China
	nl: { name: "Dutch", code: 2528 }, // Netherlands
	pl: { name: "Polish", code: 2616 }, // Poland
	tr: { name: "Turkish", code: 2792 }, // Turkey
	ar: { name: "Arabic", code: 2682 }, // Saudi Arabia
	da: { name: "Danish", code: 2208 }, // Denmark
} as const;

// Define the function schema for the AI to use
const AVAILABLE_FUNCTIONS = {
	search_keywords: {
		name: "search_keywords",
		description:
			"Search for keyword data including search volume, competition, and related keywords",
		parameters: {
			type: "object",
			properties: {
				keywords: {
					type: "array",
					items: { type: "string" },
					description: "List of keywords to search for",
				},
				min_search_volume: {
					type: "number",
					description: "Minimum monthly search volume to filter results",
				},
				language_code: {
					type: "string",
					description: "Language code for the keyword search",
				},
			},
			required: ["keywords", "language_code"],
		},
	},
} as const;

const SYSTEM_PROMPT = `
You are an expert keyword research assistant that helps users find the best keywords for their target audience.

Your goal is to help users discover valuable keywords for their business or content. You have access to real keyword data through the search_keywords function.

IMPORTANT: When asking questions to users, always format them in one of these ways:
1. As a bullet point list:
• What is your target audience?
• What products or services do you offer?

2. Or as a numbered list:
1. What is your target market?
2. Who are your main competitors?

Never embed questions within paragraphs. Always present them as separate bullet points or numbered items.

Follow these steps when helping users:
1. Understand their target audience, products, or content goals
2. Generate relevant keyword ideas based on their input
3. Use the search_keywords function to get data about these keywords
4. Analyze the results and provide insights about:
   - Search volume trends
   - Competition levels
   - Commercial intent
   - Related keyword opportunities

When you need more information, ask specific questions about:
• Target audience demographics?
• Product features and price points?
• Content topics or themes?
• Geographic targeting?
• Specific industry or niche?

Always maintain a helpful and professional tone. Explain your findings in a clear, actionable way.
Respond in the same language as the user's input.

Remember: Every question must end with a question mark and be on its own line with a bullet point or number.`;

async function searchKeywords(
	keywords: string[],
	language: string,
	minSearchVolume: number = 10
) {
	try {
		const languageInfo =
			LANGUAGE_MAPPING[language as keyof typeof LANGUAGE_MAPPING] ||
			LANGUAGE_MAPPING.en;

		// Create a post array for each keyword
		const post_array = keywords.map((keyword) => ({
			keyword,
			language_name: languageInfo.name,
			location_code: languageInfo.code,
			filters: [
				["keyword_data.keyword_info.search_volume", ">", minSearchVolume],
			],
		}));

		// Make separate API calls for each keyword to ensure we get data for all
		const results = await Promise.all(
			post_array.map(async (postData) => {
				try {
					const response = await axios({
						method: "post",
						url: "https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live",
						auth: {
							username: DATAFORSEO_LOGIN!,
							password: DATAFORSEO_PASSWORD!,
						},
						data: [postData], // Send one keyword at a time
						headers: {
							"content-type": "application/json",
						},
					});

					// Process the result for this keyword
					if (response.data?.tasks?.[0]?.result?.[0]) {
						return {
							seed_keyword: postData.keyword,
							...response.data.tasks[0].result[0],
						};
					}
					return null;
				} catch (error) {
					console.error(
						`Error fetching data for keyword ${postData.keyword}:`,
						error
					);
					return null;
				}
			})
		);

		// Filter out any failed requests and return the successful results
		return results.filter(Boolean);
	} catch (error) {
		console.error("Error searching keywords:", error);
		throw error;
	}
}

export async function POST(req: Request) {
	try {
		const { messages, language = "en" } = await req.json();

		// Create a new TransformStream for streaming
		const encoder = new TextEncoder();
		const stream = new TransformStream();
		const writer = stream.writable.getWriter();

		// Helper function to send a chunk of data
		const sendChunk = async (type: string, data: any) => {
			await writer.write(
				encoder.encode(
					`data: ${JSON.stringify({
						type,
						content: data,
					})}\n\n`
				)
			);
		};

		// Start streaming response
		const response = new Response(stream.readable, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});

		// Process in background
		(async () => {
			try {
				await sendChunk("status", { message: "Analyzing your request..." });

				// First interaction with the AI to analyze the request
				const completion = await openai.chat.completions.create({
					model: "gpt-4o-2024-08-06",
					messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
					functions: [AVAILABLE_FUNCTIONS.search_keywords],
					temperature: 0.7,
				});

				const responseMessage = completion.choices[0].message;

				// If the AI wants to search for keywords
				if (responseMessage.function_call?.name === "search_keywords") {
					const functionArgs = JSON.parse(
						responseMessage.function_call.arguments || "{}"
					);
					const keywords = functionArgs.keywords || [];
					const minSearchVolume = functionArgs.min_search_volume || 10;

					// Show the user what keywords we're searching for
					await sendChunk("status", {
						message: `Searching for keyword data for:\n${keywords
							.map((k: string) => `• ${k}`)
							.join("\n")}`,
					});

					// Search for keywords using DataForSEO
					const keywordResults = await searchKeywords(
						keywords,
						language,
						minSearchVolume
					);

					await sendChunk("status", { message: "Processing keyword data..." });

					// Get AI's analysis of the results
					const analysisCompletion = await openai.chat.completions.create({
						model: "gpt-4o-2024-08-06",
						messages: [
							{ role: "system", content: SYSTEM_PROMPT },
							...messages,
							responseMessage,
							{
								role: "function",
								name: "search_keywords",
								content: JSON.stringify(keywordResults),
							},
						],
						temperature: 0.7,
					});

					// Send the complete raw data and analysis
					await sendChunk("complete", {
						message: formatAIResponse(
							analysisCompletion.choices[0].message.content || ""
						),
						keywords: keywordResults,
					});
				} else {
					await sendChunk("complete", {
						message: formatAIResponse(responseMessage.content || ""),
						keywords: [],
					});
				}
			} catch (error) {
				console.error("Error in stream:", error);
				await sendChunk("error", {
					message:
						"An error occurred while researching keywords. Please try again.",
				});
			} finally {
				await writer.close();
			}
		})();

		return response;
	} catch (error) {
		console.error("Error processing request:", error);
		return NextResponse.json(
			{
				message:
					"An error occurred while processing your request. Please try again.",
				keywords: [],
			},
			{ status: 500 }
		);
	}
}

// Helper function to format AI responses
function formatAIResponse(content: string): string {
	// Split response into sections
	const sections = content.split(/\n(?=\*\*|#)/g);

	// Format each section
	const formattedSections = sections.map((section) => {
		// Check if it's a list
		if (section.includes("\n-") || section.includes("\n•")) {
			return section.trim();
		}
		// Check if it's a heading
		if (section.startsWith("**") || section.startsWith("#")) {
			return `\n${section.trim()}\n`;
		}
		// Regular paragraph
		return section.trim();
	});

	return formattedSections.join("\n\n");
}
