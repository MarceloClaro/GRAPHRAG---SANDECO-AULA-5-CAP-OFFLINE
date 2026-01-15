/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_OLLAMA_ENDPOINT: string;
  readonly VITE_ANALYSIS_MODEL: string;
  readonly VITE_EMBEDDING_MODEL: string;
  readonly VITE_MONGODB_VECTOR: string;
  readonly VITE_XIAOZHI_API_KEY: string;
  readonly VITE_MONGODB_CONNECTION_STRING: string;
  readonly VITE_MONGODB_DATABASE: string;
  readonly VITE_MONGODB_COLLECTION: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_DEBUG_MODE: string;
  readonly VITE_LOG_LEVEL: string;
  readonly VITE_ENABLE_TRACING: string;
  readonly VITE_MAX_CONCURRENT_REQUESTS: string;
  readonly VITE_BATCH_SIZE_EMBEDDINGS: string;
  readonly VITE_BATCH_SIZE_ANALYSIS: string;
  readonly VITE_REQUEST_TIMEOUT: string;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
