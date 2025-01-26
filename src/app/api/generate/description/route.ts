import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Website } from "@/models/Website";
import OpenAI from "openai";
import { parse } from "node-html-parser";
import { XMLParser } from "fast-xml-parser";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type LanguageKeys =
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

type CountryKeys =
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

interface WebsiteContent {
  _id: string;
  title: string;
  status: "Published" | "Draft";
  html: string;
}

interface WebsiteWithContent {
  content: WebsiteContent[];
  name: string;
  description: string;
  summary: string;
  toneofvoice: string;
  targetAudience: string;
  website: string;
}

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

async function fetchSitemapUrls(websiteUrl: string): Promise<SitemapUrl[]> {
  try {
    // Try common sitemap locations
    const sitemapLocations = [
      "/sitemap.xml",
      "/sitemap_index.xml",
      "/sitemap/sitemap.xml",
      "/wp-sitemap.xml", // WordPress
      "/page-sitemap.xml", // WordPress specific
    ];

    for (const location of sitemapLocations) {
      try {
        const response = await fetch(`${websiteUrl}${location}`);
        if (response.ok) {
          const xmlText = await response.text();
          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "",
          });
          const result = parser.parse(xmlText);

          // Handle both single sitemap and sitemap index files
          if (result.sitemapindex) {
            // This is a sitemap index, we need to fetch each sitemap
            const sitemaps = Array.isArray(result.sitemapindex.sitemap)
              ? result.sitemapindex.sitemap
              : [result.sitemapindex.sitemap];

            const allUrls: SitemapUrl[] = [];
            for (const sitemap of sitemaps) {
              const sitemapResponse = await fetch(sitemap.loc);
              if (sitemapResponse.ok) {
                const sitemapXml = await sitemapResponse.text();
                const sitemapResult = parser.parse(sitemapXml);
                if (sitemapResult.urlset?.url) {
                  allUrls.push(
                    ...(Array.isArray(sitemapResult.urlset.url)
                      ? sitemapResult.urlset.url
                      : [sitemapResult.urlset.url])
                  );
                }
              }
            }
            return allUrls;
          } else if (result.urlset?.url) {
            // This is a single sitemap file
            return Array.isArray(result.urlset.url)
              ? result.urlset.url
              : [result.urlset.url];
          }
        }
      } catch (error) {
        console.error(`Error fetching sitemap at ${location}:`, error);
        continue;
      }
    }
    return [];
  } catch (error) {
    console.error("Error fetching sitemap:", error);
    return [];
  }
}

async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const html = await response.text();
    const root = parse(html);

    // Try to get title from different sources
    const titleTag = root.querySelector("title");
    const h1Tag = root.querySelector("h1");
    const ogTitle = root.querySelector('meta[property="og:title"]');

    return (
      titleTag?.text || h1Tag?.text || ogTitle?.getAttribute("content") || null
    );
  } catch (error) {
    console.error("Error fetching page title:", error);
    return null;
  }
}

function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  return track[str2.length][str1.length];
}

function calculateWordSimilarity(word1: string, word2: string): number {
  if (word1 === word2) return 1;
  if (word1.length < 3 || word2.length < 3) return 0;

  const distance = levenshteinDistance(word1, word2);
  const maxLength = Math.max(word1.length, word2.length);
  const similarity = 1 - distance / maxLength;

  // Boost similarity for words that start the same
  if (word1.startsWith(word2) || word2.startsWith(word1)) {
    return (similarity + 0.5) / 1.5; // Weighted boost
  }

  return similarity;
}

function findSimilarWords(word: string, targetWords: string[]): number {
  let maxSimilarity = 0;
  for (const target of targetWords) {
    const similarity = calculateWordSimilarity(
      word.toLowerCase(),
      target.toLowerCase()
    );
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }
  return maxSimilarity;
}

