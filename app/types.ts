export interface Scene {
  imagePrompt: string;
  videoPrompt: string;
  description: string;
  voiceover: string;
  charactersPresent: string[];
  imageBase64?: string;
  videoUri?: string | Promise<string>;
}

export interface Scenario {
  scenario: string;
  genre: string;
  mood: string;
  music: string;
  language: Language;
  characters: Array<{ name: string, description: string, imageBase64?: string }>;
  settings: Array<{ name: string, description: string }>;
  logoOverlay?: string;
  scenes: Scene[];
}

export interface Language {
  name: string;
  code: string;
} 