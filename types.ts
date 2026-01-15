
export enum PipelineStage {
  UPLOAD = 'UPLOAD',
  EMBEDDINGS = 'EMBEDDINGS',
  CLUSTERING = 'CLUSTERING',
  GRAPH = 'GRAPH'
}

export type EmbeddingModelType = 'gemini-004' | 'sentence-bert' | 'use';

export interface CNNHyperParameters {
  margin: number;       // Margem para Triplet Loss (ex: 0.2)
  learningRate: number; // Taxa de aprendizado inicial (ex: 0.001)
  epochs: number;       // Número de iterações (ex: 20)
  miningStrategy: 'hard' | 'semi-hard' | 'random'; // Estratégia de seleção de tripletos
  optimizer: 'adamw' | 'sgd';
}

export interface TrainingMetrics {
  currentEpoch: number;
  trainLoss: number;
  valLoss: number;
  trainTripletCount: number;
  valTripletCount: number;
}

export interface DocumentChunk {
  id: string;
  source: string;
  sourceFile?: string;
  pageNumber?: number;
  content: string; // O texto completo (Qualis A1 rigor)
  contentOriginal?: string; // Texto original antes de processamento
  contentCleaned?: string; // Texto após limpeza e organização
  contentCoherent?: string; // Texto após adição de coesão
  tokens: number;
  tokenCount?: number;
  dueDate?: string;
  entityType?: string; // Ex: ARTIGO, CAPITULO, INCISO, TEXTO
  entityLabel?: string; // Ex: Art. 1º, Cap. II, Introdução
  keywords?: string[]; // Entidades identificadas por IA
  aiProvider?: string; // 'gemini' | 'ollama' | 'xiaozhi'
  processingHistory?: string; // Histórico: original → cleaned → coherent → normalized
  processingStages?: Record<string, any>; // Detalhes de cada etapa
  readabilityScore?: number; // Score de legibilidade Flesch
  uploadTime?: string;
  processingTime?: number;
  hash?: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingVector {
  id: string;
  vector: number[]; // Simulado, exibido truncado
  contentSummary: string;
  fullContent: string;
  dueDate?: string;
  entityType?: string;
  entityLabel?: string;
  keywords?: string[];
  modelUsed?: string;
  dimensions?: number;
  refined?: number[]; // Vetor refinado pós-CNN
  trainLoss?: number;
  valLoss?: number;
  chunkIndex?: number;
  metadata?: {
    provider?: string;
    model_version?: string;
  };
}

export interface ClusterPoint {
  id: string;
  x: number;
  y: number;
  clusterId: number;
  label: string;
  fullContent: string;
  dueDate?: string;
  entityType?: string;
  entityLabel?: string;
  keywords?: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  group: number;
  fullContent: string;
  centrality: number;
  dueDate?: string;
  entityType?: string;
  keywords?: string[];
}

export interface GraphLink {
  source: string;
  target: string;
  value: number; // Peso da aresta (Physics pull)
  confidence: number; // Confiança na relação (0-1)
  type: 'semantico' | 'co-ocorrencia' | 'hierarquico';
}

export interface GraphMetrics {
  density: number;
  avgDegree: number;
  modularity: number; // Estimado
  silhouetteScore: number;
  totalNodes: number;
  totalEdges: number;
  connectedComponents: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  metrics?: GraphMetrics;
}

// Novos tipos para Análise de Cluster
export interface ClusterProfile {
  clusterId: number;
  nodeCount: number;
  topKeywords: Array<{ word: string; count: number }>;
  mainTopics: string[]; // Resumo gerado das top keywords
}

export interface ClusterSimilarity {
  targetClusterId: number;
  similarClusterId: number;
  score: number; // 0-1 (Jaccard ou Cosine)
  sharedKeywords: string[];
}
