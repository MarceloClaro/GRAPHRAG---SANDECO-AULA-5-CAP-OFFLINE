/**
 * Serviço RAG (Retrieval-Augmented Generation)
 * Busca conhecimento no banco de dados para responder perguntas
 */

import { getDatabase, StoredKnowledge } from './databaseService';

export interface RAGContext {
  query: string;
  documents: StoredKnowledge[];
  relevanceScores: number[];
  totalRelevance: number;
}

export interface RAGResponse {
  answer: string;
  context: RAGContext;
  confidence: number;
  sources: string[];
  keywords: string[];
}

class RAGService {
  private db = null as any;
  private initialized = false;

  async initialize(): Promise<void> {
    if (!this.initialized) {
      this.db = await getDatabase();
      this.initialized = true;
    }
  }

  /**
   * Extrai keywords de uma pergunta
   */
  private extractKeywords(query: string): string[] {
    // Remove stop words em português
    const stopWords = new Set([
      'o', 'a', 'de', 'do', 'da', 'e', 'é', 'ou', 'um', 'uma',
      'em', 'para', 'com', 'sem', 'por', 'como', 'mas', 'se',
      'na', 'no', 'nas', 'nos', 'que', 'qual', 'quais', 'onde',
      'quando', 'por que', 'porquê', 'como', 'muito', 'pouco',
      'mais', 'menos', 'esse', 'esse', 'aquele', 'esse', 'isto'
    ]);

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => !stopWords.has(word) && word.length > 2)
      .slice(0, 5); // Top 5 keywords
  }

  /**
   * Realiza busca RAG para uma pergunta
   */
  async search(query: string, options: {
    method?: 'keywords' | 'fulltext' | 'combined';
    limit?: number;
  } = {}): Promise<RAGContext> {
    await this.initialize();

    const method = options.method || 'combined';
    const limit = options.limit || 5;
    const keywords = this.extractKeywords(query);

    let documents: StoredKnowledge[] = [];
    let relevanceScores: number[] = [];

    if (method === 'keywords' || method === 'combined') {
      const keywordResults = await this.db.searchByKeywords(keywords, limit);
      documents.push(...keywordResults);
      relevanceScores.push(...keywordResults.map((doc: StoredKnowledge) => {
        const matches = keywords.filter(kw => 
          doc.content.toLowerCase().includes(kw) ||
          doc.keywords.some(k => k.toLowerCase().includes(kw))
        ).length;
        return matches / keywords.length;
      }));
    }

    if (method === 'fulltext' || method === 'combined') {
      const fullTextResults = await this.db.fullTextSearch(query, limit);
      const newDocs = fullTextResults.filter(doc => 
        !documents.find(d => d.id === doc.id)
      );
      documents.push(...newDocs);
      relevanceScores.push(...newDocs.map(() => 0.8)); // Score padrão para fulltext
    }

    // Remove duplicatas
    const uniqueDocs = Array.from(
      new Map(documents.map(doc => [doc.id, doc])).values()
    ).slice(0, limit);

    const uniqueScores = uniqueDocs.map((doc, idx) => {
      const originalIdx = documents.findIndex(d => d.id === doc.id);
      return relevanceScores[originalIdx] || 0.5;
    });

    const totalRelevance = uniqueScores.reduce((a, b) => a + b, 0) / Math.max(uniqueScores.length, 1);

    return {
      query,
      documents: uniqueDocs,
      relevanceScores: uniqueScores,
      totalRelevance
    };
  }

  /**
   * Constrói prompt para LLM baseado em contexto RAG
   */
  buildPrompt(context: RAGContext): string {
    const documentSection = context.documents
      .map((doc, idx) => `
[Documento ${idx + 1}] (Relevância: ${(context.relevanceScores[idx] * 100).toFixed(1)}%)
Fonte: ${doc.source}
Conteúdo: ${doc.processedContent.slice(0, 300)}...
Etapa: ${doc.stage}
      `.trim())
      .join('\n\n---\n\n');

    return `
Você é um assistente especializado em análise de documentos. Responda a pergunta baseada APENAS no contexto fornecido.

PERGUNTA: ${context.query}

CONTEXTO (${context.documents.length} documento(s) relevante(s)):
${documentSection}

INSTRUÇÕES:
1. Responda de forma clara e concisa
2. Cite as fontes quando possível
3. Se não souber, diga que não há informação suficiente no contexto
4. Use a informação do "Conteúdo" principal para responder
5. Mencione o score de relevância se baixo (<50%)

RESPOSTA:`;
  }

  /**
   * Gera resposta usando contexto RAG
   */
  async generateAnswer(query: string, aiProvider: (prompt: string) => Promise<string>): Promise<RAGResponse> {
    await this.initialize();

    // Busca contexto
    const context = await this.search(query, { method: 'combined', limit: 5 });

    // Constrói prompt
    const prompt = this.buildPrompt(context);

    // Chama AI
    const answer = await aiProvider(prompt);

    // Extrai keywords da resposta
    const answerKeywords = this.extractKeywords(answer);

    return {
      answer,
      context,
      confidence: Math.min(context.totalRelevance * 100, 95), // Max 95% confidence
      sources: [...new Set(context.documents.map(d => d.source))],
      keywords: answerKeywords
    };
  }

  /**
   * Carrega dados do CSV para o banco
   */
  async importFromCSV(csvData: any[]): Promise<{ imported: number; skipped: number }> {
    await this.initialize();

    const documents: StoredKnowledge[] = [];
    let skipped = 0;

    csvData.forEach((row: any, idx: number) => {
      try {
        const keywords = this.extractKeywords(row.Conteudo_Processado || row.Conteudo_Original || '');
        
        const doc: StoredKnowledge = {
          id: `csv-${idx}-${row.Chunk_ID}`,
          chunkId: row.Chunk_ID || `row-${idx}`,
          content: row.Conteudo_Original || row.Conteudo_Processado || '',
          processedContent: row.Conteudo_Processado || '',
          source: row.Arquivo || 'unknown',
          stage: row.Etapa_Atual || 'unknown',
          keywords,
          coherenceScore: parseFloat(row.Score_Coerencia) || undefined,
          timestamp: row.Timestamp_Export || new Date().toISOString(),
          metadata: row // Armazena toda a linha para referência
        };

        documents.push(doc);
      } catch (error) {
        console.warn(`Erro ao processar linha ${idx}:`, error);
        skipped++;
      }
    });

    const imported = await this.db.saveChunks(documents);
    return { imported, skipped };
  }

  /**
   * Obtém estatísticas do conhecimento
   */
  async getKnowledgeStats(): Promise<any> {
    await this.initialize();
    return this.db.getStats();
  }
}

// Singleton
let ragInstance: RAGService | null = null;

export async function getRAGService(): Promise<RAGService> {
  if (!ragInstance) {
    ragInstance = new RAGService();
    await ragInstance.initialize();
  }
  return ragInstance;
}

export default RAGService;
