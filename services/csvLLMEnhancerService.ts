/**
 * Serviço de enriquecimento de CSV com LLM
 * Usa Ollama, Gemini ou Xiaozhi para análise precisa de documentos jurídicos
 * 
 * Benefícios sobre regex puro:
 * - Detecção inteligente de ruído (entende contexto)
 * - Extração precisa de referência jurídica
 * - Construção automática de hierarchy_path
 * - Limpeza contextual (sabe o que é importante)
 * - Normalização jurídica automática
 */

import { DocumentChunk } from '../types';
import crypto from 'crypto';

export interface LLMEnrichmentConfig {
  provider: 'ollama' | 'gemini' | 'xiaozhi';
  endpoint?: string;
  model?: string;
  apiKey?: string;
  token?: string;
  useCache?: boolean;
  cacheSize?: number;
}

export interface LLMEnrichmentResult {
  is_noise: 0 | 1;
  noise_reason: string;
  unit_type: string;
  unit_ref: string;
  hierarchy_components: string[];
  law_name: string;
  doc_family: string;
  cleaned_text: string;
  confidence: number;
  processing_time_ms: number;
  model_used: string;
}

// Cache simples em memória
const enrichmentCache = new Map<string, LLMEnrichmentResult>();
const CACHE_MAX_SIZE = 500;

/**
 * Calcula hash do texto para cache
 */
function getCacheKey(text: string, provider: string): string {
  const normalized = text.substring(0, 500).toLowerCase().trim();
  return crypto
    .createHash('md5')
    .update(`${normalized}|${provider}`)
    .digest('hex');
}

/**
 * Prompt para Ollama (local)
 */
function buildOllamaPrompt(text: string): string {
  return `Você é um especialista em análise de documentos jurídicos brasileiros.

Analise este trecho do documento:
"${text}"

IMPORTANTE:
- Responda APENAS em JSON válido
- Se não souber, use "N/A"
- Seja conservador: prefira "generico" a adivinhar

Retorne exatamente este JSON (sem explicações):
{
  "is_noise": 0|1,
  "noise_reason": "toc|copyright|header_footer|duplicado|limpeza|vazio|nada",
  "unit_type": "artigo|paragrafo|inciso|capitulo|titulo|livro|secao|generico",
  "unit_ref": "ex: Art. 5º, § 1º, Inciso IV, ou N/A se não houver",
  "hierarchy_components": ["CF88", "Título II", "Capítulo I", "Art. 5º"],
  "law_name": "lei identificada ou N/A",
  "doc_family": "CF88|CPC|CLT|CC|VADE|UNKNOWN",
  "cleaned_text": "texto sem lixo, sem números de página, pronto para embedding",
  "confidence": 0.95
}`;
}

/**
 * Prompt para Gemini (cloud)
 */
function buildGeminiPrompt(text: string): string {
  return `You are an expert in analyzing Brazilian legal documents.

Analyze this document excerpt:
"${text}"

IMPORTANT:
- Respond ONLY in valid JSON
- If unsure, use "N/A"
- Be conservative

Return exactly this JSON (no explanation):
{
  "is_noise": 0|1,
  "noise_reason": "toc|copyright|header_footer|duplicate|cleanup|empty|none",
  "unit_type": "article|paragraph|inciso|chapter|title|book|section|generic",
  "unit_ref": "e.g. Art. 5º, § 1º, or N/A",
  "hierarchy_components": ["CF88", "Title II", "Chapter I", "Art. 5º"],
  "law_name": "identified law or N/A",
  "doc_family": "CF88|CPC|CLT|CC|VADE|UNKNOWN",
  "cleaned_text": "text without garbage, ready for embedding",
  "confidence": 0.95
}`;
}

/**
 * Enriquecimento com Ollama
 */
async function enrichWithOllama(
  text: string,
  config: LLMEnrichmentConfig
): Promise<LLMEnrichmentResult> {
  const startTime = Date.now();
  const endpoint = config.endpoint || 'http://localhost:11434';
  const model = config.model || 'llama3.2:3b';
  const prompt = buildOllamaPrompt(text);

  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        format: 'json',
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 300,
          top_p: 0.9,
          top_k: 40
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.response || '{}');

    return {
      ...result,
      processing_time_ms: Date.now() - startTime,
      model_used: `Ollama ${model}`,
      confidence: result.confidence || 0.8
    };
  } catch (error) {
    console.error('[CSV LLM] Ollama error:', error);
    throw error;
  }
}

/**
 * Enriquecimento com Gemini
 */
async function enrichWithGemini(
  text: string,
  config: LLMEnrichmentConfig
): Promise<LLMEnrichmentResult> {
  const startTime = Date.now();

  try {
    const apiKey = config.apiKey || (window as any).GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = buildGeminiPrompt(text);

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          topK: 40,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini error: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const result = JSON.parse(resultText);

    return {
      ...result,
      processing_time_ms: Date.now() - startTime,
      model_used: 'Gemini 2.0 Flash',
      confidence: result.confidence || 0.85
    };
  } catch (error) {
    console.error('[CSV LLM] Gemini error:', error);
    throw error;
  }
}

/**
 * Enriquecimento com Xiaozhi (stub - seria via WebSocket)
 */
