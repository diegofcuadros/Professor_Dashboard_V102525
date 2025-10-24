export interface RagConfig {
  chunkSize: number;
  chunkOverlap: number;
  signedUrlTtlSeconds: number;
}

const parseNumericEnv = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

let cachedConfig: RagConfig | null = null;

export function getRagConfig(): RagConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    chunkSize: parseNumericEnv(process.env.RAG_DEFAULT_CHUNK_SIZE, 800),
    chunkOverlap: parseNumericEnv(process.env.RAG_CHUNK_OVERLAP, 120),
    signedUrlTtlSeconds: parseNumericEnv(process.env.RAG_SIGNED_URL_TTL_SECONDS, 900),
  };

  return cachedConfig;
}
