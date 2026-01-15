/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_OLLAMA_ENDPOINT: string;
  readonly VITE_OLLAMA_MODEL: string;
  readonly VITE_OLLAMA_EMBEDDING_MODEL: string;  readonly VITE_XIAOZHI_WEBSOCKET_URL?: string;
  readonly VITE_XIAOZHI_TOKEN?: string;
  readonly VITE_XIAOZHI_ENDPOINT?: string;  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
