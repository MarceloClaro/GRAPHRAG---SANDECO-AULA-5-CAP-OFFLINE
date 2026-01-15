import React from 'react';
import { GraphMetrics } from '../types';

interface Props {
  metrics?: GraphMetrics;
}

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtext?: string;
  color?: 'blue' | 'green' | 'indigo' | 'amber' | 'purple';
  icon?: React.ReactNode;
}> = ({ title, value, subtext, color = 'blue', icon }) => {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorStyles[color]} shadow-sm flex flex-col justify-between h-full`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">{title}</span>
        {icon && <div className="opacity-50">{icon}</div>}
      </div>
      <div>
        <span className="text-2xl font-extrabold tracking-tight">{value}</span>
        {subtext && <p className="text-xs mt-1 font-medium opacity-80">{subtext}</p>}
      </div>
    </div>
  );
};

const QualityIndicator: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  ideal: string;
  description: string;
}> = ({ label, value, min, max, ideal, description }) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  
  // Color logic
  let barColor = 'bg-slate-300';
  if (label.includes('Silhouette')) {
      barColor = value > 0.5 ? 'bg-emerald-500' : value > 0.25 ? 'bg-yellow-400' : 'bg-red-400';
  } else if (label.includes('Modularidade')) {
      barColor = value > 0.4 ? 'bg-indigo-500' : value > 0.2 ? 'bg-indigo-300' : 'bg-slate-400';
  } else if (label.includes('Densidade')) {
      // Density Goldilocks zone: not too sparse, not too dense
      barColor = value > 0.05 && value < 0.2 ? 'bg-blue-500' : 'bg-blue-300';
  }

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-end mb-1">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="text-sm font-mono font-bold text-slate-900">{value.toFixed(3)}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1 overflow-hidden">
        <div 
            className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`} 
            style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-[10px] text-slate-500">
         <span>{description}</span>
         <span className="font-medium text-slate-600">{ideal}</span>
      </div>
    </div>
  );
};

const GraphMetricsDashboard: React.FC<Props> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="mb-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Métricas Estruturais & Qualidade
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard 
            title="Total de Nós" 
            value={metrics.totalNodes} 
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
            color="indigo"
        />
        <MetricCard 
            title="Conexões (Arestas)" 
            value={metrics.totalEdges}
            subtext={`${(metrics.avgDegree).toFixed(1)} conexões/nó (méd)`}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
            color="purple"
        />
        <MetricCard 
            title="Componentes Conexos" 
            value={metrics.connectedComponents} 
            subtext={metrics.connectedComponents === 1 ? "Grafo totalmente unificado" : "Ilhas de conhecimento isoladas"}
            color={metrics.connectedComponents === 1 ? "green" : "amber"}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <MetricCard 
            title="Score Global (Est.)" 
            value={`${Math.round(((metrics.silhouetteScore + metrics.modularity + (metrics.density * 5))/3)*100)}/100`}
            subtext="Índice de qualidade RAG"
            color="blue"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-5">
        <div>
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Qualidade Semântica</h4>
            <QualityIndicator 
                label="Modularidade (Q)" 
                value={metrics.modularity} 
                min={0} max={1} 
                ideal="> 0.3"
                description="Mede quão bem o grafo se divide em comunidades distintas."
            />
            <QualityIndicator 
                label="Silhouette Score (Coesão)" 
                value={metrics.silhouetteScore} 
                min={-1} max={1} 
                ideal="> 0.5"
                description="Mede quão similar um nó é ao seu cluster comparado a outros."
            />
        </div>
        <div>
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Topologia</h4>
            <QualityIndicator 
                label="Densidade do Grafo" 
                value={metrics.density} 
                min={0} max={0.5} 
                ideal="0.05 - 0.15"
                description="Proporção de conexões possíveis que existem."
            />
             <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                <strong className="block mb-1 text-slate-800">Interpretação da IA:</strong>
                {metrics.modularity > 0.4 
                    ? "O grafo apresenta uma estrutura de comunidades forte, ideal para RAG hierárquico." 
                    : "O grafo está altamente conectado mas com pouca distinção de tópicos (difuso)."}
                {metrics.silhouetteScore < 0.25 && " Atenção: Clusters podem estar sobrepostos, sugerindo temas misturados."}
            </div>
        </div>
      </div>
    </div>
  );
};

export default GraphMetricsDashboard;