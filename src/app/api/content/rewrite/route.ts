import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
	const encoder = new TextEncoder();

	try {
		const { content, mainKeyword, relatedKeywords } = await req.json();

		if (!content || !mainKeyword) {
			return NextResponse.json(
				{ error: "Content and main keyword are required" },
				{ status: 400 }
			);
		}

		const systemPrompt = `You are an expert content writer, SEO specialist, and editor with extensive experience in creating high-quality, engaging content. Your expertise includes:
- Advanced SEO optimization techniques
- Natural language processing and readability
- Content structure and formatting
- Keyword placement and density optimization
- Writing compelling headlines and subheadings
- Creating engaging introductions and strong conclusions
- Maintaining brand voice and style consistency

Your task is to rewrite and optimize the provided content while ensuring it remains unique, engaging, and valuable to readers.`;

		const userPrompt = `Rewrite and optimize the following content:

MAIN KEYWORD TO TARGET: "${mainKeyword}"
${
	relatedKeywords?.length
		? `RELATED KEYWORDS: ${relatedKeywords.join(", ")}`
		: ""
}

ORIGINAL CONTENT:
${content}

REQUIREMENTS:

1. Content Structure:
   - Start with an engaging introduction that includes the main keyword
   - Use proper H2 and H3 headings to organize content
   - Create clear sections that flow logically
   - End with a strong conclusion

2. SEO Optimization:
   - Include the main keyword in the first paragraph
   - Naturally distribute keywords throughout the content
   - Use LSI (Latent Semantic Indexing) terms related to the main topic
   - Optimize heading tags with relevant keywords
   - Maintain a keyword density of 1-2% for the main keyword

3. Content Quality:
   - Ensure 100% unique content
   - Write in an engaging, professional tone
   - Use active voice predominantly
   - Keep paragraphs short (3-4 sentences maximum)
   - Include transition words for better flow
   - Add relevant examples or explanations where needed

4. Formatting:
   - Use proper HTML tags (h2, h3, p, ul, li)
   - Break up long paragraphs
   - Use bullet points or numbered lists where appropriate
   - Add emphasis on key points using <strong> tags
   - Include relevant internal linking opportunities

5. Readability:
   - Aim for a Flesch reading ease score of 60-70
   - Use simple, clear language
   - Vary sentence structure
   - Avoid jargon unless necessary
   - Include rhetorical questions to engage readers

IMPORTANT:
- The first character must be an HTML tag
- Focus on providing value to the reader while maintaining SEO best practices
- Ensure the content reads naturally and isn't overly optimized
- Keep the original meaning and key points intact
- Make the content actionable and informative
- KEEP IT THE SAME LANGUAGE AS THE ORIGINAL CONTENT

Please rewrite the content following these guidelines while maintaining professionalism and engagement.`;

		// Create stream response
		const stream = new TransformStream();
		const writer = stream.writable.getWriter();

		// Start the completion stream
		const completion = await openai.chat.completions.create({
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
				{
					role: "user",
					content: userPrompt,
				},
			],
			model: "gpt-4o-mini",
			temperature: 0.7,
			max_tokens: 4000,
			presence_penalty: 0.3,
			frequency_penalty: 0.3,
			stream: true,
		});

		// Process the stream
		(async () => {
			try {
				let buffer = "";
				for await (const chunk of completion) {
					const content = chunk.choices[0]?.delta?.content || "";
					if (content) {
						buffer += content;

						// Process buffer for complete HTML tags
						let processedContent = buffer
							.replace(/\n\n/g, "</p><p>")
							.replace(/\n/g, "<br>")
							.replace(/<p><h([23])/g, "</p><h$1")
							.replace(/<\/h([23])><\/p>/g, "</h$1><p>");

						// Send the processed content
						const data = encoder.encode(
							`data: ${JSON.stringify({ content: processedContent })}\n\n`
						);
						await writer.write(data);
					}
				}
				// Send the final chunk
				const data = encoder.encode("data: [DONE]\n\n");
				await writer.write(data);
			} catch (error) {
				console.error("Streaming error:", error);
			} finally {
				await writer.close();
			}
		})();

		return new Response(stream.readable, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Error rewriting content:", error);
		return NextResponse.json(
			{ error: "Failed to rewrite content" },
			{ status: 500 }
		);
	}
}
