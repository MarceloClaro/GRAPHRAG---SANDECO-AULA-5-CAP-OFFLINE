/**
 * Serviço de orquestração para enriquecimento de CSV
 * 
 * Permite escolher entre:
 * 1. Rápido (regex puro)
 * 2. Preciso (LLM)
 * 3. Híbrido (regex + background LLM)
 */

import { DocumentChunk } from '../types';
import {
  enrichChunkForCSV,
  deduplicateRows,
  generateQualityReport as generateRegexQualityReport,
  CSVRow
} from './csvEnhancerService';
import {
  enrichTextWithLLM,
  enrichChunksWithLLM,
  generateLLMQualityReport,
  LLMEnrichmentConfig,
  LLMEnrichmentResult
} from './csvLLMEnhancerService';

export type EnrichmentMode = 'rapido' | 'preciso' | 'hibrido';

export interface EnrichmentOptions {
  mode: EnrichmentMode;
  llmConfig?: LLMEnrichmentConfig;
  onProgress?: (progress: number, message: string) => void;
}

export interface EnrichedChunkResult {
  chunk: DocumentChunk;
  csvRow: CSVRow;
  llmResult?: LLMEnrichmentResult;
  source: 'regex' | 'llm' | 'hybrid';
  processingTimeMs: number;
}

/**
 * Enriquecimento RÁPIDO (regex puro)
 */
export async function enrichChunksRapido(
  chunks: DocumentChunk[],
  sourceFile: string,
  onProgress?: (progress: number, message: string) => void
): Promise<EnrichedChunkResult[]> {
  const results: EnrichedChunkResult[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const startTime = Date.now();
    const chunk = chunks[i];

    const csvRow = enrichChunkForCSV(chunk, i, sourceFile);

    results.push({
      chunk,
      csvRow,
      source: 'regex',
      processingTimeMs: Date.now() - startTime
    });

    const progress = Math.round(((i + 1) / chunks.length) * 100);
    if (onProgress) {
      onProgress(progress, `Enriquecimento rápido: ${i + 1}/${chunks.length}`);
    }
  }

  const deduped = deduplicateRows(results.map(r => r.csvRow));
  console.log(
    `[Enriquecimento Rápido] ${deduped.duplicates_removed} duplicatas removidas`
  );

  return results;
}

/**
 * Enriquecimento PRECISO (LLM)
 */
export async function enrichChunksPreciso(
  chunks: DocumentChunk[],
  sourceFile: string,
  llmConfig: LLMEnrichmentConfig,
  onProgress?: (progress: number, message: string) => void
): Promise<EnrichedChunkResult[]> {
  if (!llmConfig) {
    throw new Error('LLM config required for preciso mode');
  }

  const results: EnrichedChunkResult[] = [];

  // Usa enriquecimento em paralelo do serviço LLM
  const llmResults = await enrichChunksWithLLM(chunks, llmConfig, (progress) => {
    if (onProgress) {
      onProgress(progress, `Enriquecimento preciso com ${llmConfig.provider}: ${progress}%`);
    }
  });

  // Converte resultados LLM para CSVRow
  for (let i = 0; i < llmResults.length; i++) {
    const llmResult = llmResults[i];
    const startTime = Date.now();

    const csvRow: CSVRow = {
      chunk_id: llmResult.id,
      source_file: sourceFile,
      doc_family: llmResult.doc_family,
      law_name: llmResult.law_name || 'N/A',
      unit_type: llmResult.unit_type,
      unit_ref: llmResult.unit_ref,
      hierarchy_path: llmResult.hierarchy_components.join(' > ') || 'N/A',
      page_start: llmResult.metadata?.page || 0,
      page_end: (llmResult.metadata?.page || 0) + 1,
      chunk_index: i,
      is_noise: llmResult.is_noise,
      noise_reason: llmResult.noise_reason,
      text_raw: llmResult.content,
      text_clean: llmResult.cleaned_text,
      token_count: Math.ceil(llmResult.content.length / 4),
      char_len: llmResult.content.length,
      dedupe_hash: '',
      dedupe_group: '',
      language: 'pt',
      created_at: new Date().toISOString(),
      confidence: llmResult.confidence
    };

    results.push({
      chunk: llmResult,
      csvRow,
      llmResult,
      source: 'llm',
      processingTimeMs: llmResult.processing_time_ms
    });
  }

  const deduped = deduplicateRows(results.map(r => r.csvRow));
  console.log(
    `[Enriquecimento Preciso] ${deduped.duplicates_removed} duplicatas removidas`
  );

  return results;
}

/**
 * Enriquecimento HÍBRIDO (regex instant + LLM background)
 */
