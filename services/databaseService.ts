/**
 * Database Service - Supabase PostgreSQL Integration
 * Persistência de documentos, embeddings, clusters e grafos
 */

import { DocumentChunk, EmbeddingVector, ClusterPoint } from "../types";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const supabaseConfig: SupabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
};

/**
 * Inicializa cliente Supabase
 */
export const initSupabase = async () => {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    throw new Error('Supabase credentials not configured');
  }
  return { url: supabaseConfig.url, key: supabaseConfig.anonKey };
};

/**
 * ===== DOCUMENTOS =====
 */

export interface StoredDocument {
  id: string;
  filename: string;
  content_raw: string;
  pages: number;
  tokens: number;
  file_size: number;
  upload_date: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
  metadata: Record<string, any>;
}

export const saveDocument = async (
  doc: StoredDocument
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/documents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        },
        body: JSON.stringify(doc)
      }
    );

    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, id: data[0]?.id };
  } catch (error: any) {
    console.error('Erro ao salvar documento:', error.message);
    return { success: false, error: error.message };
  }
};

export const getDocuments = async (): Promise<StoredDocument[]> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/documents?select=*`,
      {
        headers: {
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Erro ao buscar documentos:', error.message);
    return [];
  }
};

export const updateDocumentStatus = async (
  docId: string,
  status: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/documents?id=eq.${docId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        },
        body: JSON.stringify({ status, updated_at: new Date().toISOString() })
      }
    );

    return response.ok;
  } catch (error: any) {
    console.error('Erro ao atualizar status:', error.message);
    return false;
  }
};

/**
 * ===== CHUNKS PROCESSADOS =====
 */

export interface StoredChunk {
  id: string;
  document_id: string;
  content: string;
  page_number: number;
  tokens: number;
  entity_type?: string;
  entity_label?: string;
  keywords?: string[];
  cleaned_text?: string;
}

export const saveChunks = async (chunks: StoredChunk[]): Promise<{ success: boolean; count?: number; error?: string }> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/chunks`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        },
        body: JSON.stringify(chunks)
      }
    );

    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }

    return { success: true, count: chunks.length };
  } catch (error: any) {
    console.error('Erro ao salvar chunks:', error.message);
    return { success: false, error: error.message };
  }
};

export const getChunksByDocument = async (docId: string): Promise<StoredChunk[]> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/chunks?document_id=eq.${docId}&select=*`,
      {
        headers: {
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Erro ao buscar chunks:', error.message);
    return [];
  }
};

/**
 * ===== EMBEDDINGS =====
 */

export interface StoredEmbedding {
  id: string;
  chunk_id: string;
  vector: number[];
  dimensions: number;
  model_used: string;
  content_summary: string;
  entity_type?: string;
  keywords?: string[];
  created_at?: string;
}

export const saveEmbeddings = async (embeddings: StoredEmbedding[]): Promise<{ success: boolean; count?: number; error?: string }> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/embeddings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        },
        body: JSON.stringify(
          embeddings.map(e => ({
            ...e,
            created_at: new Date().toISOString()
          }))
        )
      }
    );

    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }

    return { success: true, count: embeddings.length };
  } catch (error: any) {
    console.error('Erro ao salvar embeddings:', error.message);
    return { success: false, error: error.message };
  }
};

export const getEmbeddingsByDocument = async (docId: string): Promise<StoredEmbedding[]> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/embeddings?chunk_id=in.(SELECT id FROM chunks WHERE document_id='${docId}')&select=*`,
      {
        headers: {
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Erro ao buscar embeddings:', error.message);
    return [];
  }
};

/**
 * ===== CLUSTERS =====
 */

export interface StoredCluster {
  id: string;
  document_id: string;
  chunk_ids: string[];
  cluster_label: number;
  centroid_x: number;
  centroid_y: number;
  silhouette_score: number;
  size: number;
  keywords: string[];
}

export const saveClusters = async (clusters: StoredCluster[]): Promise<{ success: boolean; count?: number; error?: string }> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/clusters`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        },
        body: JSON.stringify(clusters)
      }
    );

    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }

    return { success: true, count: clusters.length };
  } catch (error: any) {
    console.error('Erro ao salvar clusters:', error.message);
    return { success: false, error: error.message };
  }
};

export const getClustersByDocument = async (docId: string): Promise<StoredCluster[]> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/clusters?document_id=eq.${docId}&select=*`,
      {
        headers: {
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Erro ao buscar clusters:', error.message);
    return [];
  }
};

/**
 * ===== GRAFO DE CONHECIMENTO =====
 */

