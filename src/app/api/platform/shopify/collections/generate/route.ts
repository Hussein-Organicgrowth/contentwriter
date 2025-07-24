import OpenAI from "openai";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OPENAI_MODEL_NAME = "gpt-4.1-2025-04-14"; // Use a constant for the model name

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
  body_html?: string;
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
  da: `Write in Danish using formal language. 
	 When writing in Danish, ensure the following rules are adhered to:

Verb Conjugation in Present Tense:

Add "-r" to the infinitive form of verbs to form the present tense.
Example: "at lære" becomes "jeg lærer."
Distinguishing "nogle" and "nogen":

Use "nogle" when referring to multiple people or things. Example: "Nogle mennesker har nemt ved grammatik."
Use "nogen" in questions, negatives, or conditionals. Example: "Er der nogen, der kan forklare mig reglerne?"
Compound Words:

Combine words if the emphasis is on the first part (e.g., "Dansklærer" for a Danish teacher).
Keep them separate if the emphasis is on the second part (e.g., "dansk lærer" for a teacher from Denmark).
Endings "-ende" vs. "-ene":

Use "-ende" for present participles (verbs), e.g., "løbende."
Use "-ene" for definite plural nouns, e.g., "løbene."
Pronoun Usage:

Use "jeg" as the subject. Example: "Laura og jeg spiser aftensmad."
Use "mig" as the object. Example: "Mads bad Laura og mig om at spise aftensmad."
Noun Genders and Articles:

Common gender nouns use "en," and neuter nouns use "et."
Examples: "en bil" (a car) and "et hus" (a house).
Definite Nouns:

Add "-en" for common gender nouns and "-et" for neuter nouns to make them definite.
Examples: "bilen" (the car) and "huset" (the house).
Adjective Agreement:

Match adjectives to the gender and number of the noun they describe.
Examples: "en stor dreng" (a big boy) vs. "et stort hus" (a big house).
Word Order:

Follow Subject-Verb-Object order, but ensure the verb is in the second position in main clauses (V2 word order).
Capitalization:

Capitalize only proper nouns and the first word of a sentence.
Example: Days, months, and nationalities are lowercase: "mandag," "juli," "dansk."
	  `,
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

// Reusable function to call OpenAI API
async function callOpenAICompletion(
  messages: ChatCompletionMessageParam[]
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL_NAME,
      messages: messages,
      // temperature: 0.7, // Consider making temperature configurable if needed
    });
    return completion.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    // Rethrow or handle as appropriate for your application's error strategy
    throw new Error("Failed to generate content from OpenAI.");
  }
}

async function getOutlineFromAPI(
  title: string,
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

// Helper function to generate the introduction
async function generateIntroduction(
  title: string,
  productSummary: string,
  website: WebsiteData,
  language: LanguageCode,
  currentDescription: string,
  targetCountry: CountryCode
): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "developer",
      content: `You are an expert e-commerce SEO copywriter specializing in collection page optimization. Your task is to create a highly engaging and SEO-optimized introduction for a collection page.

Brand Information:
- Brand Voice: ${website.toneofvoice}
- Target Audience: ${website.targetAudience}
- Brand Description: ${website.description}
- Brand name: ${website.name}

This is the current description: ${currentDescription} for the collection: ${title}, use that to get all the infromation you need.

Language & Market Context:
${languageInstructions[language]}
${countryContext[targetCountry]}

Introduction Requirements:
1. Create a compelling opening paragraph that includes the primary keyword (collection title)
2. Briefly explain what the collection offers and its main benefits
3. Include a high-level overview of the products in the collection
4. Set expectations for what customers will find in this collection
5. Use proper HTML formatting with <p> tags
6. Keep the introduction concise (2-3 paragraphs maximum)
7. Ensure the introduction is optimized for featured snippets

IMPORTANT RESTRICTIONS:
1. DO NOT include any "expert insights," "expert opinions," or claim expertise about the products
2. DO NOT make specific claims about product quality unless directly supported by the product information
3. DO NOT invent facts, statistics, or research findings
4. Focus ONLY on factual product information provided in the context
5. Use descriptive language about product features rather than evaluative claims about effectiveness

Return ONLY the HTML-formatted introduction content.`,
    },
    {
      role: "user",
      content: `Create an engaging introduction for the collection: "${title}"

Collection Information:
- ${productSummary}
- Current description (for context): ${currentDescription}

Return ONLY the HTML-formatted introduction (no heading tags, just paragraphs).`,
    },
  ];
  return callOpenAICompletion(messages);
}

