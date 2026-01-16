import { DocumentChunk, EmbeddingVector } from '../types';
import crypto from 'crypto';

/**
 * Serviço de enriquecimento de CSV com:
 * - Limpeza anti-esquisitice
 * - Detecção de ruído
 * - Deduplicação
 * - Metadados de estrutura jurídica
 */

export interface CSVRow {
  chunk_id: string;
  source_file: string;
  doc_family: string;
  law_name: string;
  page_start: number;
  page_end: number;
  chunk_index: number;
  unit_type: string;
  unit_ref: string;
  hierarchy_path: string;
  is_noise: 0 | 1;
  noise_reason: string;
  dedupe_hash: string;
  dedupe_group: string;
  token_count: number;
  char_len: number;
  language: string;
  text_raw: string;
  text_clean: string;
  created_at: string;
  // Campos compatibilidade com versão anterior
  [key: string]: any;
}

/**
 * Caracteres de controle e esquisitices típicas de PDF
 */
const GARBAGE_CHARS = /[\uFFFE\u00AD\uFEFF\u200B-\u200F\u202A-\u202E\uFEFF]/g;
const BROKEN_SEPARATORS = /[-￾]{2,}|[=_]{4,}/g;
const MULTIPLE_SPACES = /\s{2,}/g;
const MULTIPLE_BREAKS = /(\n\s*){3,}/g;

/**
 * Padrões para detectar ruído (sumário, índice, copyright, etc.)
 */
const NOISE_PATTERNS = {
  toc: /^\s*(sumário|índice|conteúdo|table of contents|índice sistemático|capitulo \d+|capítulo \d+|pág\.|p\.|page \d+)[\s\.\,]*$/im,
  copyright: /©|copyright|all rights reserved|direitos reservados|propriedade intelectual/i,
  header_footer: /^\s*(página \d+|page \d+|pág\.|p\.|—|–|continuação|conclusão de página)/im,
  contact: /^\s*(telefone|email|site|www\.|contato|endereço|cep|cnpj|cpf)\s*[\:=]?/im,
  duplicated: /^(em relação ao|conforme|vide|ver|art\.|parágrafo único)/im,
  empty_or_minimal: /^[\s\-\.,;:]*$|^.{1,10}$/
};

/**
 * Padrões para extrair referência jurídica (Art., §, Inciso, etc.)
 */
const JURIDICAL_PATTERNS = {
  article: /^[àáâãäaªA]rt(igo)?[\.\s]+(\d+[a-z]?)/i,
  paragraph: /[§¶]\s*(\d+[a-z]?|único)/i,
  inciso: /[Ii]nciso\s+([IVivXLC]+)/,
  section: /[Ss]eção\s+([IVivXLC]+)/,
  chapter: /[Cc]apítulo\s+([IVivXLC]+|\d+[a-z]?)/,
  title: /[Tt]ítulo\s+([IVivXLC]+|\d+[a-z]?)/,
  book: /[Ll]ivro\s+([IVivXLC]+|\d+[a-z]?)/
};

/**
 * Mapeia arquivo para família e lei
 */
function mapDocToFamily(sourceFile: string): { doc_family: string; law_name: string } {
  const lower = sourceFile.toLowerCase();

  if (lower.includes('constituicao') || lower.includes('cf88') || lower.includes('cf/88')) {
    return { doc_family: 'CF88', law_name: 'Constituição Federal de 1988' };
  }
  if (lower.includes('cpc') || lower.includes('processo civil') || lower.includes('modelos')) {
    return { doc_family: 'CPC2015', law_name: 'Código de Processo Civil' };
  }
  if (lower.includes('vade') || lower.includes('mecum')) {
    return { doc_family: 'VADE', law_name: 'Vade Mecum' };
  }
  if (lower.includes('clт') || lower.includes('consolidacao laboral')) {
    return { doc_family: 'CLT', law_name: 'Consolidação das Leis do Trabalho' };
  }
  if (lower.includes('cc') || lower.includes('civil')) {
    return { doc_family: 'CC2002', law_name: 'Código Civil' };
  }

  return { doc_family: 'UNKNOWN', law_name: 'Não identificada' };
}

/**
 * Detecta se um texto é ruído
 */
