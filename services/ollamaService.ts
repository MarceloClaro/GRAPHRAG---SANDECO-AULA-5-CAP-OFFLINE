import { DocumentChunk, EmbeddingVector } from "../types";
import { enrichChunkWithCoherence } from "./coherenceService";

export interface OllamaConfig {
  endpoint: string;
  model: string;
  embeddingModel: string;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  format?: 'json';
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

interface OllamaEmbedRequest {
  model: string;
  prompt: string;
}

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Processa um único chunk usando Ollama para limpar, classificar e extrair entidades.
 */
export const analyzeChunkWithOllama = async (
  chunk: DocumentChunk,
  config: OllamaConfig
): Promise<DocumentChunk> => {
  try {
    const prompt = `Você é um especialista em documentos legais/acadêmicos.

Instruções:
- Idioma: português.
- Saída: JSON válido.
- Se não souber, devolva "N/A" no campo correspondente.
- Formato do conteúdo (bullets ajudam a reduzir alucinação):
  1) cleaned_text: texto limpo (remova quebras e hifens)
  2) entity_type: ARTIGO | INCISO | PARAGRAFO | CAPITULO | DEFINICAO | CONCEITO | OUTRO
  3) entity_label: rótulo curto
  4) keywords: array com 3-5 palavras-chave

Texto de entrada:
"${chunk.content}"

Retorne APENAS o JSON.`;

    const requestBody: OllamaGenerateRequest = {
      model: config.model,
      prompt: prompt,
      format: 'json',
      stream: false,
      options: {
        temperature: 0.25,
        num_predict: 400,
        top_p: 0.9,
        top_k: 40
      }
    };

    const response = await fetch(`${config.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.response || "{}");

    let enrichedChunk = {
      ...chunk,
      content: result.cleaned_text || chunk.content,
      entityType: result.entity_type || chunk.entityType,
      entityLabel: result.entity_label || chunk.entityLabel,
      keywords: result.keywords || [],
      aiProvider: 'ollama',
      contentOriginal: chunk.content
    };

    // Aplica técnicas de coesão e coerência
    enrichedChunk = enrichChunkWithCoherence(enrichedChunk);

    return enrichedChunk;

  } catch (error: any) {
    console.error(`Erro ao processar chunk ${chunk.id.substring(0,8)} com Ollama:`, error.message || error);
    return { ...chunk, aiProvider: 'ollama' };
  }
};

/**
 * Processa uma lista de chunks em paralelo com Ollama.
 */
export const enhanceChunksWithOllama = async (
  chunks: DocumentChunk[],
  config: OllamaConfig,
  onProgress: (progress: number) => void
): Promise<DocumentChunk[]> => {
  const enhancedChunks: DocumentChunk[] = [];
  const batchSize = 2; // Ollama local pode processar menos em paralelo
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(c => analyzeChunkWithOllama(c, config)));
    enhancedChunks.push(...results);
    
    // Pequeno delay para não sobrecarregar
    if (i + batchSize < chunks.length) await delay(500);
    
    const progress = Math.round(((i + batch.length) / chunks.length) * 100);
    onProgress(progress);
  }
  
  return enhancedChunks;
};

/**
 * Gera embeddings reais usando modelo de embeddings do Ollama.
 */
export const generateEmbeddingsWithOllama = async (
  chunks: DocumentChunk[],
  config: OllamaConfig,
  onProgress: (progress: number) => void
): Promise<EmbeddingVector[]> => {
  const embeddings: EmbeddingVector[] = [];
  const batchSize = 5; // Embeddings são mais rápidos
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(batch.map(async (chunk) => {
      try {
        // Constrói conteúdo rico similar ao Gemini
        const richContent = `
Tipo: ${chunk.entityType || 'Texto Genérico'}
Rótulo: ${chunk.entityLabel || 'Sem Rótulo'}
Palavras-Chave: ${chunk.keywords?.join(', ') || ''}

Conteúdo:
${chunk.content}
        `.trim();

        const requestBody: OllamaEmbedRequest = {
          model: config.embeddingModel,
          prompt: richContent
        };

        const response = await fetch(`${config.endpoint}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`Ollama embedding error: ${response.status}`);
        }

        const data = await response.json();
        const vector = data.embedding || [];
        // Normaliza para cosine similarity
        const norm = Math.sqrt(vector.reduce((sum: number, v: number) => sum + v * v, 0) || 1);
        const normalized = norm > 0 ? vector.map((v: number) => v / norm) : vector;
        
        return {
          id: chunk.id,
          vector: normalized,
          contentSummary: chunk.content.substring(0, 50) + '...',
          fullContent: chunk.content,
          dueDate: chunk.dueDate,
          entityType: chunk.entityType,
          entityLabel: chunk.entityLabel,
          keywords: chunk.keywords,
          modelUsed: `Ollama ${config.embeddingModel}`
        };
      } catch (e) {
        console.error("Falha ao gerar embedding para chunk", chunk.id, e);
        // Fallback para vetor zerado
        return {
          id: chunk.id,
          vector: new Array(768).fill(0).map(() => Math.random() * 0.1),
          contentSummary: chunk.content.substring(0, 50) + '...',
          fullContent: chunk.content,
          dueDate: chunk.dueDate,
          entityType: chunk.entityType,
          entityLabel: chunk.entityLabel,
          keywords: chunk.keywords,
          modelUsed: 'ERROR_FALLBACK'
        };
      }
    }));
    
    embeddings.push(...batchResults);
    
    if (i + batchSize < chunks.length) await delay(300);
    
    const progress = Math.round(((i + batch.length) / chunks.length) * 100);
    onProgress(progress);
  }
  
  return embeddings;
};

/**
 * Testa conexão com Ollama e retorna modelos disponíveis.
 */
export const testOllamaConnection = async (endpoint: string): Promise<{ success: boolean; models?: string[]; error?: string }> => {
  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      return { success: false, error: 'Ollama não está respondendo' };
    }

    const data = await response.json();
    const modelNames = data.models?.map((m: any) => m.name) || [];
    
    return { success: true, models: modelNames };
  } catch (error: any) {
    return { 
      success: false, 
      error: 'Não foi possível conectar. Verifique se o Ollama está rodando (ollama serve)' 
    };
  }
};
