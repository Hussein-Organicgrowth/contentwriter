import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
	try {
		const { text } = await req.json();

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						"You are an expert at analyzing business content and identifying target audiences. Provide a detailed analysis of the target audience based on the provided text.",
				},
				{
					role: "user",
					content: `Analyze this text and identify the target audience: "${text}"

Please analyze for these aspects:

1. Demographics:
- Age range
- Gender (if specific)
- Income level
- Education level
- Professional status

2. Psychographics:
- Interests
- Values
- Lifestyle
- Pain points
- Goals and aspirations

3. Behavioral Characteristics:
- Buying habits
- Decision-making factors
- Brand preferences
- Online behavior

4. Geographic Factors:
- Location specifics
- Cultural considerations
- Market segment`,
				},
			],
			temperature: 0.7,
			max_tokens: 500,
		});

		const detailedAnalysis = completion.choices[0]?.message?.content || "";

		// Get a structured summary
		const summaryCompletion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						"You are a target audience analyzer. Based on the detailed analysis provided, create a structured summary with key points for each category. Be concise and specific.",
				},
				{
					role: "user",
					content: `Based on this detailed analysis, provide a structured summary with bullet points for each category. Be specific and concise:

${detailedAnalysis}

Format your response EXACTLY as follows (keep the exact labels and use • for bullet points):

DEMOGRAPHICS:
• [key point about age]
• [key point about income/education]
• [key point about professional status]

PSYCHOGRAPHICS:
• [key point about interests]
• [key point about values]
• [key point about pain points]

BEHAVIOR:
• [key point about buying habits]
• [key point about decision factors]
• [key point about brand preferences]

GEOGRAPHY:
• [key point about location]
• [key point about cultural factors]
• [key point about market specifics]`,
				},
			],
			temperature: 0.7,
			max_tokens: 500,
		});

		const structuredSummary =
			summaryCompletion.choices[0]?.message?.content || "";

		// Parse the structured summary
		const sections: { [key: string]: string[] } = {
			demographics: [],
			psychographics: [],
			behavior: [],
			geography: [],
		};

		let currentSection = "";
		const lines = structuredSummary.split("\n");

		for (const line of lines) {
			if (line.trim() === "") continue;

			if (line.endsWith(":")) {
				currentSection = line.slice(0, -1).toLowerCase();
			} else if (line.startsWith("•") && currentSection) {
				sections[currentSection].push(line.slice(1).trim());
			}
		}

		return NextResponse.json({
			detailedAnalysis,
			demographics: sections.demographics.join("\n"),
			psychographics: sections.psychographics.join("\n"),
			behavior: sections.behavior.join("\n"),
			geography: sections.geography.join("\n"),
		});
	} catch (error) {
		console.error("Error:", error);
		return NextResponse.json(
			{ error: "Failed to analyze target audience" },
			{ status: 500 }
		);
	}
}
