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

async function fetchPageTitle(
  url: string,
  timeoutMs: number = 5000
): Promise<string | null> {
  try {
    console.log(`Fetching page title for: ${url}`);

    // Create an abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ContentBot/1.0)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const root = parse(html);

    // Try to get title from different sources
    const titleTag = root.querySelector("title");
    const h1Tag = root.querySelector("h1");
    const ogTitle = root.querySelector('meta[property="og:title"]');

    const title =
      titleTag?.text || h1Tag?.text || ogTitle?.getAttribute("content") || null;
    console.log(`Title found for ${url}: ${title}`);

    return title;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log(`Timeout fetching page title for: ${url}`);
    } else {
      console.error(`Error fetching page title for ${url}:`, error);
    }
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
  productTitle: string
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
  title: string,
  language: string
) {
  console.log("Starting internal link discovery process...");
  const startTime = Date.now();

  // Set a maximum timeout for the entire process (for future use)
  // const MAX_PROCESSING_TIME = 30000; // 30 seconds

  try {
    // Clean the website URL
    let websiteUrl = website.website;
    if (!websiteUrl.startsWith("http")) {
      websiteUrl = `https://${websiteUrl}`;
    }
    websiteUrl = websiteUrl.replace(/\/$/, "");

    // Fetch all URLs from sitemap
    const sitemapUrls = await fetchSitemapUrls(websiteUrl);
    if (sitemapUrls.length === 0) return description;

    console.log(`Found ${sitemapUrls.length} URLs in sitemap`);

    // Limit sitemap processing to prevent hanging on large sites
    const limitedSitemapUrls = sitemapUrls.slice(0, 500); // Limit to first 500 URLs
    console.log(
      `Processing ${limitedSitemapUrls.length} URLs (limited from ${sitemapUrls.length})`
    );

    // Get most relevant URLs based on URL structure and content
    const relevantUrls = getRelevantUrlsFromSitemap(limitedSitemapUrls, title);

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

    console.log(`Found ${finalRelevantUrls.length} relevant URLs to process`);

    if (finalRelevantUrls.length === 0) {
      console.log("No relevant URLs found, returning original description");
      return description;
    }

    // Fetch titles only for the most relevant URLs (limit to top 5 to prevent hanging)
    const urlsToProcess = finalRelevantUrls.slice(0, 5);
    console.log(`Processing ${urlsToProcess.length} URLs for page titles`);

    const urlsWithTitles = [];
    let successCount = 0;
    let failCount = 0;

    for (const urlData of urlsToProcess) {
      try {
        console.log(
          `Fetching title for URL ${successCount + failCount + 1}/${
            urlsToProcess.length
          }: ${urlData.loc}`
        );

        // Use shorter timeout for individual requests
        const pageTitle = await fetchPageTitle(urlData.loc, 3000);

        if (
          pageTitle &&
          !pageTitle.toLowerCase().includes(title.toLowerCase())
        ) {
          urlsWithTitles.push({
            url: urlData.loc,
            title: pageTitle,
          });
          successCount++;
          console.log(`Successfully processed: ${pageTitle}`);
        } else {
          console.log(
            `Skipped URL (no title or matches product): ${urlData.loc}`
          );
        }
      } catch (error) {
        failCount++;
        console.error(`Failed to process URL ${urlData.loc}:`, error);
      }

      // Add a small delay between requests to be respectful
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Break early if we have enough links or too many failures
      if (urlsWithTitles.length >= 3 || failCount >= 3) {
        console.log(
          `Stopping early: ${urlsWithTitles.length} successful, ${failCount} failed`
        );
        break;
      }
    }

    console.log(
      `Finished processing URLs: ${successCount} successful, ${failCount} failed, ${urlsWithTitles.length} usable titles`
    );

    if (urlsWithTitles.length === 0) {
      console.log(
        "No usable URLs found for internal linking, returning original description"
      );
      return description;
    }

    console.log(
      "Found usable URLs for internal linking:",
      urlsWithTitles.map((u) => u.title)
    );
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
    const languageKey = language as LanguageKeys;
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini-2025-04-14",
      messages: [
        {
          role: "developer",
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
9. KEEP ALL THE HEADINGS AND TAGS THE SAME AS THE ORIGINAL DESCRIPTION. 
10. DO NOT CHANGE THE ORIGINAL STRUCTURE OF THE DESCRIPTION. OR ANY FORMATTING LIKE UPPERCASE, LOWERCASE, BOLD, ITALIC, ETC.

Available pages to link to:
${urlsWithTitles.map((page) => `- ${page.title} (URL: ${page.url})`).join("\n")}
Follow the language instructions: ${languageInstructions[languageKey]}
Return ONLY the modified HTML with the new internal links added. Do not include any explanations or other text.`,
        },
        {
          role: "user",
          content: `Here's the product description. Add relevant internal links where appropriate:\n\n${description}`,
        },
      ],
      // temperature: 0.5,
    });
    const cleanDescription = completion.choices[0]?.message?.content
      ?.trim()
      .replace(/```html\n?|\n?```/g, "");

    const endTime = Date.now();
    console.log(
      `Internal linking process completed in ${endTime - startTime}ms`
    );

    return cleanDescription;
  } catch (error) {
    const endTime = Date.now();
    console.error(
      `Internal linking process failed after ${endTime - startTime}ms:`,
      error
    );

    // Return original description if internal linking fails
    return description;
  }
}

