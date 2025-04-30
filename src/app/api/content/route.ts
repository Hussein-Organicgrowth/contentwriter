import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getLanguageInstruction, getCountryContext } from "@/lib/localization";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const generationConfig = {
  temperature: 0.7, // Adjust temperature as needed for creativity vs coherence
  // topK: 1, // Optional: Adjust based on desired output diversity
  // topP: 1, // Optional: Adjust based on desired output diversity
  // maxOutputTokens: 2048, // Optional: Set max tokens if needed
};

// Safety settings to block potentially harmful content
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

async function generateSection(
  genAI: GoogleGenerativeAI,
  keyword: string,
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
) {
  // Calculate words per section based on total word count and number of sections
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

  // Construct the prompt for Gemini
  const prompt = `You are an expert content writer specializing in creating engaging, conversational content that connects with readers for ${
    companyInfo.name
  }.

Primary Objectives:
1. Write in ${companyInfo.toneofvoice}
2. Connect naturally with ${companyInfo.targetAudience}
3. Embody ${companyInfo.name}'s authentic voice
4. ${languageInstruction}
5. ${countryContext}
6. Write approximately ${wordsPerSection} words for this section.

Writing Approach:
- Create flowing, narrative-style content that tells a story.
- Focus on conversational, engaging explanations.
- Use natural transitions between ideas.
- Write as if having a one-on-one conversation with the reader.
- Incorporate examples and scenarios organically.
- Keep the tone professional but warm and approachable.
- Be concise and stay within the word limit.
- Focus on quality over quantity.

SEO & Structure:
- Naturally weave in key terms without forcing them.
- Use short, focused paragraphs for readability.
- Break up long explanations with relevant examples.
- Only use lists when they truly enhance understanding.
- Keep paragraphs focused and concise.

${additionalContext}
${companyContext}

Task:
Write a natural, flowing section about "${section}" within the broader topic of "${keyword}".
Target word count for this section: ${wordsPerSection} words.

Content Direction:
- Write conversationally, as if explaining to someone in person.
- Focus on clear explanations with real-world examples.
- Address the reader's needs and questions naturally.
- Maintain a smooth flow between ideas.
- Keep paragraphs focused but conversational (2-4 sentences).
- Stay within the target word count of ${wordsPerSection} words.
- Be concise and avoid unnecessary elaboration.

Previous Content (for context, do not repeat):
${contextPrompt}

Related Topics (to weave in naturally):
${relatedKeywords.join(", ")}

Formatting Requirements:
- Use standard HTML tags like <p> for paragraphs.
- Use <strong> sparingly for truly important points.
- Use <ul> or <ol> lists ONLY if absolutely necessary for clarity. Use <li> for list items.
- Use <table>, <thead>, <tbody>, <tr>, <th>, <td> for tables if needed.
- Avoid excessive formatting - let the content flow naturally.
- DO NOT include any headings (like <h1>, <h2> etc.) within this section's content. The section title will be added separately.
- DO NOT repeat the section title "${section}" at the beginning of your response. Start directly with the content.

Remember: Write authentically as ${
    companyInfo.name
  }, using "we" and "our" in a natural way. Output only the requested section content in HTML format.
`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro-exp-03-25",
    generationConfig,
    safetySettings,
  }); // Use an appropriate Gemini model

  const result = await model.generateContentStream(prompt);
  return result.stream;
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

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  section: section.content,
                  isProgress: true,
                })}\n\n`
              )
            );

            // Use Gemini to generate content
            const completionStream = await generateSection(
              genAI,
              keyword,
              section.content,
              relatedKeywords,
              fullContent,
              language,
              targetCountry,
              section.context || "",
              companyInfo,
              targetWordCount,
              totalSections
            );

            const headingLevel = section.level;
            const sectionHeader = `\n<${headingLevel}>${section.content}</${headingLevel}>\n`;

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  content: sectionHeader,
                })}\n\n`
              )
            );
            fullContent += sectionHeader;

            // Process the stream from Gemini
            for await (const chunk of completionStream) {
              // Check if the chunk has text content
              // Handle potential errors or blocked content if necessary
              try {
                const content = chunk.text(); // Use text() method for Gemini stream
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                  fullContent += content;
                }
              } catch (error) {
                // Handle cases where the response might be blocked due to safety settings
                console.error("Error processing chunk:", error);
                // Optionally send an error message to the client
                const errorData = {
                  error: "Content generation issue for this section.",
                  section: section.content,
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(errorData)}

`)
                );
                // Decide if you want to stop or continue with the next section
                // break; // Stop processing this section if a chunk fails
              }
            }

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
