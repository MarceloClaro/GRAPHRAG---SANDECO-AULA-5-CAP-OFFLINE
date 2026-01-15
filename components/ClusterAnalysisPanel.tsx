
import React, { useMemo, useState } from 'react';
import { GraphData, ClusterProfile, ClusterSimilarity } from '../types';
import { analyzeClusterProfiles, findSimilarClusters } from '../services/clusterAnalysisService';

interface Props {
  graphData: GraphData;
  onClusterSelect: (clusterIds: number[]) => void; // Passa array de IDs para highlight (selecionado + similares)
}

const ClusterAnalysisPanel: React.FC<Props> = ({ graphData, onClusterSelect }) => {
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Computar perfis apenas quando os dados mudarem
  const profiles = useMemo(() => analyzeClusterProfiles(graphData.nodes), [graphData]);

  // Computar similaridades quando a seleção mudar
  const similarities = useMemo(() => {
    if (selectedClusterId === null) return [];
    return findSimilarClusters(selectedClusterId, profiles);
  }, [selectedClusterId, profiles]);

  // Filtrar clusters pela busca
  const filteredProfiles = profiles.filter(p => 
    p.clusterId.toString().includes(searchTerm) || 
    p.topKeywords.some(k => k.word.includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (id: number) => {
    if (selectedClusterId === id) {
      setSelectedClusterId(null);
      onClusterSelect([]); // Limpar highlight
    } else {
      setSelectedClusterId(id);
      // Calcular similares imediatamente para o highlight
      const sims = findSimilarClusters(id, profiles);
      const idsToHighlight = [id, ...sims.map(s => s.similarClusterId)];
      onClusterSelect(idsToHighlight);
    }
  };

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
      <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
        <h3 className="font-bold text-slate-800 flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          Análise de Clusters Semânticos
        </h3>
        <p className="text-xs text-slate-500 mt-1">Identificação de tópicos e correlação entre grupos.</p>
        
        <div className="mt-3 relative">
          <input 
            type="text" 
            placeholder="Buscar palavra-chave ou ID..." 
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {filteredProfiles.length === 0 && (
          <p className="text-center text-sm text-slate-400 mt-10">Nenhum cluster encontrado.</p>
        )}

        {filteredProfiles.map(profile => {
          const isSelected = selectedClusterId === profile.clusterId;
          const isSimilar = similarities.some(s => s.similarClusterId === profile.clusterId);
          const similarityData = similarities.find(s => s.similarClusterId === profile.clusterId);
          const color = colors[profile.clusterId % colors.length];

          return (
            <div 
              key={profile.clusterId}
              onClick={() => handleSelect(profile.clusterId)}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all duration-200
                ${isSelected ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300 shadow-md' : 'bg-white hover:bg-slate-50 border-slate-200'}
                ${isSimilar ? 'bg-amber-50 border-amber-300 border-dashed' : ''}
              `}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-2 shadow-sm" style={{ backgroundColor: color }}></span>
                  <span className="font-bold text-sm text-slate-700">Cluster {profile.clusterId}</span>
                  {isSelected && <span className="ml-2 text-[10px] bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded">Selecionado</span>}
                  {isSimilar && (
                    <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                      {(similarityData!.score * 100).toFixed(0)}% Similar
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{profile.nodeCount} nós</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-1">
                {profile.topKeywords.slice(0, 5).map((kw, i) => (
                  <span 
                    key={i} 
                    className={`text-[10px] px-1.5 py-0.5 rounded border 
                      ${(similarityData?.sharedKeywords.includes(kw.word)) 
                        ? 'bg-green-100 text-green-800 border-green-200 font-bold' 
                        : 'bg-slate-50 text-slate-600 border-slate-100'
                      }`}
                  >
                    {kw.word}
                  </span>
                ))}
              </div>

              {isSimilar && (
                 <div className="mt-2 text-[10px] text-slate-500 border-t border-amber-200 pt-1">
                    <span className="font-semibold text-amber-700">Conexão Semântica:</span> Compartilha {similarityData?.sharedKeywords.length} termos ({similarityData?.sharedKeywords.slice(0,3).join(', ')}...)
                 </div>
              )}
            </div>
          );
        })}
      </div>
      
      {selectedClusterId !== null && (
         <div className="p-3 bg-slate-100 text-xs text-center border-t border-slate-200 text-slate-500">
            Selecione outro cluster para limpar ou clique no mesmo para desmarcar.
         </div>
      )}
    </div>
  );
};

export default ClusterAnalysisPanel;