async function generateSeoMetadata(params: {
  keyword: string;
  description: string;
  language: LanguageKeys;
  country: CountryKeys;
}): Promise<{ title: string; metaDescription: string }> {
  const { keyword, description, language, country } = params;

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
    da: "Write in Danish using formal language.",
    no: "Write in Norwegian using formal language.",
    fi: "Write in Finnish using formal language.",
  };

  const countryContext: { [key in CountryKeys]: string } = {
    US: "The target market is the United States.",
    GB: "The target market is the United Kingdom.",
    CA: "The target market is Canada.",
    AU: "The target market is Australia.",
    DE: "The target market is Germany.",
    FR: "The target market is France.",
    ES: "The target market is Spain.",
    IT: "The target market is Italy.",
    NL: "The target market is the Netherlands.",
    SE: "The target market is Sweden.",
    NO: "The target market is Norway.",
    DK: "The target market is Denmark.",
    FI: "The target market is Finland.",
    PL: "The target market is Poland.",
    BR: "The target market is Brazil.",
    MX: "The target market is Mexico.",
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini-2025-04-14",
    messages: [
      {
        role: "developer",
        content: `You are an SEO strategist. Generate compelling metadata for product pages.

Guidelines:
- Create an SEO title up to 60 characters incorporating the main keyword "${keyword}".
- Write a meta description between 140 and 155 characters using the keyword and persuasive language.
- Ensure the copy is localized: ${languageInstructions[language]} ${countryContext[country]}
- Avoid quotation marks and promotional gimmicks. Focus on clarity and relevance.
- Return JSON in the shape { "title": string, "metaDescription": string }.
- ONLY return valid JSON.`,
      },
      {
        role: "user",
        content: `Keyword: ${keyword}

Description HTML:
${description}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    return { title: keyword, metaDescription: keyword };
  }

  try {
    const parsed = JSON.parse(raw) as {
      title?: string;
      metaDescription?: string;
    };

    return {
      title: parsed.title?.trim() || keyword,
      metaDescription: parsed.metaDescription?.trim() || keyword,
    };
  } catch (error) {
    console.error("Failed to parse SEO metadata response", error, raw);
    return {
      title: keyword,
      metaDescription: keyword,
    };
  }
}

async function generateSummary(
  description: string,
  company: string,
  website: WebsiteWithContent,
  language: LanguageKeys,
  country: CountryKeys
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini-2025-04-14",
    messages: [
      {
        role: "system",
        content:
          "You write concise HTML summaries for product descriptions. Return a single <p> element no longer than 250 characters, no line breaks.",
      },
      {
        role: "user",
        content: `Company: ${website.name}
Tone: ${website.toneofvoice}
Audience: ${website.targetAudience}
Language: ${language}
Country: ${country}

Product HTML description:
${description}`,
      },
    ],
    max_tokens: 200,
  });

  const summary = completion.choices[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error("Failed to generate summary");
  }

  return summary.replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  try {
    const {
      title,
      company,
      existingDescription,
      language = "en-US",
      targetCountry = "US",
      keyword,
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

    // Ensure language and country are valid keys with proper type checking
    const validLanguages: LanguageKeys[] = [
      "en-US",
      "en-GB",
      "es",
      "fr",
      "de",
      "it",
      "pt",
      "nl",
      "pl",
      "sv",
      "da",
      "no",
      "fi",
    ];
    const validCountries: CountryKeys[] = [
      "US",
      "GB",
      "CA",
      "AU",
      "DE",
      "FR",
      "ES",
      "IT",
      "NL",
      "SE",
      "NO",
      "DK",
      "FI",
      "PL",
      "BR",
      "MX",
    ];

    const languageKey: LanguageKeys = validLanguages.includes(
      language as LanguageKeys
    )
      ? (language as LanguageKeys)
      : "en-US";
    const targetCountryKey: CountryKeys = validCountries.includes(
      targetCountry as CountryKeys
    )
      ? (targetCountry as CountryKeys)
      : "US";

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
		

You are a professional copywriter and SEO specialist. Your primary task is to create engaging, scannable, and SEO-optimized product descriptions that balance user appeal and search engine visibility. 

Follow these detailed guidelines:

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
Your writting the product description for the company: ${
      website.name
    } and you work for this company. Make sure you we, us etc are used when referring to the company. 
You can also use the name of the company in the description. But you are person who works for the company.

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
- Make sure that the description contains atleast three h2 tags. You can add more if needed.
- The description should be between 300 and 500 words.
- Make sure that the description contain the right amount of headings and subheadings. So it is easy to read and scannable.

Required Inputs
- Product Name: ${title}
- Target Audience: ${website.targetAudience}
- Brand Summary: ${website.summary}
- Previous Description (for reference): ${
      existingDescription || "No previous description"
    }
- Target Language: ${languageKey}
- Target Country: ${targetCountryKey}
- Make sure that the new description contains all the information that the old description contains.

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
      model: "gpt-4.1-2025-04-14",
      messages: [
        {
          role: "developer",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Create a compelling product description for "${title}" in ${
            languageKey || "English"
          } for the ${
            targetCountryKey || "US"
          } market. Return only the HTML formatted description, no other text.`,
        },
      ],
      //   temperature: 0.7,
    });

    const description = completion.choices[0]?.message?.content?.trim() || "";
    const cleanDescription = description.replace(/```html\n?|\n?```/g, "");

    // Add internal links
    const descriptionWithLinks =
      (await findRelevantInternalLinks(
        website,
        cleanDescription,
        title,
        languageKey
      )) || cleanDescription; // Fallback to clean description if internal linking fails

    const mainKeyword = keyword || title;
    const seoMetadata = await generateSeoMetadata({
      keyword: mainKeyword,
      description: descriptionWithLinks,
      language: languageKey,
      country: targetCountryKey,
    });

    let summaryHtml: string | null = null;
    if (req.headers.get("x-description-destination") === "metafield") {
      summaryHtml = await generateSummary(
        descriptionWithLinks,
        company,
        website,
        languageKey,
        targetCountryKey
      );
    }

    return NextResponse.json({
      success: true,
      description: descriptionWithLinks,
      seoTitle: seoMetadata.title,
      seoDescription: seoMetadata.metaDescription,
      summaryHtml,
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
