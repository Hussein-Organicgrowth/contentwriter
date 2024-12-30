import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getLanguageInstruction, getCountryContext } from "@/lib/localization";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

async function generateSection(
	openai: OpenAI,
	keyword: string,
	title: string,
	section: string,
	relatedKeywords: string[],
	previousContent: string = "",
	isIntroduction: boolean = false,

	tone: {
		tone: string;
		style: string;
		voice: string;
		language: string;
		engagement: string;
	} = {
		tone: "",
		style: "",
		voice: "",
		language: "",
		engagement: "",
	},
	language: string = "en-US",
	targetCountry: string = "US",
	companyInfo: {
		name: string;
		website: string;
		description: string;
		summary: string;
	} = {
		name: "",
		website: "",
		description: "",
		summary: "",
	}
) {
	const contextPrompt = previousContent
		? `Previous content for context (do not repeat this):\n${previousContent}\n\n`
		: "";

	const sectionPrompt = isIntroduction
		? `Write an engaging introduction section (without title or heading) for an article about "${keyword}".`
		: `Write the content for the section "${section}" (without repeating the section title) for the article about "${keyword}".`;

	const toneInstruction = tone.tone
		? `\nMatch this writing style:
      - Overall Tone: ${tone.tone}
      - Writing Style: ${tone.style}
      - Voice: ${tone.voice}
      - Language Patterns: ${tone.language}
      - Engagement Approach: ${tone.engagement}`
		: "";

	const languageInstruction = getLanguageInstruction(language);
	const countryContext = getCountryContext(targetCountry);

	const prompt = `${contextPrompt}${sectionPrompt}

Include these related keywords naturally where relevant: ${relatedKeywords.join(
		", "
	)}${toneInstruction}

Format the content with HTML tags:
- Use <p> tags for paragraphs
- Use <ul> and <li> tags for lists
- Use <strong> tags for emphasis

Guidelines:
1. Write in the specified tone and style
2. Include specific examples and explanations
3. Make the content informative and valuable
4. Maintain a natural flow with the previous content
5. Keep SEO in mind while ensuring readability
6. Write approximately 200-300 words for this section
7. DO NOT include the title or section heading - these will be added automatically`;
	const stringCompany = JSON.stringify(companyInfo);
	console.log(stringCompany);
	const completion = await openai.chat.completions.create({
		model: "chatgpt-4o-latest",
		messages: [
			{
				role: "system",
				content: `You are a professional content writer who creates high-quality, SEO-optimized articles with proper HTML formatting. 
        ${languageInstruction}
        ${countryContext}
        You are writing the text for a company website. You have the following information:
        ${stringCompany}
        Write one section at a time, maintaining context with previous content. Do not include titles or headings - these will be added separately.`,
			},
			{
				role: "user",
				content: prompt,
			},
		],
		temperature: 0.7,
		stream: true,
	});

	return completion;
}

export async function POST(req: Request) {
	try {
		const {
			keyword,
			title,
			outline,
			relatedKeywords,
			tone,
			language = "en-US",
			targetCountry = "US",
			companyInfo,
		} = await req.json();

		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				try {
					let fullContent = "";

					// Title
					const titleContent = `<h1>${title}</h1>\n\n`;
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								content: titleContent,
								section: "Title",
							})}\n\n`
						)
					);
					fullContent += titleContent;

					// Introduction
					const introHeader = "<h2>Introduction</h2>\n";
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								content: introHeader,
								section: "Introduction",
							})}\n\n`
						)
					);
					fullContent += introHeader;

					const introCompletion = await generateSection(
						openai,
						keyword,
						title,
						"Introduction",
						relatedKeywords,
						"",
						true,
						tone,
						language,
						targetCountry,
						companyInfo
					);

					for await (const chunk of introCompletion) {
						const content = chunk.choices[0]?.delta?.content || "";
						if (content) {
							controller.enqueue(
								encoder.encode(
									`data: ${JSON.stringify({
										content,
										section: "Introduction",
									})}\n\n`
								)
							);
							fullContent += content;
						}
					}

					// Main sections
					for (let i = 1; i < outline.length - 1; i++) {
						const section = outline[i];
						const sectionHeader = `\n<h2>${section}</h2>\n`;
						controller.enqueue(
							encoder.encode(
								`data: ${JSON.stringify({
									content: sectionHeader,
									section,
								})}\n\n`
							)
						);
						fullContent += sectionHeader;

						const completion = await generateSection(
							openai,
							keyword,
							title,
							section,
							relatedKeywords,
							fullContent,
							false,
							tone,
							language,
							targetCountry,
							companyInfo
						);

						for await (const chunk of completion) {
							const content = chunk.choices[0]?.delta?.content || "";
							if (content) {
								controller.enqueue(
									encoder.encode(
										`data: ${JSON.stringify({ content, section })}\n\n`
									)
								);
								fullContent += content;
							}
						}
					}

					// Conclusion
					const conclusion = outline[outline.length - 1];
					const conclusionHeader = `\n<h2>${conclusion}</h2>\n`;
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								content: conclusionHeader,
								section: conclusion,
							})}\n\n`
						)
					);
					fullContent += conclusionHeader;

					const conclusionCompletion = await generateSection(
						openai,
						keyword,
						title,
						conclusion,
						relatedKeywords,
						fullContent,
						false,
						tone,
						language,
						targetCountry,
						companyInfo
					);

					for await (const chunk of conclusionCompletion) {
						const content = chunk.choices[0]?.delta?.content || "";
						if (content) {
							controller.enqueue(
								encoder.encode(
									`data: ${JSON.stringify({
										content,
										section: conclusion,
									})}\n\n`
								)
							);
							fullContent += content;
						}
					}

					controller.enqueue(encoder.encode("data: [DONE]\n\n"));
				} catch (error) {
					console.error("Error in stream:", error);
					controller.error(error);
				} finally {
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Error in POST:", error);
		return NextResponse.json(
			{ error: "Failed to generate content" },
			{ status: 500 }
		);
	}
}
