import OpenAI from "openai";
import { NextResponse } from "next/server";

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

export async function POST(req: Request) {
	try {
		const {
			keyword,
			language = "en-US",
			targetCountry = "US",
			contentType,
			businessName,
		} = await req.json();
		console.log(keyword, language, targetCountry);
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

		const languageKey: LanguageKeys = language;
		const targetCountryKey: CountryKeys = targetCountry;

		const businessNameValue = businessName || "";
		console.log(businessNameValue);
		console.log(languageKey, targetCountryKey);

		const languageInstructionsValue =
			languageInstructions[languageKey] ||
			"Use American English spelling and terminology.";
		const countryContextValue =
			countryContext[targetCountryKey] ||
			"Target audience is in the United States.";

		const completion = await openai.chat.completions.create({
			model: "o3-mini-2025-01-31",
			messages: [
				{
					role: "developer",
					content: `You are a professional content writer specializing in creating engaging, SEO-optimized titles tailored to the specified language and target country. Ensure the titles are culturally relevant and adhere to the linguistic nuances of the target audience.
          
          Make sure to follow the language instructions:
          ${languageInstructionsValue}
          ${countryContextValue}
          Make sure that the proper for the lanuage is met. Like if the language doesn't capitlze the title word by word then don't capitalize it. 
          Only capitalize the first word of the title if the language requires it and capitalize the words that the language requires.


          Make sure that the title is relevant to the content type: ${contentType}

          
          Guidelines for the title:
          1. **Attention-Grabbing**: Capture the reader's interest immediately.
          2. **SEO-Friendly**: Incorporate relevant keywords naturally to enhance search engine visibility.
          3. **Clear and Concise**: Convey the main idea succinctly without unnecessary words.
          4. **Relevant to the Topic**: Ensure the title accurately reflects the content of the article.
          5. **Appropriate for the Target Audience**: Consider the preferences and expectations of the audience based on their location and language.
          6. Make sure that the title is for humans and not for search engines.
          7. Make sure that the title is not too long or too short.
          8. Make sure that the title is not too vague or too specific.
          9. Make sure that the title doesn't include : 
          Additionally, consider the following:
          - Avoid clickbait; aim for authenticity and value.
          - Utilize power words that evoke emotion or curiosity.
          - Maintain proper capitalization rules specific to the target language and country.
          - Ensure the title is unique and stands out among similar content.
		  - Make sure to format the title in a normal way and human way. DONT INCLUDE : or - or any other symbols.
          `,
				},
				{
					role: "user",
					content: `Create a compelling title for an article about "${keyword}". Return only the title, no other text. - If the business name is provided, make sure to include it in the title.
		  ${businessNameValue ? `- Business name: ${businessNameValue}` : ""}`,
				},
			],
			//	temperature: 0.7,
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
