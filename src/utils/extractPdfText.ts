import * as pdfjsLib from 'pdfjs-dist';

// ✅ Fixed version that exists on cdnjs — do NOT use dynamic ${pdfjsLib.version}
const WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
const WORKER_FALLBACK = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

function initWorker() {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_CDN;
    console.log('[extractPdfText] Worker iniciado via cdnjs:', WORKER_CDN);
  } catch (err) {
    console.warn('[extractPdfText] Falha no worker principal, usando fallback:', WORKER_FALLBACK, err);
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_FALLBACK;
  }
}

initWorker();

/**
 * Extracts the full text content from a PDF File object.
 *
 * - Reads the file as ArrayBuffer in the browser (no server needed)
 * - Iterates through every page via PDF.js
 * - Joins all text items into a single trimmed string
 *
 * @param file - The PDF File from an <input type="file"> element
 * @returns Full extracted text as a plain string, or empty string on failure
 */
export async function extractPdfText(file: File): Promise<string> {
  console.log(`[extractPdfText] Iniciando leitura: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`);

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (err) {
    console.error('[extractPdfText] Erro ao ler o arquivo como ArrayBuffer:', err);
    throw new Error('Não foi possível ler o arquivo PDF. Verifique se o arquivo não está corrompido.');
  }

  let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
  try {
    pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    console.log(`[extractPdfText] PDF carregado com sucesso — ${pdf.numPages} página(s)`);
  } catch (err) {
    console.error('[extractPdfText] Erro ao carregar o PDF com PDF.js:', err);
    throw new Error('Não foi possível processar o PDF. O arquivo pode estar protegido por senha ou corrompido.');
  }

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => (item as { str: string }).str)
        .join(' ');
      fullText += pageText + '\n';
      console.log(`[extractPdfText] Página ${i}/${pdf.numPages} extraída (${pageText.length} chars)`);
    } catch (err) {
      console.warn(`[extractPdfText] Falha ao extrair texto da página ${i}:`, err);
      // Continue processing remaining pages instead of aborting
    }
  }

  const result = fullText.trim();
  console.log(`[extractPdfText] Extração concluída — total: ${result.length} caracteres`);

  if (!result) {
    console.warn('[extractPdfText] Nenhum texto extraído. O PDF pode conter apenas imagens (scan).');
  }

  return result;
}
