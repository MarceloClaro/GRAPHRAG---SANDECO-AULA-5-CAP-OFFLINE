# 🔑 CONFIGURAÇÃO DA API KEY - Gemini

## ⚡ Guia Completo Passo a Passo

### 1️⃣ Obter a Chave da API do Google Gemini

1. **Acesse o site:**
   ```
   https://aistudio.google.com/app/apikey
   ```

2. **Faça login:**
   - Use sua conta Google (Gmail)
   - Se não tiver, crie uma conta gratuitamente

3. **Crie uma API Key:**
   - Clique em **"Create API Key"** ou **"Criar chave de API"**
   - Escolha um projeto existente ou crie um novo
   - A chave será gerada automaticamente

4. **Copie a chave:**
   - Formato: `AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ...`
   - ⚠️ **ATENÇÃO:** Guarde em local seguro!

---

### 2️⃣ Configurar no Projeto

#### Opção A: Criar arquivo .env (RECOMENDADO)

1. **Na raiz do projeto**, crie um arquivo chamado `.env`:
   ```bash
   # Windows (PowerShell)
   New-Item .env -ItemType File
   
   # Linux/Mac
   touch .env
   ```

2. **Abra o arquivo `.env` no editor** e adicione:
   ```
   GEMINI_API_KEY=AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ
   ```
   ⚠️ Substitua pela sua chave real!

3. **Salve o arquivo**

#### Opção B: Copiar do template

```bash
# Copie o template
cp .env.example .env

# Edite o arquivo .env e substitua a chave
```

---

### 3️⃣ Verificar Configuração

1. **Reinicie o servidor** (se estiver rodando):
   ```bash
   # Pressione Ctrl+C para parar
   # Execute novamente:
   npm run dev
   ```

2. **Teste a integração:**
   - Acesse http://localhost:3000
   - Faça upload de um PDF
   - Clique em "🤖 Enriquecer com Gemini AI"
   - Se funcionar, está configurado! ✅

---

## 🔒 Segurança

### ✅ FAÇA:
- ✅ Mantenha a chave em arquivo `.env`
- ✅ Adicione `.env` ao `.gitignore`
- ✅ Use chaves diferentes para dev/prod
- ✅ Rotacione a chave periodicamente

### ❌ NÃO FAÇA:
- ❌ Nunca faça commit do `.env`
- ❌ Não compartilhe a chave publicamente
- ❌ Não exponha em código front-end
- ❌ Não use em repositórios públicos

---

## 🆓 Plano Gratuito do Gemini

### Limites Gratuitos (Free Tier):
- ✅ **15 requisições por minuto**
- ✅ **1 milhão de tokens por dia**
- ✅ **1.500 requisições por dia**

### Suficiente para:
- ✅ Processar ~100 PDFs por dia
- ✅ Gerar ~1000 embeddings por dia
- ✅ Uso pessoal e testes

### Se exceder:
- ⏸️ Aguarde 1 minuto entre batches grandes
- 💰 Considere upgrade para plano pago
- 🔄 Use múltiplas chaves (não recomendado)

---

## 🐛 Resolução de Problemas

### Erro: "API Key inválida"

**Possíveis causas:**
1. Chave copiada incorretamente
   - ✅ Verifique se não há espaços extras
   - ✅ Copie novamente diretamente do Google AI Studio

2. Arquivo `.env` não encontrado
   - ✅ Verifique se está na **raiz do projeto**
   - ✅ Nome deve ser exatamente `.env` (com ponto)

3. Variável com nome errado
   - ✅ Deve ser `GEMINI_API_KEY` (não `API_KEY`)

4. Servidor não reiniciado
   - ✅ Pare e inicie novamente: `Ctrl+C` + `npm run dev`

### Erro: "Rate Limit Exceeded" (429)

**Solução:**
- ⏸️ Aguarde 1 minuto
- 📉 Processe menos documentos por vez
- ⏱️ Use delays maiores entre requisições

### Erro: "Resource Exhausted" (503)

**Solução:**
- ⏸️ Servidores do Google sobrecarregados
- 🔄 Tente novamente em alguns minutos
- ✅ O sistema tentará automaticamente (retry)

---

## 📊 Monitoramento de Uso

### Ver uso da API:
1. Acesse: https://aistudio.google.com/
2. Clique em sua chave
3. Veja estatísticas de uso

### Dicas para economizar:
- 💡 Use embeddings locais quando possível
- 💡 Cache resultados já processados
- 💡 Processe em batches pequenos
- 💡 Evite reprocessar os mesmos documentos

---

## 🔄 Rotação de Chaves

### Quando trocar a chave:
- 🔴 Se a chave foi exposta publicamente
- 🟡 A cada 3-6 meses (segurança)
- 🟢 Se atingir limites frequentemente

### Como trocar:
1. Gere nova chave no Google AI Studio
2. Atualize o arquivo `.env`
3. Reinicie o servidor
4. Revogue a chave antiga (opcional)

---

## 💼 Uso em Produção

### Recomendações:
1. **Use variáveis de ambiente do servidor:**
   ```bash
   # No servidor, configure:
   export GEMINI_API_KEY=sua_chave
   ```

2. **Use secrets management:**
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Secret Manager
   - HashiCorp Vault

3. **Monitore uso:**
   - Configure alertas de limite
   - Log de erros
   - Métricas de consumo

---

## ✅ Checklist de Configuração

- [ ] Chave obtida do Google AI Studio
- [ ] Arquivo `.env` criado na raiz do projeto
- [ ] Chave adicionada como `GEMINI_API_KEY=...`
- [ ] Servidor reiniciado
- [ ] Teste realizado (enriquecimento com IA)
- [ ] `.env` adicionado ao `.gitignore`

---

## 🎯 Exemplo Completo

**Estrutura do projeto:**
```
GraphRAG-Pipeline---SANDECO-main/
├── .env                    ← Arquivo que você vai criar
├── .env.example            ← Template (já existe)
├── .gitignore              ← Já contém .env
├── package.json
├── vite.config.ts          ← Já configurado para ler .env
└── ...
```

**Conteúdo do `.env`:**
```bash
GEMINI_API_KEY=AIzaSyC1234567890ABCDEFGHIJKLMNOP-qrstuvwxyz
```

**Pronto! Agora é só executar:**
```bash
npm run dev
```

---

## 📞 Suporte

**Links Úteis:**
- 🔑 Obter API Key: https://aistudio.google.com/app/apikey
- 📚 Documentação Gemini: https://ai.google.dev/
- 💬 Comunidade: https://discuss.ai.google.dev/

**Problemas com configuração?**
- Consulte o **GUIA_RAPIDO.md**
- Leia **MELHORIAS_IMPLEMENTADAS.md**
- Verifique o **README.md**

---

**✅ Configuração concluída! Boa análise de documentos! 🚀**
