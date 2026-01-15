import React from 'react';
import { PipelineStage } from '../types';

interface Props {
  currentStage: PipelineStage;
}

const steps = [
  { id: PipelineStage.UPLOAD, label: '1. Extração & Chunks' },
  { id: PipelineStage.EMBEDDINGS, label: '2. Embeddings CNN' },
  { id: PipelineStage.CLUSTERING, label: '3. Clusterização' },
  { id: PipelineStage.GRAPH, label: '4. Grafo de Conhecimento' },
];

const PipelineProgress: React.FC<Props> = ({ currentStage }) => {
  const currentIndex = steps.findIndex(s => s.id === currentStage);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10" />
        {steps.map((step, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center bg-white px-2">
              <div 
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300
                  ${isActive ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-400'}
                  ${isCurrent ? 'ring-4 ring-indigo-100 scale-110' : ''}
                `}
              >
                {index + 1}
              </div>
              <span className={`mt-2 text-xs font-semibold uppercase tracking-wider ${isActive ? 'text-indigo-700' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineProgress;