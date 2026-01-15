/**
 * xiaozhi.me API Integration Service
 * Suporte para múltiplos modelos premium:
 * - DeepSeek-R1 (análise lógica)
 * - Qwen 2.5 (multilíngue)
 * - Claude 3.5 Sonnet (análise geral)
 * - Voyage-3 (embeddings)
 * - GPT-4 Turbo (fallback)
 */

export interface Xiaozhi {
  endpoint: string;
  apiKey: string;
  models: {
    default: string;
    analysis: string;
    embedding: string;
    summary: string;
  };
}

export interface XiaozhibMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface XiaozhibResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: XiaozhibMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const defaultXiaozhiConfig: Xiaozhi = {
  endpoint: 'https://api.xiaozhi.me/v1',
  apiKey: process.env.VITE_XIAOZHI_API_KEY || '',
  models: {
    default: 'deepseek-r1',
    analysis: 'deepseek-r1',
    embedding: 'voyage-3',
    summary: 'qwen-turbo'
  }
};

/**
 * Análise profunda com DeepSeek-R1 via xiaozhi.me
 */
export const analyzeDocumentXiaozhi = async (
  docContent: string,
  config: Xiaozhi,
  customModel?: string
): Promise<{
  analysis: string;
  keywords: string[];
  summary: string;
  complexity: number;
  entities: Array<{ text: string; type: string }>;
  metadata: Record<string, any>;
}> => {
  if (!config.apiKey) {
    throw new Error('xiaozhi.me API key não configurada');
  }

  try {
    const prompt = `Você é especialista em análise de documentos técnicos e legais.

ANALISAR:
${docContent}

RETORNE JSON COM:
{
  "analysis": "análise detalhada",
  "keywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"],
  "summary": "resumo de 1-2 linhas",
  "complexity": 0.1-1.0,
  "entities": [{"text": "entidade", "type": "TIPO"}],
  "semantic_structure": "DEFINIÇÃO|MÉTODO|RESULTADO|CONCLUSÃO",
  "language_quality": "FORMAL|TÉCNICO|COLOQUIAL"
}

RETORNE APENAS JSON VÁLIDO, SEM EXPLICAÇÕES.`;

    const messages: XiaozhibMessage[] = [
      {
        role: 'system',
        content: 'Você é um analisador de documentos especializado em estrutura semântica e entidades. Responda APENAS em JSON válido.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await fetch(`${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: customModel || config.models.analysis,
        messages: messages,
        temperature: 0.3,
        max_tokens: 2000,
        top_p: 0.95,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      })
    });

    if (!response.ok) {
      throw new Error(`xiaozhi.me error: ${response.status} ${response.statusText}`);
    }

    const data: XiaozhibResponse = await response.json();
    const content = data.choices[0]?.message?.content || '{}';

    // Extrai JSON da resposta (pode conter markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

    return {
      analysis: result.analysis || '',
      keywords: result.keywords || [],
      summary: result.summary || '',
      complexity: result.complexity || 0.5,
      entities: result.entities || [],
      metadata: {
        semantic_structure: result.semantic_structure,
        language_quality: result.language_quality,
        model_used: customModel || config.models.analysis,
        provider: 'xiaozhi.me',
        usage: {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens
        }
      }
    };
  } catch (error: any) {
    console.error('Erro na análise xiaozhi.me:', error.message);
    throw error;
  }
};

/**
 * Geração de resumo com Qwen Turbo
 */
