/**
 * Serviço de Coesão e Coerência para Texto
 * 
 * Técnicas aplicadas:
 * 1. Limpeza e Organização: Remove quebras desnecessárias, une palavras
 * 2. Adição de Coesão: Injeta conectivos entre parágrafos
 * 3. Melhoria de Coerência: Fixa pronomes soltos, mantém referências
 * 4. Normalização de Vocabulário: Padroniza abreviaturas
 * 5. Cálculo de Legibilidade: Score Flesch para português
 */

import { DocumentChunk } from '../types';

export interface TextProcessingStage {
  stageName: string;
  timestamp: string;
  content: string;
  contentPreview: string;
  metrics: {
    wordCount: number;
    sentenceCount: number;
    readabilityScore: number;
    charCount: number;
  };
}

export interface TextProcessingResult {
  processedText: string;
  originalText: string;
  stages: TextProcessingStage[];
  metrics: {
    originalReadability: number;
    finalReadability: number;
    readabilityImprovement: number;
    originalWordCount: number;
    finalWordCount: number;
    processedAt: string;
  };
}

// Coesivos e conectivos em português
const COESIVES = [
  'Neste contexto,',
  'Portanto,',
  'Assim,',
  'De modo similar,',
  'Consequentemente,',
  'Por outro lado,',
  'Além disso,',
  'Entretanto,',
  'Todavia,',
  'Contudo,',
  'Destarte,',
  'Outrossim,',
  'De fato,',
  'Em verdade,',
  'Logicamente,',
  'Indubitavelmente,',
  'Certamente,',
  'Vale ressaltar que',
  'É importante observar que',
  'Cabe destacar que',
];

// Abreviaturas comuns em documentos jurídicos
const ABBREVIATIONS: Record<string, string> = {
  'art\\.' : 'Artigo',
  'arts\\.' : 'Artigos',
  'cap\\.' : 'Capítulo',
  'caps\\.' : 'Capítulos',
  'obs\\.' : 'Observação',
  'ex\\.' : 'Exemplo',
  'pág\\.' : 'página',
  'págs\\.' : 'páginas',
  'inc\\.' : 'inciso',
  'incs\\.' : 'incisos',
  'par\\.' : 'parágrafo',
  'pars\\.' : 'parágrafos',
  'cf\\.' : 'Confira',
  'n\\.' : 'número',
  'nº\\.' : 'número',
  'eds\\.' : 'edições',
  'ed\\.' : 'edição',
  'vol\\.' : 'volume',
  'vols\\.' : 'volumes',
  'pp\\.' : 'páginas',
  'p\\.' : 'página',
  'et al\\.' : 'e outros',
  'etc\\.' : 'e assim por diante',
};

/**
 * Limpa e organiza o texto:
 * - Remove quebras de linha desnecessárias
 * - Une palavras quebradas (com hífen)
 * - Normaliza espaçamento
 * - Adiciona pontuação faltante
 */
export function cleanAndOrganizeText(text: string): string {
  if (!text) return text;

  // Remove espaços múltiplos
  let cleaned = text.replace(/\s+/g, ' ');

  // Une palavras quebradas no final da linha (hífen)
  // Ex: "desem- prego" → "desemprego"
  cleaned = cleaned.replace(/-\s+([a-záàâãéèêíïóôõöúçñ])/gi, '$1');

  // Remove quebras de linha dentro de parágrafos
  cleaned = cleaned.replace(/\n(?!\n)/g, ' ');

  // Normaliza múltiplas quebras para apenas 2 (parágrafo)
  cleaned = cleaned.replace(/\n\n+/g, '\n\n');

  // Adiciona espaço após pontuação se estiver faltando
  cleaned = cleaned.replace(/([.!?])([A-ZÁàâãéèêíïóôõöúçñ])/g, '$1 $2');

  // Remove espaços antes de pontuação
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1');

  // Normaliza espaços duplos
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim();
}

/**
 * Adiciona coesão ao texto através de conectivos
 * Distribui conectivos entre parágrafos de forma inteligente
 */