function getRelevantUrlsFromSitemap(
  sitemapUrls: SitemapUrl[],
  productTitle: string,
  description: string
): SitemapUrl[] {
  // Convert title to keywords and remove common product words
  const commonWords = [
    "with",
    "the",
    "and",
    "for",
    "from",
    "this",
    "that",
    "our",
    "your",
    "product",
    "item",
    "buy",
    "shop",
    "store",
    "price",
    "shipping",
    "cart",
  ];

  const titleWords = productTitle
    .toLowerCase()
    .split(/[\s-]+/)
    .filter((word) => word.length > 3 && !commonWords.includes(word));

  // Extract any category/type indicators from the title
  const possibleCategories = titleWords.filter((word) =>
    [
      "shirt",
      "pants",
      "shoes",
      "dress",
      "jacket",
      "accessories",
      "furniture",
      "electronics",
    ].includes(word)
  );

  // Create a map to store highest scoring URL for each normalized path
  const urlScoreMap = new Map<string, SitemapUrl & { score: number }>();

  sitemapUrls.map((url) => {
    const urlObj = new URL(url.loc);
    const urlPath = urlObj.pathname;
    const pathSegments = urlPath.toLowerCase().split(/[\/-]+/);

    // Skip certain URL patterns
    if (
      urlPath.includes("/page/") ||
      urlPath.includes("/tag/") ||
      urlPath.includes("/author/") ||
      urlPath.includes("/wp-") ||
      urlPath.match(/\d{4}\/\d{2}/) ||
      pathSegments.includes("cart") ||
      pathSegments.includes("checkout") ||
      pathSegments.includes("account") ||
      pathSegments.includes("login") ||
      pathSegments.includes("register")
    ) {
      return { ...url, score: -1 };
    }

    let score = 0;

    // Score based on URL structure
    if (pathSegments.length <= 3) score += 0.5;
    if (urlPath.includes("category")) score += 1;
    if (urlPath.includes("collection")) score += 1;
    if (urlPath.includes("guide")) score += 1.5;
    if (urlPath.includes("blog")) score += 0.5;

    // Check for category matches with similarity scoring
    if (possibleCategories.length > 0) {
      for (const category of possibleCategories) {
        const categorySimilarity = findSimilarWords(category, pathSegments);
        score += categorySimilarity * 3; // High weight for category matches
      }
    }

    // Score based on keyword matches with similarity scoring
    for (const word of titleWords) {
      const wordSimilarity = findSimilarWords(word, pathSegments);
      if (wordSimilarity > 0.8) {
        // High similarity
        score += 2 * wordSimilarity;
      } else if (wordSimilarity > 0.6) {
        // Medium similarity
        score += wordSimilarity;
      } else if (wordSimilarity > 0.4) {
        // Low similarity
        score += 0.5 * wordSimilarity;
      }
    }

    // Additional semantic scoring for URL segments
    const urlWords = pathSegments.filter((segment) => segment.length > 3);
    for (const urlWord of urlWords) {
      const similarity = findSimilarWords(urlWord, titleWords);
      if (similarity > 0.7) {
        score += similarity;
      }
    }

    // Penalize certain patterns
    if (urlPath.includes("page")) score -= 0.5;
    if (pathSegments.length > 4) score -= 0.2;

    // Normalize the URL by removing trailing slashes and converting to lowercase
    const normalizedUrl = url.loc.toLowerCase().replace(/\/+$/, "");

    // Only keep the highest scoring version of each URL
    const existingUrl = urlScoreMap.get(normalizedUrl);
    if (!existingUrl || existingUrl.score < score) {
      urlScoreMap.set(normalizedUrl, { ...url, score });
    }

    return { ...url, score };
  });

  // Convert map back to array, filter and sort
  return Array.from(urlScoreMap.values())
    .filter((url) => url.score > 1.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

async function findRelevantInternalLinks(
  website: WebsiteWithContent,
  description: string,
  title: string
) {
  // Clean the website URL
  let websiteUrl = website.website;
  if (!websiteUrl.startsWith("http")) {
    websiteUrl = `https://${websiteUrl}`;
  }
  websiteUrl = websiteUrl.replace(/\/$/, "");

  // Fetch all URLs from sitemap
  const sitemapUrls = await fetchSitemapUrls(websiteUrl);
  if (sitemapUrls.length === 0) return description;

  // Get most relevant URLs based on URL structure and content
  const relevantUrls = getRelevantUrlsFromSitemap(
    sitemapUrls,
    title,
    description
  );

  // Additional check for duplicates in relevantUrls
  const uniqueUrls = new Map<string, SitemapUrl>();
  for (const url of relevantUrls) {
    const normalizedUrl = url.loc.toLowerCase().replace(/\/+$/, "");
    if (!uniqueUrls.has(normalizedUrl)) {
      uniqueUrls.set(normalizedUrl, url);
    }
  }

  const finalRelevantUrls = Array.from(uniqueUrls.values());
  console.log(
    "Final unique relevant URLs:",
    finalRelevantUrls.map((u) => u.loc)
  );

  if (finalRelevantUrls.length === 0) return description;

  // Fetch titles only for the most relevant URLs
  const urlsWithTitles = [];
  for (const urlData of finalRelevantUrls) {
    const pageTitle = await fetchPageTitle(urlData.loc);
    if (pageTitle && !pageTitle.toLowerCase().includes(title.toLowerCase())) {
      urlsWithTitles.push({
        url: urlData.loc,
        title: pageTitle,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  if (urlsWithTitles.length === 0) return description;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini-2024-07-18",
    messages: [
      {
        role: "system",
        content: `You are an expert at internal linking and SEO. Your task is to analyze a product description and find opportunities to add relevant internal links from the website's pages.

Rules for adding internal links:
1. Only add links that are truly relevant and add value
2. Don't overdo it - 2-3 links maximum
3. Links should flow naturally within the text
4. Don't change the core message or structure
5. Maintain the original language and tone
6. Only link to content that's clearly related to what's being discussed
7. Return the HTML with the new links added
8. Use the exact URLs provided - don't modify them

Available pages to link to:
${urlsWithTitles.map((page) => `- ${page.title} (URL: ${page.url})`).join("\n")}

Return ONLY the modified HTML with the new internal links added. Do not include any explanations or other text.`,
      },
      {
        role: "user",
        content: `Here's the product description. Add relevant internal links where appropriate:\n\n${description}`,
      },
    ],
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() || description;
}

export async function POST(req: Request) {
  try {
    const {
      title,
      company,
      existingDescription,
      language = "en-US",
      targetCountry = "US",
    } = await req.json();

    if (!title || !company) {
      return NextResponse.json(
        { error: "Title and company are required" },
        { status: 400 }
      );
    }

    const languageInstructions: { [key in LanguageKeys]: string } = {
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

    const countryContext: { [key in CountryKeys]: string } = {
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

    const languageKey = language as LanguageKeys;
    const targetCountryKey = targetCountry as CountryKeys;

    const languageInstructionsValue =
      languageInstructions[languageKey] ||
      "Use American English spelling and terminology.";
    const countryContextValue =
      countryContext[targetCountryKey] ||
      "Target audience is in the United States.";

    await connectToDatabase();

    // Get the website document to access company information
    const website = await Website.findOne({ name: company });
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    // Create the prompt using website information
    const systemPrompt = ` 
		

You are a professional copywriter and SEO specialist. Your primary task is to create engaging, scannable, and SEO-optimized product descriptions that balance user appeal and search engine visibility. Follow these detailed guidelines:

Language and Locale Instructions:
${languageInstructionsValue}
${countryContextValue}
Make sure to follow proper language conventions, including:
- Appropriate currency formats and symbols
- Date and number formatting for the target locale
- Cultural references and idioms appropriate for the target market
- Local measurement units and sizing conventions

Role and Tone
Write in a ${website.toneofvoice} voice that resonates with ${
      website.targetAudience
    }.
Reflect the brand's identity as described: ${website.description}
Your writting the product description for the company: ${website.name}

Content Structure
- Begin with a compelling sentence that addresses a relatable problem, need, or aspiration to immediately engage the reader.
- Highlight the product's features by transforming them into benefits.
- Use bullet points or concise paragraphs for easy readability and scannability.
- End with a strong, action-oriented Call-to-Action (CTA) appropriate for the target locale.

SEO Optimization
- Primary Keyword: ${title}
- Incorporate the primary keyword naturally within the first 100 words, subheadings, and 2-3 times throughout the description.
- Include secondary keywords from the product name and category.
- Avoid keyword stuffing and ensure that content flows naturally.
- Consider local SEO practices and search patterns for the target market.

Required Inputs
- Product Name: ${title}
- Target Audience: ${website.targetAudience}
- Brand Summary: ${website.summary}
- Previous Description (for reference): ${
      existingDescription || "No previous description"
    }
- Target Language: ${languageKey}
- Target Country: ${targetCountryKey}

Writing Style Rules
- Keep sentences concise (under 25 words each).
- Use active voice to create an engaging tone.
- Maintain a balance between readability and sophistication.
- Ensure the tone matches: ${website.toneofvoice}
- Follow local writing conventions and style guides.

IMPORTANT: Return ONLY the HTML formatted description. Do not include any other text, explanations, or code fence markers.
Use these HTML tags directly (without markdown code fences):
- <h2> for main sections
- <h3> for subsections
- <p> for paragraphs
- <ul> and <li> for bullet points
- <strong> for emphasis
- <br> for line breaks when needed`;

    const completion = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Create a compelling product description for "${title}" in ${languageKey} for the ${targetCountryKey} market. Return only the HTML formatted description, no other text.`,
        },
      ],
      temperature: 0.7,
    });

    const description = completion.choices[0]?.message?.content?.trim() || "";
    const cleanDescription = description.replace(/```html\n?|\n?```/g, "");

    // Add internal links
    const descriptionWithLinks = await findRelevantInternalLinks(
      website,
      cleanDescription,
      title
    );

    return NextResponse.json({
      success: true,
      description: descriptionWithLinks,
    });
  } catch (error: unknown) {
    console.error("Error generating description:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
