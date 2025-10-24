// Environment variable loader for production
// Railway automatically provides environment variables

export function loadEnvironment() {
  // Railway provides PORT automatically
  process.env.PORT = process.env.PORT || '5000';
  
  // Set NODE_ENV if not provided
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';

  // Provide sensible defaults for new RAG configuration
  process.env.R2_DEFAULT_PREFIX = process.env.R2_DEFAULT_PREFIX || 'uploads';
  process.env.RAG_DEFAULT_CHUNK_SIZE = process.env.RAG_DEFAULT_CHUNK_SIZE || '800';
  process.env.RAG_CHUNK_OVERLAP = process.env.RAG_CHUNK_OVERLAP || '120';
  process.env.RAG_SIGNED_URL_TTL_SECONDS = process.env.RAG_SIGNED_URL_TTL_SECONDS || '900';
  process.env.GEMINI_COMPLETIONS_MODEL = process.env.GEMINI_COMPLETIONS_MODEL || 'gemini-1.5-pro';
  process.env.GEMINI_EMBEDDINGS_MODEL = process.env.GEMINI_EMBEDDINGS_MODEL || 'text-embedding-004';
  process.env.GEMINI_MAX_OUTPUT_TOKENS = process.env.GEMINI_MAX_OUTPUT_TOKENS || '2048';
  
  // Log configuration (for debugging)
  if (process.env.NODE_ENV === 'development') {
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '***configured***' : 'missing',
      AI_ANALYSIS_ENABLED: process.env.AI_ANALYSIS_ENABLED,
      R2_BUCKET: process.env.R2_BUCKET ? '***configured***' : 'missing',
      R2_S3_ENDPOINT: process.env.R2_S3_ENDPOINT || 'not-set',
      GEMINI_COMPLETIONS_MODEL: process.env.GEMINI_COMPLETIONS_MODEL,
      GEMINI_EMBEDDINGS_MODEL: process.env.GEMINI_EMBEDDINGS_MODEL,
    });
  }
}