async function enrichWithXiaozhi(
  text: string,
  config: LLMEnrichmentConfig
): Promise<LLMEnrichmentResult> {
  const startTime = Date.now();

  try {
    // Nota: Xiaozhi requer WebSocket; para MVP, retornamos fallback
    console.warn('[CSV LLM] Xiaozhi LLM enrichment not yet implemented (WS required)');

    return {
      is_noise: 0,
      noise_reason: 'nada',
      unit_type: 'generico',
      unit_ref: 'N/A',
      hierarchy_components: [],
      law_name: 'N/A',
      doc_family: 'UNKNOWN',
      cleaned_text: text.trim(),
      confidence: 0.5,
      processing_time_ms: Date.now() - startTime,
      model_used: 'Xiaozhi (fallback)'
    };
  } catch (error) {
    console.error('[CSV LLM] Xiaozhi error:', error);
    throw error;
  }
}

/**
 * Retry com exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 500
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[CSV LLM] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Enriquece um texto com LLM
 */
export async function enrichTextWithLLM(
  text: string,
  config: LLMEnrichmentConfig
): Promise<LLMEnrichmentResult> {
  // Validação de entrada
  if (!text || text.trim().length === 0) {
    return {
      is_noise: 1,
      noise_reason: 'vazio',
      unit_type: 'generico',
      unit_ref: 'N/A',
      hierarchy_components: [],
      law_name: 'N/A',
      doc_family: 'UNKNOWN',
      cleaned_text: '',
      confidence: 1.0,
      processing_time_ms: 0,
      model_used: 'validation'
    };
  }

  // Verificar cache
  if (config.useCache !== false) {
    const cacheKey = getCacheKey(text, config.provider);
    if (enrichmentCache.has(cacheKey)) {
      console.log('[CSV LLM] Cache hit');
      return enrichmentCache.get(cacheKey)!;
    }
  }

  // Chamar LLM com retry
  let result: LLMEnrichmentResult;

  try {
    result = await retryWithBackoff(async () => {
      switch (config.provider) {
        case 'ollama':
          return await enrichWithOllama(text, config);
        case 'gemini':
          return await enrichWithGemini(text, config);
        case 'xiaozhi':
          return await enrichWithXiaozhi(text, config);
        default:
          throw new Error(`Unknown provider: ${config.provider}`);
      }
    }, 3, 500);
  } catch (error) {
    console.error('[CSV LLM] All retries failed, returning fallback', error);
    // Fallback conservador
    result = {
      is_noise: 0,
      noise_reason: 'nada',
      unit_type: 'generico',
      unit_ref: 'N/A',
      hierarchy_components: [],
      law_name: 'N/A',
      doc_family: 'UNKNOWN',
      cleaned_text: text.trim(),
      confidence: 0.3,
      processing_time_ms: 0,
      model_used: 'fallback_error'
    };
  }

  // Armazenar em cache
  if (config.useCache !== false) {
    const cacheKey = getCacheKey(text, config.provider);
    if (enrichmentCache.size >= (config.cacheSize || CACHE_MAX_SIZE)) {
      const firstKey = enrichmentCache.keys().next().value;
      enrichmentCache.delete(firstKey);
    }
    enrichmentCache.set(cacheKey, result);
  }

  return result;
}

/**
 * Enriquece múltiplos chunks em paralelo (com rate limiting)
 */
export async function enrichChunksWithLLM(
  chunks: DocumentChunk[],
  config: LLMEnrichmentConfig,
  onProgress?: (progress: number) => void
): Promise<Array<DocumentChunk & LLMEnrichmentResult>> {
  const results: Array<DocumentChunk & LLMEnrichmentResult> = [];
  const batchSize = config.provider === 'ollama' ? 2 : 3; // Ollama é mais lento
  const delayBetweenBatches = config.provider === 'gemini' ? 200 : 500;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async chunk => {
        const enrichment = await enrichTextWithLLM(chunk.content, config);
        return {
          ...chunk,
          ...enrichment
        };
      })
    );

    results.push(...batchResults);

    if (i + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }

    const progress = Math.round(((i + batch.length) / chunks.length) * 100);
    if (onProgress) {
      onProgress(progress);
    }
  }

  return results;
}

/**
 * Gera relatório de qualidade
 */
export function generateLLMQualityReport(results: LLMEnrichmentResult[]) {
  const noiseCount = results.filter(r => r.is_noise === 1).length;
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  const avgProcessingTime = results.reduce((sum, r) => sum + r.processing_time_ms, 0) / results.length;

  const unitTypeDistribution: Record<string, number> = {};
  const noiseReasons: Record<string, number> = {};

  for (const result of results) {
    unitTypeDistribution[result.unit_type] = (unitTypeDistribution[result.unit_type] || 0) + 1;
    if (result.is_noise === 1) {
      noiseReasons[result.noise_reason] = (noiseReasons[result.noise_reason] || 0) + 1;
    }
  }

  return {
    total_processed: results.length,
    noise_count: noiseCount,
    noise_percentage: (noiseCount / results.length) * 100,
    avg_confidence: avgConfidence.toFixed(3),
    avg_processing_time_ms: avgProcessingTime.toFixed(0),
    unit_type_distribution: unitTypeDistribution,
    noise_reasons: noiseReasons,
    cache_size: enrichmentCache.size
  };
}

/**
 * Limpa o cache
 */
export function clearLLMCache(): void {
  enrichmentCache.clear();
  console.log('[CSV LLM] Cache cleared');
}
