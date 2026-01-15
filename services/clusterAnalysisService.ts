
import { GraphNode, ClusterProfile, ClusterSimilarity } from '../types';

/**
 * Agrega palavras-chave de todos os nós em cada cluster para criar um "Perfil de Cluster".
 */
export const analyzeClusterProfiles = (nodes: GraphNode[]): ClusterProfile[] => {
  const clusters: Record<number, { keywords: string[]; nodeCount: number }> = {};

  // 1. Coletar todas as keywords por cluster
  nodes.forEach(node => {
    if (!clusters[node.group]) {
      clusters[node.group] = { keywords: [], nodeCount: 0 };
    }
    clusters[node.group].nodeCount++;
    if (node.keywords) {
      clusters[node.group].keywords.push(...node.keywords);
    }
  });

  // 2. Processar frequência e retornar perfil
  return Object.entries(clusters).map(([id, data]) => {
    const frequency: Record<string, number> = {};
    data.keywords.forEach(k => {
      const normalized = k.toLowerCase().trim();
      frequency[normalized] = (frequency[normalized] || 0) + 1;
    });

    const sortedKeywords = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1]) // Ordenar por contagem descrescente
      .slice(0, 10) // Pegar top 10
      .map(([word, count]) => ({ word, count }));

    return {
      clusterId: parseInt(id),
      nodeCount: data.nodeCount,
      topKeywords: sortedKeywords,
      mainTopics: sortedKeywords.slice(0, 3).map(k => k.word)
    };
  }).sort((a, b) => a.clusterId - b.clusterId);
};

/**
 * Calcula a similaridade de Jaccard entre dois conjuntos de palavras-chave.
 * J(A,B) = |A ∩ B| / |A ∪ B|
 */
const calculateJaccardSimilarity = (keywordsA: string[], keywordsB: string[]): { score: number, shared: string[] } => {
  const setA = new Set(keywordsA);
  const setB = new Set(keywordsB);

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  if (union.size === 0) return { score: 0, shared: [] };

  return {
    score: intersection.size / union.size,
    shared: Array.from(intersection)
  };
};

/**
 * Encontra clusters similares para um cluster alvo.
 */
export const findSimilarClusters = (
  targetClusterId: number, 
  allProfiles: ClusterProfile[]
): ClusterSimilarity[] => {
  const targetProfile = allProfiles.find(p => p.clusterId === targetClusterId);
  if (!targetProfile) return [];

  const targetKeywords = targetProfile.topKeywords.map(k => k.word);
  const similarities: ClusterSimilarity[] = [];

  allProfiles.forEach(profile => {
    if (profile.clusterId === targetClusterId) return;

    const profileKeywords = profile.topKeywords.map(k => k.word);
    const { score, shared } = calculateJaccardSimilarity(targetKeywords, profileKeywords);

    if (score > 0.05) { // Threshold mínimo para relevância
      similarities.push({
        targetClusterId,
        similarClusterId: profile.clusterId,
        score,
        sharedKeywords: shared
      });
    }
  });

  return similarities.sort((a, b) => b.score - a.score);
};
