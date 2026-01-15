import React, { useState, useEffect } from 'react';

export type AIProvider = 'gemini' | 'ollama' | 'xiaozhi';

export interface AppSettings {
  aiProvider: AIProvider;
  geminiApiKey: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  ollamaEmbeddingModel: string;
  xiaozhiWebsocketUrl: string;
  xiaozhiToken: string;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  currentSettings: AppSettings;
}

const POPULAR_OLLAMA_MODELS = [
  { id: 'llama3.2:3b', name: 'Llama 3.2 3B (Rápido, CPU)', size: '2GB' },
  { id: 'llama3.2:1b', name: 'Llama 3.2 1B (Ultra Leve)', size: '1GB' },
  { id: 'phi3:mini', name: 'Phi-3 Mini (Microsoft, CPU)', size: '2.3GB' },
  { id: 'mistral:7b', name: 'Mistral 7B (Balanceado)', size: '4.1GB' },
  { id: 'gemma2:2b', name: 'Gemma 2 2B (Google, Leve)', size: '1.6GB' },
  { id: 'qwen2.5:3b', name: 'Qwen 2.5 3B (Alibaba, CPU)', size: '2GB' },
];

const OLLAMA_EMBEDDING_MODELS = [
  { id: 'nomic-embed-text', name: 'Nomic Embed (768d, Recomendado)', size: '274MB' },
  { id: 'mxbai-embed-large', name: 'MxBai Large (1024d)', size: '670MB' },
  { id: 'all-minilm', name: 'All-MiniLM (384d, Rápido)', size: '45MB' },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, onSave, currentSettings }) => {
  const [settings, setSettings] = useState<AppSettings>(currentSettings);
  const [testStatus, setTestStatus] = useState<string>('');

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  const handleSave = () => {
    // Salvar no localStorage
    localStorage.setItem('appSettings', JSON.stringify(settings));
    onSave(settings);
    onClose();
  };

  const testOllamaConnection = async () => {
    setTestStatus('Testando conexão...');
    try {
      const response = await fetch(`${settings.ollamaEndpoint}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        setTestStatus(`✅ Conectado! ${data.models?.length || 0} modelos disponíveis`);
      } else {
        setTestStatus('❌ Erro: Ollama não está respondendo');
      }
    } catch (error) {
      setTestStatus('❌ Erro: Verifique se o Ollama está rodando (ollama serve)');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '700px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '24px' }}>⚙️ Configurações</h2>

        {/* Seleção de Provedor */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Provedor de IA
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setSettings({ ...settings, aiProvider: 'gemini' })}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: settings.aiProvider === 'gemini' ? '#4285f4' : '#2d2d2d',
                color: 'white',
                border: settings.aiProvider === 'gemini' ? '2px solid #5a9aff' : '2px solid #444',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: settings.aiProvider === 'gemini' ? 'bold' : 'normal'
              }}
            >
              🌐 Google Gemini<br />
              <small style={{ opacity: 0.7 }}>Online, Alta qualidade</small>
            </button>
            <button
              onClick={() => setSettings({ ...settings, aiProvider: 'ollama' })}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: settings.aiProvider === 'ollama' ? '#22c55e' : '#2d2d2d',
                color: 'white',
                border: settings.aiProvider === 'ollama' ? '2px solid #4ade80' : '2px solid #444',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: settings.aiProvider === 'ollama' ? 'bold' : 'normal'
              }}
            >
              🦙 Ollama (Local)<br />
              <small style={{ opacity: 0.7 }}>Offline, Grátis, CPU</small>
            </button>
            <button
              onClick={() => setSettings({ ...settings, aiProvider: 'xiaozhi' })}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: settings.aiProvider === 'xiaozhi' ? '#f59e0b' : '#2d2d2d',
                color: 'white',
                border: settings.aiProvider === 'xiaozhi' ? '2px solid #fbbf24' : '2px solid #444',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: settings.aiProvider === 'xiaozhi' ? 'bold' : 'normal'
              }}
            >
              ☁️ Xiaozhi (Cloud)<br />
              <small style={{ opacity: 0.7 }}>Online, WebSocket</small>
            </button>
          </div>
        </div>

        {/* Configurações Gemini */}
        {settings.aiProvider === 'gemini' && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#2d2d2d', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>🌐 Configuração do Google Gemini</h3>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              API Key do Gemini
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ marginLeft: '8px', color: '#4285f4', fontSize: '12px' }}
              >
                (Obter chave)
              </a>
            </label>
            <input
              type="password"
              value={settings.geminiApiKey}
              onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
              placeholder="Cole sua API Key aqui (AIzaSy...)"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1e1e1e',
                color: 'white',
                border: '1px solid #444',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace'
              }}
            />
            {settings.geminiApiKey && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#4ade80' }}>
                ✅ API Key configurada ({settings.geminiApiKey.substring(0, 10)}...)
              </div>
            )}
          </div>
        )}

        {/* Configurações Ollama */}
        {settings.aiProvider === 'ollama' && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#2d2d2d', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>🦙 Configuração do Ollama</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Endpoint do Ollama
              </label>
              <input
                type="text"
                value={settings.ollamaEndpoint}
                onChange={(e) => setSettings({ ...settings, ollamaEndpoint: e.target.value })}
                placeholder="http://localhost:11434"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1e1e1e',
                  color: 'white',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}
              />
              <button
                onClick={testOllamaConnection}
                style={{
                  marginTop: '8px',
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Testar Conexão
              </button>
              {testStatus && (
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  {testStatus}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Modelo de Chat/Análise (para limpeza e classificação)
              </label>
              <select
                value={settings.ollamaModel}
                onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1e1e1e',
                  color: 'white',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                {POPULAR_OLLAMA_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.size}
                  </option>
                ))}
              </select>
              <small style={{ display: 'block', marginTop: '4px', color: '#888', fontSize: '12px' }}>
                💡 Recomendado para CPU: Llama 3.2 3B ou Phi-3 Mini
              </small>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Modelo de Embeddings (para vetorização)
              </label>
              <select
                value={settings.ollamaEmbeddingModel}
                onChange={(e) => setSettings({ ...settings, ollamaEmbeddingModel: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1e1e1e',
                  color: 'white',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                {OLLAMA_EMBEDDING_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.size}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ 
              padding: '12px', 
              backgroundColor: '#1e3a28', 
              borderRadius: '6px',
              border: '1px solid #22c55e'
            }}>
              <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                <strong>📥 Para instalar modelos:</strong>
              </div>
              <code style={{ 
                display: 'block', 
                padding: '8px', 
                backgroundColor: '#0d0d0d', 
                borderRadius: '4px',
                fontSize: '11px',
                overflowX: 'auto'
              }}>
                ollama pull {settings.ollamaModel}<br />
                ollama pull {settings.ollamaEmbeddingModel}
              </code>
            </div>
          </div>
        )}

        {/* Configurações Xiaozhi */}
        {settings.aiProvider === 'xiaozhi' && (
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#2d2d2d', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>☁️ Configuração do Xiaozhi</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                WebSocket URL
              </label>
              <input
                type="text"
                value={settings.xiaozhiWebsocketUrl}
                onChange={(e) => setSettings({ ...settings, xiaozhiWebsocketUrl: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1e1e1e',
                  color: 'white',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
                placeholder="wss://api.tenclass.net/xiaozhi/v1/"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Token de Autenticação
              </label>
              <input
                type="password"
                value={settings.xiaozhiToken}
                onChange={(e) => setSettings({ ...settings, xiaozhiToken: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1e1e1e',
                  color: 'white',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
                placeholder="test-token"
              />
            </div>

            <div style={{ backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#bbb' }}>
              <strong>ℹ️ Informações:</strong>
              <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
                <li>URL: api.tenclass.net/xiaozhi/</li>
                <li>MQTT: mqtt.xiaozhi.me</li>
                <li>Versão: V2</li>
              </ul>
            </div>
          </div>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: '#444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '12px 24px',
              backgroundColor: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
