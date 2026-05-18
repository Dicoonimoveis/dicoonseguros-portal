import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractPdfText } from '@/utils/extractPdfText';

// ─── 🔧 Configure these 3 values to match your Supabase project ──────────────
const STORAGE_BUCKET = 'policy-documents';   // 🔧 Nome do bucket no Supabase Storage
const TABLE_NAME     = 'policy_documents';   // 🔧 Nome da tabela de apólices
const TEXT_COLUMN    = 'texto_extraido';      // 🔧 Nome da coluna que recebe o texto
// ─────────────────────────────────────────────────────────────────────────────

type UploadStatus = 'idle' | 'reading' | 'uploading' | 'saving' | 'success' | 'error';

interface UploadResult {
  status: UploadStatus;
  progress: number;       // 0–100
  statusMsg: string;
  error: string | null;
  pdfText: string;
  upload: (file: File, policyId: string, userId: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook that handles the full PDF upload pipeline:
 *  1. Extracts text from the PDF in-browser via pdfjs-dist
 *  2. Uploads the original file to Supabase Storage
 *  3. Saves the extracted text to the specified table column
 *
 * @example
 *   const { status, progress, statusMsg, error, upload } = useUploadApolice();
 *   await upload(file, policyId, userId);
 */
export function useUploadApolice(): UploadResult {
  const [status, setStatus]     = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [pdfText, setPdfText]   = useState('');

  const reset = () => {
    setStatus('idle');
    setProgress(0);
    setStatusMsg('');
    setError(null);
    setPdfText('');
  };

  const upload = async (file: File, policyId: string, userId: string) => {
    try {
      reset();

      // ── Step 1: Extract text from PDF in the browser ──────────────────────
      if (file.type === 'application/pdf') {
        setStatus('reading');
        setStatusMsg('Lendo e transcrevendo o PDF...');
        setProgress(10);

        const text = await extractPdfText(file);
        setPdfText(text);
        setProgress(40);
      }

      // ── Step 2: Upload the original file to Supabase Storage ──────────────
      setStatus('uploading');
      setStatusMsg('Enviando arquivo para o storage...');
      setProgress(55);

      const ext  = file.name.split('.').pop() ?? 'pdf';
      const path = `${userId}/${policyId}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (storageErr) throw new Error(`Storage: ${storageErr.message}`);
      setProgress(75);

      // ── Step 3: Save extracted text + metadata to the database ────────────
      setStatus('saving');
      setStatusMsg('Salvando transcrição no banco de dados...');

      const { error: dbErr } = await supabase.from(TABLE_NAME).insert({
        policy_id:      policyId,
        user_id:        userId,
        file_path:      path,
        file_name:      file.name,
        doc_type:       'apolice',
        [TEXT_COLUMN]:  pdfText || null,
      });

      if (dbErr) throw new Error(`Banco de dados: ${dbErr.message}`);

      setProgress(100);
      setStatus('success');
      setStatusMsg('PDF transcrito e salvo com sucesso! ✅');
    } catch (err: any) {
      setStatus('error');
      setError(err?.message ?? 'Erro desconhecido ao processar o PDF.');
      setStatusMsg('Erro ao processar o PDF.');
    }
  };

  return { status, progress, statusMsg, error, pdfText, upload, reset };
}
