# 🦙 OLLAMA - IA Local Gratuita para CPU

## 📌 O Que é Ollama?

**Ollama** é uma plataforma que permite executar **modelos de IA localmente** no seu computador, **sem necessidade de internet ou API keys**. É ideal para:

- ✅ **Uso totalmente gratuito** (sem limites)
- ✅ **Privacidade total** (seus dados não saem do computador)
- ✅ **Funciona em CPUs** (não precisa de GPU potente)
- ✅ **Offline** (sem dependência de internet)
- ✅ **Modelos otimizados** (Llama, Phi, Mistral, Gemma)

---

## 🚀 Instalação do Ollama

### Windows
1. Baixe o instalador: https://ollama.com/download/windows
2. Execute o instalador
3. Ollama será instalado e iniciado automaticamente

### macOS
```bash
brew install ollama
```
Ou baixe em: https://ollama.com/download/mac

### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

---

## 📥 Instalando Modelos Recomendados

Após instalar o Ollama, abra o **terminal/PowerShell** e execute:

### Para Análise de Texto (Enriquecimento)
```bash
# Llama 3.2 3B - Recomendado para CPU (2GB)
ollama pull llama3.2:3b

# OU Phi-3 Mini - Microsoft, excelente para CPU (2.3GB)
ollama pull phi3:mini

# OU Llama 3.2 1B - Ultra leve (1GB)
ollama pull llama3.2:1b
```

### Para Embeddings (Vetorização)
```bash
# Nomic Embed - RECOMENDADO (768 dimensões, 274MB)
ollama pull nomic-embed-text

# OU All-MiniLM - Mais rápido (384 dimensões, 45MB)
ollama pull all-minilm
```

---

## ⚙️ Configurando no GraphRAG Pipeline

### 1. Inicie o Ollama

O Ollama deve estar rodando. Verifique:

**Windows/Linux:**
```bash
ollama serve
```

**macOS:**
Ollama inicia automaticamente. Verifique com:
```bash
ollama list
```

### 2. Configure na Interface

1. Abra o GraphRAG Pipeline: `npm run dev`
2. Clique em **⚙️ Configurações** (canto superior direito)
3. Selecione **🦙 Ollama (Local)**
4. Configure:
   - **Endpoint:** `http://localhost:11434` (padrão)
   - **Modelo de Chat:** Escolha o que você instalou (ex: `llama3.2:3b`)
   - **Modelo de Embeddings:** Escolha o que você instalou (ex: `nomic-embed-text`)
5. Clique em **"Testar Conexão"** para verificar
6. Clique em **"Salvar Configurações"**

---

## 🎯 Modelos Recomendados por Uso

### Para CPUs Comuns (4-8GB RAM)
```bash
ollama pull llama3.2:3b       # Chat (2GB)
ollama pull nomic-embed-text  # Embeddings (274MB)
```
**Uso:** Ideal para laptops e PCs comuns. Bom equilíbrio entre velocidade e qualidade.

### Para CPUs Fracas ou RAM Limitada (<4GB)
```bash
ollama pull llama3.2:1b       # Chat (1GB)
ollama pull all-minilm        # Embeddings (45MB)
```
**Uso:** Ultra leve, roda em quase qualquer máquina. Qualidade um pouco menor.

### Para CPUs Potentes (16GB+ RAM)
```bash
ollama pull mistral:7b        # Chat (4.1GB)
ollama pull mxbai-embed-large # Embeddings (670MB)
```
**Uso:** Melhor qualidade, mas mais lento. Recomendado para processamento de muitos documentos.

---

## 📊 Comparação: Gemini vs Ollama

| Aspecto | Google Gemini | Ollama |
|---------|---------------|--------|
| **Custo** | Gratuito (com limites) | Totalmente gratuito |
| **Internet** | Obrigatória | Não necessária |
| **Privacidade** | Dados enviados à Google | 100% local |
| **Qualidade** | ⭐⭐⭐⭐⭐ Excelente | ⭐⭐⭐⭐ Muito boa |
| **Velocidade** | Rápida (depende da internet) | Média (depende do CPU) |
| **Limites** | 15 req/min, 1.5k req/dia | Sem limites |
| **Setup** | API Key necessária | Instalar software |

---

## 🔧 Comandos Úteis do Ollama

