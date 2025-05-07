import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getLanguageInstruction, getCountryContext } from "@/lib/localization";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

function constructPrompt(
	keyword: string,
	title: string,
	section: string,
	relatedKeywords: string[],
	previousContent: string = "",
	language: string = "en-US",
	targetCountry: string = "US",
	context: string = "",
	companyInfo: {
		name: string;
		website: string;
		description: string;
		summary: string;
		toneofvoice: string;
		targetAudience: string;
	},
	targetWordCount: number = 1000,
	totalSections: number = 5
): ChatCompletionMessageParam[] {
	const wordsPerSection = Math.round(targetWordCount / totalSections);
	const additionalContext = context
		? `Additional Context from the user:\n${context}\nPlease consider this context while writing the content.\n\n`
		: "";
	const contextPrompt = previousContent
		? `Here's what we've written so far (don't repeat this):\n${previousContent}\n\n`
		: "";
	const companyContext = `
You work for the company ${companyInfo.name}, and you are writing content for their website.
Quick brief about ${companyInfo.name}:
- They help: ${companyInfo.targetAudience}
- Their style: ${companyInfo.toneofvoice}
- Their story: ${companyInfo.summary}

Make sure to use we, our, us, etc. instead of they, them, their, etc. Or company does this etc.
`;
	const languageInstruction = getLanguageInstruction(language);
	const countryContext = getCountryContext(targetCountry);

	return [
		{
			role: "developer",
			content: `
      
You are an expert content writer specializing in creating engaging, conversational content that connects with readers.


<PrimaryObjectives>
1. Write in ${companyInfo.toneofvoice}
2. Connect naturally with ${companyInfo.targetAudience}
3. Embody ${companyInfo.name}'s authentic voice
4. ${languageInstruction}
5. ${countryContext}
6. Write approximately ${wordsPerSection} words for this section
</PrimaryObjectives>

<WritingApproach>
- Create flowing, narrative-style content that tells a story
- Focus on conversational, engaging explanations
- Use natural transitions between ideas
- Write as if having a one-on-one conversation with the reader
- Incorporate examples and scenarios organically
- Keep the tone professional but warm and approachable
- Be concise and stay within the word limit
- Focus on quality over quantity
</WritingApproach>

<SEOAndStructure>
- Naturally weave in key terms without forcing them
- Use short, focused paragraphs for readability
- Break up long explanations with relevant examples
- Only use lists when they truly enhance understanding
- Keep paragraphs focused and concise
- Strategically incorporate the primary keyword, especially in impactful locations like the beginning of paragraphs, while maintaining natural flow.
- Leverage the 'Related Topics' to build semantic richness and cover the subject comprehensively, demonstrating expertise.
- Ensure the content directly addresses the likely search intent behind the primary keyword.
- Include relevant entities (people, places, organizations, concepts) naturally to enhance topical authority.
</SEOAndStructure>

<additionalContext>
${additionalContext}
</additionalContext>

`,
		},
		{
			role: "user",
			content: `Write a natural, flowing section about "${section}" within "${keyword}".

<TargetWordCount>
Target word count for this section: ${wordsPerSection} words
</TargetWordCount>

<ContextAndVoice>
${companyContext}
</ContextAndVoice>

<ContentDirection>
- Write conversationally, as if explaining to someone in person
- Focus on clear explanations with real-world examples
- Address the reader's needs and questions naturally
- Maintain a smooth flow between ideas
- Keep paragraphs focused but conversational (2-4 sentences)
- Stay within the target word count of ${wordsPerSection} words
- Be concise and avoid unnecessary elaboration
- Pay special attention to the primary keyword: "${keyword}". Integrate it naturally, particularly in prominent positions.
- Focus on answering the core questions a user might have when searching for "${keyword}".
- Mention relevant entities associated with the topic to provide depth and authority.
</ContentDirection>

Previous Content (for context):
<previousContent>
${contextPrompt}
</previousContent>

<RelatedTopicsToWeaveIn>
Use these related terms to add depth and semantic relevance:
${relatedKeywords.join(", ")}
</RelatedTopicsToWeaveIn>

<Formatting>
- Use <p> tags for natural paragraph breaks
- Use <strong> sparingly for truly important points
- Only use <ul> lists if absolutely necessary for clarity
- Tables if needed 
- Avoid excessive formatting - let the content flow naturally
- NO headings or titles
</Formatting>

<Reminder>
Remember: Write authentically as ${
				companyInfo.name
			}, using "we" and "our" in a natural way.
</Reminder>`,
		},
	];
}

