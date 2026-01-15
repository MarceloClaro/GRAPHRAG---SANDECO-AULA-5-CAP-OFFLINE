-- ============================================
-- GraphRAG Pipeline Database Schema
-- Supabase PostgreSQL
-- ============================================

-- ===== DOCUMENTOS ENVIADOS =====
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  content_raw TEXT NOT NULL,
  pages INTEGER NOT NULL,
  tokens INTEGER NOT NULL,
  file_size INTEGER NOT NULL,
  upload_date TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'uploaded',
  metadata JSONB DEFAULT '{}',
  created_by VARCHAR(255),
  CONSTRAINT status_check CHECK (status IN ('uploaded', 'processing', 'completed', 'error'))
);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created ON documents(upload_date DESC);

-- ===== CHUNKS PROCESSADOS =====
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  page_number INTEGER,
  tokens INTEGER,
  entity_type VARCHAR(100),
  entity_label VARCHAR(255),
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  cleaned_text TEXT,
  provider VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE INDEX idx_chunks_document ON chunks(document_id);
CREATE INDEX idx_chunks_entity_type ON chunks(entity_type);
CREATE INDEX idx_chunks_keywords ON chunks USING GIN(keywords);

-- ===== EMBEDDINGS (VETORES) =====
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  vector VECTOR(1536),  -- Voyage-3: 1536 dimensões
  dimensions INTEGER DEFAULT 1536,
  model_used VARCHAR(100),
  content_summary TEXT,
  entity_type VARCHAR(100),
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  provider VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_chunk FOREIGN KEY (chunk_id) REFERENCES chunks(id)
);

CREATE INDEX idx_embeddings_chunk ON embeddings(chunk_id);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_embeddings_provider ON embeddings(provider);

-- ===== CLUSTERS (K-MEANS++) =====
CREATE TABLE IF NOT EXISTS clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_ids UUID[] DEFAULT ARRAY[]::UUID[],
  cluster_label INTEGER NOT NULL,
  centroid_x FLOAT8,
  centroid_y FLOAT8,
  silhouette_score FLOAT8,
  size INTEGER,
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE INDEX idx_clusters_document ON clusters(document_id);
CREATE INDEX idx_clusters_label ON clusters(cluster_label);
CREATE INDEX idx_clusters_silhouette ON clusters(silhouette_score DESC);

-- ===== GRAFO - NÓS =====
CREATE TABLE IF NOT EXISTS graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  label VARCHAR(255),
  group_id INTEGER,
  centrality_degree FLOAT8,
  centrality_between FLOAT8,
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES documents(id),
  CONSTRAINT fk_chunk FOREIGN KEY (chunk_id) REFERENCES chunks(id)
);

CREATE INDEX idx_graph_nodes_document ON graph_nodes(document_id);
CREATE INDEX idx_graph_nodes_group ON graph_nodes(group_id);
CREATE INDEX idx_graph_nodes_centrality ON graph_nodes(centrality_degree DESC);

-- ===== GRAFO - ARESTAS =====
CREATE TABLE IF NOT EXISTS graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  source UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  target UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  weight FLOAT8,
  confidence FLOAT8,
  type VARCHAR(50),
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES documents(id),
  CONSTRAINT fk_source FOREIGN KEY (source) REFERENCES graph_nodes(id),
  CONSTRAINT fk_target FOREIGN KEY (target) REFERENCES graph_nodes(id)
);

CREATE INDEX idx_graph_edges_document ON graph_edges(document_id);
CREATE INDEX idx_graph_edges_source ON graph_edges(source);
CREATE INDEX idx_graph_edges_target ON graph_edges(target);
CREATE INDEX idx_graph_edges_weight ON graph_edges(weight DESC);

-- ===== SESSÕES E AUDITORIA =====
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  document_ids UUID[] DEFAULT ARRAY[]::UUID[],
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  CONSTRAINT status_check CHECK (status IN ('active', 'completed', 'error'))
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_started ON sessions(started_at DESC);

-- ===== AUDIT LOG =====
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_document ON audit_log(document_id);
CREATE INDEX idx_audit_session ON audit_log(session_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);

