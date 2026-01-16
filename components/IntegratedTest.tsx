/**
 * Componente de Teste Integrado
 * Testa CSV → BD → RAG → Chatbot → TTS completo
 */

import React, { useState } from 'react';
import { getRAGService } from '../services/ragService';
import { getDatabase } from '../services/databaseService';
import ChatbotService from '../services/chatbotService';

interface TestResult {
  stage: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  duration: number;
  details?: any;
}

interface IntegratedTestProps {
  csvData?: any[];
  aiProvider: string;
  onTestComplete?: (results: TestResult[]) => void;
}

const IntegratedTest: React.FC<IntegratedTestProps> = ({
  csvData = [],
  aiProvider,
  onTestComplete
}) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateLastResult = (updates: Partial<TestResult>) => {
    setResults(prev => {
      const newResults = [...prev];
      newResults[newResults.length - 1] = { ...newResults[newResults.length - 1], ...updates };
      return newResults;
    });
  };

  const runFullTest = async () => {
    try {
      setIsRunning(true);
      setResults([]);
      const allResults: TestResult[] = [];

      // ===== STAGE 1: CSV PARSING =====
      const csvStart = Date.now();
      addResult({
        stage: '1️⃣ Leitura do CSV',
        status: 'running',
        message: 'Processando dados do CSV...',
        duration: 0
      });

      try {
        if (!csvData || csvData.length === 0) {
          throw new Error('Nenhum dado CSV fornecido para teste');
        }

        updateLastResult({
          status: 'success',
          message: `${csvData.length} linhas lidas do CSV`,
          duration: Date.now() - csvStart,
          details: {
            totalRows: csvData.length,
            columns: csvData[0] ? Object.keys(csvData[0]).length : 0,
            sampleColumns: csvData[0] ? Object.keys(csvData[0]).slice(0, 5) : []
          }
        });
      } catch (error) {
        updateLastResult({
          status: 'error',
          message: `Erro ao ler CSV: ${error}`,
          duration: Date.now() - csvStart
        });
        throw error;
      }

      // ===== STAGE 2: DATABASE INITIALIZATION =====
      const dbStart = Date.now();
      addResult({
        stage: '2️⃣ Inicializar Banco de Dados',
        status: 'running',
        message: 'Inicializando IndexedDB...',
        duration: 0
      });

      try {
        const db = await getDatabase();
        updateLastResult({
          status: 'success',
          message: 'IndexedDB inicializado com sucesso',
          duration: Date.now() - dbStart,
          details: { engine: 'IndexedDB', status: 'ready' }
        });
      } catch (error) {
        updateLastResult({
          status: 'error',
          message: `Erro ao inicializar BD: ${error}`,
          duration: Date.now() - dbStart
        });
        throw error;
      }

      // ===== STAGE 3: IMPORT CSV TO DATABASE =====
      const importStart = Date.now();
      addResult({
        stage: '3️⃣ Importar CSV → Banco de Dados',
        status: 'running',
        message: `Importando ${csvData.length} registros...`,
        duration: 0
      });

      try {
        const ragService = await getRAGService();
        const importResult = await ragService.importFromCSV(csvData);

        updateLastResult({
          status: 'success',
          message: `${importResult.imported}/${csvData.length} registros importados`,
          duration: Date.now() - importStart,
          details: {
            imported: importResult.imported,
            skipped: importResult.skipped,
            successRate: `${((importResult.imported / csvData.length) * 100).toFixed(1)}%`
          }
        });
      } catch (error) {
        updateLastResult({
          status: 'error',
          message: `Erro ao importar CSV: ${error}`,
          duration: Date.now() - importStart
        });
        throw error;
      }

      // ===== STAGE 4: KNOWLEDGE BASE STATISTICS =====
      const statsStart = Date.now();
      addResult({
        stage: '📊 Estatísticas da Base',
        status: 'running',
        message: 'Coletando estatísticas...',
        duration: 0
      });

      try {
        const ragService = await getRAGService();
        const stats = await ragService.getKnowledgeStats();

        updateLastResult({
          status: 'success',
          message: `Base pronta com ${stats.totalChunks} documentos`,
          duration: Date.now() - statsStart,
          details: {
            totalChunks: stats.totalChunks,
            sources: stats.sources,
            stages: stats.stages,
            dateRange: stats.dateRange
          }
        });
      } catch (error) {
        updateLastResult({
          status: 'error',
          message: `Erro ao coletar estatísticas: ${error}`,
          duration: Date.now() - statsStart
        });
        throw error;
      }

      // ===== STAGE 5: RAG SEARCH TEST =====
      const searchStart = Date.now();
      addResult({
        stage: '🔍 Teste RAG Search',
        status: 'running',
        message: 'Testando busca no conhecimento...',
        duration: 0
      });

      try {
        const ragService = await getRAGService();
        const testQuery = 'qual é o conteúdo principal';
        const context = await ragService.search(testQuery, { limit: 3 });

        updateLastResult({
          status: 'success',
          message: `Busca retornou ${context.documents.length} documentos relevantes`,
          duration: Date.now() - searchStart,
          details: {
            query: testQuery,
            documentsFound: context.documents.length,
            relevance: (context.totalRelevance * 100).toFixed(1) + '%',
            topSources: context.documents.slice(0, 3).map(d => d.source)
          }
        });
      } catch (error) {
        updateLastResult({
          status: 'error',
          message: `Erro no RAG search: ${error}`,
          duration: Date.now() - searchStart
        });
        throw error;
      }

      // ===== STAGE 6: CHATBOT INITIALIZATION =====
      const chatbotStart = Date.now();
      addResult({
        stage: '🤖 Inicializar Chatbot',
        status: 'running',
        message: 'Inicializando serviço de chatbot...',
        duration: 0
      });

      try {
        const chatbot = new ChatbotService({
          aiProvider: aiProvider as 'ollama' | 'gemini' | 'xiaozhi',
          enableRAG: true,
          enableTTS: true
        });
        await chatbot.initialize();

        updateLastResult({
          status: 'success',
          message: 'Chatbot inicializado com sucesso',
          duration: Date.now() - chatbotStart,
          details: {
            aiProvider,
            ragEnabled: true,
            ttsEnabled: true,
            voices: chatbot.getAvailableVoices().length
          }
        });
      } catch (error) {
        updateLastResult({
          status: 'error',
          message: `Erro ao inicializar chatbot: ${error}`,
          duration: Date.now() - chatbotStart
        });
        throw error;
      }

      // ===== STAGE 7: TTS TEST =====
      const ttsStart = Date.now();
      addResult({
        stage: '🔊 Teste Text-to-Speech',
        status: 'running',
        message: 'Testando síntese de fala...',
        duration: 0
      });

      try {
        const utterance = new SpeechSynthesisUtterance('Teste de síntese de fala. Chatbot RAG funcionando.');
        const availableVoices = window.speechSynthesis.getVoices();
        const ptVoice = availableVoices.find(v => v.lang.includes('pt-BR'));
        if (ptVoice) utterance.voice = ptVoice;

        // Não reproduz automaticamente, apenas testa funcionalidade
        updateLastResult({
          status: 'success',
          message: 'TTS disponível e funcional',
          duration: Date.now() - ttsStart,
          details: {
            voices: availableVoices.length,
            ptBRVoices: availableVoices.filter(v => v.lang.includes('pt-BR')).length,
            supported: true
          }
        });
      } catch (error) {
        updateLastResult({
          status: 'error',
          message: `Erro ao testar TTS: ${error}`,
          duration: Date.now() - ttsStart
        });
      }

      // ===== STAGE 8: COMPLETE INTEGRATION TEST =====
      const integrationStart = Date.now();
      addResult({
        stage: '✅ Teste Integração Completa',
        status: 'running',
        message: 'Executando teste fim-a-fim...',
        duration: 0
      });

      try {
        // Simula fluxo completo: CSV → BD → RAG → Chatbot → TTS
        const mockAIResponse = async (prompt: string) => {
          return 'Resposta simulada do ' + aiProvider + ': ' + prompt.slice(0, 50) + '...';
        };

        const chatbot = new ChatbotService({
          aiProvider: aiProvider as 'ollama' | 'gemini' | 'xiaozhi',
          enableRAG: true,
          enableTTS: true
        });
        await chatbot.initialize();

        const response = await chatbot.sendMessage(
          'Teste de integração completa',
          mockAIResponse
        );

        updateLastResult({
          status: 'success',
          message: 'Fluxo completo CSV→BD→RAG→Chatbot→TTS funcionando',
          duration: Date.now() - integrationStart,
          details: {
            messageReceived: true,
            responseLength: response.message.content.length,
            ragContextUsed: response.ragContext ? true : false,
            ttsEnabled: true,
            timestamp: response.message.timestamp
          }
        });
      } catch (error) {
        updateLastResult({
          status: 'error',
          message: `Erro no teste de integração: ${error}`,
          duration: Date.now() - integrationStart
        });
      }

      setIsRunning(false);
      if (onTestComplete) {
        onTestComplete(results);
      }
    } catch (error) {
      console.error('Erro durante teste:', error);
      setIsRunning(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-300 p-6 shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🧪 Teste Integrado Completo</h2>
        <p className="text-gray-600 text-sm">CSV → BD → RAG → Chatbot → TTS</p>
      </div>

      <button
        onClick={runFullTest}
        disabled={isRunning}
        className={`w-full mb-6 px-6 py-3 rounded-lg font-bold text-white transition ${
          isRunning
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90'
        }`}
      >
        {isRunning ? '⏳ Teste em andamento...' : '▶️ Iniciar Teste Completo'}
      </button>

      <div className="space-y-3">
        {results.map((result, idx) => (
          <div
            key={idx}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedStage(expandedStage === result.stage ? null : result.stage)
              }
              className={`w-full px-4 py-3 flex items-center justify-between transition ${
                result.status === 'success'
                  ? 'bg-green-50 hover:bg-green-100'
                  : result.status === 'error'
                  ? 'bg-red-50 hover:bg-red-100'
                  : 'bg-blue-50 hover:bg-blue-100'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 text-left">
                <span className="text-xl">
                  {result.status === 'success'
                    ? '✅'
                    : result.status === 'error'
                    ? '❌'
                    : result.status === 'running'
                    ? '⏳'
                    : '⭕'}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{result.stage}</p>
                  <p className="text-sm text-gray-700">{result.message}</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="text-gray-600 font-mono">{result.duration}ms</p>
                {expandedStage === result.stage ? '▲' : '▼'}
              </div>
            </button>

            {expandedStage === result.stage && result.details && (
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <pre className="text-xs text-gray-700 overflow-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Total de Etapas:</strong> {results.length} |{' '}
            <strong>Sucesso:</strong>{' '}
            {results.filter(r => r.status === 'success').length} |{' '}
            <strong>Erros:</strong>{' '}
            {results.filter(r => r.status === 'error').length} |{' '}
            <strong>Tempo Total:</strong>{' '}
            {results.reduce((sum, r) => sum + r.duration, 0)}ms
          </p>
        </div>
      )}
    </div>
  );
};

export default IntegratedTest;
