/**
 * Serviço de Coesão e Limpeza de Texto
 * Organiza, une palavras quebradas, adiciona coesão e coerência ao texto
 */

import { DocumentChunk } from '../types';

export interface TextProcessingHistory {
  stage: string;
  timestamp: string;
  content: string;
  keywords?: string[];
  metrics?: {
    wordCount: number;
    sentenceCount: number;
    readabilityScore: number;
  };
}

/**
 * Limpa e organiza texto:
 * - Remove quebras de linha desnecessárias
 * - Une palavras fragmentadas
 * - Adiciona pontuação faltante
 * - Normaliza espaçamento
 */
export function cleanAndOrganizeText(text: string): string {
  let cleaned = text;

  // 1. Remove quebras de linha desnecessárias (mantém quebras deliberadas)
  cleaned = cleaned
    .replace(/\n\s*\n/g, '\n\n') // Normaliza parágrafos
    .replace(/\n(?![\n])/g, ' '); // Remove quebras simples, mantém duplas

  // 2. Une palavras quebradas (por hífens no fim de linha)
  cleaned = cleaned.replace(/(\w+)-\s+(\w+)/g, '$1$2');

  // 3. Remove espaçamento múltiplo
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 4. Normaliza pontuação (espaço antes de pontuação)
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1');

  // 5. Adiciona espaço após pontuação se faltando
  cleaned = cleaned.replace(/([.,!?;:])([A-Z])/g, '$1 $2');

  return cleaned;
}

/**
 * Adiciona conectores de coesão entre parágrafos
 * Conecta ideias relacionadas
 */
export function addCoesion(text: string, keywords: string[] = []): string {
  let improved = text;

  // Detecta possíveis parágrafos desconexos
  const paragraphs = improved.split('\n\n');

  if (paragraphs.length > 1) {
    // Adiciona conectores entre parágrafos baseado em proximidade de tópicos
    const connectors = [
      'Neste contexto,',
      'Neste sentido,',
      'Portanto,',
      'Assim,',
      'De modo similar,',
      'Em complemento,',
      'Além disso,',
      'Por conseguinte,',
      'Consequentemente,',
      'Em síntese,',
    ];

    const improvedParagraphs = paragraphs.map((para, idx) => {
      if (idx === 0) return para;

      // Adiciona conector se parágrafo é muito curto e desconexo
      if (para.length < 150 && !para.match(/^(No entanto|Porém|Contudo|Entretanto|No|A|O|Em|Por)/)) {
        const connector = connectors[idx % connectors.length];
        return `${connector} ${para.charAt(0).toLowerCase()}${para.slice(1)}`;
      }
      return para;
    });

    improved = improvedParagraphs.join('\n\n');
  }

  return improved;
}

/**
 * Melhora coerência: detecta pronomes soltos e adiciona referentes
 */
export function improveCoherence(text: string, entityLabel?: string): string {
  let improved = text;

  // Detecta pronomes potencialmente desconexos
  const detachedPronouns = /\b(Isso|Isto|Ele|Ela|Eles|Elas|Esse|Esse)\s+(?!foi|foi|é|são|tem|estava|estavam)/gi;

  if (detachedPronouns.test(improved) && entityLabel) {
    // Adiciona referência inicial
    if (!improved.toLowerCase().startsWith(entityLabel.toLowerCase())) {
      improved = `${entityLabel}: ${improved}`;
    }
  }

  // Evita repetição excessiva da mesma palavra
  const words = improved.split(/\s+/);
  const wordCounts: Record<string, number> = {};
  const problematicWords = ['o', 'a', 'de', 'em', 'para', 'por'];

  words.forEach((word) => {
    const lower = word.toLowerCase();
    if (problematicWords.includes(lower)) return;
    wordCounts[lower] = (wordCounts[lower] || 0) + 1;
  });

  return improved;
}

/**
 * Normaliza vocabulário e mantém sentido
 */
