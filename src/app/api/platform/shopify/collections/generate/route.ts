import OpenAI from "openai";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";
import { chatModels } from "@/utils/chatmodels";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type LanguageCode =
  | "en-US"
  | "en-GB"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "nl"
  | "pl"
  | "sv"
  | "da"
  | "no"
  | "fi";

type CountryCode =
  | "US"
  | "GB"
  | "CA"
  | "AU"
  | "DE"
  | "FR"
  | "ES"
  | "IT"
  | "NL"
  | "SE"
  | "NO"
  | "DK"
  | "FI"
  | "PL"
  | "BR"
  | "MX";

interface ShopifyProduct {
  id: number;
  title: string;
  product_type: string;
  vendor: string;
  status: string;
  image?: {
    src: string;
    alt?: string;
  };
}

interface WebsiteData {
  name: string;
  description: string;
  toneofvoice: string;
  targetAudience: string;
}

const languageInstructions: Record<LanguageCode, string> = {
  "en-US": "Use American English spelling and terminology.",
  "en-GB": "Use British English spelling and terminology.",
  es: "Write in Spanish using formal language.",
  fr: "Write in French using formal language.",
  de: "Write in German using formal language.",
  it: "Write in Italian using formal language.",
  pt: "Write in Portuguese using formal language.",
  nl: "Write in Dutch using formal language.",
  pl: "Write in Polish using formal language.",
  sv: "Write in Swedish using formal language.",
  da: "Write in Danish using formal language.",
  no: "Write in Norwegian using formal language.",
  fi: "Write in Finnish using formal language.",
};

const countryContext: Record<CountryCode, string> = {
  US: "Target audience is in the United States.",
  GB: "Target audience is in the United Kingdom.",
  CA: "Target audience is in Canada.",
  AU: "Target audience is in Australia.",
  DE: "Target audience is in Germany.",
  FR: "Target audience is in France.",
  ES: "Target audience is in Spain.",
  IT: "Target audience is in Italy.",
  NL: "Target audience is in the Netherlands.",
  SE: "Target audience is in Sweden.",
  NO: "Target audience is in Norway.",
  DK: "Target audience is in Denmark.",
  FI: "Target audience is in Finland.",
  PL: "Target audience is in Poland.",
  BR: "Target audience is in Brazil.",
  MX: "Target audience is in Mexico.",
};

async function getOutlineFromAPI(
  title: string,
  products: ShopifyProduct[],
  language: LanguageCode,
  targetCountry: CountryCode
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/outline`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyword: title,
          title: title,
          language,
          targetCountry,
          contentType: "collection",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to generate outline");
    }

    const data = await response.json();
    return data.outline.join("\n");
  } catch (error) {
    console.error("Error getting outline:", error);
    throw error;
  }
}

async function generateCollectionDescription(
  title: string,
  outline: string,
  products: ShopifyProduct[],
  website: WebsiteData,
  language: LanguageCode,
  targetCountry: CountryCode
) {
  const completion = await openai.chat.completions.create({
    model: chatModels.main,
    messages: [
      {
        role: "system",
        content: `You are an expert e-commerce copywriter. Your task is to create an engaging and SEO-optimized collection description following the provided outline.

Brand Voice: ${website.toneofvoice}
Target Audience: ${website.targetAudience}
Brand Description: ${website.description}

${languageInstructions[language]}
${countryContext[targetCountry]}

Follow these guidelines:
1. Use the outline structure exactly as provided
2. Maintain consistent brand voice and tone
3. Include relevant product details and benefits
4. Optimize for SEO while keeping content natural
5. Create compelling calls-to-action
6. Use HTML tags for formatting (h2, h3, p, ul, li)

Return ONLY the formatted HTML description.`,
      },
      {
        role: "user",
        content: `Create a collection description for: "${title}"

Number of products: ${products.length}
Product types: ${[...new Set(products.map((p) => p.product_type))].join(", ")}
Brands/Vendors: ${[...new Set(products.map((p) => p.vendor))].join(", ")}

Outline to follow:
${outline}

Generate a complete collection description following this outline. Return only the HTML formatted content.`,
      },
    ],
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() || "";
}

export async function POST(req: Request) {
  try {
    const {
      title,
      products,
      company,
      language = "en-US",
      targetCountry = "US",
    } = await req.json();

    if (!title || !company || !products) {
      return NextResponse.json(
        { error: "Title, company, and products are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const website = await Website.findOne({ name: company });

    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    // Step 1: Get the outline from the existing outline API
    const outline = await getOutlineFromAPI(
      title,
      products,
      language as LanguageCode,
      targetCountry as CountryCode
    );

    // Step 2: Generate the full description using the outline
    const description = await generateCollectionDescription(
      title,
      outline,
      products,
      website,
      language as LanguageCode,
      targetCountry as CountryCode
    );

    return NextResponse.json({
      success: true,
      outline,
      description,
    });
  } catch (error: unknown) {
    console.error("Error generating collection description:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
