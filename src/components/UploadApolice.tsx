import React, { useRef } from 'react';
import { Loader2, Upload, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { useUploadApolice } from '@/hooks/useUploadApolice';

interface UploadApoliceProps {
  policyId: string;
  userId: string;
  onSuccess?: (pdfText: string) => void;
}

/**
 * Drag-and-drop / click-to-browse PDF upload component.
 * Shows a progress bar and status messages during the full pipeline:
 *   reading → uploading → saving → success / error
 */
export function UploadApolice({ policyId, userId, onSuccess }: UploadApoliceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { status, progress, statusMsg, error, pdfText, upload, reset } = useUploadApolice();

  const handleFile = async (file: File) => {
    if (!file) return;
    await upload(file, policyId, userId);
    if (status === 'success' && onSuccess) onSuccess(pdfText);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const isWorking = ['reading', 'uploading', 'saving'].includes(status);

  return (
    <div className="w-full space-y-4">
      {/* Drop zone */}
      {status === 'idle' && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center cursor-pointer transition hover:border-[#1D9E75] hover:bg-[#F0FDF9]"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          role="button"
          aria-label="Clique ou arraste o PDF da apólice aqui"
        >
          <Upload className="w-10 h-10 text-gray-400" />
          <p className="text-sm font-semibold text-gray-700">
            Clique ou arraste o PDF da apólice aqui
          </p>
          <p className="text-xs text-gray-400">Apenas arquivos PDF · máx. 20 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleChange}
          />
        </div>
      )}

      {/* Progress / loading */}
      {isWorking && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
            <Loader2 className="w-5 h-5 animate-spin text-[#1D9E75]" />
            {statusMsg}
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: '#1D9E75' }}
            />
          </div>
          <p className="text-xs text-gray-400 text-right">{Math.round(progress)}%</p>
        </div>
      )}

      {/* Success */}
      {status === 'success' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            PDF transcrito e salvo com sucesso!
          </div>
          {pdfText && (
            <details className="text-xs text-emerald-700">
              <summary className="cursor-pointer font-medium flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Visualizar texto extraído ({pdfText.length} caracteres)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap bg-white rounded-lg border border-emerald-100 p-3 max-h-48 overflow-y-auto text-gray-700">
                {pdfText}
              </pre>
            </details>
          )}
          <button
            onClick={reset}
            className="self-start text-xs text-emerald-700 underline hover:text-emerald-900"
          >
            Enviar outro PDF
          </button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
            <AlertTriangle className="w-5 h-5" />
            {statusMsg}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={reset}
            className="self-start text-xs text-red-700 underline hover:text-red-900"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
