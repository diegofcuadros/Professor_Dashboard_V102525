import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiConfig {
  apiKey: string;
  completionsModel: string;
  embeddingsModel: string;
  maxOutputTokens: number;
}

let cachedConfig: GeminiConfig | null = null;
let cachedClient: GoogleGenerativeAI | null = null;

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function getGeminiConfig(): GeminiConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY is required to use Gemini. Please set it before enabling the RAG chatbot."
    );
  }

  cachedConfig = {
    apiKey,
    completionsModel: process.env.GEMINI_COMPLETIONS_MODEL || "gemini-1.5-pro",
    embeddingsModel: process.env.GEMINI_EMBEDDINGS_MODEL || "text-embedding-004",
    maxOutputTokens: parsePositiveInteger(process.env.GEMINI_MAX_OUTPUT_TOKENS, 2048),
  };

  return cachedConfig;
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getGeminiConfig();
  cachedClient = new GoogleGenerativeAI(config.apiKey);
  return cachedClient;
}