export function addCoesion(text: string): string {
  if (!text) return text;

  // Separa parágrafos
  const paragraphs = text.split('\n\n').filter(p => p.trim());

  if (paragraphs.length <= 1) return text;

  // Processa parágrafos adicionando conectivos onde apropriado
  const enhancedParagraphs = paragraphs.map((para, index) => {
    // Primeiro parágrafo não recebe conectivo
    if (index === 0) return para;

    // Verifica se o parágrafo já começa com conectivo
    const startsWithCoesive = COESIVES.some(c => 
      para.toLowerCase().trim().startsWith(c.toLowerCase())
    );

    if (startsWithCoesive) return para;

    // Seleciona conectivo apropriado de forma pseudoaleatória
    const randomCoesive = COESIVES[index % COESIVES.length];

    // Se o parágrafo começa com maiúscula, mantém
    const firstChar = para.charAt(0);
    const restOfPara = para.slice(1);

    return `${randomCoesive} ${firstChar}${restOfPara}`;
  });

  return enhancedParagraphs.join('\n\n');
}

/**
 * Melhora coerência:
 * - Fixa pronomes soltos
 * - Mantém referências a entidades
 * - Evita repetição excessiva de palavras
 */
export function improveCoherence(text: string, keywords?: string[]): string {
  if (!text) return text;

  let coherent = text;

  // Fixa pronomes sem referência clara no início de sentença
  coherent = coherent.replace(/\bEle\s+([a-z])/gi, 'O procedimento $1');
  coherent = coherent.replace(/\bEla\s+([a-z])/gi, 'A disposição $1');
  coherent = coherent.replace(/\bIsso\s+([a-z])/gi, 'Este fato $1');
  coherent = coherent.replace(/\bIsto\s+([a-z])/gi, 'Esta situação $1');

  // Remove repetições excessivas da mesma palavra em sequência
  coherent = coherent.replace(/\b(\w+)\s+\1\b/gi, '$1');

  // Se há keywords, garante que são mantidas consistentemente
  if (keywords && keywords.length > 0) {
    keywords.forEach(keyword => {
      // Mantém a primeira menção com destaque conceitual
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
      const matches = coherent.match(regex);
      
      if (matches && matches.length > 3) {
        // Se a palavra aparece muito, substitui algumas repetições por "conceito relacionado"
        // Mas mantém pelo menos 2 menções diretas
        let count = 0;
        coherent = coherent.replace(regex, (match) => {
          count++;
          return (count <= 2 || count % 3 === 0) ? match : `o ${keyword.toLowerCase()}`;
        });
      }
    });
  }

  return coherent;
}

/**
 * Normaliza vocabulário jurídico/técnico
 * Padroniza abreviaturas comuns
 */
export function normalizeVocabulary(text: string): string {
  if (!text) return text;

  let normalized = text;

  // Aplica todas as substituições de abreviaturas
  Object.entries(ABBREVIATIONS).forEach(([abbrev, full]) => {
    const regex = new RegExp(abbrev, 'gi');
    normalized = normalized.replace(regex, full);
  });

  return normalized;
}

/**
 * Calcula score de legibilidade (Fórmula Flesch simplificada para português)
 * Escala: 0-100 (quanto maior, mais legível)
 */
