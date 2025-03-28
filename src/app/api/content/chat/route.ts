import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ContentUpdate {
  type: "insert" | "modify" | "delete";
  position: "before" | "after" | "replace";
  target?: string; // The section to insert before/after
  content: string;
  explanation: string;
}

export async function POST(req: Request) {
  try {
    const { messages, currentContent: initialContent } = await req.json();

    // Create a stream for the response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Process the request asynchronously
    (async () => {
      try {
        // Prepare the system message with context about the content
        const systemMessage = {
          role: "developer",
          content: `You are a helpful writing assistant that helps modify content. You should respond in a specific JSON format that describes the changes to make.

The current content is:
${initialContent}

Rules:
1. Keep the content as close to the original as possible
2. Use the same tone and style as the original content
3. Use the same language as the original content
4. Always maintain proper HTML formatting and structure

Your response should be a JSON object with this structure:
{
  "updates": [
    {
      "type": "insert" | "modify" | "delete",
      "position": "before" | "after" | "replace",
      "target": "section identifier (optional)",
      "content": "HTML content to insert/modify",
      "explanation": "Explanation of the changes"
    }
  ]
}

For example, if adding a new section:
{
  "updates": [
    {
      "type": "insert",
      "position": "after",
      "target": "h2:Vi er din autoriseret kloakservice i Hillerød",
      "content": "<h2>New Section Title</h2><p>New content...</p>",
      "explanation": "Added a new section about X after the authorization section"
    }
  ]
}`,
        };

        // Create the chat completion
        const completion = await openai.chat.completions.create({
          model: "o3-mini-2025-01-31",
          messages: [systemMessage, ...messages],
          stream: true,
          //temperature: 0.7,
        });

        let responseText = "";
        let currentMessage = "";

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          responseText += content;
          currentMessage += content;

          // Try to parse the response as JSON
          try {
            const updates = JSON.parse(responseText);
            if (updates.updates) {
              // Process each update
              for (const update of updates.updates) {
                // Send the content update
                await writer.write(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "content",
                      update,
                    })}\n\n`
                  )
                );

                // Send the explanation
                await writer.write(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "message",
                      content: update.explanation,
                    })}\n\n`
                  )
                );
              }
            }
          } catch (e) {
            // If we can't parse as JSON yet, just send the message
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "message",
                  content: currentMessage,
                })}\n\n`
              )
            );
          }
        }

        // Send completion message
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      } catch (error) {
        console.error("Error in chat processing:", error);
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "message",
              content:
                "Sorry, I encountered an error while processing your request. Please try again.",
            })}\n\n`
          )
        );
        await writer.close();
      }
    })();

    // Return the stream
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
