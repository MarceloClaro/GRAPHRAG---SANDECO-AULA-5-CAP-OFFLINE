# 🚀 Quick Start - Modelos Avançados

## 1️⃣ Instalar Modelos Ollama

```bash
# DeepSeek-Coder (Análise)
ollama pull deepseek-coder:latest

# Voyage-3 (Embeddings)
ollama pull voyage-3:latest

# Iniciar Ollama
ollama serve
```

## 2️⃣ Configurar Variáveis de Ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local`:
```env
VITE_XIAOZHI_API_KEY=sk_XXXXXXXXXXXXXXXXXXXXXXXX
VITE_OLLAMA_ENDPOINT=http://localhost:11434
VITE_ANALYSIS_MODEL=deepseek-coder
VITE_EMBEDDING_MODEL=voyage-3
```

Obtenha API key xiaozhi em: https://api.xiaozhi.me/console

## 3️⃣ Usar nos Componentes

```typescript
import { analyzeWithDeepSeek, generateVoyageEmbedding } from '@/services/advancedOllamaService';
import { Config } from '@/config';

// Validar configuração
const config = await Config.validate();
if (!config.valid) {
  console.error('Erros:', config.errors);
}

// Analisar documento
const analyzed = await analyzeWithDeepSeek(chunk, Config.advancedOllama);

// Gerar embedding
const embedding = await generateVoyageEmbedding(chunk, Config.advancedOllama);
```

## 4️⃣ Usar xiaozhi.me (Fallback)

```typescript
import { analyzeDocumentXiaozhi, generateEmbeddingXiaozhi } from '@/services/xiaozhiService';
import { Config } from '@/config';

// Análise com DeepSeek-R1
const analysis = await analyzeDocumentXiaozhi(content, Config.xiaozhi);

// Embeddings Voyage-3
const emb = await generateEmbeddingXiaozhi(text, Config.xiaozhi);
```

## 5️⃣ Usar MongoDB Vector Search

```typescript
import { semanticSearchMongoDB, bulkInsertEmbeddingsMongoDB } from '@/services/mongodbVectorService';
import { Config } from '@/config';

// Inserir embeddings
await bulkInsertEmbeddingsMongoDB(embeddings, Config.mongodb.collection);

// Buscar semântica
const results = await semanticSearchMongoDB(
  queryVector,
  Config.mongodb,
  topK: 10
);
```

## 📊 Modelos Disponíveis

### Ollama Local (Gratuito)
- **DeepSeek-Coder**: Análise estrutural
- **Voyage-3**: Embeddings premium
- **nomic-embed-text**: Alternativa rápida

### xiaozhi.me Cloud (Pago)
- **DeepSeek-R1**: Raciocínio lógico
- **Qwen-Turbo**: Sumarização
- **Claude 3.5 Sonnet**: Análise geral
- **Voyage-3**: Embeddings premium

## 🔧 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Ollama não responde" | `ollama serve` em outro terminal |
| "xiaozhi.me API inválida" | Gere nova key em console |
| "Voyage-3 não encontrado" | `ollama pull voyage-3:latest` |
| "MongoDB não conecta" | Verifique connection string |

## 📈 Performance

| Modelo | Velocidade | Qualidade |
|--------|-----------|----------|
| DeepSeek Local | 20-30 tok/s | ⭐⭐⭐⭐⭐ |
| Voyage-3 Local | 5-10 emb/s | ⭐⭐⭐⭐⭐ |
| xiaozhi Cloud | 50-200 tok/s | ⭐⭐⭐⭐⭐ |

## 📚 Documentação

- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - Guia detalhado
- [config.ts](config.ts) - Configuração centralizada
- [services/advancedOllamaService.ts](services/advancedOllamaService.ts)
- [services/xiaozhiService.ts](services/xiaozhiService.ts)
- [services/mongodbVectorService.ts](services/mongodbVectorService.ts)

## ✅ Próximos Passos

1. ✅ Instalar modelos Ollama
2. ✅ Configurar .env.local
3. ✅ Testar com `Config.validate()`
4. ✅ Integrar em App.tsx
5. ✅ Deploy em produção