// Helper function to generate content for a single section
async function generateSectionContent(
  title: string,
  section: { h2: string; h3s: string[] },
  productSummary: string,
  website: WebsiteData,
  language: LanguageCode,
  currentDescription: string,
  targetCountry: CountryCode
): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "developer",
      content: `You are an expert e-commerce SEO copywriter specializing in collection page optimization. Your task is to create highly engaging and SEO-optimized content for a specific section of a collection page.

Brand Information:
- Brand Voice: ${website.toneofvoice}
- Target Audience: ${website.targetAudience}
- Brand Description: ${website.description}
- Brand name: ${website.name}

This is the current description: ${currentDescription} for the collection: ${title}, use that to get all the infromation you need.

Language & Market Context:
${languageInstructions[language]}
${countryContext[targetCountry]}

Section Content Requirements:
1. Create content that specifically addresses the section topic (H2) and its subsections (H3s)
2. Include the section keyword naturally in the content
3. Write in a scannable format with short paragraphs (2-3 sentences max)
4. Include bullet points or numbered lists where appropriate
5. Highlight relevant product features and benefits
6. Use proper HTML formatting with appropriate heading tags and structure
7. Ensure the content is comprehensive yet concise
8. Optimize for both user experience and search engines

HTML Formatting Requirements:
- Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>
- Wrap the section in <section> tags
- Ensure proper nesting of HTML elements

IMPORTANT RESTRICTIONS:
1. DO NOT include any "expert insights," "expert opinions," or claim expertise about the products
2. DO NOT make specific claims about product quality unless directly supported by the product information
3. DO NOT invent facts, statistics, or research findings
4. DO NOT reference studies, surveys, or expert recommendations
5. Focus ONLY on factual product information provided in the context
6. Use descriptive language about product features rather than evaluative claims about effectiveness
7. Avoid phrases like "studies show," "experts recommend," or "research indicates"

Return ONLY the HTML-formatted section content.`,
    },
    {
      role: "user",
      content: `Create content for the following section of the "${title}" collection:

Main Section (H2): ${section.h2}
${section.h3s.length > 0 ? "Subsections (H3s):" : ""}
${section.h3s.map((h3) => `- ${h3}`).join("\n")}

Collection Information:
- ${productSummary}
- Current description (for context): ${currentDescription}

Return ONLY the HTML-formatted content for this specific section, including the H2 and H3 headings.`,
    },
  ];
  return callOpenAICompletion(messages);
}

