/**
 * Componente de Chatbot com RAG e TTS
 * Interface para interagir com base de conhecimento
 */

import React, { useState, useEffect, useRef } from 'react';
import ChatbotService, { ChatMessage, ChatbotConfig } from '../services/chatbotService';
import { getRAGService } from '../services/ragService';

interface ChatbotPanelProps {
  aiProvider: 'ollama' | 'gemini' | 'xiaozhi';
  ollamaEndpoint?: string;
  ollamaModel?: string;
  geminiApiKey?: string;
  xiaozhiUrl?: string;
  xiaozhiToken?: string;
  isOpen: boolean;
  onClose: () => void;
}

const ChatbotPanel: React.FC<ChatbotPanelProps> = ({
  aiProvider,
  ollamaEndpoint = 'http://localhost:11434',
  ollamaModel = 'llama3.2:3b',
  geminiApiKey,
  xiaozhiUrl,
  xiaozhiToken,
  isOpen,
  onClose
}) => {
  const [chatbot, setChatbot] = useState<ChatbotService | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enableRAG, setEnableRAG] = useState(true);
  const [enableTTS, setEnableTTS] = useState(true);
  const [kbStats, setKbStats] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Inicializa chatbot
  useEffect(() => {
    const initChatbot = async () => {
      try {
        const config: ChatbotConfig = {
          aiProvider,
          enableRAG,
          enableTTS
        };

        const service = new ChatbotService(config);
        await service.initialize();
        setChatbot(service);

        // Carrega estatísticas do banco de conhecimento
        const rag = await getRAGService();
        const stats = await rag.getKnowledgeStats();
        setKbStats(stats);
      } catch (error) {
        console.error('Erro ao inicializar chatbot:', error);
      }
    };

    if (isOpen) {
      initChatbot();
    }
  }, [isOpen, aiProvider, enableRAG, enableTTS]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cria função de resposta baseada no provider
  const createAIResponseFn = async (prompt: string) => {
    if (aiProvider === 'ollama') {
      return callOllama(prompt);
    } else if (aiProvider === 'gemini') {
      return callGemini(prompt);
    } else if (aiProvider === 'xiaozhi') {
      return callXiaozhi(prompt);
    }
    return 'Provedor de IA não configurado';
  };

  // Chama Ollama
  const callOllama = async (prompt: string): Promise<string> => {
    try {
      const response = await fetch(`${ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt,
          stream: false
        })
      });

      if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
      
      const data = await response.json();
      return data.response || 'Sem resposta';
    } catch (error) {
      console.error('Erro Ollama:', error);
      return `Erro ao chamar Ollama: ${error}`;
    }
  };

  // Chama Gemini
  const callGemini = async (prompt: string): Promise<string> => {
    try {
      if (!geminiApiKey) throw new Error('Gemini API Key não configurada');

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error(`Gemini error: ${response.statusText}`);
      
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta';
    } catch (error) {
      console.error('Erro Gemini:', error);
      return `Erro ao chamar Gemini: ${error}`;
    }
  };

  // Chama Xiaozhi
  const callXiaozhi = async (prompt: string): Promise<string> => {
    try {
      if (!xiaozhiUrl || !xiaozhiToken) {
        throw new Error('Xiaozhi não configurado');
      }

      const response = await fetch(`${xiaozhiUrl}chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${xiaozhiToken}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 500
        })
      });

      if (!response.ok) throw new Error(`Xiaozhi error: ${response.statusText}`);
      
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Sem resposta';
    } catch (error) {
      console.error('Erro Xiaozhi:', error);
      return `Erro ao chamar Xiaozhi: ${error}`;
    }
  };

  // Envia mensagem
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !chatbot) return;

    try {
      setIsLoading(true);
      const userMessage = inputValue;
      setInputValue('');

      // Adiciona mensagem do usuário
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMsg]);

      // Obtém resposta
      const response = await chatbot.sendMessage(userMessage, createAIResponseFn);
      setMessages(prev => [...prev, response.message]);

      // Auto-reproduz áudio se ativado
      if (enableTTS && response.message.audioUrl) {
        await chatbot.playMessage(response.message);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Trata tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-300 flex flex-col z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">🤖 Chatbot RAG</h3>
          <p className="text-xs opacity-90">Com Base de Conhecimento</p>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition"
        >
          ✕
        </button>
      </div>

      {/* Info Stats */}
      {kbStats && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-xs">
          <span className="text-blue-700">
            📊 Base: {kbStats.totalChunks} docs | 
            {kbStats.sources?.length} fonte(s) | 
            {kbStats.stages?.length} etapa(s)
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">Bem-vindo ao Chatbot RAG!</p>
            <p className="text-xs mt-2">Faça perguntas sobre seus documentos</p>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-center gap-2">
                <input
                  type="checkbox"
                  checked={enableRAG}
                  onChange={(e) => setEnableRAG(e.target.checked)}
                  id="rag-toggle"
                />
                <label htmlFor="rag-toggle">Usar RAG (base de conhecimento)</label>
              </div>
              <div className="flex items-center justify-center gap-2">
                <input
                  type="checkbox"
                  checked={enableTTS}
                  onChange={(e) => setEnableTTS(e.target.checked)}
                  id="tts-toggle"
                />
                <label htmlFor="tts-toggle">Ativar fala (TTS)</label>
              </div>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-gray-300 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="text-sm break-words">{msg.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
                {msg.role === 'assistant' && enableTTS && (
                  <button
                    onClick={() => chatbot && chatbot.playMessage(msg)}
                    className="text-xs mt-1 underline hover:opacity-70"
                  >
                    🔊 Ouvir
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-300 p-4 bg-white rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Faça uma pergunta..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPanel;
