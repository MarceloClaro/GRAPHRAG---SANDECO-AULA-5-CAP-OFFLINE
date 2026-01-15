/**
 * Sistema de Validação Rigorosa
 * Valida entradas, saídas e integridade de dados
 */

import { DocumentChunk, EmbeddingVector, ClusterPoint, GraphData } from '../types';

export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class Validator {
  /**
   * Valida chunk de documento
   */
  static validateChunk(chunk: DocumentChunk): void {
    if (!chunk.id || typeof chunk.id !== 'string') {
      throw new ValidationError('Chunk ID inválido ou ausente', 'id', chunk.id);
    }

    if (!chunk.content || typeof chunk.content !== 'string' || chunk.content.trim().length === 0) {
      throw new ValidationError('Conteúdo do chunk vazio ou inválido', 'content', chunk.content);
    }

    if (chunk.content.length > 10000) {
      throw new ValidationError('Chunk muito grande (> 10.000 caracteres)', 'content', chunk.content.length);
    }

    if (!chunk.source || typeof chunk.source !== 'string') {
      throw new ValidationError('Source do chunk inválido', 'source', chunk.source);
    }

    if (typeof chunk.tokens !== 'number' || chunk.tokens < 0) {
      throw new ValidationError('Contagem de tokens inválida', 'tokens', chunk.tokens);
    }

    if (!chunk.entityType || typeof chunk.entityType !== 'string') {
      throw new ValidationError('Entity type inválido', 'entityType', chunk.entityType);
    }
  }

  /**
   * Valida embedding vector
   */
  static validateEmbedding(embedding: EmbeddingVector): void {
    if (!embedding.id || typeof embedding.id !== 'string') {
      throw new ValidationError('Embedding ID inválido', 'id', embedding.id);
    }

    if (!Array.isArray(embedding.vector) || embedding.vector.length === 0) {
      throw new ValidationError('Vetor de embedding vazio ou inválido', 'vector', embedding.vector);
    }

    // Valida dimensões comuns
    const validDimensions = [384, 512, 768, 1024, 1536, 3072];
    if (!validDimensions.includes(embedding.vector.length)) {
      console.warn(`⚠️ Dimensão incomum de embedding: ${embedding.vector.length}. Esperado: ${validDimensions.join(', ')}`);
    }

    // Valida valores numéricos
    const hasInvalidValues = embedding.vector.some(v => 
      typeof v !== 'number' || !isFinite(v) || isNaN(v)
    );

    if (hasInvalidValues) {
      throw new ValidationError('Vetor contém valores inválidos (NaN, Infinity)', 'vector');
    }

    // Valida normalização (norma deve estar próxima de 1.0 para embeddings normalizados)
    const norm = Math.sqrt(embedding.vector.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) {
      throw new ValidationError('Vetor zero (norma = 0)', 'vector');
    }

    if (!embedding.modelUsed || typeof embedding.modelUsed !== 'string') {
      throw new ValidationError('Modelo usado não especificado', 'modelUsed', embedding.modelUsed);
    }
  }

  /**
   * Valida cluster point
   */
  static validateCluster(cluster: ClusterPoint): void {
    if (!cluster.id || typeof cluster.id !== 'string') {
      throw new ValidationError('Cluster ID inválido', 'id', cluster.id);
    }

    if (typeof cluster.clusterId !== 'number' || cluster.clusterId < 0) {
      throw new ValidationError('Cluster ID numérico inválido', 'clusterId', cluster.clusterId);
    }

    if (!cluster.label || typeof cluster.label !== 'string') {
      throw new ValidationError('Label do cluster inválido', 'label', cluster.label);
    }

    if (typeof cluster.x !== 'number' || !isFinite(cluster.x)) {
      throw new ValidationError('Coordenada X inválida', 'x', cluster.x);
    }

    if (typeof cluster.y !== 'number' || !isFinite(cluster.y)) {
      throw new ValidationError('Coordenada Y inválida', 'y', cluster.y);
    }
  }

  /**
   * Valida grafo completo
   */
  static validateGraph(graph: GraphData): void {
    if (!graph.nodes || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
      throw new ValidationError('Grafo sem nós ou inválido', 'nodes', graph.nodes);
    }

    if (!graph.links || !Array.isArray(graph.links)) {
      throw new ValidationError('Links do grafo inválidos', 'links', graph.links);
    }

    // Valida cada nó
    graph.nodes.forEach((node, idx) => {
      if (!node.id || typeof node.id !== 'string') {
        throw new ValidationError(`Nó ${idx} com ID inválido`, 'nodes[].id', node.id);
      }

      if (!node.label || typeof node.label !== 'string') {
        throw new ValidationError(`Nó ${node.id} sem label`, 'nodes[].label', node.label);
      }

      if (typeof node.centrality !== 'number' || !isFinite(node.centrality)) {
        throw new ValidationError(`Centralidade inválida no nó ${node.id}`, 'nodes[].centrality', node.centrality);
      }
    });

    // Valida cada link
    const nodeIds = new Set(graph.nodes.map(n => n.id));
    graph.links.forEach((link, idx) => {
      const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;

      if (!nodeIds.has(sourceId)) {
        throw new ValidationError(`Link ${idx} referencia source inexistente: ${sourceId}`, 'links[].source');
      }

      if (!nodeIds.has(targetId)) {
        throw new ValidationError(`Link ${idx} referencia target inexistente: ${targetId}`, 'links[].target');
      }

      if (typeof link.value !== 'number' || !isFinite(link.value) || link.value < 0 || link.value > 1) {
        throw new ValidationError(`Peso do link ${idx} inválido (deve estar entre 0 e 1)`, 'links[].value', link.value);
      }
    });

    // Valida métricas do grafo
    if (!graph.metrics) {
      throw new ValidationError('Métricas do grafo ausentes', 'metrics');
    }

    const m = graph.metrics;
    if (typeof m.density !== 'number' || m.density < 0 || m.density > 1) {
      throw new ValidationError('Densidade do grafo inválida', 'metrics.density', m.density);
    }

    if (typeof m.averageDegree !== 'number' || m.averageDegree < 0) {
      throw new ValidationError('Grau médio inválido', 'metrics.averageDegree', m.averageDegree);
    }
  }

  /**
   * Valida array de chunks em batch
   */
  static validateChunks(chunks: DocumentChunk[]): { valid: number; invalid: number; errors: string[] } {
    const errors: string[] = [];
    let valid = 0;
    let invalid = 0;

    chunks.forEach((chunk, idx) => {
      try {
        this.validateChunk(chunk);
        valid++;
      } catch (error) {
        invalid++;
        errors.push(`Chunk ${idx} (${chunk.id}): ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    return { valid, invalid, errors };
  }

  /**
   * Valida array de embeddings em batch
   */
  static validateEmbeddings(embeddings: EmbeddingVector[]): { valid: number; invalid: number; errors: string[] } {
    const errors: string[] = [];
    let valid = 0;
    let invalid = 0;

    embeddings.forEach((emb, idx) => {
      try {
        this.validateEmbedding(emb);
        valid++;
      } catch (error) {
        invalid++;
        errors.push(`Embedding ${idx} (${emb.id}): ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    return { valid, invalid, errors };
  }

  /**
   * Testa integridade de dados entre etapas
   */
  static validatePipelineIntegrity(
    chunks: DocumentChunk[],
    embeddings: EmbeddingVector[],
    clusters?: ClusterPoint[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Valida correspondência chunks <-> embeddings
    if (chunks.length !== embeddings.length) {
      errors.push(`Descompasso: ${chunks.length} chunks vs ${embeddings.length} embeddings`);
    }

    const chunkIds = new Set(chunks.map(c => c.id));
    const embeddingIds = new Set(embeddings.map(e => e.id));

    embeddings.forEach(emb => {
      if (!chunkIds.has(emb.id)) {
        errors.push(`Embedding ${emb.id} não tem chunk correspondente`);
      }
    });

    // Valida clusters se fornecidos
    if (clusters) {
      clusters.forEach(cluster => {
        if (!chunkIds.has(cluster.id)) {
          errors.push(`Cluster ${cluster.id} não tem chunk correspondente`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
