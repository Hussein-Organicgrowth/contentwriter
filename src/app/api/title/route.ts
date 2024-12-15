import OpenAI from 'openai';
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type LanguageKeys = 'en-US' | 'en-GB' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'nl' | 'pl' | 'sv' | 'da' | 'no' | 'fi';
type CountryKeys = 'US' | 'GB' | 'CA' | 'AU' | 'DE' | 'FR' | 'ES' | 'IT' | 'NL' | 'SE' | 'NO' | 'DK' | 'FI' | 'PL' | 'BR' | 'MX';

export async function POST(req: Request) {
  try {
    const { keyword, language = 'en-US', targetCountry = 'US' } = await req.json();
    console.log(keyword, language, targetCountry);
    const languageInstructions: { [key in LanguageKeys]: string } = {
      'en-US': 'Use American English spelling and terminology.',
      'en-GB': 'Use British English spelling and terminology.',
      'es': 'Write in Spanish using formal language.',
      'fr': 'Write in French using formal language.',
      'de': 'Write in German using formal language.',
      'it': 'Write in Italian using formal language.',
      'pt': 'Write in Portuguese using formal language.',
      'nl': 'Write in Dutch using formal language.',
      'pl': 'Write in Polish using formal language.',
      'sv': 'Write in Swedish using formal language.',
      'da': 'Write in Danish using formal language.',
      'no': 'Write in Norwegian using formal language.',
      'fi': 'Write in Finnish using formal language.',
    };

    const countryContext: { [key in CountryKeys]: string } = {
      'US': 'Target audience is in the United States.',
      'GB': 'Target audience is in the United Kingdom.',
      'CA': 'Target audience is in Canada.',
      'AU': 'Target audience is in Australia.',
      'DE': 'Target audience is in Germany.',
      'FR': 'Target audience is in France.',
      'ES': 'Target audience is in Spain.',
      'IT': 'Target audience is in Italy.',
      'NL': 'Target audience is in the Netherlands.',
      'SE': 'Target audience is in Sweden.',
      'NO': 'Target audience is in Norway.',
      'DK': 'Target audience is in Denmark.',
      'FI': 'Target audience is in Finland.',
      'PL': 'Target audience is in Poland.',
      'BR': 'Target audience is in Brazil.',
      'MX': 'Target audience is in Mexico.',
    };

    const languageKey: LanguageKeys = language;
    const targetCountryKey: CountryKeys = targetCountry;
    console.log(languageKey, targetCountryKey);

    const languageInstructionsValue = languageInstructions[languageKey] || 'Use American English spelling and terminology.';
    const countryContextValue = countryContext[targetCountryKey] || 'Target audience is in the United States.';

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional content writer who creates engaging, SEO-optimized titles.
          Make sure to follow the proper grammar and spelling of the target language.
          ${languageInstructionsValue}
          ${countryContextValue}
          Some countries don't make headlines capitalized, and some do. If the target country is not specified, assume it's the United States.

          Create a title that is:
          1. Attention-grabbing
          2. SEO-friendly
          3. Clear and concise
          4. Relevant to the topic
          5. Appropriate for the target audience`,
        },
        {
          role: "user",
          content: `Create a compelling title for an article about "${keyword}". Return only the title, no other text.`,
        },
      ],
      temperature: 0.7,
    });

    const title = completion.choices[0]?.message?.content?.trim() || "";

    return NextResponse.json({ title });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to generate title" },
      { status: 500 }
    );
  }
}
