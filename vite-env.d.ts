/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_OLLAMA_ENDPOINT: string;
  readonly VITE_OLLAMA_MODEL: string;
  readonly VITE_OLLAMA_EMBEDDING_MODEL: string;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
