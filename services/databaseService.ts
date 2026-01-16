/**
 * Serviço de Banco de Dados (IndexedDB)
 * Armazena dados do CSV acumulativo para RAG
 */

import { DocumentChunk, EmbeddingVector } from '../types';

interface DBConfig {
  dbName: string;
  version: number;
}

interface StoredKnowledge {
  id: string;
  chunkId: string;
  content: string;
  processedContent: string;
  source: string;
  stage: string;
  embedding?: number[];
  keywords: string[];
  coherenceScore?: number;
  timestamp: string;
  metadata: Record<string, any>;
}

class KnowledgeDatabase {
  private db: IDBDatabase | null = null;
  private config: DBConfig;

  constructor(config: DBConfig = { dbName: 'KnowledgeGraph', version: 1 }) {
    this.config = config;
  }

  /**
   * Inicializa o banco de dados
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para chunks processados
        if (!db.objectStoreNames.contains('chunks')) {
          const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
          chunkStore.createIndex('source', 'source', { unique: false });
          chunkStore.createIndex('stage', 'stage', { unique: false });
          chunkStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para embeddings
        if (!db.objectStoreNames.contains('embeddings')) {
          const embeddingStore = db.createObjectStore('embeddings', { keyPath: 'id' });
          embeddingStore.createIndex('chunkId', 'chunkId', { unique: false });
        }

        // Store para índice de busca
        if (!db.objectStoreNames.contains('searchIndex')) {
          const indexStore = db.createObjectStore('searchIndex', { keyPath: 'id', autoIncrement: true });
          indexStore.createIndex('keyword', 'keyword', { unique: false });
          indexStore.createIndex('chunkId', 'chunkId', { unique: false });
        }

        // Store para cache de RAG
        if (!db.objectStoreNames.contains('ragCache')) {
          db.createObjectStore('ragCache', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Salva chunks do CSV no banco
   */
  async saveChunks(chunks: StoredKnowledge[]): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');

      let count = 0;
      chunks.forEach(chunk => {
        const request = store.put(chunk);
        request.onsuccess = () => count++;
        request.onerror = () => reject(request.error);
      });

      transaction.oncomplete = () => resolve(count);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Busca por relevância (busca semântica simplificada)
   */
  async searchByKeywords(keywords: string[], limit: number = 10): Promise<StoredKnowledge[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const allRequest = store.getAll();

      allRequest.onsuccess = () => {
        const allChunks = allRequest.result as StoredKnowledge[];
        
        // Calcula relevância baseado em match de keywords
        const scored = allChunks.map(chunk => {
          const matches = keywords.filter(kw => 
            chunk.content.toLowerCase().includes(kw.toLowerCase()) ||
            chunk.processedContent.toLowerCase().includes(kw.toLowerCase()) ||
            chunk.keywords.some(k => k.toLowerCase().includes(kw.toLowerCase()))
          ).length;
          
          return {
            chunk,
            score: matches / keywords.length
          };
        });

        // Ordena por score e retorna top N
        const results = scored
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(s => s.chunk);

        resolve(results);
      };

      allRequest.onerror = () => reject(allRequest.error);
    });
  }

  /**
   * Busca de conteúdo completo (full-text search)
   */
  async fullTextSearch(query: string, limit: number = 10): Promise<StoredKnowledge[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const allRequest = store.getAll();

      allRequest.onsuccess = () => {
        const allChunks = allRequest.result as StoredKnowledge[];
        const queryLower = query.toLowerCase();
        
        // Calcula score de relevância
        const scored = allChunks.map(chunk => {
          let score = 0;
          
          // Pontos por match na seção processada
          if (chunk.processedContent.toLowerCase().includes(queryLower)) {
            score += 3;
          }
          
          // Pontos por match no conteúdo original
          if (chunk.content.toLowerCase().includes(queryLower)) {
            score += 2;
          }
          
          // Pontos por match em keywords
          if (chunk.keywords.some(k => k.toLowerCase().includes(queryLower))) {
            score += 1;
          }
          
          return { chunk, score };
        });

        const results = scored
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(s => s.chunk);

        resolve(results);
      };

      allRequest.onerror = () => reject(allRequest.error);
    });
  }

  /**
   * Busca por similaridade de embedding (quando disponível)
   */
  async searchByEmbeddingSimilarity(
    embedding: number[],
    limit: number = 10
  ): Promise<Array<{ chunk: StoredKnowledge; similarity: number }>> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const allRequest = store.getAll();

      allRequest.onsuccess = () => {
        const allChunks = allRequest.result as StoredKnowledge[];
        
        const scored = allChunks
          .filter(chunk => chunk.embedding && chunk.embedding.length === embedding.length)
          .map(chunk => ({
            chunk,
            similarity: this.cosineSimilarity(embedding, chunk.embedding!)
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit);

        resolve(scored);
      };

      allRequest.onerror = () => reject(allRequest.error);
    });
  }

  /**
   * Calcula similaridade do cosseno entre dois vetores
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Obtém estatísticas do banco
   */
  async getStats(): Promise<{
    totalChunks: number;
    sources: string[];
    stages: string[];
    dateRange: { min: string; max: string };
  }> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const allRequest = store.getAll();

      allRequest.onsuccess = () => {
        const chunks = allRequest.result as StoredKnowledge[];
        const sources = [...new Set(chunks.map(c => c.source))];
        const stages = [...new Set(chunks.map(c => c.stage))];
        const timestamps = chunks.map(c => c.timestamp).sort();

        resolve({
          totalChunks: chunks.length,
          sources: sources as string[],
          stages: stages as string[],
          dateRange: {
            min: timestamps[0] || '',
            max: timestamps[timestamps.length - 1] || ''
          }
        });
      };

      allRequest.onerror = () => reject(allRequest.error);
    });
  }

  /**
   * Limpa todo o banco de dados
   */
  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chunks', 'embeddings', 'searchIndex', 'ragCache'], 'readwrite');
      
      transaction.objectStore('chunks').clear();
      transaction.objectStore('embeddings').clear();
      transaction.objectStore('searchIndex').clear();
      transaction.objectStore('ragCache').clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Exporta dados para análise
   */
  async exportAllChunks(): Promise<StoredKnowledge[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as StoredKnowledge[]);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton
let dbInstance: KnowledgeDatabase | null = null;

export async function getDatabase(): Promise<KnowledgeDatabase> {
  if (!dbInstance) {
    dbInstance = new KnowledgeDatabase();
    await dbInstance.initialize();
  }
  return dbInstance;
}

export type { StoredKnowledge, DBConfig };
export default KnowledgeDatabase;
