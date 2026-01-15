/**
 * Configuração centralizada para modelos avançados
 * Importar e usar em toda a aplicação
 */

import { AdvancedOllamaConfig, defaultAdvancedConfig } from './services/advancedOllamaService';
import { Xiaozhi, defaultXiaozhiConfig } from './services/xiaozhiService';

/**
 * Detecta ambiente (desenvolvimento/produção)
 */
export const isDevelopment = import.meta.env.MODE === 'development';
export const isProduction = import.meta.env.MODE === 'production';

/**
 * Configuração Ollama Avançada
 */
export const advancedOllamaConfig: AdvancedOllamaConfig = {
  ollamaEndpoint: import.meta.env.VITE_OLLAMA_ENDPOINT || 'http://localhost:11434',
  xiaozhi: {
    endpoint: 'https://api.xiaozhi.me/v1',
    apiKey: import.meta.env.VITE_XIAOZHI_API_KEY || ''
  },
  models: {
    analysis: (import.meta.env.VITE_ANALYSIS_MODEL || 'deepseek-coder') as any,
    embedding: (import.meta.env.VITE_EMBEDDING_MODEL || 'voyage-3') as any,
    mongodbVector: import.meta.env.VITE_MONGODB_VECTOR === 'true'
  }
};

/**
 * Configuração xiaozhi.me
 */
export const xiaozhiConfig: Xiaozhi = {
  endpoint: 'https://api.xiaozhi.me/v1',
  apiKey: import.meta.env.VITE_XIAOZHI_API_KEY || '',
  models: {
    default: 'deepseek-r1',
    analysis: 'deepseek-r1',
    embedding: 'voyage-3',
    summary: 'qwen-turbo'
  }
};

/**
 * Configuração MongoDB (se usar Atlas)
 */
export const mongoDBConfig = {
  connectionString: import.meta.env.VITE_MONGODB_CONNECTION_STRING || '',
  database: import.meta.env.VITE_MONGODB_DATABASE || 'graphrag',
  collection: import.meta.env.VITE_MONGODB_COLLECTION || 'embeddings',
  vectorIndex: 'vector_search_index',
  queryVectorCount: 10
};

/**
 * Estratégia de provedor (fallback em cascata)
 */
export const providerStrategy = {
  analysis: ['ollama-deepseek', 'xiaozhi-deepseek-r1'],
  embedding: ['ollama-voyage-3', 'xiaozhi-voyage-3', 'fallback-random'],
  summary: ['xiaozhi-qwen', 'ollama-mistral']
};

/**
 * Validar configuração
 */
export const validateConfig = async (): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verificar Ollama
  try {
    const ollamaResponse = await fetch(`${advancedOllamaConfig.ollamaEndpoint}/api/tags`);
    if (!ollamaResponse.ok) {
      warnings.push('⚠️ Ollama não está respondendo. Usando fallback xiaozhi.me');
    }
  } catch (e) {
    warnings.push('⚠️ Ollama não disponível. Usando fallback xiaozhi.me');
  }

  // Verificar xiaozhi.me
  if (!xiaozhiConfig.apiKey) {
    warnings.push('⚠️ API key xiaozhi.me não configurada. Alguns serviços podem falhar.');
  } else {
    try {
      const xiaozhiResponse = await fetch(`${xiaozhiConfig.endpoint}/models`, {
        headers: { Authorization: `Bearer ${xiaozhiConfig.apiKey}` }
      });
      if (!xiaozhiResponse.ok) {
        errors.push('❌ API key xiaozhi.me inválida');
      }
    } catch (e) {
      warnings.push('⚠️ Não foi possível verificar xiaozhi.me');
    }
  }

  // Verificar MongoDB (se configurado)
  if (mongoDBConfig.connectionString) {
    try {
      const mongoResponse = await fetch('/api/mongodb/health');
      if (!mongoResponse.ok) {
        warnings.push('⚠️ MongoDB Atlas não respondendo');
      }
    } catch (e) {
      warnings.push('⚠️ Não foi possível conectar ao MongoDB Atlas');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Logs de configuração (apenas desenvolvimento)
 */
export const logConfiguration = () => {
  if (!isDevelopment) return;

  console.group('🔧 GraphRAG Configuration');
  
  console.log('📍 Ollama Endpoint:', advancedOllamaConfig.ollamaEndpoint);
  console.log('📊 Analysis Model:', advancedOllamaConfig.models.analysis);
  console.log('🔀 Embedding Model:', advancedOllamaConfig.models.embedding);
  
  if (xiaozhiConfig.apiKey) {
    console.log('✅ xiaozhi.me API Key: CONFIGURED');
  } else {
    console.log('⚠️ xiaozhi.me API Key: NOT CONFIGURED');
  }

  if (mongoDBConfig.connectionString) {
    console.log('🗄️ MongoDB Atlas: CONFIGURED');
  } else {
    console.log('⚠️ MongoDB Atlas: NOT CONFIGURED');
  }

  console.log('🌍 Environment:', isDevelopment ? 'Development' : 'Production');
  
  console.groupEnd();
};

// Exportar tudo como namespace
export const Config = {
  advancedOllama: advancedOllamaConfig,
  xiaozhi: xiaozhiConfig,
  mongodb: mongoDBConfig,
  providers: providerStrategy,
  isDevelopment,
  isProduction,
  validate: validateConfig,
  log: logConfiguration
};
