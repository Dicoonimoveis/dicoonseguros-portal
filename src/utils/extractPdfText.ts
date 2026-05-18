import * as pdfjsLib from 'pdfjs-dist';

// Configure the PDF.js worker via CDN matching the exact installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Extracts the full text content from a PDF File object.
 * Iterates through every page and joins all text items into a single string.
 *
 * @param file - The PDF File from an <input type="file"> element
 * @returns Full extracted text as a plain string
 */
export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => (item as { str: string }).str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}
