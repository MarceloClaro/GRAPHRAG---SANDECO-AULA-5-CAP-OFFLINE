# 🚀 Guia de Integração: Modelos Avançados Ollama + xiaozhi.me

## Novos Serviços Integrados

### 1. **advancedOllamaService.ts**
Integração com modelos premium do Ollama:
- **DeepSeek-Coder**: Análise estrutural profunda (código, lógica, semântica)
- **Voyage-3**: Embeddings de qualidade enterprise (1536 dimensões)
- **MongoDB Vector Search**: Compatibilidade nativa com Atlas

```typescript
import {
  analyzeWithDeepSeek,
  generateVoyageEmbedding,
  enhancedOllamaConfig,
  testAdvancedModels
} from './services/advancedOllamaService';

// Configuração
const config = {
  ollamaEndpoint: 'http://localhost:11434',
  xiaozhi: {
    endpoint: 'https://api.xiaozhi.me/v1',
    apiKey: process.env.VITE_XIAOZHI_API_KEY
  },
  models: {
    analysis: 'deepseek-coder',
    embedding: 'voyage-3',
    mongodbVector: true
  }
};

// Análise com DeepSeek
const analyzed = await analyzeWithDeepSeek(chunk, config);

// Embeddings com Voyage-3
const embedding = await generateVoyageEmbedding(chunk, config);
```

### 2. **mongodbVectorService.ts**
Busca semântica com MongoDB Atlas:
- Vector Search com Voyage-3
- Filtros estruturados híbridos
- Bulk insert com 1536 dimensões

```typescript
import {
  semanticSearchMongoDB,
  bulkInsertEmbeddingsMongoDB,
  aggregateVectorSearch
} from './services/mongodbVectorService';

// Busca semântica
const results = await semanticSearchMongoDB(
  queryVector,
  { collection: 'documents' },
  topK: 10
);

// Inserção em bulk
const result = await bulkInsertEmbeddingsMongoDB(
  embeddings,
  'documents'
);

// Agregação com filtros
const filtered = await aggregateVectorSearch(
  queryVector,
  { entityType: 'ARTIGO', provider: 'ollama' },
  'documents'
);
```

### 3. **xiaozhiService.ts**
Integração com API xiaozhi.me:
- **DeepSeek-R1**: Análise lógica e raciocínio
- **Qwen-Turbo**: Sumarização multilíngue
- **Claude 3.5 Sonnet**: Comparação semântica
- **Voyage-3**: Embeddings premium

```typescript
import {
  analyzeDocumentXiaozhi,
  generateEmbeddingXiaozhi,
  compareSemanticXiaozhi,
  testXiaozhi
} from './services/xiaozhiService';

// Análise profunda
const analysis = await analyzeDocumentXiaozhi(content, config);

// Embeddings Voyage-3
const emb = await generateEmbeddingXiaozhi(text, config);

// Comparação semântica
const comparison = await compareSemanticXiaozhi(text1, text2, config);
```

---

## Instalação dos Modelos Ollama

### DeepSeek-Coder (Analysis)
```bash
ollama pull deepseek-coder:latest
# Tamanho: ~6.7GB
# Velocidade: ~15-20 tokens/s (local)
# Especialidade: Código, lógica, estrutura
```

### Voyage-3 (Embeddings Premium)
```bash
ollama pull voyage-3:latest
# Tamanho: ~1.2GB
# Dimensões: 1536
# Qualidade: Enterprise-grade
```

### Verificar instalação
```bash
ollama list
```

---

## Configuração das Variáveis de Ambiente

### `.env.local`
```env
# xiaozhi.me API
VITE_XIAOZHI_API_KEY=sk_XXXXXXXXXXXXXXXXXXXXXXXX

# MongoDB Atlas (opcional)
VITE_MONGODB_CONNECTION_STRING=mongodb+srv://user:pass@cluster.mongodb.net/db

# Ollama Local
VITE_OLLAMA_ENDPOINT=http://localhost:11434

# Modelos padrão
VITE_ANALYSIS_MODEL=deepseek-coder
VITE_EMBEDDING_MODEL=voyage-3
VITE_SUMMARY_MODEL=qwen-turbo
```

---

## Fluxo de Análise Otimizado

```
PDF Upload
    ↓
PDFService (extração)
    ↓
advancedOllamaService (DeepSeek-Coder)
    ↓ [Análise estrutural profunda]
    ├─ Tipo de entidade (ARTIGO, INCISO, etc)
    ├─ Palavras-chave (NER)
    ├─ Complexidade semântica
    └─ Referências estruturais
    ↓
advancedOllamaService (Voyage-3) ou xiaozhiService
    ↓ [Embeddings de qualidade]
    ├─ 1536 dimensões (Voyage-3)
    ├─ Normalização L2/MongoDB
    └─ Compatibilidade Vector Search
    ↓
mongodbVectorService (Bulk Insert)
    ↓ [Persistência escalável]
    └─ Índice Vector Search criado
```

---

## Fluxo RAG Melhorado

### 1. HyDE com DeepSeek-R1
```typescript
// Query do usuário
const query = "Como funciona a transferência de fundos?";

// DeepSeek gera documento hipotético
const hypothesis = await analyzeDocumentXiaozhi(
  `Escreva um documento que responderia: ${query}`,
  xiaozhiConfig
);

// Embedder documento hipotético
const queryVector = await generateEmbeddingXiaozhi(
  hypothesis.analysis,
  xiaozhiConfig
);

// Buscar similares
const results = await semanticSearchMongoDB(
  queryVector,
  config,
  10
);
```

