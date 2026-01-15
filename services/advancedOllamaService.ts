import { DocumentChunk, EmbeddingVector } from "../types";

/**
 * Serviço avançado Ollama com suporte a:
 * - DeepSeek (análise e código)
 * - Voyage-3 (embeddings de qualidade premium)
 * - MongoDB Atlas Vector Search compatibility
 * - API xiaozhi.me (fallback + suporte adicional)
 */

export interface AdvancedOllamaConfig {
  ollamaEndpoint: string;
  xiaozhi: {
    endpoint: string;
    apiKey: string;
  };
  models: {
    analysis: 'deepseek-coder' | 'mistral' | 'neural-chat';
    embedding: 'voyage-3' | 'nomic-embed-text' | 'mxbai-embed-large';
    mongodbVector: boolean;
  };
}

export const defaultAdvancedConfig: AdvancedOllamaConfig = {
  ollamaEndpoint: 'http://localhost:11434',
  xiaozhi: {
    endpoint: 'https://api.xiaozhi.me/v1',
    apiKey: process.env.VITE_XIAOZHI_API_KEY || ''
  },
  models: {
    analysis: 'deepseek-coder',
    embedding: 'voyage-3',
    mongodbVector: true
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * DeepSeek Coder: Análise avançada de documentos
 * Especializado em código, lógica e estrutura de documentos
 */
export const analyzeWithDeepSeek = async (
  chunk: DocumentChunk,
  config: AdvancedOllamaConfig
): Promise<DocumentChunk> => {
  try {
    const prompt = `Você é DeepSeek Coder, especialista em análise estrutural de documentos técnicos e legais.

TAREFA: Analise o fragmento abaixo e retorne JSON com análise profunda.

FRAGMENTO:
"${chunk.content}"

RETORNE JSON COM:
{
  "cleaned_text": "texto sem ruído",
  "entity_type": "ARTIGO|INCISO|PARAGRAFO|CAPITULO|DEFINICAO|CONCEITO|ALGORITMO|ESTRUTURA",
  "entity_label": "Rótulo único",
  "keywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"],
  "semantic_role": "OBJETIVO|MÉTODO|RESULTADO|CONDIÇÃO|RESTRIÇÃO",
  "complexity_score": 0.1-1.0,
  "reference_links": ["link1", "link2"],
  "code_blocks": ["código detectado"],
  "formal_definitions": ["definição1", "definição2"]
}

APENAS JSON, sem explicações.`;

    const response = await fetch(`${config.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-coder:latest',
        prompt: prompt,
        format: 'json',
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 1000
        }
      })
    });

    if (!response.ok) throw new Error(`DeepSeek error: ${response.status}`);
    
    const data = await response.json();
    const result = JSON.parse(data.response || "{}");

    return {
      ...chunk,
      content: result.cleaned_text || chunk.content,
      entityType: result.entity_type || chunk.entityType,
      entityLabel: result.entity_label || chunk.entityLabel,
      keywords: result.keywords || [],
      metadata: {
        ...chunk.metadata,
        semantic_role: result.semantic_role,
        complexity_score: result.complexity_score,
        reference_links: result.reference_links,
        code_blocks: result.code_blocks,
        formal_definitions: result.formal_definitions
      }
    };
  } catch (error: any) {
    console.error(`Erro DeepSeek para chunk ${chunk.id}:`, error.message);
    return chunk;
  }
};

/**
 * Voyage-3: Embeddings de qualidade enterprise
 * Especializado em representação semântica precisa (1536 dimensões)
 */
export const generateVoyageEmbedding = async (
  chunk: DocumentChunk,
  config: AdvancedOllamaConfig
): Promise<EmbeddingVector | null> => {
  try {
    const richContent = `
[${chunk.entityType || 'TEXTO'}] ${chunk.entityLabel || 'Sem Rótulo'}
Tags: ${chunk.keywords?.join(', ') || ''}
---
${chunk.content}
    `.trim();

    // Tenta Voyage-3 via Ollama primeiro
    try {
      const response = await fetch(`${config.ollamaEndpoint}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'voyage-3:latest',
          prompt: richContent
        })
      });

      if (response.ok) {
        const data = await response.json();
        const vector = data.embedding || [];

        // Normaliza para MongoDB Vector Search (1536 dims se possível)
        const normalizedVector = config.models.mongodbVector
          ? normalizeVectorForMongoDB(vector)
          : normalizeL2(vector);

        return {
          id: chunk.id,
          vector: normalizedVector,
          contentSummary: chunk.content.substring(0, 100) + '...',
          fullContent: chunk.content,
          dueDate: chunk.dueDate,
          entityType: chunk.entityType,
          entityLabel: chunk.entityLabel,
          keywords: chunk.keywords,
          modelUsed: 'Voyage-3-Ollama',
          dimensions: normalizedVector.length,
          metadata: {
            provider: 'ollama',
            model_version: '3.0'
          }
        };
      }
    } catch (ollamaError) {
      console.warn('Voyage-3 Ollama falhou, tentando xiaozhi.me...');
    }

    // Fallback para xiaozhi.me
    if (config.xiaozhi.apiKey) {
      return await generateVoyageViaXiaozhi(chunk, config);
    }

    return null;
  } catch (error: any) {
    console.error(`Erro Voyage-3 para chunk ${chunk.id}:`, error.message);
    return null;
  }
};

