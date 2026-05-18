import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Shield,
  Upload,
  Camera,
  ScanLine,
  CheckCircle2,
  Sparkles,
  UserCheck,
  UserPlus,
  Loader2,
  FileText,
  Search,
  LogOut,
  User,
  ArrowRight,
  FileSpreadsheet,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  RefreshCw,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { inviteClient } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/dashboard-admin")({
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
  component: AdminDashboard,
});

const PRIMARY = "#1D9E75";
const BG = "#F4F6F9";
const ADMIN_PURPLE = "#7C3AED";

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

type Profile = {
  user_id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
};

type Policy = {
  id: string;
  user_id: string;
  policy_type: string;
  item_label: string | null;
  policy_number: string;
  insurer: string;
  start_date: string;
  end_date: string;
  premium: string | null;
  coverages: string[];
  status: string;
};

const SCAN_MESSAGES = [
  "Identificando campos da apólice...",
  "Extraindo dados do segurado...",
  "Lendo número e vigência...",
  "Capturando coberturas...",
  "Verificando seguradora...",
  "Concluindo leitura...",
];

function AdminDashboard() {
  const navigate = useNavigate();
  
  // App Data State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  // Policy Import Flow State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState(SCAN_MESSAGES[0]);
  const [extracted, setExtracted] = useState<Extracted>({});
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [existingClient, setExistingClient] = useState<Profile | null>(null);
  const [form, setForm] = useState<Extracted>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSummary, setSavedSummary] = useState<{ policyNumber: string; clientName: string; dueDate: string; clientUserId: string } | null>(null);
  
  // Real-time Sync Monitor View State
  const [activeListTab, setActiveListTab] = useState<"policies" | "clients">("policies");
  const [searchTerm, setSearchTerm] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [linkMode, setLinkMode] = useState<"new" | "link">("new");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const invite = useServerFn(inviteClient);

  // Fetch profiles and policies
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, polRes] = await Promise.all([
        supabase.from("profiles").select("*").order("name", { ascending: true }),
        supabase.from("policies").select("*").order("created_at", { ascending: false }),
      ]);
      setProfiles((pRes.data ?? []) as Profile[]);
      setPolicies((polRes.data ?? []) as Policy[]);
    } catch (err) {
      console.error("Erro ao carregar dados do Supabase:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();

    // Subscribe to realtime database changes for instant synchronization
    const channel = supabase
      .channel("admin-realtime-dashboard")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        void (async () => {
          try {
            const [pRes, polRes] = await Promise.all([
              supabase.from("profiles").select("*").order("name", { ascending: true }),
              supabase.from("policies").select("*").order("created_at", { ascending: false }),
            ]);
            setProfiles((pRes.data ?? []) as Profile[]);
            setPolicies((polRes.data ?? []) as Policy[]);
          } catch (err) {
            console.error("Erro na sincronização em tempo real:", err);
          }
        })();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [reload]);

  useEffect(() => {
    if (existingClient && linkMode === "link") {
      setForm((prev) => ({
        ...prev,
        nome_cliente: existingClient.name,
        cpf_cnpj: existingClient.cpf,
        email: existingClient.email,
        telefone: existingClient.phone || prev.telefone || "",
        endereco: existingClient.address || prev.endereco || "",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        nome_cliente: extracted.nome_cliente || "",
        cpf_cnpj: extracted.cpf_cnpj || "",
        email: extracted.email || "",
        telefone: extracted.telefone || "",
        endereco: extracted.endereco || "",
      }));
    }
  }, [existingClient, extracted, linkMode]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

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

    let pct = 0;
    let msgIdx = 0;
    const progressInterval = setInterval(() => {
      pct = Math.min(pct + Math.random() * 8, 92);
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
        setError(j.error ?? "Falha ao extrair dados. Verifique a apólice anexada.");
        setStep(1);
        return;
      }
      
      const json = await res.json() as { extracted: Extracted };
      const ext = json.extracted ?? {};
      setExtracted(ext);
      setForm(ext);
      
      const filled = new Set<string>();
      Object.entries(ext).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)) {
          filled.add(k);
        }
      });
      setAiFields(filled);

      // Automatic matching
      let match: Profile | null = null;
      if (ext.cpf_cnpj) {
        const normalizedCpf = ext.cpf_cnpj.replace(/\D/g, "");
        match = profiles.find((p) => (p.cpf ?? "").replace(/\D/g, "") === normalizedCpf) || null;
      }
      if (!match && ext.email) {
        match = profiles.find((p) => p.email?.toLowerCase() === ext.email?.toLowerCase()) || null;
      }

      if (match) {
        setExistingClient(match);
        setLinkMode("link");
      } else {
        setExistingClient(null);
        setLinkMode("new");
      }

      setTimeout(() => setStep(3), 600);
    } catch (e) {
      clearInterval(progressInterval);
      setError(e instanceof Error ? e.message : "Erro na leitura do arquivo");
      setStep(1);
    }
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setError(null);
    try {
      let clientUserId = linkMode === "link" ? existingClient?.user_id : null;
      const emailToUse = form.email || existingClient?.email || `cliente-${Date.now()}@dicoonseguros.com.br`;
      
      // Upsert profile
      const res = await invite({
        data: {
          email: emailToUse,
          name: form.nome_cliente ?? existingClient?.name ?? emailToUse.split("@")[0],
          cpf: form.cpf_cnpj ?? null,
          phone: form.telefone ?? null,
          address: form.endereco ?? null,
        },
      });
      
      clientUserId = res.userId;
      if (!clientUserId) throw new Error("Erro ao salvar cadastro do cliente no banco.");

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

      // Upload policy document
      if (file && newPolicy) {
        const fileExt = file.name.split(".").pop() ?? "pdf";
        const path = `${clientUserId}/${newPolicy.id}.${fileExt}`;
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
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar informações");
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

  // Filters for Real-time Monitor
  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return profiles;
    const q = searchTerm.toLowerCase();
    return profiles.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.cpf ?? "").includes(q)
    );
  }, [profiles, searchTerm]);

  const filteredPolicies = useMemo(() => {
    const enriched = policies.map((p) => ({
      ...p,
      clientName: profiles.find((pr) => pr.user_id === p.user_id)?.name ?? "Cliente Desconhecido",
    }));
    if (!searchTerm) return enriched;
    const q = searchTerm.toLowerCase();
    return enriched.filter((p) =>
      p.policy_number.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q) ||
      p.insurer.toLowerCase().includes(q) ||
      p.policy_type.toLowerCase().includes(q)
    );
  }, [policies, profiles, searchTerm]);

  // Clients filter for manual selection during review
  const clientSelectionList = useMemo(() => {
    if (!clientSearch) return profiles;
    const q = clientSearch.toLowerCase();
    return profiles.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.cpf ?? "").includes(q)
    );
  }, [profiles, clientSearch]);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: BG }}>
      {/* ── Top Bar ── */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-emerald-50 grid place-items-center">
            <Shield className="w-5 h-5" style={{ color: PRIMARY }} strokeWidth={2.4} />
          </div>
          <div>
            <span className="text-base font-bold text-gray-900 leading-tight block">Dicoon Seguros</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-semibold">Painel Corretor</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: `${PRIMARY}15`, color: PRIMARY }}
          >
            Sincronização Ativa
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* ── Main Layout Grid ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* 🚨 LEFT COLUMN: AI POLICY SCANNER (60%) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm min-h-[500px] flex flex-col">
            <div className="border-b border-gray-100 pb-4 mb-6">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-1">
                <Sparkles className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                <span>Leitor de Apólices Inteligente</span>
              </div>
              <p className="text-xs text-gray-500">
                Arraste ou escaneie o PDF de qualquer apólice. A IA extrairá e cadastrará tudo em tempo real.
              </p>
            </div>

            <Stepper step={step} />

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex items-center gap-2">
                <span className="font-bold">Erro:</span> {error}
              </div>
            )}

            <div className="mt-6 flex-1 flex flex-col justify-center">
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
                  setExistingClient={setExistingClient}
                  linkMode={linkMode}
                  setLinkMode={setLinkMode}
                  clientSearch={clientSearch}
                  setClientSearch={setClientSearch}
                  clientSelectionList={clientSelectionList}
                  onCancel={resetFlow}
                  onConfirm={handleConfirmSave}
                  saving={saving}
                />
              )}
              {step === 4 && savedSummary && (
                <Step4Success
                  summary={savedSummary}
                  onAnother={resetFlow}
                />
              )}
            </div>
          </div>

          {/* 🚨 RIGHT COLUMN: REALTIME SYNC MONITOR (40%) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Monitor de Sincronização
                </h3>
                <p className="text-[11px] text-gray-500">Tabelas atualizadas em tempo real com o portal do cliente</p>
              </div>
              <button
                onClick={reload}
                title="Recarregar"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Search filter */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por nome, CPF ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-emerald-500 transition bg-gray-50/50"
              />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4 bg-gray-50 p-0.5 rounded-lg">
              <button
                onClick={() => setActiveListTab("policies")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${activeListTab === "policies" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
              >
                Apólices ({filteredPolicies.length})
              </button>
              <button
                onClick={() => setActiveListTab("clients")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${activeListTab === "clients" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
              >
                Clientes ({filteredProfiles.length})
              </button>
            </div>

            {/* List Content */}
            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-3">
              {loading && profiles.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span>Conectando ao banco...</span>
                </div>
              ) : activeListTab === "policies" ? (
                filteredPolicies.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-xs">Nenhuma apólice cadastrada.</p>
                ) : (
                  filteredPolicies.map((p) => (
                    <div key={p.id} className="p-3 bg-gray-50 border border-gray-150 rounded-xl hover:border-emerald-300 transition-all text-xs flex justify-between items-start">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900 truncate max-w-[120px]">{p.clientName}</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[10px] text-emerald-700 border border-emerald-100 font-medium">{p.policy_type}</span>
                        </div>
                        <p className="text-gray-500 font-mono text-[10px]">Doc: {p.policy_number}</p>
                        <p className="text-[10px] text-gray-400">Seguradora: {p.insurer}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-800 uppercase">Ativa</span>
                        <p className="text-[9px] text-gray-400 mt-2">Vence: {p.end_date.split("-").reverse().join("/")}</p>
                      </div>
                    </div>
                  ))
                )
              ) : (
                filteredProfiles.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-xs">Nenhum cliente cadastrado.</p>
                ) : (
                  filteredProfiles.map((pr) => (
                    <div key={pr.user_id} className="p-3 bg-gray-50 border border-gray-150 rounded-xl hover:border-emerald-300 transition-all text-xs flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-900">{pr.name}</p>
                        <p className="text-gray-500 font-mono text-[10px]">CPF: {pr.cpf ? pr.cpf : "Não informado"}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{pr.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400">Cadastrado</span>
                        <p className="text-[9px] text-gray-400 mt-2">{new Date(pr.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = ["Enviar PDF", "Leitura IA", "Confirmar e Sincronizar", "Sucesso"];
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center gap-1.5 flex-1 last:flex-initial">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition"
              style={{
                backgroundColor: done || active ? PRIMARY : "#E5E7EB",
                color: done || active ? "white" : "#6B7280",
              }}
            >
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
            </div>
            <span className={`text-[10px] leading-tight truncate hidden md:inline ${active ? "font-bold text-gray-900" : "text-gray-400"}`}>{label}</span>
            {i < steps.length - 1 && <div className="flex-1 h-[2px] bg-gray-200 hidden md:block" />}
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
        className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-emerald-400 transition cursor-pointer bg-gray-50/50"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) onSelect(f);
        }}
      >
        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <p className="text-sm font-semibold text-gray-800">Selecione ou arraste o PDF da apólice</p>
        <p className="text-xs text-gray-400 mt-1">Compatível com PDF e imagens de alta qualidade</p>

        <div className="flex justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <FileText className="w-3.5 h-3.5 text-gray-500" /> Escolher PDF / Imagem
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <Camera className="w-3.5 h-3.5 text-gray-500" /> Escanear Apólice
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
        }}
      />
    </div>
  );
}

function Step2Processing({
  file, previewUrl, progress, status,
}: {
  file: File | null;
  previewUrl: string | null;
  progress: number;
  status: string;
}) {
  return (
    <div className="text-center py-6">
      {previewUrl ? (
        <div className="relative w-28 h-28 mx-auto rounded-lg overflow-hidden border border-gray-200 mb-4 shadow-sm">
          <img src={previewUrl} alt="Preview da apólice" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-16 h-16 mx-auto rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-emerald-600" />
        </div>
      )}

      <p className="text-sm font-semibold text-gray-800 truncate max-w-[280px] mx-auto">
        Lendo {file?.name ?? "documento"}
      </p>

      {/* Progress Bar */}
      <div className="w-full max-w-xs mx-auto bg-gray-150 rounded-full h-2.5 mt-4 overflow-hidden border border-gray-200">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 mt-3 font-semibold">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
        <span>{status}</span>
      </div>
    </div>
  );
}

function Step3Review({
  extracted, aiFields, form, setForm, existingClient, setExistingClient,
  linkMode, setLinkMode, clientSearch, setClientSearch, clientSelectionList,
  onCancel, onConfirm, saving,
}: {
  extracted: Extracted;
  aiFields: Set<string>;
  form: Extracted;
  setForm: React.Dispatch<React.SetStateAction<Extracted>>;
  existingClient: Profile | null;
  setExistingClient: (p: Profile | null) => void;
  linkMode: "new" | "link";
  setLinkMode: (m: "new" | "link") => void;
  clientSearch: string;
  setClientSearch: (s: string) => void;
  clientSelectionList: Profile[];
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleFieldChange = (k: keyof Extracted, v: string) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  return (
    <div className="space-y-6">
      {/* ── Client Link Card ── */}
      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
        <h3 className="text-xs font-bold text-emerald-800 mb-3 flex items-center gap-1.5">
          <User className="w-4 h-4" /> Vínculo Cadastral com o Cliente
        </h3>

        <div className="flex bg-white/70 p-0.5 rounded-lg border border-gray-200 mb-4 max-w-[280px]">
          <button
            type="button"
            onClick={() => { setLinkMode("new"); setExistingClient(null); }}
            className={`flex-1 py-1 text-[11px] font-bold rounded-md transition ${linkMode === "new" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`}
          >
            Novo Cadastro
          </button>
          <button
            type="button"
            onClick={() => { setLinkMode("link"); }}
            className={`flex-1 py-1 text-[11px] font-bold rounded-md transition ${linkMode === "link" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"}`}
          >
            Vincular Existente
          </button>
        </div>

        {linkMode === "new" ? (
          <div className="text-[11px] text-emerald-700 bg-white/70 p-3 rounded-lg border border-emerald-100 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Um novo cliente será convidado e os dados de perfil dele serão criados automaticamente.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar por nome ou e-mail..."
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-emerald-500 bg-white"
              />
              
              {dropdownOpen && clientSelectionList.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-40">
                  {clientSelectionList.map((c) => (
                    <button
                      key={c.user_id}
                      type="button"
                      onClick={() => {
                        setExistingClient(c);
                        setDropdownOpen(false);
                        setClientSearch("");
                      }}
                      className="w-full px-4 py-2 hover:bg-gray-50 text-left text-xs border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <p className="text-gray-500 text-[10px]">{c.email} • CPF: {c.cpf || "—"}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {existingClient ? (
              <div className="p-3 bg-white border border-emerald-100 rounded-lg text-xs flex items-center justify-between shadow-sm">
                <div className="space-y-0.5">
                  <p className="font-bold text-gray-900">{existingClient.name}</p>
                  <p className="text-gray-500 text-[10px]">{existingClient.email} • {existingClient.phone || "Sem telefone"}</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px] uppercase tracking-wide">Vinculado</span>
              </div>
            ) : (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 font-semibold">
                ⚠️ Selecione um cliente cadastrado acima.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Client Data Section ── */}
      <Section title="Dados Pessoais do Segurado">
        <Field
          label="Nome Completo"
          name="nome_cliente"
          value={form.nome_cliente || ""}
          onChange={handleFieldChange}
          ai={aiFields.has("nome_cliente")}
        />
        <Field
          label="CPF / CNPJ"
          name="cpf_cnpj"
          value={form.cpf_cnpj || ""}
          onChange={handleFieldChange}
          ai={aiFields.has("cpf_cnpj")}
        />
        <Field
          label="E-mail de Notificação"
          name="email"
          value={form.email || ""}
          onChange={handleFieldChange}
          ai={aiFields.has("email")}
        />
        <Field
          label="Telefone / Celular"
          name="telefone"
          value={form.telefone || ""}
          onChange={handleFieldChange}
          ai={aiFields.has("telefone")}
        />
        <div className="sm:col-span-2">
          <Field
            label="Endereço de Correspondência"
            name="endereco"
            value={form.endereco || ""}
            onChange={handleFieldChange}
            ai={aiFields.has("endereco")}
          />
        </div>
      </Section>

      {/* ── Policy Data Section ── */}
      <Section title="Especificações Técnicas da Apólice">
        <Field
          label="Número da Apólice"
          name="numero_apolice"
          value={form.numero_apolice || ""}
          onChange={handleFieldChange}
          ai={aiFields.has("numero_apolice")}
        />
        <Field
          label="Companhia Seguradora"
          name="seguradora"
          value={form.seguradora || ""}
          onChange={handleFieldChange}
          ai={aiFields.has("seguradora")}
        />
        <Field
          label="Ramo do Seguro"
          name="tipo_seguro"
          value={form.tipo_seguro || ""}
          onChange={handleFieldChange}
          ai={aiFields.has("tipo_seguro")}
        />
        <Field
          label="Bem Segurado / Descrição"
          name="bem_segurado"
          value={form.bem_segurado || ""}
          onChange={handleFieldChange}
          ai={aiFields.has("bem_segurado")}
        />
        <Field
          label="Início de Vigência"
          name="data_inicio"
          value={form.data_inicio || ""}
          onChange={handleFieldChange}
          ai={aiFields.has("data_inicio")}
          type="date"
        />
        <Field
          label="Vencimento da Vigência"
          name="data_vencimento"
          value={form.data_vencimento || ""}
          onChange={handleFieldChange}
          ai={aiFields.has("data_vencimento")}
          type="date"
        />
        <Field
          label="Prêmio Comercial (R$)"
          name="premio_valor"
          value={form.premio_valor || ""}
          onChange={handleFieldChange}
          ai={aiFields.has("premio_valor")}
        />
        <Field
          label="Frequência de Pagamento"
          name="frequencia_pagamento"
          value={form.frequencia_pagamento || ""}
          onChange={handleFieldChange}
          ai={aiFields.has("frequencia_pagamento")}
        />
      </Section>

      {/* ── Buttons ── */}
      <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-gray-150">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
        >
          Descartar Apólice
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={saving || (linkMode === "link" && !existingClient)}
          className="px-6 py-2.5 rounded-lg text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 flex items-center gap-1.5"
          style={{ backgroundColor: PRIMARY }}
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Sincronizando no banco...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar e Salvar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-4">
      <h4 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wide">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function FieldLabel({ label, ai }: { label: string; ai: boolean }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">{label}</label>
      {ai && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 flex items-center gap-0.5 border border-emerald-200">
          <Sparkles className="w-2.5 h-2.5 fill-emerald-100" /> IA
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
        className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-emerald-500 transition ${ai ? "bg-[#F0FFF8] border-[#A8E6CE]" : "border-gray-200 bg-gray-50/20"}`}
      />
    </div>
  );
}

function Step4Success({
  summary, onAnother,
}: {
  summary: { policyNumber: string; clientName: string; dueDate: string; clientUserId: string };
  onAnother: () => void;
}) {
  return (
    <div className="text-center py-6">
      <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4 border border-emerald-250">
        <CheckCircle2 className="w-7 h-7 text-emerald-600 animate-bounce" />
      </div>
      <h2 className="text-base font-bold text-gray-900">Sincronização Concluída!</h2>
      <p className="text-xs text-gray-500 mt-1">Os dados cadastrais e apólice já estão disponíveis na aba do cliente em tempo real.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 max-w-lg mx-auto bg-gray-50 p-3 rounded-xl border border-gray-150">
        <SummaryCard label="Número da Apólice" value={summary.policyNumber} />
        <SummaryCard label="Cliente Associado" value={summary.clientName} />
        <SummaryCard label="Prazo de Vencimento" value={summary.dueDate.split("-").reverse().join("/")} />
      </div>

      <div className="flex justify-center gap-3 mt-6">
        <button
          onClick={onAnother}
          className="px-6 py-2.5 rounded-lg text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition flex items-center gap-1.5"
          style={{ backgroundColor: PRIMARY }}
        >
          <Plus className="w-3.5 h-3.5" /> Importar outra apólice
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-left">
      <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">{label}</p>
      <p className="text-xs font-bold text-gray-900 mt-0.5 break-words">{value}</p>
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
