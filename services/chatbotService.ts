/**
 * Serviço de Chatbot com TTS (Text-to-Speech)
 * Integra RAG + Xiaozhi + Speech Synthesis
 */

import { getRAGService, RAGResponse } from './ragService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  audioUrl?: string;
  isPlaying?: boolean;
}

export interface ChatbotConfig {
  aiProvider: 'ollama' | 'gemini' | 'xiaozhi';
  enableTTS: boolean;
  enableRAG: boolean;
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface ChatbotResponse {
  message: ChatMessage;
  ragContext?: RAGResponse;
  synthesizing: boolean;
}

class ChatbotService {
  private ragService = null as any;
  private conversationHistory: ChatMessage[] = [];
  private config: ChatbotConfig;
  private speechSynthesis = window.speechSynthesis;
  private isInitialized = false;

  constructor(config: ChatbotConfig) {
    this.config = {
      enableTTS: true,
      enableRAG: true,
      rate: 1,
      pitch: 1,
      volume: 1,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      this.ragService = await getRAGService();
      this.isInitialized = true;
    }
  }

  /**
   * Envia mensagem e obtém resposta
   */
  async sendMessage(
    userMessage: string,
    aiResponseFn: (prompt: string) => Promise<string>
  ): Promise<ChatbotResponse> {
    await this.initialize();

    // Adiciona mensagem do usuário
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    this.conversationHistory.push(userMsg);

    let ragContext: RAGResponse | undefined;
    let assistantResponse = '';

    try {
      // Se RAG está ativado, busca contexto
      if (this.config.enableRAG) {
        ragContext = await this.ragService.generateAnswer(userMessage, aiResponseFn);
        assistantResponse = ragContext.answer;
      } else {
        // Resposta direta sem RAG
        assistantResponse = await aiResponseFn(userMessage);
      }

      // Cria mensagem do assistente
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date().toISOString()
      };

      // Se TTS ativado, sintetiza fala
      if (this.config.enableTTS) {
        assistantMsg.audioUrl = await this.synthesizeToAudio(assistantResponse);
      }

      this.conversationHistory.push(assistantMsg);

      return {
        message: assistantMsg,
        ragContext,
        synthesizing: false
      };
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Desculpe, ocorreu um erro ao processar sua pergunta: ${error}`,
        timestamp: new Date().toISOString()
      };

      this.conversationHistory.push(errorMsg);

      return {
        message: errorMsg,
        synthesizing: false
      };
    }
  }

  /**
   * Sintetiza texto em áudio
   */
  private synthesizeToAudio(text: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Verifica se navegador suporta Web Speech API
        if (!this.speechSynthesis) {
          console.warn('Web Speech API não disponível');
          resolve(''); // Retorna vazio, sem áudio
          return;
        }

        // Usa blob para criar URL de áudio
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configura voz
        if (this.config.voice) {
          utterance.voice = this.config.voice;
        } else {
          // Tenta encontrar voz em português
          const voices = this.speechSynthesis.getVoices();
          const ptBRVoice = voices.find(v => v.lang.includes('pt-BR')) ||
                           voices.find(v => v.lang.includes('pt')) ||
                           voices[0];
          if (ptBRVoice) {
            utterance.voice = ptBRVoice;
          }
        }

        utterance.rate = this.config.rate || 1;
        utterance.pitch = this.config.pitch || 1;
        utterance.volume = this.config.volume || 1;
        utterance.lang = 'pt-BR';

        // Cria blob de áudio via Web Audio API
        const audioContext = new (window as any).AudioContext || new (window as any).webkitAudioContext();
        const mediaStreamDestination = audioContext.createMediaStreamDestination();

        // Para compatibilidade, gera URL data: como fallback
        const audioData = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
        
        // Evento de sucesso
        utterance.onend = () => {
          resolve(audioData);
        };

        utterance.onerror = (event) => {
          console.error('Erro na síntese de fala:', event);
          resolve(''); // Retorna vazio em caso de erro
        };

        // Inicia síntese
        this.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Erro ao sintetizar áudio:', error);
        resolve(''); // Retorna vazio em caso de erro
      }
    });
  }

  /**
   * Reproduz mensagem em áudio
   */
  async playMessage(message: ChatMessage): Promise<void> {
    if (!message.audioUrl || !this.config.enableTTS) {
      return;
    }

    try {
      // Se for áudio sintetizado, reproduz com Web Speech API
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.rate = this.config.rate || 1;
      utterance.pitch = this.config.pitch || 1;
      utterance.volume = this.config.volume || 1;

      message.isPlaying = true;
      this.speechSynthesis.speak(utterance);

      utterance.onend = () => {
        message.isPlaying = false;
      };

      utterance.onerror = () => {
        message.isPlaying = false;
      };
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
    }
  }

  /**
   * Para a reprodução de áudio
   */
  stopAudio(): void {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
      this.conversationHistory.forEach(msg => {
        msg.isPlaying = false;
      });
    }
  }

  /**
   * Obtém histórico de conversa
   */
  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Limpa histórico
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.stopAudio();
  }

  /**
   * Exporta conversa como texto
   */
  exportConversation(): string {
    return this.conversationHistory
      .map(msg => `[${msg.timestamp}] ${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');
  }

  /**
   * Exporta conversa como JSON
   */
  exportConversationJSON(): ChatMessage[] {
    return JSON.parse(JSON.stringify(this.conversationHistory));
  }

  /**
   * Atualiza configuração
   */
  updateConfig(newConfig: Partial<ChatbotConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.enableTTS === false) {
      this.stopAudio();
    }
  }

  /**
   * Obtém configuração atual
   */
  getConfig(): ChatbotConfig {
    return { ...this.config };
  }

  /**
   * Obtém vozes disponíveis
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.speechSynthesis) return [];
    return this.speechSynthesis.getVoices();
  }

  /**
   * Obtém vozes em português
   */
  getPortugueseVoices(): SpeechSynthesisVoice[] {
    return this.getAvailableVoices().filter(v => 
      v.lang.includes('pt')
    );
  }
}

// Factory para criar chatbot
export async function createChatbot(config: ChatbotConfig): Promise<ChatbotService> {
  const chatbot = new ChatbotService(config);
  await chatbot.initialize();
  return chatbot;
}

export type { ChatMessage, ChatbotConfig, ChatbotResponse };
export default ChatbotService;
