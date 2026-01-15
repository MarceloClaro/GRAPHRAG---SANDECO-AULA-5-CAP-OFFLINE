## 🧪 GUIA DE TESTE: Sistema de Coesão e Coerência

### ✅ VERIFICAÇÃO RÁPIDA

Seu sistema GraphRAG agora possui:

#### 1. **Processamento Progressivo de Texto** ✅
- Stage 1: Original (como extraído)
- Stage 2: Cleaned (quebras removidas, palavras unidas)
- Stage 3: With_Coesion (conectivos adicionados)
- Stage 4: With_Coherence (pronomes corrigidos)
- Stage 5: Normalized (vocabulário padronizado)

#### 2. **Rastreamento Automático** ✅
Cada chunk agora possui:
```typescript
{
  contentOriginal: string;      // Versão 1
  contentCleaned: string;       // Versão 2
  contentCoherent: string;      // Versão 4
  content: string;              // Versão final
  processingHistory: string;    // Resumo: "original[25w] → cleaned[22w]..."
  readabilityScore: number;     // Flesch (0-100)
  aiProvider: string;           // 'ollama' | 'gemini' | 'xiaozhi'
}
```

#### 3. **Exportação Expandida** ✅
CSV agora contém **24 colunas**:
- content_original, content_cleaned, content_coherent, content_final
- readability_original, readability_final (+ intermediárias)
- wordcount_*, sentencecount_* de cada etapa
- processingStages, aiProvider, keywords

---

### 🔍 TESTE 1: Verificar Integração com Ollama

**Pré-requisitos:**
```bash
ollama serve  # Terminal separado
```

**Passos:**
1. Abrir http://localhost:3000
2. Carregar um PDF com texto em português
3. Selecionar "🦙 Ollama" nas configurações
4. Clicar "Processar"
5. Verificar no console do navegador (F12):
   ```
   ✅ Chunk processado com coherenceService
   ✅ 5 stages rastreados
   ✅ readabilityScore calculado
   ```

**Esperado:**
```
Entidade 1:
- Original: "Art. 5º -\nFreedom of expression is..."
- Cleaned: "Artigo 5º Freedom of expression is..."
- Final: "Artigo 5º Portanto freedom of expression is..."
- Readability: 45 → 65 (+20 pontos)
```

---

### 🔍 TESTE 2: Verificar Integração com Gemini

**Pré-requisitos:**
- API Key do Gemini configurada em Configurações ⚙️

**Passos:**
1. Abrir http://localhost:3000
2. Ir para ⚙️ Configurações → 🌐 Google Gemini
3. Inserir API Key
4. Carregar PDF
5. Selecionar "🌐 Gemini"
6. Processar

**Esperado:**
```
Chunk processado com:
- Enriquecimento via Gemini (keywords extraídas)
- Aplicação de coesão (conectivos injetados)
- Normalização de vocabulário
- Score de legibilidade incrementado
```

---

### 🔍 TESTE 3: Verificar Integração com Xiaozhi

**Pré-requisitos:**
- WebSocket URL configurado em Configurações ⚙️
- Token de acesso

**Passos:**
1. ⚙️ Configurações → ☁️ Xiaozhi
2. Inserir WebSocket URL: `wss://seu-endpoint/xiaozhi`
3. Inserir Token
4. Carregar PDF
5. Selecionar "☁️ Xiaozhi"
6. Processar

**Esperado:**
```
WebSocket conectado ✅
Chunks enriquecidos ✅
Processamento de coesão aplicado ✅
```

---

### 📊 TESTE 4: Verificar Histórico Progressivo

**Passos:**
1. Processar um PDF com qualquer provedor
2. Exportar → "Entidades Processadas (CSV)"
3. Abrir arquivo em Excel/Google Sheets

**Verificar Colunas:**
```
✅ content_original    → Texto original
✅ content_cleaned     → Após limpeza
✅ content_coherent    → Após coesão
✅ content_final       → Versão final

✅ readability_original → Ex: 45
✅ readability_cleaned  → Ex: 52
✅ readability_coherent → Ex: 58
✅ readability_final    → Ex: 65

✅ wordcount_original   → Ex: 25
✅ wordcount_final      → Ex: 24

✅ processingStages    → "original[25w|45] → cleaned[22w|52] → ..."
```

---

### 🔄 TESTE 5: Verificar Múltiplos Provedores

**Processar mesmo PDF com 3 provedores:**

1. Carregar PDF
2. Processar com Ollama → Exportar como "resultado_ollama.csv"
3. Carregar mesmo PDF
4. Processar com Gemini → Exportar como "resultado_gemini.csv"
5. Carregar mesmo PDF
6. Processar com Xiaozhi → Exportar como "resultado_xiaozhi.csv"