export interface StoredGraphNode {
  id: string;
  document_id: string;
  chunk_id: string;
  label: string;
  group: number;
  centrality_degree: number;
  centrality_between: number;
  keywords: string[];
}

export interface StoredGraphEdge {
  id: string;
  document_id: string;
  source: string;
  target: string;
  weight: number;
  confidence: number;
  type: string;
}

export const saveGraphNodes = async (nodes: StoredGraphNode[]): Promise<{ success: boolean; count?: number; error?: string }> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/graph_nodes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        },
        body: JSON.stringify(nodes)
      }
    );

    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }

    return { success: true, count: nodes.length };
  } catch (error: any) {
    console.error('Erro ao salvar nós:', error.message);
    return { success: false, error: error.message };
  }
};

export const saveGraphEdges = async (edges: StoredGraphEdge[]): Promise<{ success: boolean; count?: number; error?: string }> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/graph_edges`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        },
        body: JSON.stringify(edges)
      }
    );

    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }

    return { success: true, count: edges.length };
  } catch (error: any) {
    console.error('Erro ao salvar arestas:', error.message);
    return { success: false, error: error.message };
  }
};

export const getGraphByDocument = async (docId: string): Promise<{
  nodes: StoredGraphNode[];
  edges: StoredGraphEdge[];
}> => {
  try {
    const [nodesRes, edgesRes] = await Promise.all([
      fetch(
        `${supabaseConfig.url}/rest/v1/graph_nodes?document_id=eq.${docId}&select=*`,
        {
          headers: {
            'apikey': supabaseConfig.anonKey,
            'Authorization': `Bearer ${supabaseConfig.anonKey}`
          }
        }
      ),
      fetch(
        `${supabaseConfig.url}/rest/v1/graph_edges?document_id=eq.${docId}&select=*`,
        {
          headers: {
            'apikey': supabaseConfig.anonKey,
            'Authorization': `Bearer ${supabaseConfig.anonKey}`
          }
        }
      )
    ]);

    if (!nodesRes.ok || !edgesRes.ok) {
      throw new Error('Database error');
    }

    return {
      nodes: await nodesRes.json(),
      edges: await edgesRes.json()
    };
  } catch (error: any) {
    console.error('Erro ao buscar grafo:', error.message);
    return { nodes: [], edges: [] };
  }
};

/**
 * ===== SESSÕES E AUDITORIA =====
 */

export interface StoredSession {
  id: string;
  user_id?: string;
  document_ids: string[];
  started_at: string;
  ended_at?: string;
  status: 'active' | 'completed' | 'error';
  metadata: Record<string, any>;
}

export const saveSession = async (session: StoredSession): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        },
        body: JSON.stringify(session)
      }
    );

    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, id: data[0]?.id };
  } catch (error: any) {
    console.error('Erro ao salvar sessão:', error.message);
    return { success: false, error: error.message };
  }
};

export const updateSession = async (
  sessionId: string,
  status: string,
  metadata?: Record<string, any>
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/sessions?id=eq.${sessionId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        },
        body: JSON.stringify({
          status,
          ended_at: new Date().toISOString(),
          metadata: metadata || {}
        })
      }
    );

    return response.ok;
  } catch (error: any) {
    console.error('Erro ao atualizar sessão:', error.message);
    return false;
  }
};

/**
 * ===== BUSCA E AGREGAÇÕES =====
 */

export const searchDocuments = async (query: string): Promise<StoredDocument[]> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/documents?filename=ilike.%${query}%&select=*`,
      {
        headers: {
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Erro na busca:', error.message);
    return [];
  }
};

export const getDocumentStats = async (docId: string): Promise<{
  chunks: number;
  embeddings: number;
  clusters: number;
  graph_nodes: number;
  graph_edges: number;
}> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/rpc/get_document_stats`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        },
        body: JSON.stringify({ doc_id: docId })
      }
    );

    if (!response.ok) {
      throw new Error(`Database error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Erro ao obter estatísticas:', error.message);
    return {
      chunks: 0,
      embeddings: 0,
      clusters: 0,
      graph_nodes: 0,
      graph_edges: 0
    };
  }
};

/**
 * ===== TESTE DE CONECTIVIDADE =====
 */

export const testDatabaseConnection = async (): Promise<{
  connected: boolean;
  error?: string;
}> => {
  try {
    const response = await fetch(
      `${supabaseConfig.url}/rest/v1/documents?limit=1&select=count()`,
      {
        headers: {
          'apikey': supabaseConfig.anonKey,
          'Authorization': `Bearer ${supabaseConfig.anonKey}`
        }
      }
    );

    return { connected: response.ok };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
};
