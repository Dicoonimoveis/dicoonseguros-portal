import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Shield,
  FileText,
  AlertTriangle,
  Folder,
  Download,
  MessageCircle,
  User,
  LogOut,
  Eye,
  Trash2,
  UploadCloud,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signOut, getCurrentUser, refreshSessionState, onSessionChange, logClientAccess } from "@/lib/auth";

export const Route = createFileRoute("/dashboard-cliente")({
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
    if (isAdmin) {
      throw redirect({ to: "/dashboard-admin" });
    }
  },
  component: ClientDashboard,
});

const PRIMARY = "#1D9E75";
const WHATSAPP = "#25D366";
const WHATSAPP_LINK = "https://wa.me/message/HCHOQ3CXMLGFG1";
const BG = "#F0F2F5";

type NavKey = "apolices" | "sinistros" | "documentos" | "pdfs" | "corretor" | "perfil";

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

type Claim = {
  id: string;
  protocol: string;
  insurance_type: string;
  event_date: string;
  event_type: string;
  status: string;
  indemnity_amount: number | null;
  payment_date: string | null;
};

type ClientDoc = {
  id: string;
  file_path: string;
  file_name: string;
  doc_type: string;
  size_bytes: number;
  created_at: string;
};

type PolicyDoc = {
  id: string;
  policy_id: string;
  file_path: string;
  file_name: string;
  doc_type: string;
  created_at: string;
  policy?: Policy | null;
};