export function calculateReadability(text: string): number {
  if (!text || text.length < 3) return 0;

  const words = text.split(/\s+/).length;
  const sentences = (text.match(/[.!?]/g) || []).length || 1;
  const syllables = countSyllables(text);

  // Flesch Reading Ease adaptado para português
  const score = 248 - (1.2 * words) - (58.5 * syllables / words);
  
  // Retorna entre 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Conta sílabas em um texto (aproximação para português)
 */
export function countSyllables(text: string): number {
  if (!text) return 0;

  let count = 0;
  const words = text.toLowerCase().split(/\s+/);

  words.forEach(word => {
    // Remove pontuação
    word = word.replace(/[^a-záàâãéèêíïóôõöúçñ]/g, '');
    
    // Conta vogais consecutivas como uma sílaba
    if (word.length > 0) {
      let inVowel = false;
      for (const char of word) {
        const isVowel = 'aáàâãeéèêiíïoóôõöuúü'.includes(char);
        if (isVowel && !inVowel) {
          count++;
          inVowel = true;
        } else if (!isVowel) {
          inVowel = false;
        }
      }
    }
  });

  return Math.max(1, count);
}

/**
 * Processa texto com todas as técnicas de coesão/coerência
 * Mantém histórico de cada etapa
 */
export function processTextWithCoherence(
  originalText: string,
  keywords?: string[]
): TextProcessingResult {
  const startTime = new Date().toISOString();
  const stages: TextProcessingStage[] = [];

  // Etapa 1: Original
  const originalReadability = calculateReadability(originalText);
  stages.push({
    stageName: 'original',
    timestamp: new Date().toISOString(),
    content: originalText,
    contentPreview: originalText.substring(0, 150),
    metrics: {
      wordCount: originalText.split(/\s+/).length,
      sentenceCount: (originalText.match(/[.!?]/g) || []).length,
      readabilityScore: originalReadability,
      charCount: originalText.length,
    },
  });

  // Etapa 2: Limpeza
  const cleaned = cleanAndOrganizeText(originalText);
  stages.push({
    stageName: 'cleaned',
    timestamp: new Date().toISOString(),
    content: cleaned,
    contentPreview: cleaned.substring(0, 150),
    metrics: {
      wordCount: cleaned.split(/\s+/).length,
      sentenceCount: (cleaned.match(/[.!?]/g) || []).length,
      readabilityScore: calculateReadability(cleaned),
      charCount: cleaned.length,
    },
  });

  // Etapa 3: Adição de Coesão
  const withCoesion = addCoesion(cleaned);
  stages.push({
    stageName: 'with_coesion',
    timestamp: new Date().toISOString(),
    content: withCoesion,
    contentPreview: withCoesion.substring(0, 150),
    metrics: {
      wordCount: withCoesion.split(/\s+/).length,
      sentenceCount: (withCoesion.match(/[.!?]/g) || []).length,
      readabilityScore: calculateReadability(withCoesion),
      charCount: withCoesion.length,
    },
  });

  // Etapa 4: Melhoria de Coerência
  const withCoherence = improveCoherence(withCoesion, keywords);
  stages.push({
    stageName: 'with_coherence',
    timestamp: new Date().toISOString(),
    content: withCoherence,
    contentPreview: withCoherence.substring(0, 150),
    metrics: {
      wordCount: withCoherence.split(/\s+/).length,
      sentenceCount: (withCoherence.match(/[.!?]/g) || []).length,
      readabilityScore: calculateReadability(withCoherence),
      charCount: withCoherence.length,
    },
  });

  // Etapa 5: Normalização de Vocabulário
  const normalized = normalizeVocabulary(withCoherence);
  const finalReadability = calculateReadability(normalized);
  stages.push({
    stageName: 'normalized',
    timestamp: new Date().toISOString(),
    content: normalized,
    contentPreview: normalized.substring(0, 150),
    metrics: {
      wordCount: normalized.split(/\s+/).length,
      sentenceCount: (normalized.match(/[.!?]/g) || []).length,
      readabilityScore: finalReadability,
      charCount: normalized.length,
    },
  });

  // Cria histórico em formato CSV compacto
  const processingHistory = stages
    .map(s => `${s.stageName}[${s.metrics.wordCount}w]`)
    .join(' → ');

  return {
    processedText: normalized,
    originalText,
    stages,
    metrics: {
      originalReadability,
      finalReadability,
      readabilityImprovement: finalReadability - originalReadability,
      originalWordCount: originalText.split(/\s+/).length,
      finalWordCount: normalized.split(/\s+/).length,
      processedAt: startTime,
    },
  };
}

/**
 * Cria coluna de histórico de processamento para CSV
 */
export function createProcessingHistoryColumn(result: TextProcessingResult): string {
  return result.stages
    .map(s => `${s.stageName}[${s.metrics.wordCount}w|r${s.metrics.readabilityScore.toFixed(1)}]`)
    .join(' → ');
}

/**
 * Enriquece chunk com processamento de coesão/coerência
 */
export function enrichChunkWithCoherence(chunk: DocumentChunk): DocumentChunk {
  if (!chunk.content) return chunk;

  const result = processTextWithCoherence(chunk.content, chunk.keywords);

  return {
    ...chunk,
    contentOriginal: chunk.content, // Backup original
    contentCleaned: result.stages[1]?.content,
    contentCoherent: result.stages[3]?.content,
    content: result.processedText, // Texto final
    processingHistory: createProcessingHistoryColumn(result),
    processingStages: {
      stages: result.stages,
      metrics: result.metrics,
    },
    readabilityScore: result.metrics.finalReadability,
  };
}