### 2. CRAG com Voyage-3 + xiaozhi.me
```typescript
// Recuperar chunks
const candidates = await semanticSearchMongoDB(queryVector, config);

// Avaliar relevância com Claude 3.5
const evaluation = await analyzeDocumentXiaozhi(
  `Avalie se este chunk responde a: ${query}\n\n${chunk.content}`,
  xiaozhiConfig,
  'claude-3.5-sonnet'
);

// Se AMBIGUOUS ou INCORRECT → web search fallback
// Se CORRECT → usar direto
```

### 3. GraphRAG com Vector Search
```typescript
// Seed nodes via Voyage-3 + MongoDB
const seedChunks = await semanticSearchMongoDB(
  queryVector,
  config,
  3
);

// BFS expansion no grafo
const expanded = expandGraphNeighbors(seedChunks, graphData, 2);

// Reordenar por centralidade
const ranked = rankByBetweenness(expanded);

// Contextualizar com Qwen
const context = await summarizeWithQwenXiaozhi(
  expanded.map(c => c.content).join('\n'),
  xiaozhiConfig
);
```

---

## Comparação de Modelos

| Aspecto | DeepSeek-Coder | Voyage-3 | Qwen-Turbo | Claude 3.5 |
|---------|---|---|---|---|
| **Análise** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Embeddings** | ❌ | ⭐⭐⭐⭐⭐ | ❌ | ❌ |
| **Velocidade** | ⭐⭐⭐ (local) | ⭐⭐⭐⭐ (local) | ⭐⭐⭐⭐⭐ (cloud) | ⭐⭐⭐⭐ (cloud) |
| **Custo** | ✅ Gratuito | ✅ Gratuito | 💲 xiaozhi | 💲 xiaozhi |
| **Estrutura** | Código/Lógica | Semântica | Sumarização | Análise Geral |
| **Dimensões** | N/A | 1536 | N/A | N/A |

---

## Exemplos de Uso

### Exemplo 1: Análise Completa com Fallback
```typescript
async function analyzeChunkFull(chunk, config) {
  try {
    // Tenta DeepSeek-Coder (Ollama)
    const analysis = await analyzeWithDeepSeek(chunk, config);
    
    // Tenta Voyage-3 (Ollama) com fallback xiaozhi
    let embedding = await generateVoyageEmbedding(chunk, config);
    if (!embedding && config.xiaozhi.apiKey) {
      const voyageData = await generateEmbeddingXiaozhi(
        chunk.content,
        defaultXiaozhiConfig
      );
      embedding = { vector: voyageData.embedding, ...chunk };
    }
    
    return { analysis, embedding };
  } catch (error) {
    console.error('Erro na análise:', error);
    // Fallback para xiaozhi.me completo
    return analyzeChunkXiaozhi(chunk);
  }
}
```

### Exemplo 2: Busca Semântica Avançada
```typescript
async function semanticSearch(query, config) {
  // Gerar embedding da query
  const queryEmbedding = await generateVoyageEmbedding(
    { content: query },
    config
  );

  // Buscar no MongoDB com filtros estruturados
  const results = await aggregateVectorSearch(
    queryEmbedding.vector,
    {
      entityType: 'ARTIGO',
      provider: 'ollama'
    },
    'documents',
    topK: 20
  );

  // Reranker com Claude (opcional)
  if (config.xiaozhi.apiKey) {
    for (const result of results) {
      const relevance = await compareSemanticXiaozhi(
        query,
        result.content,
        defaultXiaozhiConfig
      );
      result.relevanceScore = relevance.similarity;
    }
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  return results;
}
```

---

## Troubleshooting

### ❌ "Ollama não está respondendo"
```bash
# Verifique se Ollama está rodando
ollama serve

# Teste conexão
curl http://localhost:11434/api/tags
```

### ❌ "xiaozhi.me API key inválida"
```bash
# Gere nova key em https://api.xiaozhi.me/console
# Atualize .env.local
VITE_XIAOZHI_API_KEY=sk_novo_valor
```

### ❌ "Voyage-3 não encontrado"
```bash
# Baixe o modelo
ollama pull voyage-3:latest

# Verifique versão
ollama list | grep voyage
```

### ❌ "MongoDB Vector Search não funciona"
```javascript
// Crie índice manualmente no Atlas:
db.documents.createIndex({
  "embedding": "cosmosSearch",
  "efConstruction": 64,
  "efSearch": 40
});
```

---

## Performance Esperada

| Operação | Ollama Local | xiaozhi.me Cloud |
|----------|---|---|
| DeepSeek Análise (500 tokens) | 30-45s | 3-5s |
| Voyage-3 Embedding (768 dim) | 2-5s | 1-2s |
| Qwen Sumarização (200 tokens) | N/A | 1-2s |
| Vector Search (1M docs) | N/A | 50-200ms |

---

## Próximos Passos

1. ✅ Instalar modelos Ollama (DeepSeek + Voyage-3)
2. ✅ Configurar API key xiaozhi.me
3. ✅ Atualizar App.tsx para usar novos serviços
4. ✅ Criar MongoDB Atlas cluster (opcional)
5. ✅ Testar fluxo end-to-end
6. ✅ Otimizar hyperparâmetros de CNN

---

## Referências

- [Ollama Docs](https://ollama.ai)
- [xiaozhi.me API](https://api.xiaozhi.me/docs)
- [MongoDB Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/)
- [Voyage-3 Embeddings](https://www.voyageai.com/docs)
- [DeepSeek-Coder](https://github.com/deepseek-ai/deepseek-coder)