/**
 * Voyage-3 via API xiaozhi.me (fallback premium)
 */
const generateVoyageViaXiaozhi = async (
  chunk: DocumentChunk,
  config: AdvancedOllamaConfig
): Promise<EmbeddingVector | null> => {
  try {
    const response = await fetch(`${config.xiaozhi.endpoint}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.xiaozhi.apiKey}`
      },
      body: JSON.stringify({
        model: 'voyage-3',
        input: chunk.content,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      throw new Error(`xiaozhi.me error: ${response.status}`);
    }

    const data = await response.json();
    const vector = data.data?.[0]?.embedding || [];

    return {
      id: chunk.id,
      vector: normalizeL2(vector),
      contentSummary: chunk.content.substring(0, 100) + '...',
      fullContent: chunk.content,
      dueDate: chunk.dueDate,
      entityType: chunk.entityType,
      entityLabel: chunk.entityLabel,
      keywords: chunk.keywords,
      modelUsed: 'Voyage-3-xiaozhi.me',
      dimensions: vector.length,
      metadata: {
        provider: 'xiaozhi',
        model_version: '3.0'
      }
    };
  } catch (error: any) {
    console.error('xiaozhi.me Voyage-3 falhou:', error.message);
    return null;
  }
};

/**
 * MongoDB Vector Search normalization
 * Converte para formato compatível com Atlas Vector Search (1536 dims)
 */
const normalizeVectorForMongoDB = (vector: number[]): number[] => {
  // Redimensiona para 1536 dims se necessário
  let normalized = vector;
  
  if (vector.length < 1536) {
    // Pad com interpolação
    normalized = new Array(1536).fill(0);
    const step = vector.length / 1536;
    for (let i = 0; i < 1536; i++) {
      const idx = Math.floor(i * step);
      normalized[i] = vector[idx] || 0;
    }
  } else if (vector.length > 1536) {
    // Downsample com média
    normalized = new Array(1536).fill(0);
    const step = vector.length / 1536;
    for (let i = 0; i < 1536; i++) {
      const startIdx = Math.floor(i * step);
      const endIdx = Math.floor((i + 1) * step);
      const sum = vector.slice(startIdx, endIdx).reduce((a, b) => a + b, 0);
      normalized[i] = sum / (endIdx - startIdx);
    }
  }

  return normalizeL2(normalized);
};

/**
 * Normalização L2 (unit sphere)
 */
const normalizeL2 = (vector: number[]): number[] => {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? vector.map(v => v / norm) : vector;
};

/**
 * Análise em batch com DeepSeek
 */
export const enhanceChunksWithDeepSeek = async (
  chunks: DocumentChunk[],
  config: AdvancedOllamaConfig,
  onProgress: (progress: number) => void
): Promise<DocumentChunk[]> => {
  const enhancedChunks: DocumentChunk[] = [];
  const batchSize = 2;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(c => analyzeWithDeepSeek(c, config))
    );
    enhancedChunks.push(...results);

    if (i + batchSize < chunks.length) await delay(300);

    const progress = Math.round(((i + batch.length) / chunks.length) * 100);
    onProgress(progress);
  }

  return enhancedChunks;
};