// Helper function to generate the conclusion
async function generateConclusion(
  title: string,
  productSummary: string,
  website: WebsiteData,
  language: LanguageCode,
  currentDescription: string,
  targetCountry: CountryCode
): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "developer",
      content: `You are an expert e-commerce SEO copywriter specializing in collection page optimization. Your task is to create a compelling conclusion with a call-to-action for a collection page.

Brand Information:
- Brand Voice: ${website.toneofvoice}
- Target Audience: ${website.targetAudience}
- Brand Description: ${website.description}
- Brand name: ${website.name}

Language & Market Context:
${languageInstructions[language]}
${countryContext[targetCountry]}

Conclusion Requirements:
1. Create a compelling H2 heading for the conclusion section
2. Summarize the key benefits of the collection
3. Include a strong call-to-action that encourages purchases
4. Use persuasive language that builds urgency or desire
5. Include the primary keyword naturally
6. Use proper HTML formatting
7. Keep the conclusion concise but impactful

IMPORTANT RESTRICTIONS:
1. DO NOT include any "expert insights," "expert opinions," or claim expertise about the products
2. DO NOT make specific claims about product quality unless directly supported by the product information
3. DO NOT invent facts, statistics, or research findings
4. DO NOT reference studies, surveys, or expert recommendations
5. Focus ONLY on factual product information provided in the context
6. Use descriptive language about product features rather than evaluative claims about effectiveness
7. Avoid phrases like "studies show," "experts recommend," or "research indicates
8. DO NOT INCLUDE MATERIALS THAT DOESNT EXIST IN THE COLLECTION"

Return ONLY the HTML-formatted conclusion content.`,
    },
    {
      role: "user",
      content: `Create a compelling conclusion with call-to-action for the collection: "${title}"

Collection Information:
- ${productSummary}
- Current description (for context): ${currentDescription}

Return ONLY the HTML-formatted conclusion with a call-to-action.`,
    },
  ];
  return callOpenAICompletion(messages);
}

// Main function to generate the full collection description
async function generateCollectionDescription(
  title: string,
  outline: string,
  products: ShopifyProduct[],
  website: WebsiteData,
  language: LanguageCode,
  currentDescription: string,
  targetCountry: CountryCode
): Promise<string> {
  // Added return type
  // Parse the outline into sections
  const outlineLines = outline.split("\n").filter((line) => line.trim() !== "");
  const sections: { h2: string; h3s: string[] }[] = []; // Added type for sections

  let currentH2: string | null = null; // Added type
  let currentH3s: string[] = []; // Added type

  for (const line of outlineLines) {
    if (line.startsWith("H2:")) {
      // If we already have an H2 section, save it before starting a new one
      if (currentH2) {
        sections.push({
          h2: currentH2,
          h3s: [...currentH3s],
        });
        currentH3s = [];
      }
      currentH2 = line.substring(3).trim();
    } else if (line.startsWith("H3:")) {
      currentH3s.push(line.substring(3).trim());
    }
  }

  // Add the last section if there is one
  if (currentH2) {
    sections.push({
      h2: currentH2,
      h3s: [...currentH3s],
    });
  }

  // Prepare a concise product summary for the LLM
  console.log("products", JSON.stringify(products));
  const productSummary = `Number of products: ${
    products.length
  }. Product types: ${[...new Set(products.map((p) => p.product_type))].join(
    ", "
  )}. Product titles: ${products
    .map((p) => p.title)
    .slice(0, 10) // Limit to first 10 titles
    .join(", ")}${products.length > 10 ? "..." : ""}.
Product description snippets (first ${Math.min(3, products.length)} products):
${products
  .slice(0, 3) // Limit to first 3 products
  .map(
    (p) =>
      `- ${p.title}: ${
        p.body_html?.substring(0, 200).replace(/\s+/g, " ").trim() ||
        "(No description)"
      }...`
  )
  .join("\n")}`;
  console.log("productSummary", productSummary); // Keep console log for debugging if needed

  // Generate content using helper functions
  let fullContent = "";

  // Generate introduction
  const introduction = await generateIntroduction(
    title,
    productSummary,
    website,
    language,
    currentDescription,
    targetCountry
  );
  fullContent += introduction + "\n\n";

  // Generate content for each section
  for (const section of sections) {
    const sectionContent = await generateSectionContent(
      title,
      section,
      productSummary,
      website,
      language,
      currentDescription,
      targetCountry
    );
    fullContent += sectionContent + "\n\n";
  }

  // Generate a conclusion with call-to-action
  const conclusion = await generateConclusion(
    title,
    productSummary,
    website,
    language,
    currentDescription,
    targetCountry
  );
  fullContent += conclusion;

  return fullContent;
}

export async function POST(req: Request) {
  try {
    const {
      title,
      products,
      company,
      currentDescription,
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
      currentDescription,
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