function detectNoise(text: string): { is_noise: 0 | 1; reason: string } {
  const lines = text.trim().split('\n');
  
  for (const pattern of Object.entries(NOISE_PATTERNS)) {
    const [reason, regex] = pattern;
    
    // Verifica primeiras/últimas linhas (onde ruído tipicamente aparece)
    if (regex.test(lines[0]) || regex.test(lines[lines.length - 1])) {
      return { is_noise: 1, reason };
    }

    // Verifica se texto inteiro é só ruído
    if (reason === 'empty_or_minimal' && regex.test(text)) {
      return { is_noise: 1, reason };
    }
  }

  return { is_noise: 0, reason: '' };
}

/**
 * Extrai referência jurídica do texto (Art. 5º, § 1º, etc.)
 */
function extractJuridicalRef(text: string, doc_family: string): { unit_type: string; unit_ref: string } {
  // Tenta encontrar padrão jurídico nas primeiras 3 linhas
  const firstLines = text.split('\n').slice(0, 3).join(' ');

  for (const [type, pattern] of Object.entries(JURIDICAL_PATTERNS)) {
    const match = firstLines.match(pattern);
    if (match) {
      const ref = match[0];
      return { unit_type: type, unit_ref: ref };
    }
  }

  // Fallback: tipo genérico baseado na família
  if (doc_family === 'CF88') {
    return { unit_type: 'artigo', unit_ref: 'Artigo Não Identificado' };
  }

  return { unit_type: 'texto_generico', unit_ref: 'Sem Referência' };
}

/**
 * Constrói hierarchy_path heurístico
 */
function buildHierarchyPath(
  doc_family: string,
  unit_type: string,
  unit_ref: string,
  text: string
): string {
  const parts = [doc_family];

  // Tenta encontrar título/capítulo no texto
  const titleMatch = text.match(/[Tt]ítulo\s+([IVivXLC]+|\d+[a-z]?)/);
  if (titleMatch) parts.push(`Título ${titleMatch[1]}`);

  const chapterMatch = text.match(/[Cc]apítulo\s+([IVivXLC]+|\d+[a-z]?)/);
  if (chapterMatch) parts.push(`Capítulo ${chapterMatch[1]}`);

  // Adiciona a referência jurídica
  if (unit_ref !== 'Sem Referência') {
    parts.push(unit_ref);
  }

  return parts.join(' > ');
}

/**
 * Calcula hash SHA-256 normalizado para deduplicação
 */