**Comparar:**
```
- Verificar coluna "aiProvider": deve ser diferente em cada
- Readability scores devem variar por provedor
- Conteúdo processado pode variar (cada IA tem estilo)
- Histórico deve ser idêntico (mesmas 5 etapas)
```

---

### 📄 TESTE 6: Verificar Relatório Técnico

**Passos:**
1. Processar PDF
2. Clicar "Gerar Relatório" 📊
3. Abrir relatório (HTML/PDF)

**Verificar Seção "Histórico de Processamento de Texto":**
```markdown
✅ Seção presente
✅ Menciona 5 etapas
✅ Descreve cada técnica
✅ Referencia CSV com colunas progressivas
✅ Inclui informações sobre rastreamento
```

---

### 📋 TESTE 7: Testar Técnicas Específicas

#### Test 7a: Limpeza de Texto (`cleanAndOrganizeText`)

**Entrada:**
```
Art. 5º -
Freedom of expression is a fun-
damental right that must be pro-
tected by the state.
```

**Esperado:**
```
Art. 5º - Freedom of expression is a fundamental right that must be protected by the state.
```

✅ Palavras reunidas: `fun- damental` → `fundamental`
✅ Quebras de linha removidas
✅ Espaços normalizados

#### Test 7b: Adição de Coesão (`addCoesion`)

**Entrada:**
```
Art. 5º defines freedom.
Everyone has this right.
The state must protect it.
```

**Esperado:**
```
Art. 5º defines freedom.
Portanto, everyone has this right.
De modo similar, the state must protect it.
```

✅ Conectivos adicionados entre parágrafos
✅ Fluidez melhorada
✅ Sentido mantido

#### Test 7c: Melhoria de Coerência (`improveCoherence`)

**Entrada:**
```
The court issued the decision. It was fair. This was important.
```

**Esperado:**
```
The court issued the decision. The court decision was fair. This ruling was important.
```

✅ Pronomes soltos substituídos
✅ Referências claras
✅ Redundâncias evitadas

#### Test 7d: Normalização de Vocabulário (`normalizeVocabulary`)

**Entrada:**
```
Art. 5º, Cap. II, obs. importante, pág. 23, inc. a
```

**Esperado:**
```
Artigo 5º, Capítulo II, Observação importante, página 23, inciso a
```

✅ Todas abreviaturas padronizadas
✅ Consistência terminológica

#### Test 7e: Cálculo de Legibilidade (`calculateReadability`)

**Entrada:**
```
Artigo 5º é reconhecido a todos o direito à liberdade de expressão.
```

**Esperado:**
```
Readability Score: 45-65 (Escala Flesch)
```

✅ Score entre 0-100
✅ Melhora com processamento

---

### 🐛 CHECKLIST DE TROUBLESHOOTING

| Problema | Causa | Solução |
|----------|-------|---------|
| CSV vazio | Nenhum chunk processado | Verificar se PDF foi carregado |
| Colunas de histórico ausentes | coherenceService não integrado | Verificar importação em ollamaService, geminiService, xiaozhiService |
| Readability = 0 | calculateReadability não chamada | Verificar se processTextWithCoherence foi executada |
| Textos iguais em todas etapas | processamento pulado | Verificar if (chunk.content) e se etapas estão se salvando |
| Conectivos em inglês | COESIVES com valores errados | Verificar lista de conectivos em coherenceService |
| Exportação com 12 colunas | Função antiga de exportação | Verificar se chunksToExportFormat está sendo usada |
| Relatório sem seção de histórico | Mudança não commitada | Verificar se reportService foi atualizado |

---

### ✨ VALIDAÇÃO FINAL

Execute este checklist para confirmar implementação completa:

- [ ] Arquivo `coherenceService.ts` existe e compila
- [ ] `ollamaService.ts` importa e chama `enrichChunkWithCoherence`
- [ ] `geminiService.ts` importa e chama `enrichChunkWithCoherence`
- [ ] `xiaozhiService.ts` importa e chama `enrichChunkWithCoherence`
- [ ] `types.ts` tem 6 novos campos em DocumentChunk
- [ ] `exportService.ts` tem função `chunksToExportFormat`
- [ ] `reportService.ts` tem seção "Histórico de Processamento"
- [ ] CSV exportado tem 24 colunas
- [ ] App compila sem erros: `http://localhost:3000` ✅
- [ ] Ao processar PDF: readability score muda (ex: 45 → 65)
- [ ] Histórico mostra progressão: `original → cleaned → coherent → final`
- [ ] Relatório inclui nova seção com técnicas descritas

---

### 🎓 ENTENDER O SISTEMA

**Arquivo de Referência:** `COHERENCE_TRACKING.md`
```bash
# Ver documentação completa
cat COHERENCE_TRACKING.md

# Ver resumo
cat IMPLEMENTATION_SUMMARY.md

# Ver mudanças commitadas
git log --oneline | head -10
```

---

**Status:** Sistema pronto para testes em produção! 🚀
