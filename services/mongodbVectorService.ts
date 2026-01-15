/**
 * MongoDB Atlas Vector Search Integration
 * Compatível com Voyage-3 e embeddings de 1536 dimensões
 */

export interface MongoDBVectorConfig {
  connectionString: string;
  database: string;
  collection: string;
  vectorIndex: string; // Nome do índice vector search
  queryVectorCount: number; // Quantos vetores retornar
}

export interface VectorSearchResult {
  id: string;
  score: number;
  content: string;
  entityType: string;
  keywords: string[];
  metadata: Record<string, any>;
}

/**
 * Operação de busca semântica via MongoDB Vector Search
 * Usa aggregation pipeline com $search
 */
export const semanticSearchMongoDB = async (
  queryVector: number[],
  config: MongoDBVectorConfig,
  topK: number = 10
): Promise<VectorSearchResult[]> => {
  try {
    const pipeline = [
      {
        $search: {
          cosmosSearch: true,
          vector: queryVector,
          k: topK,
          efSearch: 40
        },
        returnDocument: 'merged'
      },
      {
        $project: {
          similarityScore: { $meta: 'searchScore' },
          document: '$$ROOT'
        }
      },
      {
        $limit: topK
      }
    ];

    // Em uma app real, você chamaria sua API backend
    // que faz a conexão com MongoDB
    const response = await fetch('/api/search/semantic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: queryVector,
        topK: topK,
        collection: config.collection
      })
    });

    if (!response.ok) {
      throw new Error(`MongoDB search error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error: any) {
    console.error('Erro na busca MongoDB Vector Search:', error.message);
    return [];
  }
};

/**
 * Índice MongoDB Vector Search
 * Configuração para criar índice em um collection
 */
export const createMongoDBVectorIndex = async (config: MongoDBVectorConfig) => {
  const indexDefinition = {
    name: config.vectorIndex,
    type: 'vector',
    definition: {
      "fields": [
        {
          "type": "vector",
          "path": "embedding",
          "similarity": "cosine",
          "dimensions": 1536
        },
        {
          "type": "filter",
          "path": "entityType"
        },
        {
          "type": "filter",
          "path": "keywords"
        },
        {
          "type": "filter",
          "path": "metadata.provider"
        }
      ]
    }
  };

  return indexDefinition;
};

/**
 * Exemplo de schema do documento para MongoDB
 */
export const mongoDBDocumentSchema = {
  _id: "ObjectId",
  id: "string (chunk_id)",
  content: "string",
  embedding: "array[number] (1536 dimensões)",
  entityType: "string",
  entityLabel: "string",
  keywords: "array[string]",
  sourceFile: "string",
  pageNumber: "number",
  tokens: "number",
  modelUsed: "string",
  createdAt: "date",
  updatedAt: "date",
  metadata: {
    provider: "string (ollama|xiaozhi|gemini)",
    model_version: "string",
    semantic_role: "string",
    complexity_score: "number",
    reference_links: "array[string]"
  }
};

/**
 * Bulk insert de embeddings no MongoDB via backend
 */
export const bulkInsertEmbeddingsMongoDB = async (
  embeddings: Array<any>,
  collection: string
): Promise<{ insertedCount: number; errors: string[] }> => {
  try {
    const response = await fetch('/api/mongodb/bulk-insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection: collection,
        documents: embeddings.map((emb, idx) => ({
          id: emb.id,
          content: emb.fullContent,
          embedding: emb.vector,
          entityType: emb.entityType,
          entityLabel: emb.entityLabel,
          keywords: emb.keywords,
          sourceFile: emb.metadata?.sourceFile || 'unknown',
          pageNumber: emb.metadata?.pageNumber || 0,
          tokens: emb.metadata?.tokens || 0,
          modelUsed: emb.modelUsed,
          dimensions: emb.vector.length,
          createdAt: new Date(),
          metadata: {
            provider: emb.metadata?.provider || 'unknown',
            model_version: emb.metadata?.model_version || '1.0'
          }
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Bulk insert error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Erro ao fazer bulk insert no MongoDB:', error.message);
    return { insertedCount: 0, errors: [error.message] };
  }
};

/**
 * Consulta com múltiplos filtros no MongoDB
 */
export const queryMongoDB = async (
  filters: {
    entityType?: string;
    keywords?: string[];
    provider?: string;
    pageNumber?: number;
  },
  collection: string,
  limit: number = 100
): Promise<any[]> => {
  try {
    const query = {} as any;

    if (filters.entityType) {
      query.entityType = filters.entityType;
    }

    if (filters.keywords && filters.keywords.length > 0) {
      query.keywords = { $in: filters.keywords };
    }

    if (filters.provider) {
      query['metadata.provider'] = filters.provider;
    }

    if (typeof filters.pageNumber === 'number') {
      query.pageNumber = filters.pageNumber;
    }

    const response = await fetch('/api/mongodb/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection,
        query,
        limit
      })
    });

    if (!response.ok) {
      throw new Error(`Query error: ${response.status}`);
    }

    const data = await response.json();
    return data.documents || [];
  } catch (error: any) {
    console.error('Erro na query MongoDB:', error.message);
    return [];
  }
};

/**
 * Atualização de embeddings (útil para refinamentos)
 */
export const updateEmbeddingMongoDB = async (
  id: string,
  newVector: number[],
  collection: string
): Promise<boolean> => {
  try {
    const response = await fetch('/api/mongodb/update-embedding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection,
        id,
        embedding: newVector,
        updatedAt: new Date()
      })
    });

    return response.ok;
  } catch (error: any) {
    console.error(`Erro ao atualizar embedding ${id}:`, error.message);
    return false;
  }
};

/**
 * Agregação com Vector Search
 * Combina busca semântica com filtros estruturados
 */
export const aggregateVectorSearch = async (
  queryVector: number[],
  filters: { entityType?: string; provider?: string },
  collection: string,
  topK: number = 20
): Promise<VectorSearchResult[]> => {
  try {
    const response = await fetch('/api/mongodb/aggregate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection,
        vector: queryVector,
        filters,
        topK
      })
    });

    if (!response.ok) {
      throw new Error(`Aggregate error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error: any) {
    console.error('Erro na agregação:', error.message);
    return [];
  }
};
