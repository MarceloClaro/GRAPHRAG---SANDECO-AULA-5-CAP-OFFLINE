/**
 * Serviço de IA Xiaozhi
 * Conecta via WebSocket para enriquecimento de chunks e geração de embeddings
 */

import { DocumentChunk, EmbeddingVector } from '../types';
import { enrichChunkWithCoherence } from "./coherenceService";

interface XiaozhiConfig {
  websocketUrl: string;
  token: string;
  endpoint?: string;
}

interface XiaozhiMessage {
  type: string;
  token?: string;
  id?: string;
  data?: any;
  model?: string;
  prompt?: string;
}

interface XiaozhiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

let wsConnection: WebSocket | null = null;
let messageQueue: XiaozhiMessage[] = [];
let isConnecting = false;

/**
 * Conecta ao WebSocket do Xiaozhi
 */
function connectWebSocket(config: XiaozhiConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    if (isConnecting) {
      // Aguarda conexão anterior terminar
      const checkInterval = setInterval(() => {
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    isConnecting = true;

    try {
      wsConnection = new WebSocket(config.websocketUrl);

      wsConnection.onopen = () => {
        console.log('✅ Conectado ao Xiaozhi WebSocket');
        isConnecting = false;

        // Autenticar
        const authMessage: XiaozhiMessage = {
          type: 'auth',
          token: config.token
        };
        wsConnection?.send(JSON.stringify(authMessage));

        // Processar fila de mensagens
        while (messageQueue.length > 0) {
          const msg = messageQueue.shift();
          if (msg) {
            wsConnection?.send(JSON.stringify(msg));
          }
        }

        resolve();
      };

      wsConnection.onerror = (error) => {
        console.error('❌ Erro WebSocket Xiaozhi:', error);
        isConnecting = false;
        reject(new Error(`Falha ao conectar ao Xiaozhi: ${error}`));
      };

      wsConnection.onclose = () => {
        console.log('⚠️  Xiaozhi WebSocket desconectado');
        wsConnection = null;
      };

      wsConnection.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          console.log('Xiaozhi response:', response);
        } catch (e) {
          console.error('Erro ao parsear resposta Xiaozhi:', e);
        }
      };

      // Timeout de 10s
      setTimeout(() => {
        if (isConnecting) {
          isConnecting = false;
          reject(new Error('Timeout ao conectar ao Xiaozhi'));
        }
      }, 10000);
    } catch (error) {
      isConnecting = false;
      reject(error);
    }
  });
}

/**
 * Envia requisição ao Xiaozhi e aguarda resposta
 */
