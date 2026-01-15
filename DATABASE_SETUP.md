# 🗄️ Database Setup - Supabase PostgreSQL

## 1️⃣ Criar Projeto no Supabase

1. Acesse https://supabase.com
2. Crie uma conta e novo projeto
3. Selecione região (ex: South America - São Paulo)
4. Copie as credenciais:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: `eyJhbGc...`

## 2️⃣ Configurar Variáveis de Ambiente

Edite `.env.local`:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

## 3️⃣ Criar Schema do Banco

### Opção A: Via SQL Editor no Supabase

1. Abra Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole todo o conteúdo de [DATABASE_SCHEMA.sql](DATABASE_SCHEMA.sql)
4. Clique em **Run**

### Opção B: Via Script

```bash
# Instale psql (PostgreSQL client)
# Windows: https://www.postgresql.org/download/windows/

psql postgresql://postgres:[password]@[project-id].supabase.co:5432/postgres -f DATABASE_SCHEMA.sql
```

## 4️⃣ Estrutura do Banco

```
📊 DOCUMENTOS
├─ documents (PDFs enviados)
│
📄 PROCESSAMENTO
├─ chunks (Fragmentos extraídos)
├─ embeddings (Vetores 1536D - Voyage-3)
│
📈 ANÁLISE
├─ clusters (K-Means++ resultados)
│
🕸️ GRAFO
├─ graph_nodes (Nós do grafo)
├─ graph_edges (Arestas com pesos)
│
📋 AUDITORIA
├─ sessions (Sessões de usuario)
├─ audit_log (Log de operações)
├─ search_cache (Cache de buscas)
```

## 5️⃣ Usar no Código

```typescript
import {
  saveDocument,
  saveChunks,
  saveEmbeddings,
  saveClusters,
  saveGraphNodes,
  saveGraphEdges,
  testDatabaseConnection
} from '@/services/databaseService';

// Testar conexão
const { connected } = await testDatabaseConnection();
console.log('Database connected:', connected);

// Salvar documento
const docResult = await saveDocument({
  id: 'doc-123',
  filename: 'contrato.pdf',
  content_raw: '...',
  pages: 10,
  tokens: 5000,
  file_size: 2048000,
  upload_date: new Date().toISOString(),
  status: 'processing',
  metadata: { source: 'pdf', language: 'pt-BR' }
});

// Salvar chunks
const chunksResult = await saveChunks(chunks.map(c => ({
  id: c.id,
  document_id: 'doc-123',
  content: c.content,
  page_number: c.pageNumber,
  tokens: c.tokens,
  entity_type: c.entityType,
  entity_label: c.entityLabel,
  keywords: c.keywords
})));

// Salvar embeddings
const embResult = await saveEmbeddings(embeddings.map(e => ({
  id: e.id,
  chunk_id: e.id,
  vector: e.vector,
  dimensions: 1536,
  model_used: 'voyage-3',
  content_summary: e.contentSummary,
  entity_type: e.entityType,
  keywords: e.keywords
})));
```

## 6️⃣ Vector Search (pgvector)

### Busca Semântica
```typescript
// Via função RPC
const response = await fetch(
  `${SUPABASE_URL}/rest/v1/rpc/semantic_search`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      query_vector: embedVector,
      limit_results: 10,
      doc_id: docId
    })
  }
);

const results = await response.json();
// Retorna: [{chunk_id, similarity, content, keywords}]
```

## 7️⃣ Índices e Performance

### Índices Criados Automaticamente

| Tabela | Índice | Tipo | Função |
|--------|--------|------|---------|
| documents | status, upload_date | B-tree | Filtros rápidos |
| chunks | document_id, entity_type, keywords | B-tree + GIN | Busca de keywords |
| embeddings | chunk_id, **vector**, provider | B-tree + IVFFlat | Vector search |
| clusters | document_id, silhouette_score | B-tree | Análise de qualidade |
| graph_nodes | document_id, centrality_degree | B-tree | Busca por centralidade |
| graph_edges | source, target, weight | B-tree | Traversal rápido |

### Benchmark Esperado
- Vector Search (1M vectors): 50-200ms
- Busca textual: 10-50ms
- Aggregações: 100-500ms

## 8️⃣ Backups e Maintenance

### Backups Automáticos
Supabase faz backup diário. Para manual:

```bash
# Exporte dados
pg_dump -h xxxxx.supabase.co -U postgres database_name > backup.sql

# Importe dados
psql -h xxxxx.supabase.co -U postgres database_name < backup.sql
```

### Limpeza de Cache
```sql
-- Remover buscas antigas do cache
DELETE FROM search_cache 
WHERE expires_at < NOW();
```

## 9️⃣ Segurança (RLS - Row Level Security)

As políticas estão configuradas como **públicas** (desenvolvimento). Para produção:

```sql
-- Exemplo: Apenas usuários autenticados
CREATE POLICY "User documents access" ON documents
FOR SELECT USING (
  auth.uid()::text = created_by
);

-- Exemplo: Admins podem ver tudo
CREATE POLICY "Admin full access" ON documents
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
```

## 🔟 Troubleshooting

| Problema | Solução |
|----------|---------|
| "ANON_KEY invalid" | Gere nova key em Project Settings → API |
| "Connection timeout" | Verifique firewall/VPN |
| "Vector dimension mismatch" | Voyage-3 deve ter 1536 dims |
| "RLS policy violation" | Ajuste políticas em Security → Policies |
| "Quota exceeded" | Upgrade plano ou delete dados antigos |

## 📚 Documentação

- [Supabase Docs](https://supabase.com/docs)
- [pgvector Extension](https://github.com/pgvector/pgvector)
- [PostgreSQL Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

## ✅ Próximos Passos

1. ✅ Criar projeto Supabase
2. ✅ Executar DATABASE_SCHEMA.sql
3. ✅ Configurar .env.local
4. ✅ Testar conexão com testDatabaseConnection()
5. ✅ Integrar salvar/carregar em App.tsx
6. ✅ Setup backups automáticos
7. ✅ Configurar RLS para produção
