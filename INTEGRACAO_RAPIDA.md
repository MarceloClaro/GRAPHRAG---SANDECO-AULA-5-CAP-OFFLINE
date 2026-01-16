/**
 * GUIA DE INTEGRAÇÃO RÁPIDA - RAG + CHATBOT + TTS em App.tsx
 * 
 * Copie e adapte o código abaixo para integrar o sistema completo
 */

// ============================================================================
// 1. IMPORTS - Adicione no topo do App.tsx
// ============================================================================

import ChatbotPanel from './components/ChatbotPanel';
import IntegratedTest from './components/IntegratedTest';
import { getRAGService } from './services/ragService';

// ============================================================================
// 2. STATE - Adicione no useState do componente App
// ============================================================================

// Chatbot states
const [chatbotVisible, setChatbotVisible] = useState(false);
const [showIntegrationTest, setShowIntegrationTest] = useState(false);
const [lastExportedCSV, setLastExportedCSV] = useState<any[]>([]);

// ============================================================================
// 3. FUNÇÃO - Importar CSV para RAG (no seu handler de export)
// ============================================================================

const importCSVToRAG = async (csvData: any[]) => {
  try {
    console.log('📊 Iniciando importação para RAG...');
    
    const rag = await getRAGService();
    const result = await rag.importFromCSV(csvData);
    
    console.log(`✅ Importado: ${result.imported}/${csvData.length} documentos`);
    
    // Armazena para teste
    setLastExportedCSV(csvData);
    
    // Mostra toast de sucesso
    alert(`✅ ${result.imported} documentos carregados na base de conhecimento!`);
    
  } catch (error) {
    console.error('❌ Erro ao importar para RAG:', error);
    alert(`❌ Erro ao importar para RAG: ${error}`);
  }
};

// ============================================================================
// 4. FUNÇÃO - Atualizar função de export existente
// ============================================================================

// ENCONTRE SUA FUNÇÃO downloadCSV E ADICIONE ISTO:
const handleExportAndImportRAG = async () => {
  try {
    // Gera CSV normalmente
    const unifiedRows = buildUnifiedRows();
    
    // Download normal
    downloadCSV(unifiedRows, `pipeline_unificado_${new Date().toISOString().split('T')[0]}.csv`);
    
    // NOVO: Importa para RAG
    await importCSVToRAG(unifiedRows);
    
  } catch (error) {
    console.error('Erro no export:', error);
  }
};

// ============================================================================
// 5. BOTÃO - Adicione no seu UI (próximo aos botões de export)
// ============================================================================

{/* NOVO: Botões para Chatbot e Teste */}
<div className="flex gap-2 mt-4">
  <button
    onClick={() => setShowIntegrationTest(true)}
    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition flex items-center gap-2"
  >
    🧪 Teste Integração
  </button>
  
  <button
    onClick={() => setChatbotVisible(!chatbotVisible)}
    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center gap-2"
  >
    🤖 Chatbot RAG
  </button>
</div>

// ============================================================================
// 6. COMPONENTES - Adicione ao final do render (antes do fechamento)
// ============================================================================

{/* Chatbot Panel - Flutuante no canto inferior direito */}
{chatbotVisible && (
  <ChatbotPanel
    aiProvider={appSettings.aiProvider as 'ollama' | 'gemini' | 'xiaozhi'}
    ollamaEndpoint={appSettings.ollamaEndpoint}
    ollamaModel={appSettings.ollamaModel}
    geminiApiKey={appSettings.geminiApiKey}
    xiaozhiUrl={appSettings.xiaozhiWebsocketUrl}
    xiaozhiToken={appSettings.xiaozhiToken}
    isOpen={chatbotVisible}
    onClose={() => setChatbotVisible(false)}
  />
)}

{/* Teste Integrado - Modal ou sidebar */}
{showIntegrationTest && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-40 p-4 overflow-auto">
    <div className="bg-white rounded-lg max-w-2xl mx-auto mt-20 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">🧪 Teste Integrado</h2>
        <button
          onClick={() => setShowIntegrationTest(false)}
          className="text-2xl font-bold text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <IntegratedTest
        csvData={lastExportedCSV}
        aiProvider={appSettings.aiProvider}
        onTestComplete={(results) => {
          console.log('✅ Teste completo:', results);
        }}
      />
    </div>
  </div>
)}

// ============================================================================
// 7. WORKFLOW COMPLETO - Exemplo de uso
// ============================================================================

