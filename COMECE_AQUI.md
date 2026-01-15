# 🚀 Iniciar GraphRAG - Guia Rápido

## ✅ Configuração Automática COMPLETA

- ✓ `.env.local` criado e configurado
- ✓ Ollama Local selecionado (gratuito, offline)
- ✓ PDF de exemplo: `public/exemplo-teste.pdf`
- ✓ Servidor rodando em `http://localhost:3000`

## 📋 Passos para Usar

### 1. Abra o App
```
http://localhost:3000
```

### 2. Configure Provider (Opcional - já é Ollama)
- Clique em ⚙️ **Configurações**
- Verifique que **Ollama (Local)** está selecionado ✓

### 3. Faça Upload de PDF
- Clique em **"Selecionar Arquivos"**
- Escolha seu PDF ou use o exemplo: `public/exemplo-teste.pdf`

### 4. Processe o Pipeline

#### Etapa 1: Enriquecimento IA
```
Clique em: "Limpar & Classificar com Ollama"
Status: Processando texto...
```

#### Etapa 2: Embeddings
```
Clique em: "Gerar Embeddings"
Status: Vetorizando conteúdo...
```

#### Etapa 3: CNN Training (Automático)
```
Status: Refinando vetores com Triplet Loss
Epochs: 1-15
```

#### Etapa 4: Clusterização
```
Clique em: "Executar Clusterização"
Status: K-Means++ com Silhueta
```

#### Etapa 5: Grafo de Conhecimento
```
Clique em: "Construir Grafo"
Status: Criando arestas ponderadas
```

#### Etapa 6: Relatório
```
Clique em: "Relatório Técnico"
Visualize análises completas
```

#### Etapa 7: Exportação
```
CSV Unificado: "Exportar CSV Unificado"
Relatório PDF: "Relatório PDF"
Auditoria XLSX: "Auditoria XLSX"
```

## 🤖 Verificar Configuração

Execute o script de automação:
```bash
npm run automate
```

Saída esperada:
```
✓ .env.local carregado
✓ Ollama Local: Configurado
✓ PDF de teste: Disponível
✓ Servidor: http://localhost:3000
```

## 📊 Dados Gerados

Cada etapa gera arquivos CSV:
- `etapa1_entidades_inteligentes.csv` - Chunks enriquecidos
- `etapa2_embeddings.csv` - Vetores
- `etapa4_clusters.csv` - Grupos semânticos
- `etapa6_grafo_nos.csv` - Nós do grafo
- `etapa6_grafo_arestas.csv` - Conectividades
- `pipeline_unificado.csv` - Dados consolidados

## 🔧 Trocar para Google Gemini

Se tiver API key do Gemini:

1. Edite `.env.local`:
```env
VITE_GEMINI_API_KEY=AIzaSy...seu_token...
```

2. No app, vá em **⚙️ Configurações**

3. Clique em **"Google Gemini"** (botão cinza)

4. Salve e recarregue a página

## 🐛 Troubleshooting

**App está em branco?**
- Pressione F12 para abrir console
- Procure por erros vermelhos
- Recarregue a página (F5)

**Ollama não conecta?**
- Verifique se `ollama serve` está rodando
- Instale modelos: `ollama pull llama3.2:3b`
- Teste: `http://localhost:11434/api/models`

**Muito lento?**
- Use um PDF pequeno primeiro
- CPU é limitado, seja paciente com Ollama local
- Considere usar Google Gemini para velocidade

## 📚 Estrutura do Projeto

```
/src
├── App.tsx              (Interface principal)
├── services/
│   ├── geminiService.ts (Google IA)
│   ├── ollamaService.ts (Local IA)
│   └── ...
└── components/          (React UI)

/public
└── exemplo-teste.pdf    (PDF para teste)

/scripts
└── automate.js          (Verificação do sistema)

.env.local              (Configuração)
```

## 🎯 Próximos Passos

1. Acesse `http://localhost:3000`
2. Selecione um PDF
3. Escolha um provider (Ollama é padrão)
4. Clique nos botões em sequência
5. Exporte os resultados

**Framework pronto para usar!** 🚀
