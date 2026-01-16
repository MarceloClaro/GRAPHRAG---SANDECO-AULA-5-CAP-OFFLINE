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
  if (chunks.length === 0) {
    console.warn('[Enriquecimento Rápido] Nenhum chunk para processar');
    return [];
  }

  const results: EnrichedChunkResult[] = [];

  try {
    for (let i = 0; i < chunks.length; i++) {
      const startTime = Date.now();
      const chunk = chunks[i];

      if (!chunk || !chunk.content) {
        console.warn(`[Enriquecimento Rápido] Chunk ${i} inválido, pulando...`);
        continue;
      }

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
  } catch (error) {
    console.error('[Enriquecimento Rápido] Erro:', error);
    throw new Error(`Erro no enriquecimento Rápido: ${error instanceof Error ? error.message : String(error)}`);
  }
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

  if (chunks.length === 0) {
    console.warn('[Enriquecimento Preciso] Nenhum chunk para processar');
    return [];
  }

  const results: EnrichedChunkResult[] = [];

  try {
    // Usa enriquecimento em paralelo do serviço LLM
    const llmResults = await enrichChunksWithLLM(chunks, llmConfig, (progress) => {
      if (onProgress) {
        onProgress(progress, `Enriquecimento preciso com ${llmConfig.provider}: ${progress}%`);
      }
    });

    // Converte resultados LLM para CSVRow
    for (let i = 0; i < llmResults.length; i++) {
      const llmResult = llmResults[i];

      const csvRow: CSVRow = {
        chunk_id: llmResult.id || `chunk_${i}`,
        source_file: sourceFile,
        doc_family: llmResult.doc_family || 'UNKNOWN',
        law_name: llmResult.law_name || 'N/A',
        unit_type: llmResult.unit_type || 'generico',
        unit_ref: llmResult.unit_ref || 'N/A',
        hierarchy_path: (llmResult.hierarchy_components || []).join(' > ') || 'N/A',
        page_start: llmResult.pageNumber || 0,
        page_end: (llmResult.pageNumber || 0) + 1,
        chunk_index: i,
        is_noise: llmResult.is_noise || 0,
        noise_reason: llmResult.noise_reason || 'nada',
        text_raw: llmResult.content || '',
        text_clean: llmResult.cleaned_text || '',
        token_count: Math.ceil((llmResult.content || '').length / 4),
        char_len: (llmResult.content || '').length,
        dedupe_hash: '',
        dedupe_group: '',
        language: 'pt',
        created_at: new Date().toISOString(),
        confidence: llmResult.confidence || 0.8
      };

      results.push({
        chunk: llmResult,
        csvRow,
        llmResult,
        source: 'llm',
        processingTimeMs: llmResult.processing_time_ms || 1000
      });
    }

    const deduped = deduplicateRows(results.map(r => r.csvRow));
    console.log(
      `[Enriquecimento Preciso] ${deduped.duplicates_removed} duplicatas removidas`
    );

    return results;
  } catch (error) {
    console.error('[Enriquecimento Preciso] Erro:', error);
    throw new Error(`Erro no enriquecimento Preciso: ${error instanceof Error ? error.message : String(error)}`);
  }
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
  if (chunks.length === 0) {
    console.warn('[Enriquecimento Híbrido] Nenhum chunk para processar');
    return [];
  }

  const results: EnrichedChunkResult[] = [];

  // FASE 1: Enriquecimento rápido (regex) - instantâneo
  if (onProgress) {
    onProgress(0, 'Fase 1/2: Enriquecimento rápido (regex)...');
  }

  try {
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
        // Filtra chunks que não são ruído
        const nonNoiseIndices: number[] = [];
        const nonNoiseChunks: DocumentChunk[] = [];
        
        for (let i = 0; i < results.length; i++) {
          if (results[i].csvRow.is_noise === 0) {
            nonNoiseIndices.push(i);
            nonNoiseChunks.push(results[i].chunk);
          }
        }

        if (nonNoiseChunks.length === 0) {
          if (onProgress) {
            onProgress(100, 'Enriquecimento híbrido concluído! (Sem chunks para refinar)');
          }
          return;
        }

        const llmResults = await enrichChunksWithLLM(
          nonNoiseChunks,
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
        for (let j = 0; j < llmResults.length; j++) {
          const i = nonNoiseIndices[j];
          const llmResult = llmResults[j];
          
          results[i].llmResult = llmResult;
          results[i].source = 'hybrid';

          // Atualiza CSV com dados mais precisos do LLM
          results[i].csvRow.unit_type = llmResult.unit_type || results[i].csvRow.unit_type;
          results[i].csvRow.unit_ref = llmResult.unit_ref || results[i].csvRow.unit_ref;
          results[i].csvRow.hierarchy_path =
            (llmResult.hierarchy_components || []).join(' > ') || results[i].csvRow.hierarchy_path;
          results[i].csvRow.confidence = llmResult.confidence || results[i].csvRow.confidence;
        }

        if (onProgress) {
          onProgress(100, 'Enriquecimento híbrido concluído!');
        }

        console.log('[Enriquecimento Híbrido] LLM background completo');
      } catch (error) {
        console.error('[Enriquecimento Híbrido] Erro em background:', error);
        if (onProgress) {
          onProgress(100, '⚠️ Enriquecimento hybrid finalizado com resultado regex (LLM falhou)');
        }
      }
    });

    const deduped = deduplicateRows(results.map(r => r.csvRow));
    console.log(
      `[Enriquecimento Híbrido] ${deduped.duplicates_removed} duplicatas removidas`
    );

    return results;
  } catch (error) {
    console.error('[Enriquecimento Híbrido] Erro na fase 1:', error);
    throw new Error(`Erro no enriquecimento Híbrido: ${error instanceof Error ? error.message : String(error)}`);
  }
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
 * Exporta entidades extraídas (bruto) para CSV
 * Inclui: chunk_id, text_raw, unit_type, unit_ref, hierarchy_path, is_noise, confidence
 */
export function exportRawEntitiesCSV(
  results: EnrichedChunkResult[],
  includeNoise: boolean = false
): string {
  const rows = results
    .filter(r => includeNoise || r.csvRow.is_noise === 0)
    .map(r => ({
      chunk_id: r.csvRow.chunk_id,
      text_raw: r.csvRow.text_raw,
      unit_type: r.csvRow.unit_type,
      unit_ref: r.csvRow.unit_ref,
      hierarchy_path: r.csvRow.hierarchy_path,
      doc_family: r.csvRow.doc_family,
      law_name: r.csvRow.law_name,
      is_noise: r.csvRow.is_noise,
      noise_reason: r.csvRow.noise_reason,
      confidence: r.csvRow.confidence,
      source: r.source,
      processing_time_ms: r.processingTimeMs
    }));

  // Headers
  const headers = [
    'chunk_id',
    'text_raw',
    'unit_type',
    'unit_ref',
    'hierarchy_path',
    'doc_family',
    'law_name',
    'is_noise',
    'noise_reason',
    'confidence',
    'source',
    'processing_time_ms'
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