/*
FLUXO PARA USUÁRIO FINAL:

1. EXECUTAR PIPELINE COMPLETO
   └─ Upload PDF → ... → Clustering → Graph

2. EXPORTAR CSV
   └─ Clicar "📊 Exportar CSV + Importar RAG"
   └─ CSV baixado
   └─ Dados importados para IndexedDB

3. TESTAR INTEGRAÇÃO (Opcional)
   └─ Clicar "🧪 Teste Integração"
   └─ Validar 8 etapas
   └─ Verificar performance

4. CONVERSAR COM CHATBOT
   └─ Clicar "🤖 Chatbot RAG"
   └─ Digitar pergunta: "Como denunciar corrupção?"
   └─ Aguardar resposta com contexto
   └─ Clicar "🔊 Ouvir" para fala

5. EXEMPLOS DE PERGUNTAS:
   ├─ "Quais são as etapas do processo?"
   ├─ "Como acessar a base de conhecimento?"
   ├─ "Quais documentos tratam de compliance?"
   ├─ "Qual é o procedimento correto?"
   └─ "Onde encontro informações sobre [tema]?"

6. EXPORTAR CONVERSA
   └─ ChatbotPanel oferece export JSON/TXT
   └─ Compartilhar com time
*/

// ============================================================================
// 8. CONFIGURAÇÃO XIAOZHI - settings.tsx
// ============================================================================

/*
Adicione ao seu SettingsPanel:

<div className="mb-4">
  <label className="block text-sm font-bold mb-2">
    🤖 Xiaozhi WebSocket URL
  </label>
  <input
    type="text"
    value={xiaozhiWebsocketUrl}
    onChange={(e) => setXiaozhiWebsocketUrl(e.target.value)}
    placeholder="wss://api.tenclass.net/xiaozhi/v1/"
    className="w-full px-3 py-2 border rounded"
  />
</div>

<div className="mb-4">
  <label className="block text-sm font-bold mb-2">
    🔐 Xiaozhi Token
  </label>
  <input
    type="password"
    value={xiaozhiToken}
    onChange={(e) => setXiaozhiToken(e.target.value)}
    placeholder="seu-token-aqui"
    className="w-full px-3 py-2 border rounded"
  />
</div>
*/

// ============================================================================
// 9. TIPOS - Adicione ao types.ts se necessário
// ============================================================================

/*
export interface RAGSettings {
  enabled: boolean;
  method: 'keywords' | 'fulltext' | 'combined';
  resultLimit: number;
  confidenceThreshold: number;
}

export interface ChatbotSettings {
  enableTTS: boolean;
  enableRAG: boolean;
  aiProvider: 'ollama' | 'gemini' | 'xiaozhi';
}
*/

// ============================================================================
// 10. EXEMPLO COMPLETO - Seu handler de export
// ============================================================================

/*
const handleExportCSV = async () => {
  try {
    setIsProcessing(true);
    setProcessingStatus('Gerando CSV acumulativo...');

    // Seu código existente
    const unifiedRows = buildUnifiedRows();
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Download do CSV
    downloadCSV(unifiedRows, `pipeline_${timestamp}.csv`);
    
    // NOVO: Importa para BD do RAG
    setProcessingStatus('Importando para base de conhecimento...');
    await importCSVToRAG(unifiedRows);
    
    // NOVO: Mostra opção de testar
    setProcessingStatus('Pronto! Clique em "Teste Integração" ou "Chatbot RAG"');
    
    // Opcional: Abrir chatbot automaticamente
    setTimeout(() => {
      setChatbotVisible(true);
    }, 1000);
    
  } catch (error) {
    console.error('Erro:', error);
    setUploadError(`Erro ao exportar: ${error}`);
  } finally {
    setIsProcessing(false);
  }
};
*/

// ============================================================================
// 11. MELHORIAS FUTURAS
// ============================================================================

/*
✅ IMPLEMENTADO:
  - Database com IndexedDB
  - RAG com 3 métodos de busca
  - Chatbot com histórico
  - TTS em português
  - Teste integrado completo

⏳ PRÓXIMAS:
  1. Persistência de conversa em BD
  2. Analytics de perguntas/respostas
  3. Fine-tuning de prompts
  4. Suporte a múltiplos idiomas
  5. API REST para integração
  6. Dashboard de estatísticas
  7. Otimização com stemming/lemmatization
  8. Cache de respostas
  9. Feedback de usuário
  10. A/B testing de provedores
*/

// ============================================================================
// 12. TROUBLESHOOTING
// ============================================================================

/*
PROBLEMA: "Database not initialized"
SOLUÇÃO: Certifique-se que importFromCSV foi chamado antes de enviar mensagem

PROBLEMA: "TTS não funciona"
SOLUÇÃO: Verifique se há vozes pt-BR disponíveis no navegador

PROBLEMA: "Xiaozhi não responde"
SOLUÇÃO: Valide token e URL no Settings

PROBLEMA: "Busca RAG não encontra documentos"
SOLUÇÃO: Verifique se CSV foi importado (veja console logs)

PROBLEMA: "Performance lenta"
SOLUÇÃO: Limite resultados da busca a 5-10 docs
*/

export default App;