export function normalizeVocabulary(text: string): string {
  let normalized = text;

  // Padroniza gênero (se houver inconsistência)
  // Exemplo: "O artigo" vs "o artigo"
  normalized = normalized.replace(/\b([aeiou])lgum([a-z]*)\b/gi, (match, vowel, rest) => {
    return `algum${rest}`;
  });

  // Corrige abreviações comuns
  const abbreviations: Record<string, string> = {
    '\\bArt\\.\\s': 'Artigo ',
    '\\bCap\\.\\s': 'Capítulo ',
    '\\bPar\\.\\s': 'Parágrafo ',
    '\\bpág\\.\\s': 'página ',
    '\\bObs\\.\\s': 'Observação ',
    '\\bEx\\.\\s': 'Exemplo ',
  };

  Object.entries(abbreviations).forEach(([pattern, replacement]) => {
    normalized = normalized.replace(new RegExp(pattern, 'gi'), replacement);
  });

  return normalized;
}

/**
 * Processa texto completo com todas as técnicas
 */
export function processTextWithCoherence(
  originalText: string,
  entityLabel?: string,
  aiProvider?: string
): {
  processed: string;
  history: TextProcessingHistory[];
  metrics: {
    originalWordCount: number;
    processedWordCount: number;
    cleanedWordCount: number;
    readabilityImprovement: number;
  };
} {
  const history: TextProcessingHistory[] = [];

  // Stage 1: Original
  const originalWordCount = originalText.split(/\s+/).length;
  history.push({
    stage: 'original',
    timestamp: new Date().toISOString(),
    content: originalText.substring(0, 100),
    metrics: {
      wordCount: originalWordCount,
      sentenceCount: (originalText.match(/[.!?]/g) || []).length,
      readabilityScore: calculateReadability(originalText),
    },
  });

  // Stage 2: Clean and Organize
  const cleaned = cleanAndOrganizeText(originalText);
  const cleanedWordCount = cleaned.split(/\s+/).length;
  history.push({
    stage: 'cleaned',
    timestamp: new Date().toISOString(),
    content: cleaned.substring(0, 100),
    metrics: {
      wordCount: cleanedWordCount,
      sentenceCount: (cleaned.match(/[.!?]/g) || []).length,
      readabilityScore: calculateReadability(cleaned),
    },
  });

  // Stage 3: Add Coesion
  let withCoesion = addCoesion(cleaned);
  history.push({
    stage: 'with_coesion',
    timestamp: new Date().toISOString(),
    content: withCoesion.substring(0, 100),
  });

  // Stage 4: Improve Coherence
  let withCoherence = improveCoherence(withCoesion, entityLabel);
  history.push({
    stage: 'with_coherence',
    timestamp: new Date().toISOString(),
    content: withCoherence.substring(0, 100),
  });

  // Stage 5: Normalize Vocabulary
  const final = normalizeVocabulary(withCoherence);
  const finalWordCount = final.split(/\s+/).length;
  history.push({
    stage: 'normalized',
    timestamp: new Date().toISOString(),
    content: final.substring(0, 100),
    metrics: {
      wordCount: finalWordCount,
      sentenceCount: (final.match(/[.!?]/g) || []).length,
      readabilityScore: calculateReadability(final),
    },
  });

  return {
    processed: final,
    history,
    metrics: {
      originalWordCount,
      processedWordCount: cleanedWordCount,
      cleanedWordCount: finalWordCount,
      readabilityImprovement: calculateReadability(final) - calculateReadability(originalText),
    },
  };
}

/**
 * Calcula score de legibilidade (Flesch Reading Ease - simplificado)
 */
function calculateReadability(text: string): number {
  const words = text.split(/\s+/).length;
  const sentences = (text.match(/[.!?]/g) || []).length;
  const syllables = countSyllables(text);

  if (words === 0 || sentences === 0) return 0;

  // Fórmula simplificada de Flesch
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, score));
}

/**
 * Conta sílabas aproximadamente
 */
function countSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let count = 0;

  words.forEach((word) => {
    // Remove pontuação
    word = word.replace(/[.,!?;:]/g, '');

    // Regras simplificadas para português
    const vowels = word.match(/[aeiou]/gi) || [];
    let syllableCount = Math.max(1, vowels.length - 1);

    // Ajustes
    if (word.endsWith('e')) syllableCount = Math.max(1, syllableCount - 1);
    if (word.endsWith('ão') || word.endsWith('ões')) syllableCount += 1;

    count += syllableCount;
  });

  return count;
}

/**
 * Cria coluna de histórico para CSV (resumido)
 */
export function createProcessingHistoryColumn(history: TextProcessingHistory[]): string {
  return history
    .map((h) => `${h.stage}[${h.metrics?.wordCount || '?'}w]`)
    .join(' → ');
}