export const summarizeWithQwenXiaozhi = async (
  content: string,
  config: Xiaozhi,
  maxLength: number = 200
): Promise<string> => {
  try {
    const response = await fetch(`${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em síntese de texto. Crie resumos concisos com máximo ${maxLength} caracteres.`
          },
          {
            role: 'user',
            content: `Resuma em até ${maxLength} caracteres:\n\n${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: Math.ceil(maxLength / 4) + 50
      })
    });

    if (!response.ok) {
      throw new Error(`Qwen error: ${response.status}`);
    }

    const data: XiaozhibResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error: any) {
    console.error('Erro no resumo Qwen:', error.message);
    return '';
  }
};

/**
 * Embeddings via Voyage-3 em xiaozhi.me
 * Alternativa ao Ollama para qualidade premium
 */
export const generateEmbeddingXiaozhi = async (
  text: string,
  config: Xiaozhi
): Promise<{
  embedding: number[];
  dimensions: number;
  model: string;
}> => {
  if (!config.apiKey) {
    throw new Error('xiaozhi.me API key não configurada');
  }

  try {
    const response = await fetch(`${config.endpoint}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.models.embedding,
        input: text,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding error: ${response.status}`);
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding || [];

    return {
      embedding: embedding,
      dimensions: embedding.length,
      model: config.models.embedding
    };
  } catch (error: any) {
    console.error('Erro ao gerar embedding xiaozhi.me:', error.message);
    throw error;
  }
};

/**
 * Comparação semântica entre textos
 * Usa análise Claude 3.5 Sonnet
 */
export const compareSemanticXiaozhi = async (
  text1: string,
  text2: string,
  config: Xiaozhi
): Promise<{
  similarity: number;
  differences: string[];
  commonThemes: string[];
  analysis: string;
}> => {
  try {
    const response = await fetch(`${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: 'claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise comparativa semântica. Responda em JSON válido.'
          },
          {
            role: 'user',
            content: `Compare semanticamente:

TEXTO 1:
${text1}

TEXTO 2:
${text2}

RETORNE JSON:
{
  "similarity": 0.0-1.0,
  "differences": ["diferença1", "diferença2"],
  "commonThemes": ["tema1", "tema2"],
  "analysis": "análise detalhada"
}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`Comparison error: ${response.status}`);
    }

    const data: XiaozhibResponse = await response.json();
    const content = data.choices[0]?.message?.content || '{}';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
  } catch (error: any) {
    console.error('Erro na comparação xiaozhi.me:', error.message);
    throw error;
  }
};

/**
 * Extração de estrutura (Índice, sumário, etc)
 */
export const extractStructureXiaozhi = async (
  documentContent: string,
  config: Xiaozhi
): Promise<{
  structure: Array<{
    level: number;
    title: string;
    startIndex: number;
    endIndex: number;
  }>;
  toc: string[];
  sections: Record<string, string[]>;
}> => {
  try {
    const response = await fetch(`${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.models.analysis,
        messages: [
          {
            role: 'system',
            content: 'Você é especialista em análise estrutural de documentos. Retorne JSON válido.'
          },
          {
            role: 'user',
            content: `Extraia a estrutura do documento:

${documentContent.substring(0, 2000)}...

RETORNE JSON:
{
  "structure": [{"level": 1, "title": "título", "startIndex": 0, "endIndex": 100}],
  "toc": ["Capítulo 1", "Capítulo 2"],
  "sections": {"Introdução": ["parágrafo1", "parágrafo2"]}
}`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`Structure error: ${response.status}`);
    }

    const data: XiaozhibResponse = await response.json();
    const content = data.choices[0]?.message?.content || '{}';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
  } catch (error: any) {
    console.error('Erro na extração de estrutura:', error.message);
    throw error;
  }
};

/**
 * Teste de conectividade com xiaozhi.me
 */
export const testXiaozhi = async (config: Xiaozhi): Promise<{
  available: boolean;
  models: string[];
  error?: string;
}> => {
  try {
    const response = await fetch(`${config.endpoint}/models`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    });

    if (!response.ok) {
      return {
        available: false,
        models: [],
        error: `HTTP ${response.status}`
      };
    }

    const data = await response.json();
    const models = data.data?.map((m: any) => m.id) || [];

    return {
      available: true,
      models: models
    };
  } catch (error: any) {
    return {
      available: false,
      models: [],
      error: error.message
    };
  }
};

/**
 * Rate limiting helper
 */
export const createXiaozhibRateLimiter = (maxRequestsPerMinute: number = 60) => {
  const requests: number[] = [];

  return {
    async waitIfNeeded() {
      const now = Date.now();
      requests.push(now);

      // Remove requests older than 1 minute
      while (requests.length > 0 && requests[0] < now - 60000) {
        requests.shift();
      }

      if (requests.length > maxRequestsPerMinute) {
        const oldestRequest = requests[0];
        const waitTime = Math.max(0, oldestRequest + 60000 - now + 100);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  };
};