### Listar modelos instalados
```bash
ollama list
```

### Remover um modelo
```bash
ollama rm llama3.2:3b
```

### Testar um modelo no terminal
```bash
ollama run llama3.2:3b
```
Digite uma pergunta e pressione Enter. Digite `/bye` para sair.

### Ver modelos disponíveis
Acesse: https://ollama.com/library

---

## 💡 Dicas de Uso

### Para Melhor Desempenho:
1. ✅ Use modelos de 1-3B de parâmetros em CPUs comuns
2. ✅ Feche outros programas pesados enquanto processa
3. ✅ Processe documentos em batches menores
4. ✅ Use `nomic-embed-text` para embeddings (melhor custo-benefício)

### Para Máxima Qualidade:
1. ✅ Use `phi3:mini` ou `llama3.2:3b` para análise
2. ✅ Configure mais epochs no treinamento CNN
3. ✅ Use `mxbai-embed-large` para embeddings (se tiver RAM)

### Para Máxima Velocidade:
1. ✅ Use `llama3.2:1b` (modelo mais leve)
2. ✅ Use `all-minilm` para embeddings
3. ✅ Reduza o número de chunks processados por vez

---

## 🐛 Resolução de Problemas

### Erro: "Não foi possível conectar ao Ollama"

**Solução:**
```bash
# Inicie o servidor Ollama
ollama serve
```

Ou verifique se está rodando:
```bash
# Windows
Get-Process ollama

# Linux/Mac
ps aux | grep ollama
```

### Erro: "Modelo não encontrado"

**Solução:**
```bash
# Instale o modelo
ollama pull llama3.2:3b
```

### Processamento muito lento

**Soluções:**
1. Use um modelo menor (`llama3.2:1b`)
2. Processe menos documentos por vez
3. Feche outros programas
4. Verifique uso de CPU (deve estar em 100% durante processamento)

### Ollama consome muita RAM

**Soluções:**
1. Use modelos menores
2. Remova modelos não usados: `ollama rm nome_do_modelo`
3. Reinicie o Ollama: 
   ```bash
   # Windows
   Stop-Process -Name ollama
   ollama serve
   ```

---

## 📈 Benchmarks (Tempo Médio)

Processando 100 chunks de documentos em CPU Intel i5:

| Modelo | Tempo (Análise) | Tempo (Embeddings) | RAM Usada |
|--------|----------------|-------------------|-----------|
| llama3.2:1b | ~8 min | - | ~1.5 GB |
| llama3.2:3b | ~12 min | - | ~3 GB |
| phi3:mini | ~10 min | - | ~2.5 GB |
| all-minilm | - | ~2 min | ~200 MB |
| nomic-embed-text | - | ~4 min | ~500 MB |
| mxbai-embed-large | - | ~7 min | ~1 GB |

---

## 🔄 Atualizando Modelos

```bash
# Atualizar um modelo para a versão mais recente
ollama pull llama3.2:3b

# Atualizar todos os modelos
ollama list | awk '{print $1}' | tail -n +2 | xargs -I {} ollama pull {}
```

---

## 🌐 Links Úteis

- **Site Oficial:** https://ollama.com/
- **Modelos Disponíveis:** https://ollama.com/library
- **Documentação:** https://github.com/ollama/ollama/blob/main/docs/api.md
- **Discord Comunidade:** https://discord.gg/ollama

---

## ✅ Checklist de Setup

- [ ] Ollama instalado
- [ ] Servidor Ollama rodando (`ollama serve`)
- [ ] Modelo de chat instalado (ex: `llama3.2:3b`)
- [ ] Modelo de embeddings instalado (ex: `nomic-embed-text`)
- [ ] Configurado no GraphRAG Pipeline
- [ ] Conexão testada com sucesso
- [ ] Primeiro documento processado

---

## 🎉 Vantagens do Ollama no GraphRAG

1. **✅ Privacidade Total:** Seus documentos não saem do computador
2. **✅ Sem Custos:** Use quanto quiser, sem limites
3. **✅ Offline:** Funciona sem internet
4. **✅ CPU-Friendly:** Modelos otimizados para CPUs comuns
5. **✅ Open Source:** Modelos de código aberto (Llama, Phi, etc)

---

**🦙 Aproveite IA local, gratuita e privada com Ollama! 🚀**
