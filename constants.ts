// Textos simulando um corpus acadêmico de alta qualidade (Qualis A1)
// sobre RAG, Teoria dos Grafos e NLP.

export const ACADEMIC_TEXTS = [
  `A Recuperação Aumentada por Geração (RAG) representa uma mudança paradigmática na arquitetura de Modelos de Linguagem Grande (LLMs). Ao dissociar a memória paramétrica do modelo da base de conhecimento externa, o RAG mitiga alucinações e permite a atualização dinâmica de informações sem a necessidade de retreino custoso. A integração vetorial permite que o modelo consulte um índice denso antes da geração.`,
  
  `Na teoria espectral dos grafos, a matriz Laplaciana desempenha um papel crucial na identificação de comunidades. A decomposição de autovalores (eigenvalues) permite o particionamento do grafo minimizando o corte normalizado (Normalized Cut). Este método é matematicamente equivalente ao relaxamento real de problemas de otimização combinatória discreta, sendo fundamental para algoritmos de clusterização espectral.`,
  
  `A arquitetura Transformer, introduzida por Vaswani et al., fundamenta-se no mecanismo de auto-atenção (Self-Attention). Diferentemente de Redes Neurais Recorrentes (RNNs), que processam sequências linearmente, o Transformer permite a modelagem de dependências de longo alcance de forma paralela. A complexidade quadrática O(n²) da atenção, contudo, impõe desafios para contextos extensos, motivando variantes como Sparse Transformers.`,
  
  `Word Embeddings estáticos, como Word2Vec e GloVe, falham em capturar a polissemia. Em contraste, embeddings contextuais gerados por modelos como BERT (Bidirectional Encoder Representations from Transformers) atribuem representações vetoriais distintas para a mesma palavra dependendo de seu entorno sintático e semântico, capturando nuances pragmáticas essenciais para tarefas de NLU (Natural Language Understanding).`,
  
  `A aplicação de Redes Neurais Convolucionais (CNNs) em 1D para processamento de texto permite a extração de características n-gramaticais locais de forma hierárquica. Ao deslizar filtros sobre a dimensão temporal dos embeddings, a rede aprende padrões de composição semântica, oferecendo uma alternativa computacionalmente eficiente às LSTMs para tarefas de classificação de texto e reconhecimento de entidades nomeadas.`,
  
  `Grafos de Conhecimento (Knowledge Graphs) estruturam informações em triplas (sujeito, predicado, objeto), facilitando o raciocínio dedutivo. A combinação de RAG com Grafos de Conhecimento, denominada GraphRAG, supera as limitações da busca vetorial pura ao permitir a navegação multi-hop, conectando conceitos semanticamente distantes através de caminhos explícitos no grafo.`,
  
  `Algoritmos de detecção de comunidades, como Louvain e Leiden, otimizam a modularidade da rede. A modularidade mede a densidade de arestas dentro das comunidades em comparação com arestas entre comunidades. O algoritmo de Leiden refina o Louvain garantindo comunidades conectadas e acelerando a convergência, sendo preferível para grafos de grande escala em bioinformática e redes sociais.`
];

export const COLORS = {
  primary: '#3b82f6', // blue-500
  secondary: '#6366f1', // indigo-500
  success: '#10b981', // emerald-500
  background: '#f8fafc', // slate-50
  surface: '#ffffff',
  text: '#1e293b', // slate-800
  border: '#e2e8f0', // slate-200
};