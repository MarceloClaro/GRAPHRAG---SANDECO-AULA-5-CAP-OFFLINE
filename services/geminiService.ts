import { GoogleGenAI, Type } from "@google/genai";
import { DocumentChunk, EmbeddingVector } from "../types";
import { auditLogger } from './auditLogger';
import { Validator } from './validator';
import { enrichChunkWithCoherence } from "./coherenceService";

// Cache simples para respostas de IA (evita reprocessamento)
const responseCache = new Map<string, any>();
const CACHE_MAX_SIZE = 100;

// Função para obter a API key de múltiplas fontes
const getApiKey = (): string => {
  // 1. Tenta do window (configurado pela UI)
  if ((window as any).GEMINI_API_KEY) {
    return (window as any).GEMINI_API_KEY;
  }
  // 2. Tenta do process.env (Vite)
  if (import.meta.env.VITE_API_KEY) {
    return import.meta.env.VITE_API_KEY;
  }
  // 3. Tenta variável de ambiente legada
  if (import.meta.env.GEMINI_API_KEY) {
    return import.meta.env.GEMINI_API_KEY;
  }
  // 4. Fallback vazio (irá falhar, mas com erro claro)
  return '';
};

// Inicializa o cliente Gemini com API key dinâmica
const getAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API Key do Gemini não configurada. Configure em Configurações (⚙️) ou no arquivo .env');
  }
  return new GoogleGenAI({ apiKey });
};

// Switch to gemini-2.0-flash-exp as gemini-3-flash-preview (from prompt guidelines) 
// might not be available to all API keys yet, causing 404.
const modelName = 'gemini-2.0-flash-exp';
const embeddingModelName = 'text-embedding-004';

interface GeminiChunkResponse {
  cleaned_text: string;
  entity_type: string;
  entity_label: string;
  keywords: string[];
}

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper with exponential backoff and audit
async function retryOperation<T>(operation: () => Promise<T>, operationName: string, maxRetries: number = 3, initialDelay: number = 2000): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      const isRateLimit = error.message?.includes('429') || error.status === 429 || error.code === 429;
      const isServerOverload = error.message?.includes('503') || error.status === 503;
      const isInternal = error.message?.includes('500') || error.status === 500 || error.code === 500;

      if (isRateLimit || isServerOverload || isInternal) {
        const waitTime = initialDelay * Math.pow(2, i);
        const reason = isRateLimit ? 'RateLimit' : isServerOverload ? 'ServiceUnavailable' : 'InternalError';
        auditLogger.logWarning(operationName, `${reason} (Attempt ${i + 1}/${maxRetries})`, { waitTime, status: error.status, code: error.code });
        await delay(waitTime);
        continue;
      }
      
      // Throw other errors immediately
      auditLogger.logError(operationName, error);
      throw error; 
    }
  }
  auditLogger.logError(operationName, lastError);
  throw lastError;
}

/**
 * Processa um único chunk usando Gemini para limpar, classificar e extrair entidades.
 */
export const analyzeChunkWithGemini = async (chunk: DocumentChunk): Promise<DocumentChunk> => {
  // Cache check
  const cacheKey = `analyze_${chunk.id}_${chunk.content.substring(0, 50)}`;
  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey);
  }
  
  const opId = auditLogger.startOperation('GEMINI_ANALYZE_CHUNK', {
    chunkId: chunk.id,
    contentLength: chunk.content.length
  });
  
  try {
    const prompt = `Você é um especialista em documentos legais/acadêmicos.

Instruções:
- Idioma: português.
- Saída: JSON válido (campos: cleaned_text, entity_type, entity_label, keywords).
- Se não souber, devolva "N/A" no campo correspondente.
- Formato estruturado (bullets reduzem alucinação):
  1) cleaned_text: texto limpo (sem quebras, hifens)
  2) entity_type: ARTIGO | INCISO | PARAGRAFO | CAPITULO | DEFINICAO | CONCEITO | EMENTA | OUTRO
  3) entity_label: rótulo curto (ex: "Art. 5º")
  4) keywords: array com 3-5 palavras-chave

Texto de entrada:
"${chunk.content}"

Retorne APENAS o JSON.`;

    // Wrap API call with retry logic
    const response = await retryOperation(async () => {
      const ai = getAIClient();
      return await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        generationConfig: {
          temperature: 0.25,
          topP: 0.9,
          topK: 40,
          responseMimeType: 'application/json'
        }
      });
    }, 'GEMINI_API_CALL', 3, 2000);

    const resultText = response.text || '{}';
    const result: GeminiChunkResponse = JSON.parse(resultText);

    const enhancedChunk = {
      ...chunk,
      content: result.cleaned_text || chunk.content,
      entityType: result.entity_type || chunk.entityType,
      entityLabel: result.entity_label || chunk.entityLabel,
      keywords: result.keywords || [],
      aiProvider: 'gemini',
      contentOriginal: chunk.content
    };
    
    // Aplica técnicas de coesão e coerência
    let coherentChunk = enrichChunkWithCoherence(enhancedChunk);
    
    // Valida chunk processado
    Validator.validateChunk(coherentChunk);
    
    // Armazena em cache
    if (responseCache.size >= CACHE_MAX_SIZE) {
      const firstKey = responseCache.keys().next().value;
      responseCache.delete(firstKey);
    }
    responseCache.set(cacheKey, coherentChunk);
    
    auditLogger.endOperation(opId, { success: true });
    return coherentChunk;
  } catch (error: any) {
    const isInternal = error?.status === 500 || error?.code === 500 || error?.message?.includes('500');
    if (isInternal) {
      auditLogger.logWarning('GEMINI_ANALYZE_CHUNK', 'Gemini retornou 500, devolvendo chunk original', { chunkId: chunk.id, message: error.message });
    } else {
      auditLogger.logError('GEMINI_ANALYZE_CHUNK', error, { chunkId: chunk.id });
    }
    console.error(`Erro ao processar chunk ${chunk.id} com Gemini:`, error.message);
    return { ...chunk, aiProvider: 'gemini' };
  }
};

