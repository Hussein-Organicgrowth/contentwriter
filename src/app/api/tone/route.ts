import OpenAI from 'openai';
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { sampleText } = await req.json();

    // First, get the detailed analysis
    const analysisCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing writing style and tone of voice. Provide a comprehensive analysis of the text's writing characteristics, including specific examples from the text when possible.",
        },
        {
          role: "user",
          content: `Analyze this text in detail: "${sampleText}"

Please provide a comprehensive analysis with these components:

1. Overall Tone:
- Emotional quality (e.g., professional, casual, friendly)
- Attitude towards the subject
- Level of formality

2. Writing Style:
- Sentence structure (e.g., complex, simple, varied)
- Paragraph organization
- Use of literary devices
- Technical vs. conversational balance

3. Voice Characteristics:
- Perspective (e.g., first-person, third-person)
- Author's personality
- Level of authority
- Relationship with reader

4. Language Patterns:
- Commonly used words and phrases
- Word choice characteristics
- Jargon or specialized terminology
- Transitional phrases

5. Engagement Elements:
- How it captures attention
- Persuasive techniques
- Reader involvement methods
- Call-to-action style`
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const detailedAnalysis = analysisCompletion.choices[0]?.message?.content || '';

    // Then, get a structured summary
    const summaryCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a writing style analyzer. Based on the detailed analysis provided, create a structured summary with key points for each category. Be concise and specific.",
        },
        {
          role: "user",
          content: `Based on this detailed analysis, provide a structured summary with bullet points for each category. Be specific and concise:

${detailedAnalysis}

Format your response EXACTLY as follows (keep the exact labels and use • for bullet points):

TONE:
• [key point about emotional quality]
• [key point about attitude]
• [key point about formality]

STYLE:
• [key point about sentence structure]
• [key point about organization]
• [key point about technical balance]

VOICE:
• [key point about perspective]
• [key point about authority]
• [key point about reader relationship]

LANGUAGE:
• [commonly used words/phrases]
• [jargon and terminology]
• [transitional elements]

ENGAGEMENT:
• [attention techniques]
• [persuasion methods]
• [call-to-action style]`
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const structuredSummary = summaryCompletion.choices[0]?.message?.content || '';

    // Parse the structured summary
    const sections: { [key: string]: string[] } = {
      tone: [],
      style: [],
      voice: [],
      language: [],
      engagement: []
    };

    let currentSection = '';
    const lines = structuredSummary.split('\n');
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      
      if (line.endsWith(':')) {
        currentSection = line.slice(0, -1).toLowerCase();
      } else if (line.startsWith('•') && currentSection) {
        sections[currentSection].push(line.slice(1).trim());
      }
    }

    return NextResponse.json({
      detailedAnalysis,
      tone: sections.tone.join('\n'),
      style: sections.style.join('\n'),
      voice: sections.voice.join('\n'),
      language: sections.language.join('\n'),
      engagement: sections.engagement.join('\n'),
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze tone" },
      { status: 500 }
    );
  }
}
