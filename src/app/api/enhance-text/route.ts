import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text, action, focus } = await req.json();

    let systemPrompt = "You are a professional content writer and editor. ";
    let userPrompt = "";

    switch (action) {
      case "expand":
        systemPrompt +=
          "You specialize in expanding text while maintaining the original style and tone.";
        userPrompt = `Expand the following text while maintaining its style and adding relevant details: "${text}"`;
        break;
      case "improve":
        systemPrompt +=
          "You specialize in improving text clarity and professionalism. Make sure to keep the original tone and style of the text and make sure to keep the same language.";
        userPrompt = `Improve this text by making it more clear, professional, and engaging while maintaining its core message: "${text}"`;
        break;
      case "explain":
        systemPrompt +=
          "You specialize in editing text. YOUR OUTPUT SHOULD ONLY BE THE EDITED TEXT AND NOTHING ELSE";
        userPrompt = focus
          ? `Edit the following text to improve it specifically in terms of ${focus}: "${text}"`
          : `Edit the following text to improve it in terms of clarity, structure, and effectiveness: "${text}"`;
        break;
      default:
        throw new Error("Invalid action specified");
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              );
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
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to enhance text" },
      { status: 500 }
    );
  }
}
