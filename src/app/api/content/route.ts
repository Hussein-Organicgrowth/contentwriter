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
  }
) {
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

  const completion = await openai.chat.completions.create({
    model: "o3-mini-2025-01-31",
    messages: [
      {
        role: "developer",
        content: `You are an expert content writer specializing in creating engaging, conversational content that connects with readers.

Primary Objectives:
1. Write in ${companyInfo.toneofvoice}
2. Connect naturally with ${companyInfo.targetAudience}
3. Embody ${companyInfo.name}'s authentic voice
4. ${languageInstruction}
5. ${countryContext}

Writing Approach:
- Create flowing, narrative-style content that tells a story
- Focus on conversational, engaging explanations
- Use natural transitions between ideas
- Write as if having a one-on-one conversation with the reader
- Incorporate examples and scenarios organically
- Keep the tone professional but warm and approachable

SEO & Structure:
- Naturally weave in key terms without forcing them
- Use short, focused paragraphs for readability
- Break up long explanations with relevant examples
- Only use lists when they truly enhance understanding

${additionalContext}`,
      },
      {
        role: "user",
        content: `Write a natural, flowing section about "${section}" within "${keyword}".

Context & Voice:
${companyContext}

Content Direction:
- Write conversationally, as if explaining to someone in person
- Focus on clear explanations with real-world examples
- Address the reader's needs and questions naturally
- Maintain a smooth flow between ideas
- Keep paragraphs focused but conversational (2-4 sentences)

Previous Content (for context):
${contextPrompt}

Related Topics (to weave in naturally):
${relatedKeywords.join(", ")}

Formatting:
- Use <p> tags for natural paragraph breaks
- Use <strong> sparingly for truly important points
- Only use <ul> lists if absolutely necessary for clarity
- Tables if needed 
- Avoid excessive formatting - let the content flow naturally
- NO headings or titles

 
Remember: Write authentically as ${
          companyInfo.name
        }, using "we" and "our" in a natural way.`,
      },
    ],
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