/**
 * Processa uma lista de chunks em paralelo (com limite de concorrência para evitar rate limit).
 */
export const enhanceChunksWithAI = async (chunks: DocumentChunk[], onProgress: (progress: number) => void): Promise<DocumentChunk[]> => {
  const opId = auditLogger.startOperation('GEMINI_ENHANCE_BATCH', { chunkCount: chunks.length });
  
  const enhancedChunks: DocumentChunk[] = [];
  const batchSize = 3; 
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(c => analyzeChunkWithGemini(c)));
    enhancedChunks.push(...results);
    
    if (i + batchSize < chunks.length) await delay(1000); 
    
    const progress = Math.round(((i + batch.length) / chunks.length) * 100);
    onProgress(progress);
  }
  
  auditLogger.endOperation(opId, { itemsProcessed: enhancedChunks.length });
  return enhancedChunks;
};

/**
 * Gera embeddings reais usando o modelo text-embedding-004 do Gemini.
 */
export const generateRealEmbeddingsWithGemini = async (chunks: DocumentChunk[], onProgress: (progress: number) => void): Promise<EmbeddingVector[]> => {
  const opId = auditLogger.startOperation('GEMINI_EMBEDDINGS', { chunkCount: chunks.length, model: embeddingModelName });
  
  const embeddings: EmbeddingVector[] = [];
  const batchSize = 10; // Embeddings endpoint usually has higher throughput
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    // Process batch in parallel but carefully
    const batchResults = await Promise.all(batch.map(async (chunk) => {
        try {
            // Construct a rich content string that includes metadata for higher fidelity embeddings
            // This ensures the vector captures the classification (Type, Label) and Keywords, not just raw text.
            const richContent = `
Tipo: ${chunk.entityType || 'Texto Genérico'}
Rótulo: ${chunk.entityLabel || 'Sem Rótulo'}
Palavras-Chave: ${chunk.keywords?.join(', ') || ''}

Conteúdo:
${chunk.content}
            `.trim();

            const result = await retryOperation(async () => {
                const ai = getAIClient();
                return await ai.models.embedContent({
                    model: embeddingModelName,
                    contents: richContent, 
                });
            }, 'GEMINI_EMBEDDING', 3, 2000);
            
            // Normaliza para cosine similarity
            const vector = result.embeddings?.[0]?.values || result.embedding?.values || [];
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
                modelUsed: `Gemini ${embeddingModelName} (High-Fidelity)`
            };
        } catch (e) {
            console.error("Falha ao gerar embedding para chunk", chunk.id, e);
            // Fallback para vetor zerado ou aleatório em caso de falha crítica para não parar pipeline
            // Use 768 dimensions as that is standard for text-embedding-004
            return {
                id: chunk.id,
                vector: new Array(768).fill(0).map(() => Math.random()),
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
    
    // Rate limit safeguard
    if (i + batchSize < chunks.length) await delay(500);

    const progress = Math.round(((i + batch.length) / chunks.length) * 100);
    onProgress(progress);
  }

  // Validação dos embeddings gerados
  const validation = Validator.validateEmbeddings(embeddings);
  if (validation.invalid > 0) {
    auditLogger.logWarning('GEMINI_EMBEDDINGS_VALIDATION', `${validation.invalid} embeddings inválidos`);
  }
  
  auditLogger.endOperation(opId, { 
    itemsProcessed: embeddings.length,
    validEmbeddings: validation.valid,
    invalidEmbeddings: validation.invalid
  });

  return embeddings;
};