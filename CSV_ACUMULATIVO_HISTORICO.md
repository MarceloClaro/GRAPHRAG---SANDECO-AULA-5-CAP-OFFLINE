# 📊 CSV ACUMULATIVO - Sistema de Histórico Progressivo

## Conceito

O CSV exportado é **acumulativo e progressivo**: conforme o pipeline avança, **novas colunas são adicionadas** mantendo todos os dados anteriores. Não há substituição, apenas **crescimento**.

---

## 📋 Estrutura por Etapa

### 🟢 **ETAPA 1: UPLOAD & ENRIQUECIMENTO IA** (Sempre)

```csv
Chunk_ID | Arquivo | Pagina | Tipo_Entidade_IA | Rotulo_Entidade | Provedor_IA | Timestamp_Upload | ...

chunk_001 | lei.pdf | 1 | LEGAL | Direito | Ollama | 2026-01-15T21:30:00Z
```

**Colunas Base:**
- `Chunk_ID` - ID único do chunk
- `Arquivo` - Nome do arquivo PDF
- `Pagina` - Número da página
- `Tipo_Entidade_IA` - Tipo (ex: LEGAL, CONTRATO)
- `Rotulo_Entidade` - Rótulo específico
- `Provedor_IA` - Qual IA processou (Ollama, Gemini, Xiaozhi)
- `Timestamp_Upload` - Data/hora do upload

---

### 🟡 **ETAPA 2: LIMPEZA & COERÊNCIA** (Adicionadas)

```csv
... | Conteudo_Original | Conteudo_Processado | Tokens_Originais | Tokens_Atuais | Score_Coesao | Score_Coerencia | ...

... | "texto com erros..." | "texto limpo..." | 342 | 298 | 0.87 | 0.92 | ...
```

**Novas Colunas Adicionadas:**
- `Conteudo_Original` - Texto antes da limpeza (primeiras 200 chars)
- `Conteudo_Processado` - Texto após limpeza (primeiras 200 chars)
- `Tokens_Originais` - Contagem de tokens antes
- `Tokens_Atuais` - Contagem de tokens depois
- `Score_Coesao` - Métrica de coesão (0-1)
- `Score_Coerencia` - Métrica de coerência (0-1)

**Total de Colunas até aqui: 14 + 6 = 20**

---

### 🟠 **ETAPA 3: ANÁLISE SEMÂNTICA** (Adicionadas)

```csv
... | Palavras_Chave | Prazo | Conteudo_Preview | ...

... | "responsabilidade; indenização" | "2025-12-31" | "O artigo 14 estabelece..." | ...
```

**Novas Colunas Adicionadas:**
- `Palavras_Chave` - Keywords extraídas (ex: "termo1; termo2; termo3")
- `Prazo` - Data associada
- `Conteudo_Preview` - Preview curto (140 chars)

**Total de Colunas até aqui: 20 + 3 = 23**

---

### 🔵 **ETAPA 4: EMBEDDINGS** (Adicionadas quando processed)

```csv
... | Modelo_Embedding | Dim_Vetor | Vetor_Preview | Timestamp_Embedding | ...

... | "sentence-bert" | "384" | "[0.2314; -0.5671; 0.1234; 0.8901; -0.4567;...]" | "2026-01-15T21:35:00Z" | ...
```

**Novas Colunas Adicionadas:**
- `Modelo_Embedding` - Qual modelo de embedding (ex: sentence-bert, text-embedding-004)
- `Dim_Vetor` - Dimensionalidade (384, 1024, etc)
- `Vetor_Preview` - Amostra dos primeiros 5 valores do vetor
- `Timestamp_Embedding` - Quando foi vetorizado

**Total de Colunas até aqui: 23 + 4 = 27**

---

### 🟣 **ETAPA 5: REFINAMENTO CNN** (Adicionadas se com embeddings)

```csv
... | CNN_Epoch | CNN_Loss | Distancia_Triplet | ...

... | "15" | "0.0234" | "0.1245" | ...
```

**Novas Colunas Adicionadas:**
- `CNN_Epoch` - Qual epoch do treinamento CNN
- `CNN_Loss` - Valor de loss (mais baixo = melhor)
- `Distancia_Triplet` - Distância triplet (0-1, mais baixo = melhor)