-- ===== CACHE DE BUSCAS =====
CREATE TABLE IF NOT EXISTS search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64) NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  results JSONB NOT NULL,
  model_used VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX idx_search_cache_created ON search_cache(created_at DESC);
CREATE INDEX idx_search_cache_expires ON search_cache(expires_at);

-- ===== FUNÇÕES RPC =====

-- Função para obter estatísticas do documento
CREATE OR REPLACE FUNCTION get_document_stats(doc_id UUID)
RETURNS TABLE(chunks BIGINT, embeddings BIGINT, clusters BIGINT, graph_nodes BIGINT, graph_edges BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM chunks WHERE document_id = doc_id),
    (SELECT COUNT(*) FROM embeddings e WHERE e.chunk_id IN (SELECT id FROM chunks WHERE document_id = doc_id)),
    (SELECT COUNT(*) FROM clusters WHERE document_id = doc_id),
    (SELECT COUNT(*) FROM graph_nodes WHERE document_id = doc_id),
    (SELECT COUNT(*) FROM graph_edges WHERE document_id = doc_id);
END;
$$ LANGUAGE plpgsql;

-- Função para busca semântica (Vector Search)
CREATE OR REPLACE FUNCTION semantic_search(
  query_vector VECTOR(1536),
  limit_results INTEGER DEFAULT 10,
  doc_id UUID DEFAULT NULL
)
RETURNS TABLE(chunk_id UUID, similarity FLOAT8, content TEXT, keywords TEXT[]) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.chunk_id,
    1 - (e.vector <=> query_vector) AS similarity,
    c.content,
    c.keywords
  FROM embeddings e
  JOIN chunks c ON e.chunk_id = c.id
  WHERE (doc_id IS NULL OR c.document_id = doc_id)
  ORDER BY e.vector <=> query_vector
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- Função para obter subgrafo
CREATE OR REPLACE FUNCTION get_subgraph(doc_id UUID, max_depth INTEGER DEFAULT 2)
RETURNS TABLE(node_id UUID, target_id UUID, weight FLOAT8, depth INTEGER) AS $$
WITH RECURSIVE graph_traverse AS (
  SELECT 
    gn.id as node_id,
    ge.target as target_id,
    ge.weight,
    1 as depth
  FROM graph_nodes gn
  LEFT JOIN graph_edges ge ON gn.id = ge.source
  WHERE gn.document_id = doc_id
  
  UNION ALL
  
  SELECT 
    gt.node_id,
    ge.target,
    ge.weight,
    gt.depth + 1
  FROM graph_traverse gt
  JOIN graph_edges ge ON gt.target_id = ge.source
  WHERE gt.depth < max_depth
)
SELECT * FROM graph_traverse;
$$ LANGUAGE SQL;

-- ===== POLÍTICAS DE RLS (Row Level Security) =====

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (para desenvolvimento; ajuste em produção)
CREATE POLICY "Enable read access for all" ON documents FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON documents FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all" ON chunks FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON chunks FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all" ON embeddings FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON embeddings FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all" ON clusters FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON clusters FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all" ON graph_nodes FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON graph_nodes FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all" ON graph_edges FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON graph_edges FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all" ON sessions FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON sessions FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all" ON audit_log FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON audit_log FOR INSERT WITH CHECK (true);

-- ===== TRIGGERS PARA AUDITORIA =====

CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (action, details, timestamp)
  VALUES (TG_ARGV[0], ROW_TO_JSON(NEW), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_documents_audit
AFTER INSERT OR UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION audit_changes('DOCUMENT_UPDATED');

CREATE TRIGGER trigger_chunks_audit
AFTER INSERT ON chunks
FOR EACH ROW EXECUTE FUNCTION audit_changes('CHUNKS_CREATED');

CREATE TRIGGER trigger_embeddings_audit
AFTER INSERT ON embeddings
FOR EACH ROW EXECUTE FUNCTION audit_changes('EMBEDDINGS_CREATED');

-- ===== GRANT PERMISSIONS =====

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT, UPDATE ON documents, chunks, embeddings, clusters, graph_nodes, graph_edges, sessions TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
