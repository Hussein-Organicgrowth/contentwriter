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
    toneofvoice: string;
    targetAudience: string;
  }
) {
  const contextPrompt = previousContent
    ? `Here's what we've written so far (don't repeat this):\n${previousContent}\n\n`
    : "";

  const sectionPrompt = `Write a concise, focused section about "${section}" for the topic "${keyword}". 
Keep it brief but informative - aim for 2-5 short paragraphs maximum.
DO NOT include any headings or titles in your response - these will be handled separately.`;

  const companyContext = `
You work for the company ${companyInfo.name}. and you are writing content for their website.
Quick brief about ${companyInfo.name}:
- They help: ${companyInfo.targetAudience}
- Their style: ${companyInfo.toneofvoice}
- Their story: ${companyInfo.summary}`;

  const languageInstruction = getLanguageInstruction(language);
  const countryContext = getCountryContext(targetCountry);

  const prompt = `${contextPrompt}${sectionPrompt}

${companyContext}

Key guidelines:
1. Be concise - each paragraph should be 2-3 sentences maximum
2. Total length should be around 150-200 words
3. Focus on the most important points only
4. Use simple, clear language
5. Include only essential information
6. Avoid repetition and fluff
7. Make every word count
8. DO NOT include any headings or titles - they will be added separately

Writing style:
- Write in ${companyInfo.toneofvoice}
- Address ${companyInfo.targetAudience} directly
- Keep it authentic to their brand
- Be clear and direct

Format:
- <p> for short, focused paragraphs
- <strong> for key points
- <ul> for brief lists (if needed)
- Keep lists to 3-4 items maximum
- DO NOT include any <h1>, <h2>, <h3>, etc. tags

Naturally incorporate these related topics (only if relevant): ${relatedKeywords.join(
    ", "
  )}`;

  const completion = await openai.chat.completions.create({
    model: "chatgpt-4o-latest",
    messages: [
      {
        role: "system",
        content: `You are a precise, concise content writer who creates clear, focused content.
				${languageInstruction}
				${countryContext}
				
				Your main goals:
				1. Be brief but informative
				2. Focus on quality over quantity
				3. Write for ${companyInfo.targetAudience}
				4. Match ${companyInfo.name}'s tone: ${companyInfo.toneofvoice}
				
				Remember: Less is more. Every word must serve a purpose.`,
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

    console.log("Received outline:", JSON.stringify(outline, null, 2));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = "";
          const processedSections = new Set(); // Track normalized section titles

          // Helper function to normalize section titles for comparison
          const normalizeTitle = (title: string) => title.toLowerCase().trim();

          // Send the main title
          const titleContent = `<h1>${title}</h1>\n\n`;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                content: titleContent,
              })}\n\n`
            )
          );
          fullContent += titleContent;

          // Process all sections from the outline
          for (let i = 0; i < outline.length; i++) {
            const section = outline[i];
            const normalizedTitle = normalizeTitle(section.content);

            console.log(`Processing section ${i + 1}:`, {
              content: section.content,
              normalizedTitle,
              isProcessed: processedSections.has(normalizedTitle),
              headingLevel: section.level,
            });

            // Skip if we've already processed this section
            if (processedSections.has(normalizedTitle)) {
              console.log(`Skipping duplicate section: ${section.content}`);
              continue;
            }

            // Send progress update
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  section: section.content,
                  isProgress: true,
                })}\n\n`
              )
            );

            // Generate content
            const completion = await generateSection(
              openai,
              keyword,
              title,
              section.content,
              relatedKeywords,
              fullContent,
              false,
              tone,
              language,
              targetCountry,
              companyInfo
            );

            // Create section header using the level from the outline
            const headingLevel = section.level;
            const sectionHeader = `\n<${headingLevel}>${section.content}</${headingLevel}>\n`;

            // Send the header first
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  content: sectionHeader,
                })}\n\n`
              )
            );
            fullContent += sectionHeader;

            // Stream the content chunks as they come
            let isFirstChunk = true;
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                // For the first chunk, we'll check and remove any heading that might be at the start
                if (isFirstChunk) {
                  const headingPattern = new RegExp(
                    `<h[1-6]>${section.content}</h[1-6]>`,
                    "gi"
                  );
                  const cleanedContent = content.replace(headingPattern, "");
                  if (cleanedContent) {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          content: cleanedContent,
                        })}\n\n`
                      )
                    );
                    fullContent += cleanedContent;
                  }
                  isFirstChunk = false;
                } else {
                  // Stream subsequent chunks directly
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        content: content,
                      })}\n\n`
                    )
                  );
                  fullContent += content;
                }
              }
            }

            // Mark this section as processed
            processedSections.add(normalizedTitle);
            console.log(
              "Updated processed sections:",
              Array.from(processedSections)
            );
          }

          // Send the done message in proper JSON format
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