**Total de Colunas até aqui: 27 + 3 = 30**

---

### 🟤 **ETAPA 6: CLUSTERING** (Adicionadas quando clusterizado)

```csv
... | Cluster_ID | Cluster_Label | Cluster_Coordenada_X | Cluster_Coordenada_Y | Distancia_Centroide | Score_Silhueta | ...

... | "3" | "Contratos Legais" | "0.234" | "-0.567" | "0.0423" | "0.78" | ...
```

**Novas Colunas Adicionadas:**
- `Cluster_ID` - ID do cluster (0, 1, 2, ...)
- `Cluster_Label` - Rótulo do cluster (se atribuído)
- `Cluster_Coordenada_X` - Posição X no espaço 2D
- `Cluster_Coordenada_Y` - Posição Y no espaço 2D
- `Distancia_Centroide` - Distância até centro do cluster
- `Score_Silhueta` - Métrica de qualidade do cluster (-1 a 1)

**Total de Colunas até aqui: 30 + 6 = 36**

---

### 🌐 **ETAPA 7: GRAFO** (Adicionadas quando grafo construído)

```csv
... | Grafo_NodeID | Grafo_Group | Grafo_Centralidade | Grafo_Betweenness | Grau_Arestas | Palavras_Chave_Grafo | Timestamp_Grafo | ...

... | "node_001" | "3" | "0.4523" | "0.2134" | "8" | "contrato; clausula" | "2026-01-15T21:40:00Z" | ...
```

**Novas Colunas Adicionadas:**
- `Grafo_NodeID` - ID do nó no grafo
- `Grafo_Group` - Grupo/comunidade (ex: 1, 2, 3)
- `Grafo_Centralidade` - Betweenness centrality (0-1)
- `Grafo_Betweenness` - Closeness centrality (0-1)
- `Grau_Arestas` - Quantas conexões tem (degree)
- `Palavras_Chave_Grafo` - Keywords mais relevantes
- `Timestamp_Grafo` - Quando foi incluído no grafo

**Total de Colunas até aqui: 36 + 7 = 43**

---

### ⭐ **METADADOS FINAIS** (Sempre)

```csv
... | Etapa_Atual | Status_Processamento | Timestamp_Export | Versao_Pipeline

... | "GRAPH" | "Grafo Construído" | "2026-01-15T21:45:00Z" | "2.5.0"
```

**Colunas Finais:**
- `Etapa_Atual` - Em qual etapa está (UPLOAD, EMBEDDINGS, CLUSTERING, GRAPH)
- `Status_Processamento` - Descrição do status (Iniciado, Vetorizado, etc)
- `Timestamp_Export` - Quando foi exportado
- `Versao_Pipeline` - Versão do sistema

**TOTAL FINAL: 43 + 4 = 47 colunas possíveis**

---

## 📊 Exemplo Completo de Linha

### Após ETAPA 1 (Upload + IA)
```
chunk_001 | lei_8078.pdf | 1 | LEGAL | Direito_Consumidor | Ollama (mistral) | 2026-01-15T21:30:00Z
```
**7 colunas**

### Após ETAPA 2 (Limpeza + Coerência)
```
... | "O artigo 5 estabelece..." | "O artigo 5º estabelece..." | 456 | 412 | 0.89 | 0.91
```
**+6 colunas = 13 total**

### Após ETAPA 4 (Embeddings)
```
... | sentence-bert | 384 | "[0.234; -0.567; 0.123; 0.890; -0.456;...]" | 2026-01-15T21:35:00Z
```
**+4 colunas = 17 total**

### Após ETAPA 6 (Clustering)
```
... | 2 | Direito | 0.345 | -0.678 | 0.0234 | 0.82
```
**+6 colunas = 23 total**

### Após ETAPA 7 (Grafo)
```
... | node_045 | 1 | 0.523 | 0.234 | 5 | "direito; contrato; responsabilidade" | 2026-01-15T21:40:00Z
```
**+7 colunas = 30 total**

