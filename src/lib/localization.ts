export interface Language {
  code: string;
  name: string;
  instruction: string;
}

export interface Country {
  code: string;
  name: string;
  context: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en-US', name: 'English (US)', instruction: 'Use American English spelling and terminology.' },
  { code: 'en-GB', name: 'English (UK)', instruction: 'Use British English spelling and terminology.' },
  { code: 'es', name: 'Spanish', instruction: 'Write in Spanish using formal language.' },
  { code: 'fr', name: 'French', instruction: 'Write in French using formal language.' },
  { code: 'de', name: 'German', instruction: 'Write in German using formal language.' },
  { code: 'it', name: 'Italian', instruction: 'Write in Italian using formal language.' },
  { code: 'pt', name: 'Portuguese', instruction: 'Write in Portuguese using formal language.' },
  { code: 'nl', name: 'Dutch', instruction: 'Write in Dutch using formal language.' },
  { code: 'pl', name: 'Polish', instruction: 'Write in Polish using formal language.' },
  { code: 'sv', name: 'Swedish', instruction: 'Write in Swedish using formal language.' },
  { code: 'da', name: 'Danish', instruction: 'Write in Danish using formal language.' },
  { code: 'no', name: 'Norwegian', instruction: 'Write in Norwegian using formal language.' },
  { code: 'fi', name: 'Finnish', instruction: 'Write in Finnish using formal language.' },
];

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', context: 'Target audience is in the United States.' },
  { code: 'GB', name: 'United Kingdom', context: 'Target audience is in the United Kingdom.' },
  { code: 'CA', name: 'Canada', context: 'Target audience is in Canada.' },
  { code: 'AU', name: 'Australia', context: 'Target audience is in Australia.' },
  { code: 'DE', name: 'Germany', context: 'Target audience is in Germany.' },
  { code: 'FR', name: 'France', context: 'Target audience is in France.' },
  { code: 'ES', name: 'Spain', context: 'Target audience is in Spain.' },
  { code: 'IT', name: 'Italy', context: 'Target audience is in Italy.' },
  { code: 'NL', name: 'Netherlands', context: 'Target audience is in the Netherlands.' },
  { code: 'SE', name: 'Sweden', context: 'Target audience is in Sweden.' },
  { code: 'NO', name: 'Norway', context: 'Target audience is in Norway.' },
  { code: 'DK', name: 'Denmark', context: 'Target audience is in Denmark.' },
  { code: 'FI', name: 'Finland', context: 'Target audience is in Finland.' },
  { code: 'PL', name: 'Poland', context: 'Target audience is in Poland.' },
  { code: 'BR', name: 'Brazil', context: 'Target audience is in Brazil.' },
  { code: 'MX', name: 'Mexico', context: 'Target audience is in Mexico.' },
];

export const getLanguageInstruction = (code: string): string => {
  const language = LANGUAGES.find(lang => lang.code === code);
  return language?.instruction || LANGUAGES[0].instruction;
};

export const getCountryContext = (code: string): string => {
  const country = COUNTRIES.find(c => c.code === code);
  return country?.context || COUNTRIES[0].context;
};
