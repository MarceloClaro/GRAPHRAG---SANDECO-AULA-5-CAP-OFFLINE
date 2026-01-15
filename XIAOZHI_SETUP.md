# 🌐 Integração Xiaozhi no GraphRAG Pipeline

## ✅ O que foi feito

### 1. **Novo Serviço: xiaozhiService.ts** (`services/xiaozhiService.ts`)
- Conecta via **WebSocket** ao `wss://api.tenclass.net/xiaozhi/v1/`
- Implementa autenticação com token
- Fornece 2 funções principais:
  - `enhanceChunksWithXiaozhi()` - Enriquecimento de chunks com IA
  - `generateEmbeddingsWithXiaozhi()` - Geração de embeddings

### 2. **Configuração de Ambiente**
Adicionadas 3 novas variáveis em `.env.local` e `.env.example`:

```dotenv
# ============================================
# XIAOZHI (Opcional - IA na Nuvem via WebSocket)
# ============================================
VITE_XIAOZHI_WEBSOCKET_URL=wss://api.tenclass.net/xiaozhi/v1/
VITE_XIAOZHI_TOKEN=test-token
VITE_XIAOZHI_ENDPOINT=https://api.tenclass.net/xiaozhi/
```

### 3. **Tipos TypeScript** (`vite-env.d.ts`)
Adicionadas 3 novas variáveis de ambiente:
```typescript
readonly VITE_XIAOZHI_WEBSOCKET_URL?: string;
readonly VITE_XIAOZHI_TOKEN?: string;
readonly VITE_XIAOZHI_ENDPOINT?: string;
```

### 4. **Interface SettingsPanel** (Componente)
- Tipo `AIProvider` agora suporta: `'gemini' | 'ollama' | 'xiaozhi'`
- Novo botão visual: `☁️ Xiaozhi (Cloud)`
- Painel de configuração com campos:
  - WebSocket URL
  - Token de Autenticação
  - Informações do serviço (URL, MQTT, Versão)

### 5. **Integração App.tsx**
- Import do `xiaozhiService`
- Suporte para provider `'xiaozhi'` nas 2 etapas:
  1. **Enriquecimento** (Limpar & Classificar)
  2. **Embeddings** (Gerar Embeddings)
- Lógica de pipeline: `ollama` → `xiaozhi` → `gemini`

---

## 🚀 Como Usar Xiaozhi

### Opção 1: Interface Web (Recomendada)
1. Abra http://localhost:3000
2. Clique em **⚙️ Configurações**
3. Clique no botão **☁️ Xiaozhi (Cloud)**
4. As credenciais aparecem pré-preenchidas:
   - URL: `wss://api.tenclass.net/xiaozhi/v1/`
   - Token: `test-token`
5. Clique **Salvar**
6. Faça upload de PDF e processe normalmente

### Opção 2: Arquivo .env.local
Se quiser trocar para Xiaozhi como padrão, edite `.env.local`:
```dotenv
VITE_XIAOZHI_WEBSOCKET_URL=wss://api.tenclass.net/xiaozhi/v1/
VITE_XIAOZHI_TOKEN=test-token
VITE_XIAOZHI_ENDPOINT=https://api.tenclass.net/xiaozhi/
```

---

## 📋 Credenciais Fornecidas

| Campo | Valor |
|-------|-------|
| **WebSocket URL** | `wss://api.tenclass.net/xiaozhi/v1/` |
| **Token** | `test-token` |
| **REST Endpoint** | `https://api.tenclass.net/xiaozhi/` |
| **MQTT Server** | `mqtt.xiaozhi.me` |
| **MQTT Client ID** | `GID_test@@@d0_8e_79_df_74_77@@@b0391636-ca55-420f-b826-e1e38e19e56e` |
| **MQTT Username** | `eyJpcCI6IjE3Ny4zNy4xODcuMTU1In0=` |
| **MQTT Password** | `d90JH4J3vLEOdXEIYbuD9BqV50yVqUk1BHcuIUeAsTE=` |
| **Versão API** | V2 |

---

## 🔧 Arquitetura

### Provider Selection Flow
```
[Upload PDF]
    ↓
[Settings Panel] → Provider Selection
    ↓
   Ollama (Local, Gratuito)
   ↓  
   Xiaozhi (Cloud, WebSocket)
   ↓
   Gemini (Online, API Key)
```

### Xiaozhi WebSocket Pipeline
```
1. Conectar → wsocket.OPEN
2. Autenticar → send {type: 'auth', token: 'test-token'}
3. Enviar Dados → send {type: 'process', data: chunks}
4. Processar → Xiaozhi retorna embeddings/enrichment
5. Desconectar → webSocket.close()
```

---

## ✨ Recursos

- ✅ **WebSocket Permanente**: Conexão mantida durante a sessão
- ✅ **Fila de Mensagens**: Mensagens enfileiradas até conexão estar pronta
- ✅ **Timeout Automático**: 10s para conexão, 30s para resposta
- ✅ **Erro Handling**: Fallback gracioso se Xiaozhi não responder
- ✅ **Status Connection**: Função `getXiaozhiStatus()` para debug
- ✅ **UI Integrada**: Seamless provider switching via configurações

---

## 📝 Próximas Integrações (Opcional)

Se você quiser expandir ainda mais:

### 1. MQTT Support
```typescript
// Para usar MQTT ao invés de WebSocket
import mqtt from 'mqtt';
const client = mqtt.connect('mqtt://mqtt.xiaozhi.me');
```

### 2. REST API
```typescript
// Alternativa via HTTP/REST
const response = await fetch('https://api.tenclass.net/xiaozhi/v1/embed', {
  method: 'POST',
  body: JSON.stringify(chunks)
});
```

### 3. Load Balancing
Distribuir requisições entre múltiplos providers baseado em:
- Latência
- Taxa de erro
- Disponibilidade

---

## 🐛 Troubleshooting

### Xiaozhi não conecta
```bash
# Verificar se WebSocket está rodando
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  wss://api.tenclass.net/xiaozhi/v1/
```

### Token inválido
- Validar que `VITE_XIAOZHI_TOKEN` está correto
- Ver logs do console (F12)

### Embeddings vazios
- Verificar se chunks têm conteúdo
- Validar dimensão do embedding (default: 384)

---

## 📦 Dependências

Nenhuma dependência externa foi adicionada!
- Usa API nativa do navegador: `WebSocket`
- Compatível com: Chrome, Firefox, Safari, Edge

---

## ✅ Status de Integração

- [x] Serviço Xiaozhi criado
- [x] Variáveis de ambiente configuradas
- [x] Tipos TypeScript atualizados
- [x] UI Settings Panel integrada
- [x] Pipeline App.tsx integrado
- [x] Documentação concluída
- [ ] Testes E2E (opcional)
- [ ] MQTT suporte (opcional)

---

**Data**: 15 de janeiro de 2026
**Versão**: 1.0.0