### Com Metadados
```
... | GRAPH | Grafo Construído | 2026-01-15T21:45:00Z | 2.5.0
```
**+4 colunas = 34 colunas finais neste exemplo**

---

## 🔄 Fluxo Acumulativo

```
UPLOAD (7 col)
    ↓
UPLOAD + COERÊNCIA (13 col)
    ↓
UPLOAD + COERÊNCIA + SEMÂNTICA (16 col)
    ↓
... + EMBEDDINGS (20 col)
    ↓
... + CNN (23 col)
    ↓
... + CLUSTERING (29 col)
    ↓
... + GRAFO (36 col)
    ↓
... + METADADOS (40 col)

RESULTADO: CSV COMPLETO COM HISTÓRICO PROGRESSIVO
```

---

## 💾 Como Usar o CSV Acumulativo

### Cenário 1: Análise de Qualidade (Upload → Coerência)
```
Colunas importantes:
- Chunk_ID, Arquivo
- Conteudo_Original, Conteudo_Processado
- Score_Coesao, Score_Coerencia (0-1)
- Tokens_Originais vs Tokens_Atuais
```

### Cenário 2: Análise de Embeddings (Upload → Embeddings)
```
Colunas importantes:
- Chunk_ID, Arquivo
- Modelo_Embedding, Dim_Vetor
- Vetor_Preview (primeiros 5 valores)
- CNN_Loss, Distancia_Triplet (se CNN)
```

### Cenário 3: Análise de Clustering (Upload → Clustering)
```
Colunas importantes:
- Chunk_ID, Arquivo, Cluster_ID
- Cluster_Coordenada_X, Cluster_Coordenada_Y
- Distancia_Centroide, Score_Silhueta
- Cluster_Label (resumo do cluster)
```

### Cenário 4: Análise de Grafo (Upload → Grafo)
```
Colunas importantes:
- Chunk_ID, Arquivo, Grafo_NodeID
- Grafo_Centralidade, Grafo_Betweenness
- Grau_Arestas (quantas conexões)
- Palavras_Chave_Grafo
- Grafo_Group (comunidade)
```

---

## 🎯 Benefícios do CSV Acumulativo

✅ **Histórico Completo** - Todos os dados anteriores mantidos  
✅ **Rastreabilidade** - Ver transformação em cada etapa  
✅ **Flexibilidade** - Use só as colunas que precisa  
✅ **Auditoria** - Timestamps para cada processamento  
✅ **Performance** - Coloca vazias as colunas não preenchidas  
✅ **Análise** - Compare dados antes/depois facilmente  

---

## 🔍 Exemplo de Análise

### Comparar Qualidade de Texto
```
Score_Coerencia_Antes vs Score_Coerencia_Depois
Score_Coesao_Antes vs Score_Coesao_Depois
Tokens_Originais vs Tokens_Atuais

Resultado: Ver melhoria percentual
```

### Analisar Clustering
```
Cluster_ID + Palavras_Chave + Score_Silhueta
Agrupar por cluster
Média de silhueta por cluster

Resultado: Identificar melhor/pior cluster
```

### Visualizar Grafo
```
Grafo_NodeID + Grafo_Centralidade + Grau_Arestas
Ordenar por centralidade DESC
Top 10 nós mais centrais

Resultado: Nós mais importantes
```

---

## 📅 Timestamps para Auditoria

Cada etapa adiciona seu timestamp:
- `Timestamp_Upload` - Quando arquivo foi enviado
- `Timestamp_Embedding` - Quando vetorizado
- `Timestamp_Grafo` - Quando foi parte do grafo
- `Timestamp_Export` - Quando foi exportado

**Total de overhead: 15-20% do tamanho final**

---

## 📝 Nota Técnica

O CSV usa:
- **Quoting**: Aspas duplas em torno de campos com vírgula/newline
- **Encoding**: UTF-8 (suporta português, acentos)
- **Decimal**: Ponto (0.1234, não 0,1234)
- **Encoding vetor**: JSON array como string

---

**Status:** ✅ Sistema Acumulativo Implementado  
**Data:** 15 de Janeiro de 2026  
**Versão:** 2.5.0