/**
 * Embeddings em batch com Voyage-3
 */
export const generateVoyageEmbeddings = async (
  chunks: DocumentChunk[],
  config: AdvancedOllamaConfig,
  onProgress: (progress: number) => void
): Promise<EmbeddingVector[]> => {
  const embeddings: EmbeddingVector[] = [];
  const batchSize = 3;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(c => generateVoyageEmbedding(c, config))
    );

    embeddings.push(...batchResults.filter(e => e !== null) as EmbeddingVector[]);

    if (i + batchSize < chunks.length) await delay(200);

    const progress = Math.round(((i + batch.length) / chunks.length) * 100);
    onProgress(progress);
  }

  return embeddings;
};

/**
 * Análise com xiaozhi.me (fallback universal)
 * Suporta múltiplos modelos premium
 */
export const analyzeWithXiaozhi = async (
  chunk: DocumentChunk,
  config: AdvancedOllamaConfig,
  model: string = 'deepseek-r1'
): Promise<DocumentChunk | null> => {
  if (!config.xiaozhi.apiKey) {
    console.warn('xiaozhi.me API key não configurada');
    return null;
  }

  try {
    const messages = [
      {
        role: 'system',
        content: `Você é um especialista em análise de documentos legais e acadêmicos.
Retorne APENAS um JSON válido, sem markdown, explicações ou formatação adicional.`
      },
      {
        role: 'user',
        content: `Analise este fragmento e retorne JSON:

"${chunk.content}"

{
  "cleaned_text": "texto limpo",
  "entity_type": "tipo identificado",
  "entity_label": "rótulo",
  "keywords": ["kw1", "kw2", "kw3"],
  "summary": "resumo de 1 linha"
}`
      }
    ];

    const response = await fetch(`${config.xiaozhi.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.xiaozhi.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`xiaozhi.me error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const result = JSON.parse(content);

    return {
      ...chunk,
      content: result.cleaned_text || chunk.content,
      entityType: result.entity_type || chunk.entityType,
      entityLabel: result.entity_label || chunk.entityLabel,
      keywords: result.keywords || [],
      metadata: {
        ...chunk.metadata,
        summary: result.summary,
        provider: 'xiaozhi.me'
      }
    };
  } catch (error: any) {
    console.error(`Erro xiaozhi.me para chunk ${chunk.id}:`, error.message);
    return null;
  }
};

/**
 * Teste de conectividade e modelos disponíveis
 */
export const testAdvancedModels = async (
  config: AdvancedOllamaConfig
): Promise<{
  ollama: { available: boolean; models: string[] };
  xiaozhi: { available: boolean; error?: string };
}> => {
  const result = {
    ollama: { available: false, models: [] },
    xiaozhi: { available: false }
  };

  // Testa Ollama
  try {
    const response = await fetch(`${config.ollamaEndpoint}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      result.ollama.available = true;
      result.ollama.models = data.models?.map((m: any) => m.name) || [];
    }
  } catch (e) {
    console.warn('Ollama não disponível');
  }

  // Testa xiaozhi.me
  if (config.xiaozhi.apiKey) {
    try {
      const response = await fetch(`${config.xiaozhi.endpoint}/models`, {
        headers: { 'Authorization': `Bearer ${config.xiaozhi.apiKey}` }
      });
      result.xiaozhi.available = response.ok;
    } catch (error: any) {
      console.warn('xiaozhi.me erro:', error.message);
    }
  }

  return result;
};