export async function enrichChunksHibrido(
  chunks: DocumentChunk[],
  sourceFile: string,
  llmConfig: LLMEnrichmentConfig,
  onProgress?: (progress: number, message: string) => void
): Promise<EnrichedChunkResult[]> {
  const results: EnrichedChunkResult[] = [];

  // FASE 1: Enriquecimento rápido (regex) - instantâneo
  if (onProgress) {
    onProgress(0, 'Fase 1/2: Enriquecimento rápido (regex)...');
  }

  for (let i = 0; i < chunks.length; i++) {
    const startTime = Date.now();
    const chunk = chunks[i];

    const csvRow = enrichChunkForCSV(chunk, i, sourceFile);

    results.push({
      chunk,
      csvRow,
      source: 'regex',
      processingTimeMs: Date.now() - startTime
    });
  }

  if (onProgress) {
    onProgress(50, 'Fase 1/2 concluída. Iniciando fase 2 (LLM em background)...');
  }

  // FASE 2: Enriquecimento com LLM em background (sem bloquear)
  // Retorna resultado híbrido imediatamente, LLM continua em segundo plano
  setImmediate(async () => {
    if (onProgress) {
      onProgress(50, 'Fase 2/2: Refinamento com LLM iniciado (background)...');
    }

    try {
      const llmResults = await enrichChunksWithLLM(
        chunks.filter((_, i) => results[i].csvRow.is_noise === 0), // Só enriquece não-ruído
        llmConfig,
        (progress) => {
          if (onProgress) {
            const overallProgress = 50 + progress * 0.5;
            onProgress(
              Math.round(overallProgress),
              `Refinamento LLM: ${progress}%`
            );
          }
        }
      );

      // Atualiza resultados com LLM
      let llmIndex = 0;
      for (let i = 0; i < results.length; i++) {
        if (results[i].csvRow.is_noise === 0 && llmIndex < llmResults.length) {
          const llmResult = llmResults[llmIndex];
          results[i].llmResult = llmResult;
          results[i].source = 'hybrid';

          // Atualiza CSV com dados mais precisos do LLM
          results[i].csvRow.unit_type = llmResult.unit_type;
          results[i].csvRow.unit_ref = llmResult.unit_ref;
          results[i].csvRow.hierarchy_path =
            llmResult.hierarchy_components.join(' > ') || results[i].csvRow.hierarchy_path;
          results[i].csvRow.confidence = llmResult.confidence;

          llmIndex++;
        }
      }

      if (onProgress) {
        onProgress(100, 'Enriquecimento híbrido concluído!');
      }

      console.log('[Enriquecimento Híbrido] LLM background completo');
    } catch (error) {
      console.error('[Enriquecimento Híbrido] Erro em background:', error);
    }
  });

  const deduped = deduplicateRows(results.map(r => r.csvRow));
  console.log(
    `[Enriquecimento Híbrido] ${deduped.duplicates_removed} duplicatas removidas`
  );

  return results;
}

/**
 * Função principal de orquestração
 */
export async function enrichChunksWithMode(
  chunks: DocumentChunk[],
  sourceFile: string,
  options: EnrichmentOptions
): Promise<EnrichedChunkResult[]> {
  const { mode, llmConfig, onProgress } = options;

  console.log(`[Enriquecimento CSV] Iniciando modo: ${mode}`);

  let results: EnrichedChunkResult[];

  switch (mode) {
    case 'rapido':
      results = await enrichChunksRapido(chunks, sourceFile, onProgress);
      break;

    case 'preciso':
      if (!llmConfig) {
        throw new Error('LLM config required for preciso mode');
      }
      results = await enrichChunksPreciso(chunks, sourceFile, llmConfig, onProgress);
      break;

    case 'hibrido':
      if (!llmConfig) {
        throw new Error('LLM config required for hibrido mode');
      }
      results = await enrichChunksHibrido(chunks, sourceFile, llmConfig, onProgress);
      break;

    default:
      throw new Error(`Unknown enrichment mode: ${mode}`);
  }

  // Gera relatório
  const qualityReport = generateRegexQualityReport(results.map(r => r.csvRow));
  console.log(
    `[Enriquecimento CSV] Relatório:`,
    JSON.stringify(qualityReport, null, 2)
  );

  return results;
}

/**
 * Exporta resultados enriquecidos para CSV
 */
export function exportEnrichedResultsToCSV(
  results: EnrichedChunkResult[],
  includeNoise: boolean = false
): string {
  const rows = results
    .filter(r => includeNoise || r.csvRow.is_noise === 0)
    .map(r => r.csvRow);

  // Headers ordenados
  const headers = [
    'chunk_id',
    'source_file',
    'doc_family',
    'law_name',
    'unit_type',
    'unit_ref',
    'hierarchy_path',
    'page_start',
    'page_end',
    'is_noise',
    'noise_reason',
    'token_count',
    'char_len',
    'language',
    'created_at',
    'confidence',
    'text_clean'
  ];

  // Cabeçalho
  const csvLines = [headers.join(',')];

  // Linhas (com escape de aspas)
  for (const row of rows) {
    const values = headers.map(header => {
      const value = (row as any)[header];
      if (value === null || value === undefined) return '';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    });
    csvLines.push(values.join(','));
  }

  return csvLines.join('\n');
}

/**
 * Compara tempo de processamento entre modos
 */
export function compareProcessingTimes(results: EnrichedChunkResult[]): {
  mode: string;
  totalTimeMs: number;
  avgPerChunkMs: number;
  chunksProcessed: number;
} {
  const totalTime = results.reduce((sum, r) => sum + r.processingTimeMs, 0);

  return {
    mode: results[0]?.source || 'unknown',
    totalTimeMs: totalTime,
    avgPerChunkMs: totalTime / results.length,
    chunksProcessed: results.length
  };
}
