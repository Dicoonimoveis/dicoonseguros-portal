import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker source using a reliable CDN matching the exact library version
// ✅ Versão 5.x via unpkg — compatível com pdfjs-dist@5.7.284 instalado
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs';

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => (item as { str: string }).str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}