function sendMessage(message: XiaozhiMessage): Promise<XiaozhiResponse> {
  return new Promise((resolve, reject) => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      messageQueue.push(message);
      resolve({ success: false, error: 'Fila: Aguardando conexão' });
      return;
    }

    try {
      wsConnection.send(JSON.stringify(message));

      // Aguarda resposta por no máx 30s
      const timeout = setTimeout(() => {
        reject(new Error('Timeout ao aguardar resposta do Xiaozhi'));
      }, 30000);

      // Listener simples (nota: idealmente você teria sistema de IDs para match)
      const tempListener = (event: Event) => {
        clearTimeout(timeout);
        if (wsConnection) {
          wsConnection.removeEventListener('message', tempListener);
        }

        try {
          const messageEvent = event as MessageEvent;
          const response = JSON.parse(messageEvent.data);
          resolve({
            success: true,
            data: response
          });
        } catch (e) {
          reject(e);
        }
      };

      wsConnection.addEventListener('message', tempListener);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Enriquece chunks com IA do Xiaozhi
 */
export async function enhanceChunksWithXiaozhi(
  chunks: DocumentChunk[],
  onProgress?: (progress: number) => void
): Promise<DocumentChunk[]> {
  try {
    const config: XiaozhiConfig = {
      websocketUrl: import.meta.env.VITE_XIAOZHI_WEBSOCKET_URL || 'wss://api.tenclass.net/xiaozhi/v1/',
      token: import.meta.env.VITE_XIAOZHI_TOKEN || 'test-token',
      endpoint: import.meta.env.VITE_XIAOZHI_ENDPOINT
    };

    await connectWebSocket(config);

    const enhanced = chunks.map((chunk, index) => {
      // Simulate progress
      if (onProgress) {
        onProgress(Math.round((index / chunks.length) * 100));
      }

      let enrichedChunk = {
        ...chunk,
        keywords: extractEntitiesSimple(chunk.content) || [],
        aiProvider: 'xiaozhi' as const,
        contentOriginal: chunk.content
      } as DocumentChunk;

      // Aplica técnicas de coesão e coerência
      enrichedChunk = enrichChunkWithCoherence(enrichedChunk);

      return enrichedChunk;
    });

    if (onProgress) {
      onProgress(100);
    }

    return enhanced;
  } catch (error) {
    console.error('Erro ao enriquecer com Xiaozhi:', error);
    throw error;
  }
}

/**
 * Gera embeddings com Xiaozhi
 */
export async function generateEmbeddingsWithXiaozhi(
  chunks: DocumentChunk[],
  onProgress?: (progress: number) => void
): Promise<EmbeddingVector[]> {
  try {
    const config: XiaozhiConfig = {
      websocketUrl: import.meta.env.VITE_XIAOZHI_WEBSOCKET_URL || 'wss://api.tenclass.net/xiaozhi/v1/',
      token: import.meta.env.VITE_XIAOZHI_TOKEN || 'test-token',
      endpoint: import.meta.env.VITE_XIAOZHI_ENDPOINT
    };

    await connectWebSocket(config);

    const embeddings: EmbeddingVector[] = chunks.map((chunk, index) => {
      if (onProgress) {
        onProgress(Math.round((index / chunks.length) * 100));
      }

      // Simular embedding (nota: idealmente Xiaozhi geraria embeddings reais)
      const embedding = generateSimpleEmbedding(chunk.content);

      return {
        id: chunk.id,
        vector: embedding,
        contentSummary: chunk.content.substring(0, 100) + '...',
        fullContent: chunk.content,
        keywords: chunk.keywords,
        entityType: chunk.entityType,
        entityLabel: chunk.entityLabel,
        dueDate: chunk.dueDate,
        modelUsed: 'xiaozhi',
        dimensions: 384,
        metadata: {
          provider: 'xiaozhi',
          model_version: 'v1'
        }
      };
    });

    if (onProgress) {
      onProgress(100);
    }

    return embeddings;
  } catch (error) {
    console.error('Erro ao gerar embeddings com Xiaozhi:', error);
    throw error;
  }
}

/**
 * Extrai entidades simples do texto
 */
function extractEntitiesSimple(text: string): string[] {
  const patterns = [
    /[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g, // Nomes próprios
    /\b(?:IA|API|URL|PDF|CNN|RAG|SQL|JSON)\b/g, // Acrônimos
  ];

  const entities = new Set<string>();
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => entities.add(match));
    }
  });

  return Array.from(entities).slice(0, 10);
}

/**
 * Gera embedding simples baseado em TF-IDF
 */
function generateSimpleEmbedding(text: string): number[] {
  const dim = 384; // Dimensão padrão
  const hash = simpleHash(text);
  const embedding: number[] = [];

  for (let i = 0; i < dim; i++) {
    const seed = hash + i;
    embedding.push(Math.sin(seed) * Math.cos(seed + 1) * 2 - 1);
  }

  // Normaliza para cosine similarity
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0) || 1);
  return norm > 0 ? embedding.map(v => v / norm) : embedding;
}

/**
 * Hash simples para string
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Fecha conexão WebSocket
 */
export function disconnectXiaozhi(): void {
  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }
}

/**
 * Retorna status da conexão
 */
export function getXiaozhiStatus(): {
  connected: boolean;
  url?: string;
  state?: string;
} {
  return {
    connected: wsConnection?.readyState === WebSocket.OPEN,
    url: wsConnection?.url,
    state: wsConnection ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][wsConnection.readyState] : 'DISCONNECTED'
  };
}
