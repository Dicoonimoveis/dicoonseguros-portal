import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Shield,
  Upload,
  Camera,
  ScanLine,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  UserCheck,
  UserPlus,
  Loader2,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { inviteClient } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/importar-apolice")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      throw redirect({ to: "/acesso-negado" });
    }
  },
  component: ImportarApolicePage,
});

const PRIMARY = "#1D9E75";
const BG = "#F0F2F5";

type Extracted = {
  nome_cliente?: string | null;
  cpf_cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  numero_apolice?: string | null;
  seguradora?: string | null;
  tipo_seguro?: string | null;
  bem_segurado?: string | null;
  data_inicio?: string | null;
  data_vencimento?: string | null;
  premio_valor?: string | null;
  frequencia_pagamento?: string | null;
  coberturas?: string[] | null;
};

type ExistingClient = { user_id: string; name: string; email: string; cpf: string | null; policiesCount: number };

const SCAN_MESSAGES = [
  "Identificando campos da apólice...",
  "Extraindo dados do segurado...",
  "Lendo número e vigência...",
  "Capturando coberturas...",
  "Verificando seguradora...",
  "Concluindo leitura...",
];

function ImportarApolicePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState(SCAN_MESSAGES[0]);
  const [extracted, setExtracted] = useState<Extracted>({});
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [existingClient, setExistingClient] = useState<ExistingClient | null>(null);
  const [form, setForm] = useState<Extracted>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSummary, setSavedSummary] = useState<{ policyNumber: string; clientName: string; dueDate: string; clientUserId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleFileSelected = (f: File) => {
    if (f.size > 20 * 1024 * 1024) {
      setError("Arquivo maior que 20 MB.");
      return;
    }
    setError(null);
    setFile(f);
    if (f.type.startsWith("image/")) setPreviewUrl(URL.createObjectURL(f));
    else setPreviewUrl(null);
    startExtraction(f);
  };

  const startExtraction = async (f: File) => {
    setStep(2);
    setProgress(0);
    setStatusMsg(SCAN_MESSAGES[0]);

    // Simulated progress while AI runs
    let pct = 0;
    let msgIdx = 0;
    const progressInterval = setInterval(() => {
      pct = Math.min(pct + Math.random() * 7, 92);
      setProgress(pct);
      if (Math.random() > 0.6) {
        msgIdx = (msgIdx + 1) % SCAN_MESSAGES.length;
        setStatusMsg(SCAN_MESSAGES[msgIdx]);
      }
    }, 400);

    try {
      const base64 = await fileToBase64(f);
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch("/api/extract-policy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileBase64: base64, mimeType: f.type || "application/pdf" }),
      });
      clearInterval(progressInterval);
      setProgress(100);

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Falha ao extrair dados.");
        setStep(1);
        return;
      }
      const json = await res.json() as { extracted: Extracted };
      const ext = json.extracted ?? {};
      setExtracted(ext);
      setForm(ext);
      // Mark which fields came from AI
      const filled = new Set<string>();
      Object.entries(ext).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)) {
          filled.add(k);
        }
      });
      setAiFields(filled);

      // Lookup client by CPF/CNPJ
      if (ext.cpf_cnpj) {
        const normalizedCpf = ext.cpf_cnpj.replace(/\D/g, "");
        const { data: profileMatch } = await supabase
          .from("profiles")
          .select("user_id, name, email, cpf");
        const match = (profileMatch ?? []).find(
          (p) => (p.cpf ?? "").replace(/\D/g, "") === normalizedCpf
        );
        if (match) {
          const { count } = await supabase
            .from("policies")
            .select("*", { count: "exact", head: true })
            .eq("user_id", match.user_id);
          setExistingClient({
            user_id: match.user_id,
            name: match.name,
            email: match.email,
            cpf: match.cpf,
            policiesCount: count ?? 0,
          });
        } else {
          setExistingClient(null);
        }
      }

      setTimeout(() => setStep(3), 600);
    } catch (e) {
      clearInterval(progressInterval);
      setError(e instanceof Error ? e.message : "Erro desconhecido");
      setStep(1);
    }
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setError(null);
    try {
      let clientUserId = existingClient?.user_id;

      if (!clientUserId) {
        // Create new auth user via signUp (with a temp password)
        const tempPassword = `Dicoon@${Math.random().toString(36).slice(2, 8)}${Date.now().toString().slice(-4)}`;
        const emailToUse = form.email || `cliente-${Date.now()}@dicoonseguros.com.br`;
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: emailToUse,
          password: tempPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: { name: form.nome_cliente ?? emailToUse.split("@")[0] },
          },
        });
        if (signUpErr) throw signUpErr;
        clientUserId = signUpData.user?.id;
        if (!clientUserId) throw new Error("Não foi possível criar o cliente.");
        // Update profile extra fields
        await supabase.from("profiles").update({
          cpf: form.cpf_cnpj ?? null,
          phone: form.telefone ?? null,
          address: form.endereco ?? null,
          name: form.nome_cliente ?? undefined,
        }).eq("user_id", clientUserId);
      }

      // Create policy
      const { data: newPolicy, error: policyErr } = await supabase.from("policies").insert({
        user_id: clientUserId,
        policy_type: form.tipo_seguro ?? "Outro",
        item_label: form.bem_segurado ?? null,
        policy_number: form.numero_apolice ?? `IMP-${Date.now()}`,
        insurer: form.seguradora ?? "—",
        start_date: form.data_inicio ?? new Date().toISOString().slice(0, 10),
        end_date: form.data_vencimento ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        premium: form.premio_valor ?? null,
        coverages: form.coberturas ?? [],
        status: "active",
      }).select().single();
      if (policyErr) throw policyErr;

      // Upload file
      if (file && newPolicy) {
        const ext = file.name.split(".").pop() ?? "pdf";
        const path = `${clientUserId}/${newPolicy.id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("policy-documents")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (!upErr) {
          await supabase.from("policy_documents").insert({
            policy_id: newPolicy.id,
            user_id: clientUserId,
            file_path: path,
            file_name: file.name,
            doc_type: "apolice",
          });
        }
      }

      setSavedSummary({
        policyNumber: form.numero_apolice ?? newPolicy?.policy_number ?? "—",
        clientName: form.nome_cliente ?? existingClient?.name ?? "Cliente",
        dueDate: form.data_vencimento ?? "—",
        clientUserId: clientUserId!,
      });
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const resetFlow = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStep(1);
    setFile(null);
    setPreviewUrl(null);
    setProgress(0);
    setExtracted({});
    setAiFields(new Set());
    setExistingClient(null);
    setForm({});
    setSavedSummary(null);
    setError(null);
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: BG }}>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4">
        <Link to="/dashboard-admin" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <Shield className="w-6 h-6" style={{ color: PRIMARY }} />
          <span className="text-lg font-bold" style={{ color: PRIMARY }}>Importar apólice com IA</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Stepper step={step} />

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          {step === 1 && (
            <Step1Upload
              onSelect={handleFileSelected}
              fileInputRef={fileInputRef}
              cameraInputRef={cameraInputRef}
            />
          )}
          {step === 2 && (
            <Step2Processing
              file={file}
              previewUrl={previewUrl}
              progress={progress}
              status={statusMsg}
            />
          )}
          {step === 3 && (
            <Step3Review
              extracted={extracted}
              aiFields={aiFields}
              form={form}
              setForm={setForm}
              existingClient={existingClient}
              onCancel={resetFlow}
              onConfirm={handleConfirmSave}
              saving={saving}
            />
          )}
          {step === 4 && savedSummary && (
            <Step4Success
              summary={savedSummary}
              onAnother={resetFlow}
              onSeeClient={() => navigate({ to: "/dashboard-admin" })}
              onSeePolicies={() => navigate({ to: "/dashboard-admin" })}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = ["Enviar arquivo", "Leitura IA", "Revisar dados", "Confirmar"];
  return (
    <div className="flex items-center gap-2 sm:gap-4">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{
                backgroundColor: done || active ? PRIMARY : "#E5E7EB",
                color: done || active ? "white" : "#6B7280",
              }}
            >
              {done ? <CheckCircle2 className="w-4 h-4" /> : n}
            </div>
            <span className={`text-xs sm:text-sm ${active ? "font-semibold text-gray-900" : "text-gray-500"}`}>{label}</span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
          </div>
        );
      })}
    </div>
  );
}

function Step1Upload({
  onSelect, fileInputRef, cameraInputRef,
}: {
  onSelect: (f: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div>
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-emerald-400 transition cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) onSelect(f);
        }}
      >
        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <p className="text-base font-medium text-gray-800">Clique para enviar ou escanear a apólice</p>
        <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG · A IA extrai os dados automaticamente</p>

        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileText className="w-4 h-4" /> Enviar PDF
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Camera className="w-4 h-4" /> Usar câmera
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ScanLine className="w-4 h-4" /> Escanear documento
          </button>
        </div>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 flex gap-3">
        <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <strong>Como funciona:</strong> a IA lê o documento e preenche os campos automaticamente.
          Se o cliente já existir ele é vinculado; se não existir, um novo cadastro é criado.
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); }}
      />
    </div>
  );
}

function Step2Processing({
  file, previewUrl, progress, status,
}: { file: File | null; previewUrl: string | null; progress: number; status: string }) {
  return (
    <div className="text-center py-6">
      <div className="relative mx-auto w-40 h-52 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 mb-6">
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
            <FileText className="w-12 h-12 mb-2" />
            <span className="text-xs px-2 text-center truncate w-full">{file?.name}</span>
          </div>
        )}
        {/* Scanline animation */}
        <div
          className="absolute left-0 right-0 h-1 shadow-[0_0_12px_2px_rgba(29,158,117,0.6)]"
          style={{
            background: "linear-gradient(90deg, transparent, #1D9E75, transparent)",
            animation: "scanline 1.6s linear infinite",
          }}
        />
        <style>{`@keyframes scanline { 0% { top: 0%; } 50% { top: 95%; } 100% { top: 0%; } }`}</style>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-700 mb-3">
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: PRIMARY }} />
        {status}
      </div>

      <div className="max-w-md mx-auto bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: PRIMARY }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">{Math.round(progress)}%</p>
    </div>
  );
}

function Step3Review({
  extracted, aiFields, form, setForm, existingClient, onCancel, onConfirm, saving,
}: {
  extracted: Extracted;
  aiFields: Set<string>;
  form: Extracted;
  setForm: (f: Extracted) => void;
  existingClient: ExistingClient | null;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  const update = (k: keyof Extracted, v: string) => setForm({ ...form, [k]: v });

  return (
    <div>
      {existingClient ? (
        <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
            {existingClient.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              <p className="font-semibold text-emerald-900">{existingClient.name}</p>
            </div>
            <p className="text-xs text-emerald-800">{existingClient.email} · {existingClient.cpf} · {existingClient.policiesCount} apólice(s)</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white">Vincular</span>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 mb-6 flex items-center gap-3">
          <UserPlus className="w-5 h-5 text-amber-700" />
          <p className="text-sm text-amber-900">
            Cliente não encontrado. Um <strong>novo cadastro</strong> será criado automaticamente com os dados extraídos.
          </p>
        </div>
      )}

      <Section title="Dados do cliente">
        <Field label="Nome completo" name="nome_cliente" value={form.nome_cliente ?? ""} onChange={update} ai={aiFields.has("nome_cliente")} />
        <Field label="CPF/CNPJ" name="cpf_cnpj" value={form.cpf_cnpj ?? ""} onChange={update} ai={aiFields.has("cpf_cnpj")} />
        <Field label="E-mail" name="email" value={form.email ?? ""} onChange={update} ai={aiFields.has("email")} />
        <Field label="Telefone" name="telefone" value={form.telefone ?? ""} onChange={update} ai={aiFields.has("telefone")} />
      </Section>

      <Section title="Dados da apólice">
        <Field label="Número da apólice" name="numero_apolice" value={form.numero_apolice ?? ""} onChange={update} ai={aiFields.has("numero_apolice")} />
        <Field label="Seguradora" name="seguradora" value={form.seguradora ?? ""} onChange={update} ai={aiFields.has("seguradora")} />
        <Field label="Tipo de seguro" name="tipo_seguro" value={form.tipo_seguro ?? ""} onChange={update} ai={aiFields.has("tipo_seguro")} />
        <Field label="Bem segurado" name="bem_segurado" value={form.bem_segurado ?? ""} onChange={update} ai={aiFields.has("bem_segurado")} />
        <Field label="Data de início" name="data_inicio" value={form.data_inicio ?? ""} onChange={update} ai={aiFields.has("data_inicio")} type="date" />
        <Field label="Data de vencimento" name="data_vencimento" value={form.data_vencimento ?? ""} onChange={update} ai={aiFields.has("data_vencimento")} type="date" />
        <Field label="Valor do prêmio (R$)" name="premio_valor" value={form.premio_valor ?? ""} onChange={update} ai={aiFields.has("premio_valor")} />
        <div>
          <FieldLabel label="Frequência" ai={aiFields.has("frequencia_pagamento")} />
          <select
            value={form.frequencia_pagamento ?? ""}
            onChange={(e) => update("frequencia_pagamento", e.target.value)}
            className={`w-full px-3 py-2 rounded-md border text-sm ${aiFields.has("frequencia_pagamento") ? "bg-[#F0FFF8] border-[#A8E6CE]" : "border-gray-300"}`}
          >
            <option value="">Selecionar</option>
            <option value="mensal">Mensal</option>
            <option value="anual">Anual</option>
            <option value="semestral">Semestral</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel label="Coberturas (separe por vírgula)" ai={aiFields.has("coberturas")} />
          <textarea
            value={Array.isArray(form.coberturas) ? form.coberturas.join(", ") : (form.coberturas ?? "")}
            onChange={(e) => setForm({ ...form, coberturas: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            rows={2}
            className={`w-full px-3 py-2 rounded-md border text-sm ${aiFields.has("coberturas") ? "bg-[#F0FFF8] border-[#A8E6CE]" : "border-gray-300"}`}
          />
        </div>
      </Section>

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onCancel} className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={saving}
          className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-60 inline-flex items-center gap-2"
          style={{ backgroundColor: PRIMARY }}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Confirmar e salvar
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function FieldLabel({ label, ai }: { label: string; ai: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      {ai && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 inline-flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" /> IA
        </span>
      )}
    </div>
  );
}

function Field({
  label, name, value, onChange, ai, type = "text",
}: {
  label: string;
  name: keyof Extracted;
  value: string;
  onChange: (k: keyof Extracted, v: string) => void;
  ai: boolean;
  type?: string;
}) {
  return (
    <div>
      <FieldLabel label={label} ai={ai} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className={`w-full px-3 py-2 rounded-md border text-sm ${ai ? "bg-[#F0FFF8] border-[#A8E6CE]" : "border-gray-300"}`}
      />
    </div>
  );
}

function Step4Success({
  summary, onAnother, onSeeClient, onSeePolicies,
}: {
  summary: { policyNumber: string; clientName: string; dueDate: string; clientUserId: string };
  onAnother: () => void;
  onSeeClient: () => void;
  onSeePolicies: () => void;
}) {
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-9 h-9 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Apólice importada com sucesso!</h2>
      <p className="text-sm text-gray-500 mt-1">Os dados foram salvos e o cliente pode acessá-los.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 max-w-2xl mx-auto">
        <SummaryCard label="Número" value={summary.policyNumber} />
        <SummaryCard label="Cliente" value={summary.clientName} />
        <SummaryCard label="Vencimento" value={summary.dueDate} />
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <button onClick={onAnother} className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
          Importar outra apólice
        </button>
        <button onClick={onSeeClient} className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
          Ver perfil do cliente
        </button>
        <button onClick={onSeePolicies} className="px-4 py-2 rounded-md text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
          Ver apólices
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-left">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-1 break-words">{value}</p>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
