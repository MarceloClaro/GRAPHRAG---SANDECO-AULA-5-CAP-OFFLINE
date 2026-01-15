import * as pdfjsLibProxy from 'pdfjs-dist';

// Fix for ESM/CJS interop issues with pdfjs-dist on some CDNs (esm.sh)
// We try to find the main library object whether it's on .default or the root proxy
const pdfjsLib = (pdfjsLibProxy as any).default || pdfjsLibProxy;

// Configurar o worker do PDF.js usando CDNJS (estável para workers)
// Isso resolve o erro 'NetworkError' e 'fake worker' causados por falha no carregamento do worker do esm.sh
const workerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

try {
  // Tenta configurar no objeto resolvido
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  } 
  // Fallback: tenta configurar diretamente no proxy se o default falhou
  else if ((pdfjsLibProxy as any).GlobalWorkerOptions) {
    (pdfjsLibProxy as any).GlobalWorkerOptions.workerSrc = workerUrl;
  }
  // Fallback 2: tenta encontrar no window (caso raro de vazamento global)
  else if ((window as any).pdfjsLib?.GlobalWorkerOptions) {
    (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  }
} catch (e) {
  console.warn("Erro ao configurar GlobalWorkerOptions do PDF.js:", e);
}

export interface ProcessedPDF {
  filename: string;
  text: string;
  pageCount: number;
}

export const extractTextFromPDF = async (file: File): Promise<ProcessedPDF> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Carregar documento com configurações otimizadas
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    
    console.log(`📄 Processando PDF: ${file.name} - Total de páginas: ${pdf.numPages}`);
    
    let fullText = '';
    let processedPages = 0;
    
    // Iterar sobre TODAS as páginas de forma minuciosa
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        console.log(`  ⏳ Extraindo página ${i}/${pdf.numPages}...`);
        
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Adiciona marcador de página para rastreamento
        fullText += `\n[--- PÁGINA ${i} ---]\n`;
        
        // Extração rigorosa: processa cada item de texto preservando posicionamento
        let pageText = '';
        let lastY = -1;
        
        textContent.items.forEach((item: any, idx: number) => {
          const str = item.str?.trim() || '';
          if (!str) return;
          
          // Detecta mudança de linha (novo Y)
          const currentY = item.transform ? item.transform[5] : 0;
          
          if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
            // Nova linha detectada
            pageText += '\n';
          } else if (idx > 0 && pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            // Adiciona espaço entre palavras na mesma linha
            pageText += ' ';
          }
          
          pageText += str;
          lastY = currentY;
        });
        
        // Limpa espaços excessivos mas preserva quebras de linha
        pageText = pageText
          .replace(/[ \t]+/g, ' ')  // Normaliza espaços horizontais
          .replace(/ \n/g, '\n')    // Remove espaços antes de quebra
          .replace(/\n /g, '\n')    // Remove espaços depois de quebra
          .trim();
        
        if (pageText.length > 0) {
          fullText += pageText + '\n\n';
          processedPages++;
        } else {
          console.warn(`  ⚠️ Página ${i} está vazia ou não contém texto extraível`);
          fullText += `[Página ${i} sem texto extraível]\n\n`;
        }
        
      } catch (pageError) {
        console.error(`  ❌ Erro ao processar página ${i}:`, pageError);
        fullText += `[Erro ao extrair página ${i}]\n\n`;
      }
    }
    
    console.log(`✅ Extração concluída: ${processedPages}/${pdf.numPages} páginas processadas`);
    console.log(`📊 Total de caracteres extraídos: ${fullText.length}`);

    // Limpeza rigorosa e minuciosa do texto completo
    fullText = fullText
      // 1. Remove hifenização de quebra de linha (palavras quebradas)
      .replace(/(\w)-\n(\w)/g, '$1$2')
      // 2. Normaliza espaços em branco múltiplos (mas preserva estrutura)
      .replace(/[ \t]+/g, ' ')
      // 3. Normaliza todas as quebras de linha para \n
      .replace(/(\r\n|\r)/g, '\n')
      // 4. Remove linhas que são só espaços
      .replace(/\n[ \t]+\n/g, '\n\n')
      // 5. Reduz múltiplas linhas vazias (máximo 2 \n consecutivos)
      .replace(/\n{3,}/g, '\n\n')
      // 6. Remove espaços no início e fim de cada linha
      .split('\n').map(line => line.trim()).join('\n')
      // 7. Remove espaços antes/depois de pontuação comum
      .replace(/\s+([.,;:!?])/g, '$1')
      // 8. Corrige espaçamento após pontuação
      .replace(/([.,;:!?])([A-Z])/g, '$1 $2')
      // 9. Remove caracteres de controle e caracteres invisíveis
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
      // 10. Trim final
      .trim();
    
    // Validação final
    if (fullText.length === 0) {
      throw new Error('PDF processado mas nenhum texto foi extraído. O arquivo pode estar vazio ou ser apenas imagens.');
    }
    
    if (fullText.length < 50) {
      console.warn('⚠️ Texto extraído é muito curto. Pode indicar problema no PDF.');
    }

    return {
      filename: file.name,
      text: fullText,
      pageCount: pdf.numPages
    };
  } catch (error: any) {
    console.error(`❌ Erro ao processar PDF ${file.name}:`, error);
    
    let errorMessage = `Falha ao ler o arquivo ${file.name}.`;
    
    if (error.name === 'PasswordException') {
      errorMessage += ' O arquivo está protegido por senha.';
    } else if (error.message && (error.message.includes('fake worker') || error.message.includes('worker'))) {
      errorMessage += ' Erro no worker do PDF.js. Tente recarregar a página.';
    } else {
      errorMessage += ' Verifique se é um PDF válido.';
    }
    
    throw new Error(errorMessage);
  }
};