async function generateSection(
	openai: OpenAI,
	keyword: string,
	title: string,
	section: string,
	relatedKeywords: string[],
	previousContent: string = "",
	language: string = "en-US",
	targetCountry: string = "US",
	context: string = "",
	companyInfo: {
		name: string;
		website: string;
		description: string;
		summary: string;
		toneofvoice: string;
		targetAudience: string;
	},
	targetWordCount: number = 1000,
	sectionIndex: number = 0,
	totalSections: number = 5
) {
	const messages: ChatCompletionMessageParam[] = constructPrompt(
		keyword,
		title,
		section,
		relatedKeywords,
		previousContent,
		language,
		targetCountry,
		context,
		companyInfo,
		targetWordCount,
		totalSections
	);

	const completion = await openai.chat.completions.create({
		model: "gpt-4.1-mini-2025-04-14",
		messages: messages,
		stream: true,
	});

	return completion;
}

async function streamSectionContent(
	controller: ReadableStreamDefaultController,
	encoder: TextEncoder,
	openai: OpenAI,
	keyword: string,
	title: string,
	section: { content: string; context?: string; level: string },
	relatedKeywords: string[],
	fullContent: string,
	language: string,
	targetCountry: string,
	companyInfo: any, // Consider defining a more specific type for companyInfo
	targetWordCount: number,
	sectionIndex: number,
	totalSections: number
): Promise<string> {
	controller.enqueue(
		encoder.encode(
			`data: ${JSON.stringify({
				section: section.content,
				isProgress: true,
			})}\n\n`
		)
	);

	const completion = await generateSection(
		openai,
		keyword,
		title,
		section.content,
		relatedKeywords,
		fullContent,
		language,
		targetCountry,
		section.context || "",
		companyInfo,
		targetWordCount,
		sectionIndex,
		totalSections
	);

	const headingLevel = section.level;
	const sectionHeader = `\n<${headingLevel}>${section.content}</${headingLevel}>\n`;

	controller.enqueue(
		encoder.encode(`data: ${JSON.stringify({ content: sectionHeader })}\n\n`)
	);
	let sectionGeneratedContent = sectionHeader;

	let isFirstChunk = true;
	for await (const chunk of completion) {
		const content = chunk.choices[0]?.delta?.content || "";
		if (content) {
			if (isFirstChunk) {
				const headingPattern = new RegExp(
					`<h[1-6]>${section.content}</h[1-6]>`,
					"gi"
				);
				const cleanedContent = content.replace(headingPattern, "");
				if (cleanedContent) {
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ content: cleanedContent })}\n\n`
						)
					);
					sectionGeneratedContent += cleanedContent;
				}
				isFirstChunk = false;
			} else {
				controller.enqueue(
					encoder.encode(`data: ${JSON.stringify({ content: content })}\n\n`)
				);
				sectionGeneratedContent += content;
			}
		}
	}
	return sectionGeneratedContent;
}

export async function POST(req: Request) {
	try {
		const {
			keyword,
			title,
			outline,
			relatedKeywords,
			language = "en-US",
			targetCountry = "US",
			companyInfo,
			targetWordCount = 1000,
		} = await req.json();

		console.log("Received outline:", JSON.stringify(outline, null, 2));

		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				try {
					let fullContent = "";
					const processedSections = new Set();
					const totalSections = outline.length;

					const normalizeTitle = (title: string) => title.toLowerCase().trim();

					const titleContent = `<h1>${title}</h1>\n\n`;
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								content: titleContent,
							})}\n\n`
						)
					);
					fullContent += titleContent;

					for (let i = 0; i < outline.length; i++) {
						const section = outline[i];
						const normalizedTitle = normalizeTitle(section.content);

						if (processedSections.has(normalizedTitle)) {
							console.log(`Skipping duplicate section: ${section.content}`);
							continue;
						}

						const generatedContent = await streamSectionContent(
							controller,
							encoder,
							openai,
							keyword,
							title,
							section,
							relatedKeywords,
							fullContent,
							language,
							targetCountry,
							companyInfo,
							targetWordCount,
							i,
							totalSections
						);
						fullContent += generatedContent;

						processedSections.add(normalizedTitle);
						console.log(
							"Updated processed sections:",
							Array.from(processedSections)
						);
					}

					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								done: true,
							})}\n\n`
						)
					);
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
