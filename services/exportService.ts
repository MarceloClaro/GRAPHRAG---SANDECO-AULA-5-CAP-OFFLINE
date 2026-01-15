import { DocumentChunk } from '../types';

/**
 * Converte chunks para formato de exportação com histórico progressivo
 * Mantém todas as versões do texto e métricas através do pipeline
 */
export const chunksToExportFormat = (chunks: DocumentChunk[]) => {
  return chunks.map((chunk) => {
    const stages = (chunk.processingStages as any)?.stages || [];
    
    // Extrai conteúdo de cada etapa
    const original = stages[0]?.content || chunk.contentOriginal || chunk.content;
    const cleaned = stages[1]?.content || chunk.contentCleaned || chunk.content;
    const coherent = stages[3]?.content || chunk.contentCoherent || chunk.content;
    const final = chunk.content;

    // Extrai métricas de cada etapa
    const originalMetrics = stages[0]?.metrics || {};
    const cleanedMetrics = stages[1]?.metrics || {};
    const coherentMetrics = stages[3]?.metrics || {};
    const finalMetrics = stages[4]?.metrics || {};

    return {
      // Identificação
      id: chunk.id,
      sourceFile: chunk.sourceFile || chunk.source,
      pageNumber: chunk.pageNumber || '',
      
      // Classificação
      entityType: chunk.entityType || '',
      entityLabel: chunk.entityLabel || '',
      
      // Rastreamento
      aiProvider: chunk.aiProvider || '',
      
      // Histórico de Processamento - PROGRESSIVO
      content_original: original,
      content_cleaned: cleaned,
      content_coherent: coherent,
      content_final: final,
      
      // Métricas Progressivas
      wordcount_original: originalMetrics.wordCount || 0,
      wordcount_cleaned: cleanedMetrics.wordCount || 0,
      wordcount_coherent: coherentMetrics.wordCount || 0,
      wordcount_final: finalMetrics.wordCount || 0,
      
      sentencecount_original: originalMetrics.sentenceCount || 0,
      sentencecount_cleaned: cleanedMetrics.sentenceCount || 0,
      sentencecount_coherent: coherentMetrics.sentenceCount || 0,
      sentencecount_final: finalMetrics.sentenceCount || 0,
      
      readability_original: originalMetrics.readabilityScore || 0,
      readability_cleaned: cleanedMetrics.readabilityScore || 0,
      readability_coherent: coherentMetrics.readabilityScore || 0,
      readability_final: finalMetrics.readabilityScore || 0,
      
      // Resumo do Histórico
      processingStages: chunk.processingHistory || '',
      
      // Entidades
      keywords: (chunk.keywords || []).join('; '),
      
      // Timestamps
      uploadTime: chunk.uploadTime || '',
      processingTime: chunk.processingTime || '',
    };
  });
};

export const downloadCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert("Nenhum dado para exportar.");
    return;
  }

  // Extract headers - mantém ordem dos campos
  const headers = Object.keys(data[0]);
  
  // Create CSV rows
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => {
      return headers.map(fieldName => {
        let value = row[fieldName];
        
        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }
        
        // Convert arrays/objects to string representation
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        } else {
          value = String(value);
        }

        // Escape double quotes by doubling them
        // Enclose in double quotes to handle commas, newlines, and original quotes
        return `"${value.replace(/"/g, '""')}"`;
      }).join(',');
    })
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exporta chunks com histórico completo de processamento
 */
export const exportChunksWithHistory = (chunks: DocumentChunk[], filename?: string) => {
  const exportData = chunksToExportFormat(chunks);
  const exportFilename = filename || `entidades-processadas-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(exportData, exportFilename);
};