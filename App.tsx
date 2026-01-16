
import React, { useState, useRef, useEffect } from 'react';
import { PipelineStage, DocumentChunk, EmbeddingVector, ClusterPoint, GraphData, CNNHyperParameters, TrainingMetrics } from './types';
import { 
  processRealPDFsToChunks, 
  generateEmbeddingsFromChunks, 
  generateClustersFromEmbeddings, 
  generateGraphFromClusters 
} from './services/mockDataService';
import { enhanceChunksWithAI, generateRealEmbeddingsWithGemini } from './services/geminiService';
import { enhanceChunksWithOllama, generateEmbeddingsWithOllama } from './services/ollamaService';
import { enhanceChunksWithXiaozhi, generateEmbeddingsWithXiaozhi } from './services/xiaozhiService';
import { trainCNNWithTripletLoss } from './services/cnnRefinementService';
import { extractTextFromPDF } from './services/pdfService';
import { downloadCSV, exportChunksWithHistory, exportCleanRowsOnly } from './services/exportService';
import { generateTechnicalReport, downloadReportAsPDF, downloadReportAsXLSX, UnifiedRow } from './services/reportService';
import { enrichChunksWithMode, exportEnrichedResultsToCSV, EnrichmentMode, EnrichedChunkResult } from './services/csvEnrichmentOrchestratorService';
import { LLMEnrichmentConfig } from './services/csvLLMEnhancerService';
import PipelineProgress from './components/PipelineProgress';
import FullContentModal from './components/FullContentModal';
import ForceGraph, { ForceGraphRef } from './components/charts/ForceGraph';
import GraphMetricsDashboard from './components/GraphMetricsDashboard';
import ClusterAnalysisPanel from './components/ClusterAnalysisPanel';
import SettingsPanel, { AppSettings } from './components/SettingsPanel';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const App: React.FC = () => {
  // State
  const [stage, setStage] = useState<PipelineStage>(PipelineStage.UPLOAD);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [embeddings, setEmbeddings] = useState<EmbeddingVector[]>([]);
  const [clusters, setClusters] = useState<ClusterPoint[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [highlightedClusters, setHighlightedClusters] = useState<number[]>([]);
  
  // Refs
  const graphRef = useRef<ForceGraphRef>(null);

  // CNN Training Settings
  const [cnnParams, setCnnParams] = useState<CNNHyperParameters>({
    margin: 0.2,
    learningRate: 0.005,
    epochs: 15,
    miningStrategy: 'hard',
    optimizer: 'adamw'
  });
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetrics | null>(null);
  
  // Upload State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("Processando...");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Settings State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    aiProvider: 'ollama',
    geminiApiKey: '',
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'llama3.2:3b',
    ollamaEmbeddingModel: 'nomic-embed-text',
    xiaozhiWebsocketUrl: 'wss://api.tenclass.net/xiaozhi/v1/',
    xiaozhiToken: 'test-token'
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAppSettings(parsed);
        // Se houver API key salva, configure no process.env para compatibilidade
        if (parsed.geminiApiKey) {
          (window as any).GEMINI_API_KEY = parsed.geminiApiKey;
        }
      } catch (e) {
        console.error('Erro ao carregar configurações', e);
      }
    }
  }, []);
  const [aiEnhanced, setAiEnhanced] = useState(false);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', text: '' });

  // Report State
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');

  // CSV Enrichment State
  const [enrichmentMode, setEnrichmentMode] = useState<EnrichmentMode>('rapido');
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);
  const [enrichmentMessage, setEnrichmentMessage] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedResults, setEnrichedResults] = useState<EnrichedChunkResult[] | null>(null);

  // Handle Real File Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus("Lendo PDF e extraindo texto...");
    setUploadError(null);
    setAiEnhanced(false);

    try {
      const files = Array.from(event.target.files);
      const extractedDocs = [];

      for (const file of files) {
        if (file.type === "application/pdf") {
          const processed = await extractTextFromPDF(file);
          extractedDocs.push(processed);
        } else {
           const text = await file.text();
           extractedDocs.push({ filename: file.name, text: text, pageCount: 1 });
        }
      }

      const generatedChunks = processRealPDFsToChunks(extractedDocs);
      
      if (generatedChunks.length === 0) {
        setUploadError("Nenhum conteúdo de texto pôde ser extraído dos arquivos.");
      } else {
        setChunks(generatedChunks);
        setStage(PipelineStage.UPLOAD);
      }
    } catch (err) {
      console.error(err);
      setUploadError("Erro ao processar arquivos.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnhanceWithAI = async () => {
    if (chunks.length === 0) return;
    setIsProcessing(true);
    
    try {
      let enhanced: DocumentChunk[];
      
      if (appSettings.aiProvider === 'ollama') {
        setProcessingStatus("Ollama: Limpando texto e identificando entidades...");
        enhanced = await enhanceChunksWithOllama(chunks, {
          endpoint: appSettings.ollamaEndpoint,
          model: appSettings.ollamaModel,
          embeddingModel: appSettings.ollamaEmbeddingModel
        }, (progress) => {
          setProcessingStatus(`Ollama: Processando chunks... ${progress}%`);
        });
      } else if (appSettings.aiProvider === 'xiaozhi') {
        setProcessingStatus("Xiaozhi: Limpando texto e identificando entidades...");
        enhanced = await enhanceChunksWithXiaozhi(chunks, (progress) => {
          setProcessingStatus(`Xiaozhi: Processando chunks... ${progress}%`);
        });
      } else {
        // Gemini
        if (!appSettings.geminiApiKey && !(window as any).GEMINI_API_KEY) {
          setUploadError("API Key do Gemini não configurada. Abra as Configurações (⚙️)");
          setIsProcessing(false);
          return;
        }
        
        setProcessingStatus("Gemini AI: Limpando texto e identificando entidades...");
        // Temporariamente configura a API key no window para o serviço acessar
        if (appSettings.geminiApiKey) {
          (window as any).GEMINI_API_KEY = appSettings.geminiApiKey;
        }
        
        enhanced = await enhanceChunksWithAI(chunks, (progress) => {
          setProcessingStatus(`Gemini AI: Processando chunks... ${progress}%`);
        });
      }
      
      setChunks(enhanced);
      setAiEnhanced(true);
    } catch (err) {
      console.error("Erro na IA", err);
      setUploadError("Falha ao conectar com Gemini API. Verifique sua chave.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessEmbeddings = async () => {
    setIsProcessing(true);
    setProcessingStatus("Inicializando modelo de embedding...");
    setTrainingMetrics(null); // Reset metrics

    try {
        let embeds: EmbeddingVector[];
        
        if (appSettings.aiProvider === 'ollama') {
            setProcessingStatus("Gerando Embeddings com Ollama (Local)...");
            embeds = await generateEmbeddingsWithOllama(chunks, {
              endpoint: appSettings.ollamaEndpoint,
              model: appSettings.ollamaModel,
              embeddingModel: appSettings.ollamaEmbeddingModel
            }, (progress) => {
                setProcessingStatus(`Gerando vetores (Ollama ${appSettings.ollamaEmbeddingModel})... ${progress}%`);
            });
        } else if (appSettings.aiProvider === 'xiaozhi') {
            setProcessingStatus("Gerando Embeddings com Xiaozhi (Cloud)...");
            embeds = await generateEmbeddingsWithXiaozhi(chunks, (progress) => {
                setProcessingStatus(`Gerando vetores (Xiaozhi)... ${progress}%`);
            });
        } else {
            // Gemini embeddings
            if (!appSettings.geminiApiKey && !(window as any).GEMINI_API_KEY) {
              setUploadError("API Key do Gemini não configurada. Abra as Configurações (⚙️)");
              setIsProcessing(false);
              return;
            }
            
            if (appSettings.geminiApiKey) {
              (window as any).GEMINI_API_KEY = appSettings.geminiApiKey;
            }
            
            setProcessingStatus("Gerando Embeddings Reais via Gemini API (High-Fidelity)...");
            embeds = await generateRealEmbeddingsWithGemini(chunks, (progress) => {
                setProcessingStatus(`Gerando vetores (Gemini-004)... ${progress}%`);
            });
        }

        setEmbeddings(embeds);
        setStage(PipelineStage.EMBEDDINGS);
    } catch (e) {
        console.error(e);
        setUploadError("Erro na geração de embeddings.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRunCNNTraining = async () => {
      if (embeddings.length === 0) return;
      setIsProcessing(true);
      setProcessingStatus("Inicializando CNN com Triplet Loss (Cross-Validation 80/20)...");

      try {
          await trainCNNWithTripletLoss(embeddings, cnnParams, (metrics, updatedEmbeddings) => {
              setProcessingStatus(`Epoch ${metrics.currentEpoch}/${cnnParams.epochs} | Train Loss: ${metrics.trainLoss.toFixed(4)} | Val Loss: ${metrics.valLoss.toFixed(4)}`);
              setTrainingMetrics(metrics);
              setEmbeddings(updatedEmbeddings); // Update visual state with refined vectors
          });
          setProcessingStatus("Treinamento concluído.");
      } catch (err) {
          console.error("Erro no treinamento CNN", err);
          setUploadError("Falha no refinamento CNN.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleRunClustering = () => {
    setIsProcessing(true);
    setProcessingStatus("Calculando clusters (K-Means++)...");
    
    // Processamento assíncrono para não bloquear UI
    requestAnimationFrame(() => {
        const clusterPoints = generateClustersFromEmbeddings(embeddings);
        setClusters(clusterPoints);
        setStage(PipelineStage.CLUSTERING);
        setIsProcessing(false);
    });
  };

  const handleBuildGraph = () => {
    setIsProcessing(true);
    setProcessingStatus("Construindo grafo de conhecimento e calculando métricas...");
    
    // Processamento assíncrono para não bloquear UI
    requestAnimationFrame(() => {
        const graph = generateGraphFromClusters(clusters);
        setGraphData(graph);
        setStage(PipelineStage.GRAPH);
        setIsProcessing(false);
    });
  };

  const handleGenerateReport = () => {
    const report = generateTechnicalReport(chunks, embeddings, graphData, appSettings.aiProvider === 'ollama' ? `ollama-${appSettings.ollamaEmbeddingModel}` : 'gemini-004');
    setReportText(report);
    setReportOpen(true);
  };

  // CSV Export Handlers
  const exportChunks = () => {
    const dataToExport = chunks.map(c => ({
      ID: c.id,
      Arquivo: c.source,
      Tipo_Entidade: c.entityType,
      Rotulo_Entidade: c.entityLabel,
      Tokens: c.tokens,
      Palavras_Chave: c.keywords?.join('; '),
      Prazo: c.dueDate,
      Conteudo_Completo: c.content
    }));
    downloadCSV(dataToExport, 'etapa1_entidades_inteligentes.csv');
  };

  // Export CSV Enriquecido para RAG
  const exportEnrichedCSV = async (includeNoise: boolean = false) => {
    if (chunks.length === 0) {
      alert('Nenhum dado para exportar. Faça upload primeiro.');
      return;
    }

    setIsEnriching(true);
    setEnrichmentProgress(0);
    setEnrichmentMessage('Iniciando enriquecimento...');

    try {
      const sourceFile = chunks[0]?.source || 'documento.pdf';

      // Configuração do LLM
      const llmConfig: LLMEnrichmentConfig = {
        provider: appSettings.aiProvider === 'ollama' ? 'ollama' : 
                  appSettings.aiProvider === 'xiaozhi' ? 'xiaozhi' : 'gemini',
        endpoint: appSettings.ollamaEndpoint,
        model: appSettings.ollamaModel,
        apiKey: appSettings.geminiApiKey,
        token: appSettings.xiaozhiToken,
        useCache: true,
        cacheSize: 500
      };

      // Enriquecer com modo selecionado
      const results = await enrichChunksWithMode(chunks, sourceFile, {
        mode: enrichmentMode,
        llmConfig: enrichmentMode !== 'rapido' ? llmConfig : undefined,
        onProgress: (progress, message) => {
          setEnrichmentProgress(progress);
          setEnrichmentMessage(message);
        }
      });

      setEnrichedResults(results);

      // Exportar CSV
      const csvContent = exportEnrichedResultsToCSV(results, includeNoise);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const modeLabel = enrichmentMode === 'rapido' ? 'rapido' : 
                        enrichmentMode === 'preciso' ? 'preciso_llm' : 'hibrido';
      const noiseLabel = includeNoise ? 'completo' : 'limpo';
      link.download = `csv_enriquecido_${modeLabel}_${noiseLabel}_${Date.now()}.csv`;
      link.click();

      setEnrichmentMessage('✅ CSV enriquecido exportado com sucesso!');
      setTimeout(() => setIsEnriching(false), 2000);

    } catch (error) {
      console.error('Erro ao enriquecer CSV:', error);
      setEnrichmentMessage('❌ Erro ao processar. Tente o modo Rápido.');
      setTimeout(() => setIsEnriching(false), 3000);
    }
  };

  const exportEmbeddings = () => {
    const dataToExport = embeddings.map(e => ({
      ID: e.id,
      Tipo_Entidade: e.entityType,
      Modelo: e.modelUsed,
      Dimensao_Vetor: e.vector.length,
      Vetor_Preview: `[${e.vector.slice(0, 5).map(v => v.toFixed(4)).join('; ')}...]`,
      Conteudo_Completo: e.fullContent
    }));
    downloadCSV(dataToExport, 'etapa2_embeddings.csv');
  };

  const exportClusters = () => {
    const dataToExport = clusters.map(c => ({
      ID: c.id,
      Cluster_ID: c.clusterId,
      Rotulo: c.label,
      Tipo_Entidade: c.entityType,
      Conteudo_Completo: c.fullContent
    }));
    downloadCSV(dataToExport, 'etapa4_clusters.csv');
  };

  const exportGraph = () => {
    if (!graphData) return;
    const nodesExport = graphData.nodes.map(n => ({
      Node_ID: n.id,
      Label: n.label,
      Tipo_Entidade: n.entityType,
      Palavras_Chave: n.keywords?.join('; '),
      Centralidade: n.centrality.toFixed(4),
      Conteudo_Completo: n.fullContent
    }));
    downloadCSV(nodesExport, 'etapa6_grafo_nos.csv');
    
    const edgesExport = graphData.links.map(l => ({
      Origem: l.source,
      Destino: l.target,
      Peso: l.value.toFixed(4),
      Confianca: l.confidence.toFixed(4),
      Tipo: l.type
    }));
    downloadCSV(edgesExport, 'etapa6_grafo_arestas.csv');
  };

  // CSV unificado com colunas incrementais de todas as etapas
  const exportUnifiedCSV = () => {
    const rows = buildUnifiedRows();
    if (!rows.length) {
      alert('Nenhum dado para exportar. Faça o upload/processamento primeiro.');
      return;
    }
    downloadCSV(rows, 'pipeline_unificado.csv');
  };

  // Exporta relatório QUALIS A1 em PDF (HTML) e XLSX (planilha)
  const exportReportAudit = (format: 'pdf' | 'xlsx') => {
    const rows = buildUnifiedRows();
    if (!rows.length) {
      alert('Nenhum dado para exportar. Faça o upload/processamento primeiro.');
      return;
    }
    const report = generateTechnicalReport(chunks, embeddings, graphData, appSettings.aiProvider === 'ollama' ? 'sentence-bert' : 'gemini-004');
    if (format === 'pdf') downloadReportAsPDF(report, rows);
    if (format === 'xlsx') downloadReportAsXLSX(rows);
  };

  // Constrói linhas unificadas reutilizáveis
  const buildUnifiedRows = (): UnifiedRow[] => {
    return chunks.map(chunk => {
      const embedding = embeddings.find(e => e.id === chunk.id);
      const cluster = clusters.find(c => c.id === chunk.id);
      const node = graphData?.nodes.find(n => n.id === chunk.id);
      const degree = graphData ? graphData.links.filter(l => l.source === chunk.id || l.target === chunk.id).length : undefined;
      const provider = appSettings.aiProvider === 'ollama' 
        ? `Ollama (${appSettings.ollamaModel})` 
        : appSettings.aiProvider === 'xiaozhi'
        ? 'Xiaozhi'
        : 'Gemini';

      // ESTRUTURA ACUMULATIVA - Adiciona colunas conforme etapas avançam
      const row: any = {
        // ETAPA 1: Upload & Identificação (Sempre presente)
        Chunk_ID: chunk.id,
        Arquivo: chunk.source,
        Pagina: chunk.pageNumber || '',
        
        // ETAPA 1: Enriquecimento IA
        Tipo_Entidade_IA: chunk.entityType || '',
        Rotulo_Entidade: chunk.entityLabel || '',
        Provedor_IA: provider,
        Timestamp_Upload: chunk.uploadTime || new Date().toISOString(),
      };

      // ETAPA 2: Limpeza & Coerência
      if (stage >= PipelineStage.UPLOAD) {
        row.Conteudo_Original = (chunk.contentOriginal || chunk.content || '').slice(0, 200);
        row.Conteudo_Processado = (chunk.content || '').slice(0, 200);
        row.Tokens_Originais = chunk.tokensOriginal || chunk.tokens || 0;
        row.Tokens_Atuais = chunk.tokens || 0;
        row.Score_Coesao = chunk.coesionScore?.toFixed(4) || '';
        row.Score_Coerencia = chunk.coherenceScore?.toFixed(4) || '';
      }

      // ETAPA 3: Análise Semântica
      if (stage >= PipelineStage.UPLOAD) {
        row.Palavras_Chave = chunk.keywords?.join('; ') || '';
        row.Prazo = chunk.dueDate || '';
        row.Conteudo_Preview = (chunk.content || '').replace(/\s+/g, ' ').slice(0, 140);
      }

      // ETAPA 4: Embeddings (Adicionado quando processado)
      if (embeddings.length > 0) {
        row.Modelo_Embedding = embedding?.modelUsed || '';
        row.Dim_Vetor = embedding?.vector?.length || '';
        row.Vetor_Preview = embedding ? `[${embedding.vector.slice(0, 5).map(v => v.toFixed(4)).join('; ')}...]` : '';
        row.Timestamp_Embedding = embedding?.timestamp || '';
      }

      // ETAPA 5: Refinamento CNN (Adicional se processado)
      if (embeddings.length > 0) {
        row.CNN_Epoch = embedding?.cnnEpoch || '';
        row.CNN_Loss = embedding?.cnnLoss?.toFixed(6) || '';
        row.Distancia_Triplet = embedding?.tripletDistance?.toFixed(4) || '';
      }

      // ETAPA 6: Clustering (Adicionado quando clusterizado)
      if (clusters.length > 0) {
        row.Cluster_ID = cluster?.clusterId ?? '';
        row.Cluster_Label = cluster?.label || '';
        row.Cluster_Coordenada_X = cluster?.x ?? '';
        row.Cluster_Coordenada_Y = cluster?.y ?? '';
        row.Distancia_Centroide = cluster?.distanceToCentroid?.toFixed(4) || '';
        row.Score_Silhueta = cluster?.silhouetteScore?.toFixed(4) || '';
      }

      // ETAPA 7: Construção & Visualização Grafo
      if (graphData && graphData.nodes.length > 0) {
        row.Grafo_NodeID = node?.id || '';
        row.Grafo_Group = node?.group ?? '';
        row.Grafo_Centralidade = node?.centrality?.toFixed(4) ?? '';
        row.Grafo_Betweenness = node?.betweenness?.toFixed(4) || '';
        row.Grau_Arestas = degree ?? '';
        row.Palavras_Chave_Grafo = node?.keywords?.join('; ') || '';
        row.Timestamp_Grafo = node?.timestamp || '';
      }

      // METADADOS FINAIS (Sempre presente)
      row.Etapa_Atual = stage;
      row.Status_Processamento = stage === PipelineStage.UPLOAD 
        ? 'Iniciado' 
        : stage === PipelineStage.EMBEDDINGS 
        ? 'Vetorizado' 
        : stage === PipelineStage.CLUSTERING 
        ? 'Clusterizado'
        : stage === PipelineStage.GRAPH 
        ? 'Grafo Construído'
        : 'Completado';
      row.Timestamp_Export = new Date().toISOString();
      row.Versao_Pipeline = '2.5.0';

      return row;
    });
  };

  const openModal = (title: string, content: string) => {
    setModalContent({ title, text: content });
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">GraphRAG Pipeline</h1>
              <p className="text-xs text-slate-400">
                {appSettings.aiProvider === 'ollama' 
                  ? `Powered by Ollama (${appSettings.ollamaModel})` 
                  : 'Powered by Gemini AI'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
              title="Configurações"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">Configurações</span>
            </button>
            <div className="text-right hidden md:block">
              <span className={`${
                appSettings.aiProvider === 'ollama' 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                  : appSettings.aiProvider === 'xiaozhi'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600'
              } text-white text-xs px-2 py-1 rounded shadow-sm`}>
                {appSettings.aiProvider === 'ollama' 
                  ? '🦙 Ollama Local' 
                  : appSettings.aiProvider === 'xiaozhi'
                  ? '🌐 Xiaozhi WebSocket'
                  : '🌐 Gemini Cloud'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <PipelineProgress currentStage={stage} />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] p-6 relative">
          
          {isProcessing && (
             <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-xl">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-indigo-800 font-medium animate-pulse">{processingStatus}</p>
             </div>
          )}

          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 flex-wrap gap-4">
            <h2 className="text-2xl font-bold text-slate-800">
              {stage === PipelineStage.UPLOAD && "1. Extração & Refinamento AI"}
              {stage === PipelineStage.EMBEDDINGS && "2. Vetores & Embeddings"}
              {stage === PipelineStage.CLUSTERING && "3. Clusterização Semântica"}
              {stage === PipelineStage.GRAPH && "4. Grafo de Conhecimento"}
            </h2>
            <div className="flex items-center space-x-3">
              {chunks.length > 0 && (
                <button
                  onClick={exportUnifiedCSV}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg shadow-sm transition-all text-sm font-medium flex items-center"
                  title="Exportar CSV unificado com dados incrementais"
                >
                  Exportar CSV Unificado
                </button>
              )}

              {chunks.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => exportReportAudit('pdf')}
                    disabled={isProcessing}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg shadow-sm transition-all text-sm font-medium"
                    title="Baixar relatório completo em PDF com planilha de auditoria"
                  >
                    Relatório PDF
                  </button>
                  <button
                    onClick={() => exportReportAudit('xlsx')}
                    disabled={isProcessing}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg shadow-sm transition-all text-sm font-medium"
                    title="Baixar planilha XLSX com dados consolidados"
                  >
                    Auditoria XLSX
                  </button>
                </div>
              )}
              
              {stage === PipelineStage.UPLOAD && chunks.length > 0 && (
                <>
                  {!aiEnhanced && (
                    <button 
                      onClick={handleEnhanceWithAI} 
                      disabled={isProcessing} 
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all font-medium flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {appSettings.aiProvider === 'ollama' 
                        ? 'Limpar & Classificar com Ollama' 
                        : appSettings.aiProvider === 'xiaozhi'
                        ? 'Limpar & Classificar com Xiaozhi'
                        : 'Limpar & Classificar com Gemini'}
                    </button>
                  )}
                  <button onClick={handleProcessEmbeddings} disabled={isProcessing} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all font-medium flex items-center">
                    Gerar Embeddings <span className="ml-2">→</span>
                  </button>
                </>
              )}
              {stage === PipelineStage.EMBEDDINGS && (
                <button onClick={handleRunClustering} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all font-medium flex items-center">
                  Executar Clusterização <span className="ml-2">→</span>
                </button>
              )}
              {stage === PipelineStage.CLUSTERING && (
                <button onClick={handleBuildGraph} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all font-medium flex items-center">
                  Construir Grafo <span className="ml-2">→</span>
                </button>
              )}
              {stage === PipelineStage.GRAPH && (
                <>
                <button onClick={handleGenerateReport} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all font-medium flex items-center">
                    📄 Relatório Técnico
                </button>
                <button onClick={() => {
                    setStage(PipelineStage.UPLOAD);
                    setChunks([]);
                    setEmbeddings([]);
                    setClusters([]);
                    setGraphData(null);
                    setAiEnhanced(false);
                }} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg shadow-sm transition-all font-medium">
                  Novo Processamento
                </button>
                </>
              )}
            </div>
          </div>

          {/* Stage 1: Upload & Chunks View */}
          {stage === PipelineStage.UPLOAD && (
            <div className="space-y-4">
              {uploadError && (
                 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Erro: </strong>
                    <span className="block sm:inline">{uploadError}</span>
                 </div>
              )}

              {chunks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 transition-colors hover:bg-slate-100 hover:border-indigo-400">
                   <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-4 text-lg font-medium text-slate-700">Carregar Documentos PDF</p>
                      <p className="mt-1 text-sm text-slate-500">Pipeline RAG completa com enriquecimento jurídico inteligente.</p>
                      <label className="mt-6 inline-block cursor-pointer">
                        <span className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg shadow-md font-medium transition-colors">
                           Selecionar Arquivos
                        </span>
                        <input 
                           type="file" 
                           multiple 
                           accept=".pdf,application/pdf" 
                           className="hidden" 
                           onChange={handleFileUpload}
                        />
                      </label>
                   </div>
                </div>
              ) : (
                <>
                  <div className={`flex justify-between items-center p-3 rounded-lg border ${aiEnhanced ? 'bg-purple-50 border-purple-100' : 'bg-green-50 border-green-100'}`}>
                     <div className="flex-1">
                        <span className={`${aiEnhanced ? 'text-purple-800' : 'text-green-800'} font-medium block`}>
                           {aiEnhanced ? `✨ ${chunks.length} entidades enriquecidas e limpas pela IA` : `✅ ${chunks.length} entidades extraídas (Bruto)`}
                        </span>
                        {aiEnhanced && (
                          <span className="text-xs text-purple-600 mt-1">
                            {(() => {
                              const providers = chunks.reduce((acc: Record<string, number>, chunk) => {
                                const p = chunk.aiProvider || 'desconhecido';
                                acc[p] = (acc[p] || 0) + 1;
                                return acc;
                              }, {});
                              const providerText = Object.entries(providers)
                                .map(([p, count]) => {
                                  if (p === 'ollama') return `🦙 Ollama: ${count}`;
                                  if (p === 'gemini') return `🌐 Gemini: ${count}`;
                                  if (p === 'xiaozhi') return `☁️ Xiaozhi: ${count}`;
                                  return `${p}: ${count}`;
                                })
                                .join(' • ');
                              return `Processado por: ${providerText}`;
                            })()}
                          </span>
                        )}
                     </div>
                     <div className="flex items-center gap-2">
                       <select 
                         value={enrichmentMode} 
                         onChange={(e) => setEnrichmentMode(e.target.value as EnrichmentMode)}
                         className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white"
                         disabled={isEnriching}
                       >
                         <option value="rapido">⚡ Rápido (regex)</option>
                         <option value="preciso">🎯 Preciso (LLM)</option>
                         <option value="hibrido">🔄 Híbrido</option>
                       </select>
                       <button 
                         onClick={() => exportEnrichedCSV(false)} 
                         className="flex items-center text-sm bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                         disabled={isEnriching}
                       >
                         <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                         CSV RAG
                       </button>
                     </div>
                  </div>
                  {isEnriching && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-800">{enrichmentMessage}</span>
                        <span className="text-sm text-blue-600">{enrichmentProgress}%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${enrichmentProgress}%` }}
                        ></div>
                      </div>
                      {enrichmentMode === 'preciso' && (
                        <p className="text-xs text-blue-600 mt-2">
                          💡 Modo Preciso: Processamento mais lento (~1-2s/chunk), mas com maior acurácia via LLM
                        </p>
                      )}
                    </div>
                  )}

                  {/* Info sobre modos de enriquecimento */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-indigo-900 mb-2">📊 Modos de Enriquecimento CSV para RAG</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white rounded p-3 border border-indigo-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">⚡</span>
                          <span className="font-semibold text-slate-800">Rápido</span>
                        </div>
                        <p className="text-slate-600">~100ms/chunk • Regex • 70% acurácia</p>
                        <p className="text-slate-500 mt-1">Ideal para MVP e testes rápidos</p>
                      </div>
                      <div className="bg-white rounded p-3 border border-purple-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🎯</span>
                          <span className="font-semibold text-slate-800">Preciso</span>
                        </div>
                        <p className="text-slate-600">~1-2s/chunk • LLM • 95% acurácia</p>
                        <p className="text-slate-500 mt-1">Produção e dados críticos</p>
                      </div>
                      <div className="bg-white rounded p-3 border border-blue-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🔄</span>
                          <span className="font-semibold text-slate-800">Híbrido</span>
                        </div>
                        <p className="text-slate-600">Instant UI + LLM async • 95% acurácia</p>
                        <p className="text-slate-500 mt-1">Melhor UX (não bloqueia)</p>
                      </div>
                    </div>
                    <p className="text-xs text-indigo-700 mt-3">
                      💡 O CSV enriquecido inclui: rastreabilidade (fonte, página, artigo), limpeza de ruído, metadados jurídicos (hierarquia, tipo, referência)
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo (IA)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rótulo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Palavras-Chave (Entidades)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Conteúdo (Preview)</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {chunks.map(chunk => (
                          <tr key={chunk.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    chunk.entityType === 'ARTIGO' ? 'bg-blue-100 text-blue-800' :
                                    chunk.entityType === 'DEFINICAO' ? 'bg-teal-100 text-teal-800' :
                                    chunk.entityType === 'ESTRUTURA_MACRO' ? 'bg-purple-100 text-purple-800' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {chunk.entityType}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{chunk.entityLabel}</td>
                            <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
                              <div className="flex flex-wrap gap-1">
                                {chunk.keywords?.slice(0, 3).map((k, i) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded text-[10px]">{k}</span>
                                ))}
                                {chunk.keywords && chunk.keywords.length > 3 && <span className="text-xs text-slate-400">+{chunk.keywords.length - 3}</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                              {chunk.content.substring(0, 60)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button 
                                onClick={() => openModal(`Entidade: ${chunk.entityLabel}`, chunk.content)}
                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100"
                              >
                                Ver
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Stage 2: Embeddings View */}
          {stage === PipelineStage.EMBEDDINGS && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4">
                 <div>
                    <h3 className="font-semibold text-indigo-900">Geração de Embeddings ({
                      appSettings.aiProvider === 'ollama' 
                        ? `Ollama (${appSettings.ollamaEmbeddingModel})` 
                        : appSettings.aiProvider === 'xiaozhi'
                        ? 'Xiaozhi Embeddings'
                        : 'Gemini text-embedding-004'
                    })</h3>
                    <p className="text-sm text-indigo-700">Vetores gerados com sucesso. Dimensões: {embeddings[0]?.vector.length || 0}.</p>
                 </div>
                 <button onClick={exportEmbeddings} className="flex items-center text-sm bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 transition">
                    CSV
                 </button>
              </div>

              {/* CNN Training Controls */}
              <div className="bg-slate-800 text-white p-4 rounded-lg shadow-lg mb-6">
                <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-3">
                    <h3 className="font-bold flex items-center">
                        <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        Refinamento CNN (Triplet Loss)
                    </h3>
                    {trainingMetrics && (
                        <div className="flex gap-3 text-xs">
                           <span className="bg-purple-600 px-2 py-1 rounded">
                             Epoch {trainingMetrics.currentEpoch}
                           </span>
                           <span className="bg-blue-600 px-2 py-1 rounded">
                             Train Loss: {trainingMetrics.trainLoss.toFixed(4)}
                           </span>
                           <span className={`px-2 py-1 rounded ${trainingMetrics.valLoss > trainingMetrics.trainLoss ? 'bg-amber-600' : 'bg-green-600'}`}>
                             Val Loss: {trainingMetrics.valLoss.toFixed(4)}
                           </span>
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Margin</label>
                        <input 
                          type="number" step="0.1" 
                          aria-label="CNN margin"
                          title="CNN margin"
                            value={cnnParams.margin}
                            onChange={(e) => setCnnParams({...cnnParams, margin: parseFloat(e.target.value)})}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-purple-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Learning Rate</label>
                        <input 
                          type="number" step="0.001" 
                          aria-label="CNN learning rate"
                          title="CNN learning rate"
                            value={cnnParams.learningRate}
                            onChange={(e) => setCnnParams({...cnnParams, learningRate: parseFloat(e.target.value)})}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-purple-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Epochs</label>
                        <input 
                          type="number" 
                          aria-label="CNN epochs"
                          title="CNN epochs"
                            value={cnnParams.epochs}
                            onChange={(e) => setCnnParams({...cnnParams, epochs: parseInt(e.target.value)})}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-purple-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Mining Strategy</label>
                        <select 
                          aria-label="CNN mining strategy"
                          title="CNN mining strategy"
                            value={cnnParams.miningStrategy}
                            onChange={(e) => setCnnParams({...cnnParams, miningStrategy: e.target.value as any})}
                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-purple-500"
                        >
                            <option value="hard">Hard Negatives</option>
                            <option value="semi-hard">Semi-Hard</option>
                            <option value="random">Random</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button 
                        onClick={handleRunCNNTraining} 
                        disabled={isProcessing}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center disabled:opacity-50"
                    >
                         {isProcessing ? 'Treinando...' : 'Iniciar Treinamento (Cross-Val)'}
                         <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {embeddings.map((emb, idx) => (
                  <div key={emb.id} className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <span className="text-xs font-bold text-slate-600 block">{emb.entityLabel}</span>
                            <span className="text-[10px] uppercase text-slate-400">{emb.entityType}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                           <span className="text-xs text-indigo-600 font-bold border border-indigo-200 px-1 rounded bg-indigo-50">Prazo: {emb.dueDate}</span>
                        </div>
                    </div>
                    <div className="font-mono text-xs text-green-600 break-all bg-slate-50 p-2 rounded mb-3">
                      [{emb.vector.slice(0, 10).map(n => n.toFixed(3)).join(', ')}, ...] ({emb.vector.length} dim)
                    </div>
                    <button 
                      onClick={() => openModal(`Texto Base: ${emb.entityLabel}`, emb.fullContent)}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Inspecionar Texto Limpo
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage 3: Clustering View */}
          {stage === PipelineStage.CLUSTERING && (
            <div className="space-y-4">
               <div className="flex justify-between items-center mb-4">
                 <p className="text-slate-600">Clusters calculados com base nas propriedades semânticas.</p>
                 <button onClick={exportClusters} className="flex items-center text-sm bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 transition">
                    CSV
                 </button>
               </div>
               
               <div className="h-[500px] w-full bg-slate-50 rounded-lg border border-slate-200 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="x" name="UMAP X" unit="" stroke="#94a3b8" />
                      <YAxis type="number" dataKey="y" name="UMAP Y" unit="" stroke="#94a3b8" />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload as ClusterPoint;
                                return (
                                    <div className="bg-white p-3 border border-slate-200 shadow-lg rounded text-sm max-w-xs">
                                        <p className="font-bold mb-1 text-indigo-700">{data.label}</p>
                                        <p className="text-xs font-semibold text-slate-600 mb-1">{data.entityType}</p>
                                        <div className="flex flex-wrap gap-1 mb-1">
                                            {data.keywords?.slice(0,3).map(k => <span className="text-[9px] bg-slate-100 px-1 rounded">{k}</span>)}
                                        </div>
                                        <p className="text-xs text-slate-500 mb-1">Cluster: {data.clusterId}</p>
                                        <p className="text-xs italic truncate">{data.fullContent.substring(0,50)}...</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                      />
                      <Scatter name="Documentos" data={clusters} fill="#8884d8">
                        {clusters.map((entry, index) => {
                           const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];
                           return <Cell key={`cell-${index}`} fill={colors[entry.clusterId % colors.length]} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
               </div>
            </div>
          )}

          {/* Stage 4: Graph View */}
          {stage === PipelineStage.GRAPH && graphData && (
            <div className="space-y-6">
               <GraphMetricsDashboard metrics={graphData.metrics} />

               <div className="flex justify-end items-center gap-4 mb-2">
                  <div className="flex space-x-2">
                    <button onClick={() => graphRef.current?.downloadGraphImage()} className="flex items-center text-sm bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Baixar PNG
                    </button>
                    <button onClick={exportGraph} className="flex items-center text-sm bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 transition">
                        CSV (Nós)
                    </button>
                    <button onClick={exportGraph} className="flex items-center text-sm bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800 transition">
                        CSV (Arestas)
                    </button>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Painel de Análise Lateral */}
                  <div className="lg:col-span-1">
                     <ClusterAnalysisPanel 
                        graphData={graphData} 
                        onClusterSelect={(ids) => setHighlightedClusters(ids)} 
                     />
                  </div>
                  
                  {/* Área do Grafo Principal */}
                  <div className="lg:col-span-3">
                     <ForceGraph 
                       ref={graphRef}
                       data={graphData} 
                       onNodeClick={(node) => openModal(`${node.label} (${node.entityType})`, node.fullContent)}
                       highlightedClusterIds={highlightedClusters}
                     />
                  </div>
               </div>
            </div>
          )}

        </div>
      </main>

      <FullContentModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={modalContent.title}
        content={modalContent.text}
      />

      <FullContentModal 
        isOpen={reportOpen} 
        onClose={() => setReportOpen(false)} 
        title="Relatório Técnico Qualis A1"
        content={reportText}
      />

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={(newSettings) => {
          setAppSettings(newSettings);
          // Configurar API key se mudou
          if (newSettings.geminiApiKey) {
            (window as any).GEMINI_API_KEY = newSettings.geminiApiKey;
          }
        }}
        currentSettings={appSettings}
      />
    </div>
  );
};

export default App;