function calculateDedupeHash(text: string): string {
  // Normaliza texto para hash
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

/**
 * Calcula dedupe_group (agrupa duplicatas)
 */
function calculateDedupeGroup(sourceFile: string, pageStart: number, unitRef: string): string {
  return `${sourceFile}|p${pageStart}|${unitRef}`.replace(/\s+/g, '_');
}

/**
 * Limpa texto "anti-esquisitice"
 */
function cleanText(rawText: string): string {
  let clean = rawText;

  // Remove caracteres de controle
  clean = clean.replace(GARBAGE_CHARS, '');

  // Remove separadores quebrados
  clean = clean.replace(BROKEN_SEPARATORS, ' ');

  // Colapsa múltiplos espaços
  clean = clean.replace(MULTIPLE_SPACES, ' ');

  // Colapsa múltiplas quebras de linha
  clean = clean.replace(MULTIPLE_BREAKS, '\n\n');

  // Remove cabeçalho/rodapé repetitivo (linhas isoladas com só número/palavra)
  const lines = clean.split('\n');
  const filtered = lines.filter(line => {
    const trimmed = line.trim();
    // Remove linhas que parecem ser só "página X" ou "pág. X"
    if (/^(página|page|pág\.|p\.|—)\s*\d+\s*$/i.test(trimmed)) return false;
    return true;
  });

  clean = filtered.join('\n').trim();

  // Normaliza incisos (OCR: 'l' para 'I', '1' para 'I' quando fizer sentido)
  // Cautela: só faz se encontrar padrão claro de inciso
  if (/inciso\s+[li1]/i.test(clean)) {
    clean = clean.replace(/inciso\s+l([^a-z]|$)/i, 'Inciso I$1');
    clean = clean.replace(/inciso\s+1([^a-z]|$)/i, 'Inciso I$1');
  }

  return clean;
}

/**
 * Conta tokens (aproximado: split por espaço)
 */
function countTokens(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Enriquece um chunk com metadados de CSV
 */
export function enrichChunkForCSV(
  chunk: DocumentChunk,
  chunkIndex: number,
  sourceFile: string
): CSVRow {
  const { doc_family, law_name } = mapDocToFamily(sourceFile);
  const textClean = cleanText(chunk.content);
  const { is_noise, reason } = detectNoise(textClean);
  const { unit_type, unit_ref } = extractJuridicalRef(textClean, doc_family);
  const hierarchyPath = buildHierarchyPath(doc_family, unit_type, unit_ref, textClean);
  const dedupeHash = calculateDedupeHash(textClean);
  const dedupeGroup = calculateDedupeGroup(sourceFile, chunk.pageNumber || 1, unit_ref);
  const tokenCount = countTokens(textClean);
  const charLen = textClean.length;

  return {
    chunk_id: chunk.id,
    source_file: sourceFile,
    doc_family,
    law_name,
    page_start: chunk.pageNumber || 1,
    page_end: chunk.pageNumber || 1,
    chunk_index: chunkIndex,
    unit_type,
    unit_ref,
    hierarchy_path: hierarchyPath,
    is_noise,
    noise_reason: reason,
    dedupe_hash: dedupeHash,
    dedupe_group: dedupeGroup,
    token_count: tokenCount,
    char_len: charLen,
    language: 'pt',
    text_raw: chunk.content,
    text_clean: textClean,
    created_at: new Date().toISOString(),
    // Mantém compatibilidade com campos antigos
    Chunk_ID: chunk.id,
    Arquivo: sourceFile,
    Pagina: chunk.pageNumber || 1,
    Tipo_Entidade_IA: chunk.entityType || unit_type,
    Rotulo_Entidade: chunk.entityLabel || unit_ref,
    Provedor_IA: chunk.aiProvider || 'unknown',
    Timestamp_Upload: chunk.uploadTime || new Date().toISOString(),
    Conteudo_Original: chunk.contentOriginal || chunk.content,
    Conteudo_Processado: textClean
  };
}

/**
 * Detecta e remove duplicatas (mantém primeira ocorrência)
 */
export function deduplicateRows(rows: CSVRow[]): { deduped: CSVRow[]; duplicates_removed: number } {
  const seen = new Set<string>();
  const deduped: CSVRow[] = [];
  let duplicates_removed = 0;

  for (const row of rows) {
    // Usa dedupe_group como chave primária
    const key = `${row.dedupe_hash}|${row.dedupe_group}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(row);
    } else {
      duplicates_removed++;
    }
  }

  return { deduped, duplicates_removed };
}

/**
 * Gera relatório de qualidade do CSV
 */
export function generateQualityReport(rows: CSVRow[]): {
  total_rows: number;
  noise_rows: number;
  clean_rows: number;
  noise_percentage: number;
  avg_token_count: number;
  avg_char_len: number;
  noise_breakdown: Record<string, number>;
  families: Set<string>;
  laws: Set<string>;
} {
  const noiseBreakdown: Record<string, number> = {};
  let totalTokens = 0;
  let totalChars = 0;

  for (const row of rows) {
    if (row.is_noise === 1) {
      noiseBreakdown[row.noise_reason] = (noiseBreakdown[row.noise_reason] || 0) + 1;
    }
    totalTokens += row.token_count;
    totalChars += row.char_len;
  }

  const noiseCount = Object.values(noiseBreakdown).reduce((a, b) => a + b, 0);
  const cleanCount = rows.length - noiseCount;

  const families = new Set(rows.map(r => r.doc_family));
  const laws = new Set(rows.map(r => r.law_name));

  return {
    total_rows: rows.length,
    noise_rows: noiseCount,
    clean_rows: cleanCount,
    noise_percentage: rows.length > 0 ? (noiseCount / rows.length) * 100 : 0,
    avg_token_count: rows.length > 0 ? totalTokens / rows.length : 0,
    avg_char_len: rows.length > 0 ? totalChars / rows.length : 0,
    noise_breakdown: noiseBreakdown,
    families,
    laws
  };
}