type Profile = {
  user_id: string;
  name: string;
  email: string;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  address: string | null;
};

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - now.getTime()) / 86400000);
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatBRL(v: number | null): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ClientDashboard() {
  const navigate = useNavigate();
  const [sessionUser, setSessionUser] = useState(getCurrentUser());
  const [active, setActive] = useState<NavKey>("apolices");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [clientDocs, setClientDocs] = useState<ClientDoc[]>([]);
  const [policyDocs, setPolicyDocs] = useState<PolicyDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void refreshSessionState().then((u) => setSessionUser(u));
    return onSessionChange(() => setSessionUser(getCurrentUser()));
  }, []);

  useEffect(() => {
    if (sessionUser?.email) {
      logClientAccess(sessionUser.email);
    }
  }, [sessionUser]);

  const userId = sessionUser?.id;

  const loadCore = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [profRes, polRes, claimsRes, docsRes, pdocsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("policies").select("*").eq("user_id", userId).order("end_date"),
        supabase.from("claims").select("*").eq("user_id", userId).order("event_date", { ascending: false }),
        supabase.from("client_documents").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("policy_documents").select("*, policy:policies(*)").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);
      if (profRes.data) setProfile(profRes.data as Profile);
      if (polRes.data) setPolicies(polRes.data as Policy[]);
      setClaims((claimsRes.data as Claim[]) ?? []);
      setClientDocs((docsRes.data as ClientDoc[]) ?? []);
      setPolicyDocs((pdocsRes.data as PolicyDoc[]) ?? []);
    } catch (err) {
      console.error("Erro ao carregar dados do cliente em tempo real:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadCore();

    if (!userId) return;

    // Supabase Realtime - Listen explicitly on all tables for any admin/client updates
    const channel = supabase
      .channel(`client-realtime-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` },
        () => { void loadCore(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "policies", filter: `user_id=eq.${userId}` },
        () => { void loadCore(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "claims", filter: `user_id=eq.${userId}` },
        () => { void loadCore(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_documents", filter: `user_id=eq.${userId}` },
        () => { void loadCore(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "policy_documents", filter: `user_id=eq.${userId}` },
        () => { void loadCore(); }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, loadCore]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const initials = useMemo(() => {
    const name = profile?.name ?? sessionUser?.name ?? sessionUser?.email ?? "U";
    return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  }, [profile, sessionUser]);

  const displayName = profile?.name ?? sessionUser?.name ?? sessionUser?.email ?? "Cliente";
  const isPending = profile?.status === "pending";

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: BG, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6" style={{ color: PRIMARY }} strokeWidth={2.4} />
          <span className="text-base sm:text-lg font-bold" style={{ color: PRIMARY }}>Dicoon Seguros</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="text-sm text-gray-600 hidden sm:block">
            Olá, <span className="font-semibold text-gray-900">{displayName.split(" ").slice(0, 2).join(" ")}</span>
          </span>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: PRIMARY }}>
            {initials}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      {!isPending && (
        <aside className="fixed top-16 bottom-0 left-0 z-20 hidden md:block bg-gray-50 border-r border-gray-200 py-4 px-2" style={{ width: 185 }}>
          <nav className="space-y-0.5">
            <NavItem icon={<FileText className="w-4 h-4" />} label="Minhas apólices" k="apolices" active={active} onClick={setActive} />
            <NavItem icon={<AlertTriangle className="w-4 h-4" />} label="Sinistros" k="sinistros" active={active} onClick={setActive} />
            <NavItem icon={<Folder className="w-4 h-4" />} label="Meus documentos" k="documentos" active={active} onClick={setActive} />
            <NavItem icon={<Download className="w-4 h-4" />} label="Apólices / PDFs" k="pdfs" active={active} onClick={setActive} />
            <NavItem icon={<MessageCircle className="w-4 h-4" />} label="Falar com corretor" k="corretor" active={active} onClick={setActive} />
            <NavItem icon={<User className="w-4 h-4" />} label="Dados pessoais" k="perfil" active={active} onClick={setActive} />
          </nav>
        </aside>
      )}

      {/* Mobile bottom nav */}
      {!isPending && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 grid grid-cols-6 text-[10px]">
          {[
            { k: "apolices" as const, icon: <FileText className="w-4 h-4 mx-auto" />, l: "Apólices" },
            { k: "sinistros" as const, icon: <AlertTriangle className="w-4 h-4 mx-auto" />, l: "Sinistros" },
            { k: "documentos" as const, icon: <Folder className="w-4 h-4 mx-auto" />, l: "Docs" },
            { k: "pdfs" as const, icon: <Download className="w-4 h-4 mx-auto" />, l: "PDFs" },
            { k: "corretor" as const, icon: <MessageCircle className="w-4 h-4 mx-auto" />, l: "Corretor" },
            { k: "perfil" as const, icon: <User className="w-4 h-4 mx-auto" />, l: "Perfil" },
          ].map((it) => (
            <button key={it.k} onClick={() => setActive(it.k)} className="py-2" style={{ color: active === it.k ? PRIMARY : "#6b7280" }}>
              {it.icon}<div>{it.l}</div>
            </button>
          ))}
        </nav>
      )}

      {/* Main */}
      <main className={`pt-16 pb-20 md:pb-0 ${isPending ? "w-full" : "md:pl-[185px]"}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : isPending ? (
            <PendingApprovalView profile={profile!} docs={clientDocs} onReload={loadCore} />
          ) : (
            <>
              {active === "apolices" && <PoliciesView policies={policies} userId={userId!} />}
              {active === "sinistros" && <ClaimsView userId={userId!} claims={claims} loading={false} />}
              {active === "documentos" && <DocumentsView userId={userId!} docs={clientDocs} loading={false} onReload={loadCore} />}
              {active === "pdfs" && <PdfsView userId={userId!} docs={policyDocs} loading={false} />}
              {active === "corretor" && <BrokerView policies={policies} />}
              {active === "perfil" && <ProfileView profile={profile} initials={initials} onProfileChange={loadCore} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, k, active, onClick }: { icon: React.ReactNode; label: string; k: NavKey; active: NavKey; onClick: (k: NavKey) => void }) {
  const isActive = active === k;
  return (
    <button
      onClick={() => onClick(k)}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-left transition"
      style={
        isActive
          ? { backgroundColor: "white", color: PRIMARY, borderLeft: `3px solid ${PRIMARY}`, paddingLeft: "9px" }
          : { color: "#4B5563" }
      }
    >
      <span style={{ color: isActive ? PRIMARY : "#9CA3AF" }}>{icon}</span>
      {label}
    </button>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
      <h1 className="text-xl font-semibold text-gray-900">{children}</h1>
      {action}
    </div>
  );
}

function WaButton({ children, className = "", full = false }: { children: React.ReactNode; className?: string; full?: boolean }) {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white hover:brightness-110 transition ${full ? "w-full" : ""} ${className}`}
      style={{ backgroundColor: WHATSAPP }}
    >
      <MessageCircle className="w-3.5 h-3.5" />
      {children}
    </a>
  );
}

/* ============== POLICIES VIEW ============== */
function PoliciesView({ policies, userId }: { policies: Policy[]; userId: string }) {
  const expiring7 = policies.filter((p) => { const d = daysUntil(p.end_date); return d >= 0 && d <= 7; });
  const expiring30 = policies.filter((p) => { const d = daysUntil(p.end_date); return d > 7 && d <= 30; });

  return (
    <>
      <SectionTitle>Minhas apólices</SectionTitle>

      {(expiring7.length > 0 || expiring30.length > 0) && (
        <div className="space-y-3 mb-6">
          {expiring7.map((p) => (
            <div key={p.id} className="rounded-xl bg-white p-4 flex items-center justify-between gap-3 flex-wrap" style={{ border: "1px solid #fee2e2", borderLeft: "4px solid #E24B4A" }}>
              <div className="flex items-start gap-3 min-w-0">
                <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: "#E24B4A" }} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Apólice vence em {daysUntil(p.end_date)} dia(s) — {p.policy_type}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{p.item_label ? `${p.item_label} · ` : ""}Vence em {formatDate(p.end_date)}</p>
                </div>
              </div>
              <WaButton>Renovar via WhatsApp</WaButton>
            </div>
          ))}
          {expiring30.map((p) => (
            <div key={p.id} className="rounded-xl bg-white p-4 flex items-center gap-3" style={{ border: "1px solid #fef3c7", borderLeft: "4px solid #EF9F27" }}>
              <AlertTriangle className="w-5 h-5" style={{ color: "#EF9F27" }} />
              <div>
                <p className="text-sm font-semibold text-gray-900">Vencimento em {daysUntil(p.end_date)} dias — {p.policy_type}</p>
                <p className="text-xs text-gray-600 mt-0.5">Vence em {formatDate(p.end_date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {policies.length === 0 ? (
        <EmptyState icon={<FileText className="w-10 h-10" />} title="Nenhuma apólice cadastrada" description="Suas apólices aparecerão aqui assim que o corretor cadastrá-las." />
      ) : (
        <div className="space-y-4">
          {policies.map((p) => <PolicyCard key={p.id} policy={p} userId={userId} />)}
        </div>
      )}
    </>
  );
}

function PolicyCard({ policy, userId: _userId }: { policy: Policy; userId: string }) {
  const days = daysUntil(policy.end_date);
  const isExpired = days < 0;
  const isUrgent = !isExpired && days <= 7;
  const isWarn = !isExpired && days > 7 && days <= 30;

  const barColor = isExpired ? "#9CA3AF" : isUrgent ? "#E24B4A" : isWarn ? "#EF9F27" : PRIMARY;
  const totalDays = Math.max(1, Math.round((new Date(policy.end_date).getTime() - new Date(policy.start_date).getTime()) / 86400000));
  const elapsed = Math.max(0, Math.min(100, ((totalDays - Math.max(0, days)) / totalDays) * 100));

  const badge = isExpired
    ? { text: "Vencida", bg: "#F3F4F6", color: "#4B5563" }
    : isUrgent
      ? { text: `Vence em ${days} dia(s)`, bg: "#FEE2E2", color: "#B91C1C" }
      : isWarn
        ? { text: `Vence em ${days} dias`, bg: "#FEF3C7", color: "#B45309" }
        : { text: "Ativa", bg: "#D1FAE5", color: "#047857" };

  const handleDownload = async () => {
    const { data: docs } = await supabase
      .from("policy_documents")
      .select("file_path,file_name")
      .eq("policy_id", policy.id)
      .eq("doc_type", "apolice")
      .order("created_at", { ascending: false })
      .limit(1);
    if (!docs || docs.length === 0) {
      alert("Nenhum PDF disponível para esta apólice ainda.");
      return;
    }
    const { data, error } = await supabase.storage.from("policy-documents").createSignedUrl(docs[0].file_path, 60);
    if (error || !data) { alert("Não foi possível gerar o download."); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">
            {policy.policy_type}
            {policy.item_label && <span className="text-gray-500 font-normal"> · {policy.item_label}</span>}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Apólice {policy.policy_number} · {policy.insurer}</p>
          <p className="text-xs text-gray-600 mt-1">
            Vigência: {formatDate(policy.start_date)} a <span className="font-semibold text-gray-900">{formatDate(policy.end_date)}</span>
            {policy.premium && <> · Prêmio: {policy.premium}</>}
          </p>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ backgroundColor: badge.bg, color: badge.color }}>
          {badge.text}
        </span>
      </div>

      {policy.coverages.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {policy.coverages.map((c) => (
            <span key={c} className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{c}</span>
          ))}
        </div>
      )}

      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
        <div className="h-full rounded-full transition-all" style={{ width: `${elapsed}%`, backgroundColor: barColor }} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
          <Eye className="w-3.5 h-3.5" /> Ver detalhes
        </button>
        <button onClick={handleDownload} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-50 transition" style={{ border: `1px solid ${PRIMARY}`, color: PRIMARY }}>
          <Download className="w-3.5 h-3.5" /> Baixar PDF
        </button>
        {(isUrgent || isWarn) && <WaButton className="ml-auto">Renovar via WhatsApp</WaButton>}
      </div>
    </div>
  );
}

/* ============== CLAIMS VIEW ============== */
function ClaimsView({ userId, claims: initialClaims, loading: parentLoading }: { userId: string; claims?: Claim[]; loading?: boolean }) {
  const [claims, setClaims] = useState<Claim[]>(initialClaims ?? []);
  const [loading, setLoading] = useState(parentLoading ?? true);

  useEffect(() => {
    if (initialClaims) {
      setClaims(initialClaims);
      setLoading(parentLoading ?? false);
    }
  }, [initialClaims, parentLoading]);

  useEffect(() => {
    if (!initialClaims) {
      void supabase.from("claims").select("*").eq("user_id", userId).order("event_date", { ascending: false })
        .then(({ data }) => { setClaims((data as Claim[]) ?? []); setLoading(false); });
    }
  }, [userId, initialClaims]);

  const statusBadge = (s: string) => {
    const map: Record<string, { t: string; bg: string; c: string }> = {
      em_analise: { t: "Em análise", bg: "#DBEAFE", c: "#1D4ED8" },
      aguardando_documentos: { t: "Aguardando documentos", bg: "#FEF3C7", c: "#B45309" },
      concluido: { t: "Concluído", bg: "#D1FAE5", c: "#047857" },
      negado: { t: "Negado", bg: "#FEE2E2", c: "#B91C1C" },
    };
    return map[s] ?? { t: s, bg: "#F3F4F6", c: "#374151" };
  };

  return (
    <>
      <SectionTitle action={<WaButton>+ Abrir sinistro via WhatsApp</WaButton>}>Sinistros</SectionTitle>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : claims.length === 0 ? (
        <EmptyState icon={<AlertTriangle className="w-10 h-10" />} title="Nenhum sinistro registrado" description="Quando você abrir um sinistro, ele aparecerá aqui." />
      ) : (
        <div className="space-y-3">
          {claims.map((c) => {
            const b = statusBadge(c.status);
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Protocolo {c.protocol}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.insurance_type} · {c.event_type} · {formatDate(c.event_date)}</p>
                    {c.status === "concluido" && (
                      <p className="text-xs text-gray-700 mt-2">
                        Indenização: <span className="font-semibold">{formatBRL(c.indemnity_amount)}</span> · Pago em {formatDate(c.payment_date)}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ backgroundColor: b.bg, color: b.c }}>{b.t}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    <Eye className="w-3.5 h-3.5" /> Ver acompanhamento
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    <Folder className="w-3.5 h-3.5" /> Documentos
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ============== DOCUMENTS VIEW (uploads pessoais) ============== */
const DOC_TYPES = ["CNH", "RG", "Comprovante de endereço", "Comprovante de renda", "Certidão", "Outro"];
const MAX_SIZE = 10 * 1024 * 1024;

function DocumentsView({ userId, docs: initialDocs, loading: parentLoading, onReload }: { userId: string; docs?: ClientDoc[]; loading?: boolean; onReload?: () => void }) {
  const [docs, setDocs] = useState<ClientDoc[]>(initialDocs ?? []);
  const [loading, setLoading] = useState(parentLoading ?? true);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>("CNH");
  const [docTypeOther, setDocTypeOther] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialDocs) {
      setDocs(initialDocs);
      setLoading(parentLoading ?? false);
    }
  }, [initialDocs, parentLoading]);

  const load = useCallback(async () => {
    if (onReload) {
      onReload();
      return;
    }
    const { data } = await supabase.from("client_documents").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setDocs((data as ClientDoc[]) ?? []);
    setLoading(false);
  }, [userId, onReload]);

  useEffect(() => {
    if (!initialDocs) {
      void load();
    }
  }, [userId, initialDocs, load]);

  const handleFile = (file: File) => {
    if (!["application/pdf", "image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      alert("Formato não suportado. Use PDF, JPG ou PNG.");
      return;
    }
    if (file.size > MAX_SIZE) {
      alert("Arquivo maior que 10 MB.");
      return;
    }
    setPendingFile(file);
  };

  const confirmUpload = async () => {
    if (!pendingFile) return;
    const finalType = docType === "Outro" ? (docTypeOther.trim() || "Outro") : docType;
    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage.from("client-documents").upload(path, pendingFile, { contentType: pendingFile.type });
      if (up.error) throw up.error;
      const ins = await supabase.from("client_documents").insert({
        user_id: userId,
        file_path: path,
        file_name: pendingFile.name,
        doc_type: finalType,
        size_bytes: pendingFile.size,
        mime_type: pendingFile.type,
      });
      if (ins.error) throw ins.error;
      setPendingFile(null);
      setDocTypeOther("");
      setDocType("CNH");
      await load();
    } catch (e: any) {
      alert("Erro ao enviar: " + (e.message ?? "tente novamente"));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (d: ClientDoc) => {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(d.file_path, 60);
    if (error || !data) { alert("Não foi possível gerar o download."); return; }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (d: ClientDoc) => {
    if (!confirm(`Excluir "${d.file_name}"? Esta ação não pode ser desfeita.`)) return;
    await supabase.storage.from("client-documents").remove([d.file_path]);
    await supabase.from("client_documents").delete().eq("id", d.id);
    await load();
  };

  return (
    <>
      <SectionTitle>Meus documentos</SectionTitle>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
        className="bg-white rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition mb-4"
        style={{ borderColor: dragOver ? PRIMARY : "#D1D5DB", backgroundColor: dragOver ? `${PRIMARY}08` : "white" }}
      >
        <UploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-2" />
        <p className="text-sm font-medium text-gray-900">Arraste um arquivo ou clique para selecionar</p>
        <p className="text-xs text-gray-500 mt-1">PDF, JPG ou PNG · até 10 MB</p>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }} />
      </div>

      {pendingFile && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <p className="text-sm font-medium text-gray-900 mb-3">Arquivo: <span className="font-normal text-gray-600">{pendingFile.name}</span></p>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo do documento</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full text-sm rounded-md border border-gray-300 px-3 py-2 mb-2">
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {docType === "Outro" && (
            <input value={docTypeOther} onChange={(e) => setDocTypeOther(e.target.value)} placeholder="Descreva o tipo" className="w-full text-sm rounded-md border border-gray-300 px-3 py-2 mb-2" />
          )}
          <div className="flex gap-2">
            <button onClick={confirmUpload} disabled={uploading} className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>
              {uploading ? "Enviando..." : "Confirmar envio"}
            </button>
            <button onClick={() => setPendingFile(null)} className="px-4 py-2 rounded-md border border-gray-300 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">Nenhum documento enviado ainda.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docs.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ backgroundColor: `${PRIMARY}15`, color: PRIMARY }}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.file_name}</p>
                  <p className="text-xs text-gray-500">{d.doc_type} · {(d.size_bytes / 1024).toFixed(0)} KB</p>
                  <p className="text-xs text-gray-400 mt-0.5">Enviado em {new Date(d.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDownload(d)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium hover:bg-gray-50">
                  <Download className="w-3.5 h-3.5" /> Baixar
                </button>
                <button onClick={() => handleDelete(d)} className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium text-white" style={{ backgroundColor: "#DC2626" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-6">
        🔒 Seus documentos são privados e armazenados com segurança. Somente você tem acesso a eles.
      </p>
    </>
  );
}

/* ============== PDFs VIEW ============== */
function PdfsView({ userId, docs: initialDocs, loading: parentLoading }: { userId: string; docs?: PolicyDoc[]; loading?: boolean }) {
  const [docs, setDocs] = useState<PolicyDoc[]>(initialDocs ?? []);
  const [loading, setLoading] = useState(parentLoading ?? true);

  useEffect(() => {
    if (initialDocs) {
      setDocs(initialDocs);
      setLoading(parentLoading ?? false);
    }
  }, [initialDocs, parentLoading]);

  useEffect(() => {
    if (!initialDocs) {
      void supabase
        .from("policy_documents")
        .select("*, policy:policies(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .then(({ data }) => { setDocs((data as PolicyDoc[]) ?? []); setLoading(false); });
    }
  }, [userId, initialDocs]);

  const typeBadge = (t: string) => {
    if (t === "apolice") return { t: "Apólice", bg: "#DBEAFE", c: "#1D4ED8" };
    if (t === "recibo") return { t: "Recibo", bg: "#D1FAE5", c: "#047857" };
    if (t === "endosso") return { t: "Endosso", bg: "#FEF3C7", c: "#B45309" };
    return { t, bg: "#F3F4F6", c: "#374151" };
  };

  const handleDownload = async (d: PolicyDoc) => {
    const { data, error } = await supabase.storage.from("policy-documents").createSignedUrl(d.file_path, 60);
    if (error || !data) { alert("Não foi possível gerar o download."); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <>
      <SectionTitle>Apólices / PDFs</SectionTitle>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : docs.length === 0 ? (
        <EmptyState icon={<Download className="w-10 h-10" />} title="Nenhum PDF disponível" description="Os PDFs que o corretor anexar às suas apólices aparecerão aqui." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Documento</th>
                <th className="text-left px-4 py-3 font-medium">Apólice</th>
                <th className="text-left px-4 py-3 font-medium">Vigência</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map((d) => {
                const b = typeBadge(d.doc_type);
                return (
                  <tr key={d.id}>
                    <td className="px-4 py-3 text-gray-900">{d.file_name}</td>
                    <td className="px-4 py-3 text-gray-600">{d.policy?.policy_number ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{d.policy ? `${formatDate(d.policy.start_date)} – ${formatDate(d.policy.end_date)}` : "—"}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: b.bg, color: b.c }}>{b.t}</span></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDownload(d)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-50" style={{ border: `1px solid ${PRIMARY}`, color: PRIMARY }}>
                        <Download className="w-3.5 h-3.5" /> Baixar PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-3">Os PDFs disponíveis são os arquivos anexados pelo seu corretor.</p>
    </>
  );
}

/* ============== BROKER VIEW ============== */
function BrokerView({ policies }: { policies: Policy[] }) {
  const [policyId, setPolicyId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const buildWaLink = () => {
    const pol = policies.find((p) => p.id === policyId);
    const text = encodeURIComponent(
      `Olá! ${pol ? `Sobre a apólice ${pol.policy_number} (${pol.policy_type}). ` : ""}${subject ? `Assunto: ${subject}. ` : ""}${message}`
    );
    return `https://wa.me/5551982367904?text=${text}`;
  };

  return (
    <>
      <SectionTitle>Falar com corretor</SectionTitle>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Enviar mensagem</h3>
          <label className="block text-xs font-medium text-gray-700 mb-1">Apólice relacionada</label>
          <select value={policyId} onChange={(e) => setPolicyId(e.target.value)} className="w-full text-sm rounded-md border border-gray-300 px-3 py-2 mb-3">
            <option value="">Outro assunto</option>
            {policies.map((p) => <option key={p.id} value={p.id}>{p.policy_type} {p.policy_number}</option>)}
          </select>
          <label className="block text-xs font-medium text-gray-700 mb-1">Assunto</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Dúvida sobre renovação" className="w-full text-sm rounded-md border border-gray-300 px-3 py-2 mb-3" />
          <label className="block text-xs font-medium text-gray-700 mb-1">Mensagem</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Descreva sua dúvida ou solicitação..." className="w-full text-sm rounded-md border border-gray-300 px-3 py-2 mb-4 resize-none" />
          <a href={buildWaLink()} target="_blank" rel="noreferrer" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold text-white hover:brightness-110" style={{ backgroundColor: WHATSAPP }}>
            <MessageCircle className="w-4 h-4" /> Enviar pelo WhatsApp
          </a>
        </div>

        <div className="space-y-3">
          <ContactCard
            icon={<MessageCircle className="w-5 h-5" />}
            iconBg={`${WHATSAPP}20`}
            iconColor={WHATSAPP}
            label="WhatsApp"
            value="(51) 98236-7904"
            actionLabel="Abrir"
            href={WHATSAPP_LINK}
          />
          <ContactCard icon={<Mail className="w-5 h-5" />} iconBg="#FEF3C7" iconColor="#B45309" label="E-mail" value="contato@dicoonseguros.com.br" />
          <ContactCard icon={<Phone className="w-5 h-5" />} iconBg="#FEF3C7" iconColor="#B45309" label="Telefone" value="(51) 98236-7904" />
          <div className="bg-white rounded-xl border p-4 flex items-center gap-3" style={{ borderColor: `${PRIMARY}40`, backgroundColor: `${PRIMARY}10` }}>
            <Clock className="w-5 h-5" style={{ color: PRIMARY }} />
            <p className="text-sm font-medium" style={{ color: PRIMARY }}>Atendimento: Seg–Sex, 8h às 18h</p>
          </div>
        </div>
      </div>
    </>
  );
}

function ContactCard({ icon, iconBg, iconColor, label, value, actionLabel, href }: { icon: React.ReactNode; iconBg: string; iconColor: string; label: string; value: string; actionLabel?: string; href?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg, color: iconColor }}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
        </div>
      </div>
      {actionLabel && href && (
        <a href={href} target="_blank" rel="noreferrer" className="px-4 py-1.5 rounded-md text-xs font-semibold text-white shrink-0" style={{ backgroundColor: WHATSAPP }}>{actionLabel}</a>
      )}
    </div>
  );
}

/* ============== PROFILE VIEW ============== */
function ProfileView({ profile, initials, onProfileChange }: { profile: Profile | null; initials: string; onProfileChange: () => void }) {
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Sync state with profile data on load/update
  useEffect(() => {
    if (profile) {
      setCpf(profile.cpf ?? "");
      setBirthDate(profile.birth_date ?? "");
      setPhone(profile.phone ?? "");
      setAddress(profile.address ?? "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.user_id) return;
    setSaving(true);
    setMsg(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          phone: phone.trim() || null,
        })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      setMsg({ type: "ok", text: "Dados de contato atualizados com sucesso!" });
      onProfileChange(); // Trigger parent loadCore to sync state

      // Clear success message after 3 seconds
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      console.error("Erro ao salvar perfil:", err);
      setMsg({ type: "err", text: err.message ?? "Erro ao salvar alterações." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionTitle>Dados pessoais</SectionTitle>
      <div className="max-w-2xl">
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold shrink-0" style={{ backgroundColor: PRIMARY }}>
              {initials}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">{profile?.name ?? "—"}</p>
              <p className="text-xs text-gray-500">{profile?.email ?? "—"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome Completo (Leitura) */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Nome completo</label>
              <input
                type="text"
                value={profile?.name ?? ""}
                disabled
                className="w-full text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500 cursor-not-allowed outline-none"
              />
            </div>

            {/* E-mail (Leitura) */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">E-mail</label>
              <input
                type="email"
                value={profile?.email ?? ""}
                disabled
                className="w-full text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500 cursor-not-allowed outline-none"
              />
            </div>

            {/* CPF (Leitura) */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">CPF</label>
              <input
                type="text"
                value={cpf}
                disabled
                className="w-full text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500 cursor-not-allowed outline-none"
              />
            </div>

            {/* Data de Nascimento (Leitura) */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Data de nascimento</label>
              <input
                type="date"
                value={birthDate}
                disabled
                className="w-full text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500 cursor-not-allowed outline-none"
              />
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: (51) 99999-9999"
                className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offset-1 transition"
                style={{ "--tw-ring-color": PRIMARY } as React.CSSProperties}
              />
            </div>

            {/* Endereço (Leitura) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Endereço</label>
              <input
                type="text"
                value={address}
                disabled
                className="w-full text-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500 cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 p-3.5 rounded-lg leading-relaxed">
            ℹ️ Por motivos de conformidade legal (LGPD) e segurança contratual das apólices, os dados cadastrais estruturais (Nome, CPF, Data de Nascimento e Endereço) são mantidos diretamente pelo seu corretor de seguros. Caso precise alterá-los ou queira solicitar a exclusão de sua conta, por favor entre em contato com o corretor na aba <strong>Falar com corretor</strong>.
          </div>

          {msg && (
            <div
              className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg border transition animate-pulse"
              style={
                msg.type === "ok"
                  ? { backgroundColor: "#E6F4EA", borderColor: "#A3CFBB", color: "#137333" }
                  : { backgroundColor: "#FCE8E6", borderColor: "#F5C2C7", color: "#C5221F" }
              }
            >
              {msg.type === "ok" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              <span className="font-medium">{msg.text}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60 transition shadow-sm"
              style={{ backgroundColor: PRIMARY }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Salvar Alterações
            </button>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white hover:brightness-110 transition shadow-sm"
              style={{ backgroundColor: WHATSAPP }}
            >
              <MessageCircle className="w-4 h-4" /> Falar com Corretor
            </a>
          </div>

          <p className="text-[11px] text-gray-400 text-center">
            Qualquer alteração em seus dados será imediatamente sincronizada com a corretora.
          </p>
        </form>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 text-right">{value || "—"}</dd>
    </div>
  );
}

function Field({ label, type = "text", value, onChange }: { label: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full text-sm rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offset-1" style={{ "--tw-ring-color": PRIMARY } as React.CSSProperties} required />
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 py-16 px-6 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  );
}

/* ============== PENDING APPROVAL VIEW ============== */
function PendingApprovalView({ profile, docs, onReload }: { profile: Profile; docs: ClientDoc[]; onReload: () => void }) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>("CNH");
  const [docTypeOther, setDocTypeOther] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!["application/pdf", "image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      alert("Formato não suportado. Use PDF, JPG ou PNG.");
      return;
    }
    if (file.size > MAX_SIZE) {
      alert("Arquivo maior que 10 MB.");
      return;
    }
    setPendingFile(file);
  };

  const confirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop();
      const path = `${profile.user_id}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("client-documents")
        .upload(path, pendingFile);

      if (uploadError) throw uploadError;

      const finalType = docType === "Outro" ? (docTypeOther.trim() || "Outro") : docType;

      const { error: dbError } = await supabase
        .from("client_documents")
        .insert({
          user_id: profile.user_id,
          file_name: pendingFile.name,
          file_path: path,
          doc_type: finalType,
          size_bytes: pendingFile.size,
        });

      if (dbError) throw dbError;

      setPendingFile(null);
      setDocTypeOther("");
      onReload();
    } catch (err: any) {
      console.error(err);
      alert("Erro ao enviar: " + (err.message ?? err));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (d: ClientDoc) => {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(d.file_path, 60);
    if (error || !data) { alert("Não foi possível gerar o download."); return; }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (d: ClientDoc) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    try {
      await supabase.storage.from("client-documents").remove([d.file_path]);
      await supabase.from("client_documents").delete().eq("id", d.id);
      onReload();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-4">
      {/* Status card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-center shadow-sm">
        <div className="w-16 h-16 bg-[#DBEAFE] text-[#1D4ED8] rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Cadastro em Análise</h2>
        <p className="text-sm text-gray-600 max-w-lg mx-auto leading-relaxed mb-6">
          Olá, <span className="font-semibold">{profile.name}</span>! Seu cadastro foi recebido com sucesso.
          Nossos corretores estão analisando as suas informações para liberar o acesso completo ao portal.
          Você receberá uma confirmação por e-mail assim que seu acesso for ativado.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://wa.me/5551982367904?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20o%20status%20do%20meu%20cadastro%20no%20portal%20Dicoon%20Seguros."
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition hover:brightness-110 shadow-sm"
            style={{ backgroundColor: WHATSAPP }}
          >
            <MessageCircle className="w-4 h-4" /> Falar com corretor no WhatsApp
          </a>
        </div>
      </div>

      {/* Document Uploader Area */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Folder className="w-5 h-5 text-gray-400" /> Enviar documentos para análise
        </h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Para agilizar a sua aprovação, por favor anexe fotos legíveis ou PDFs do seu documento de identificação (RG ou CNH) e um comprovante de residência recente.
        </p>

        {/* Upload box */}
        {!pendingFile ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              dragOver ? "border-emerald-500 bg-emerald-50/20" : "border-gray-300 hover:border-emerald-500 hover:bg-gray-50/50"
            }`}
          >
            <input type="file" ref={inputRef} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} accept=".pdf,image/*" className="hidden" />
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Clique para selecionar ou arraste o arquivo aqui</p>
            <p className="text-xs text-gray-400 mt-1">PDF, JPG ou PNG (Máximo 10 MB)</p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-8 h-8 text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{pendingFile.name}</p>
                <p className="text-xs text-gray-500">{(pendingFile.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de documento</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 bg-white outline-none">
                  {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {docType === "Outro" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Especificar tipo</label>
                  <input type="text" value={docTypeOther} onChange={(e) => setDocTypeOther(e.target.value)} placeholder="Ex: Cópia CNH" className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 outline-none" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setPendingFile(null)} disabled={uploading} className="px-4 py-2 text-xs font-semibold text-gray-500 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={confirmUpload} disabled={uploading} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition hover:brightness-110 disabled:opacity-60" style={{ backgroundColor: PRIMARY }}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {uploading ? "Enviando..." : "Confirmar Envio"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Documentos Enviados ({docs.length})</h3>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Nenhum documento enviado ainda.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {docs.map((d) => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${PRIMARY}15`, color: PRIMARY }}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.file_name}</p>
                    <p className="text-xs text-gray-500">{d.doc_type} · {(d.size_bytes / 1024).toFixed(0)} KB</p>
                    <p className="text-xs text-gray-400 mt-0.5">Enviado em {new Date(d.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDownload(d)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium hover:bg-gray-50 text-gray-700">
                    <Download className="w-3.5 h-3.5" /> Baixar
                  </button>
                  <button onClick={() => handleDelete(d)} className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium text-white hover:brightness-110" style={{ backgroundColor: "#DC2626" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
