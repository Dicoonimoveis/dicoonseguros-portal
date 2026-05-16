import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Shield, LayoutDashboard, Users, FileText, CalendarClock, AlertTriangle,
  BarChart3, Settings, LogOut, Bell, Plus, Search, Upload, ScanLine,
  Download, Trash2, MessageCircle, Eye, Pencil, X, FileSpreadsheet,
  Sparkles, TrendingUp, DollarSign, Activity, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/dashboard-admin")({
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", sessionData.session.user.id);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw redirect({ to: "/dashboard-cliente" });
  },
  component: AdminDashboard,
});

const PRIMARY = "#1D9E75";
const BG = "#F0F2F5";
const ADMIN_PURPLE = "#7C3AED";
const WHATSAPP = "#25D366";
const WA_LINK = "https://wa.me/message/HCHOQ3CXMLGFG1";

type NavKey =
  | "dashboard" | "clientes" | "apolices" | "vencimentos" | "sinistros"
  | "documentos" | "importar" | "relatorios" | "configuracoes";

type Profile = { user_id: string; name: string; email: string; cpf: string | null; phone: string | null; created_at: string };
type Policy = {
  id: string; user_id: string; policy_type: string; item_label: string | null;
  policy_number: string; insurer: string; start_date: string; end_date: string;
  premium: string | null; coverages: string[]; status: string;
};
type Claim = {
  id: string; user_id: string; policy_id: string | null; protocol: string;
  insurance_type: string; event_date: string; event_type: string; status: string;
  indemnity_amount: number | null; notes: string | null;
};
type ClientDoc = {
  id: string; user_id: string; file_path: string; file_name: string;
  doc_type: string; size_bytes: number; created_at: string;
};
type PolicyDoc = {
  id: string; policy_id: string; user_id: string; file_path: string;
  file_name: string; doc_type: string;
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState<NavKey>("dashboard");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [clientDocs, setClientDocs] = useState<ClientDoc[]>([]);
  const [policyDocs, setPolicyDocs] = useState<PolicyDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [pRes, polRes, cRes, cdRes, pdRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("policies").select("*").order("end_date", { ascending: true }),
      supabase.from("claims").select("*").order("created_at", { ascending: false }),
      supabase.from("client_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("policy_documents").select("*"),
    ]);
    setProfiles((pRes.data ?? []) as Profile[]);
    setPolicies((polRes.data ?? []) as Policy[]);
    setClaims((cRes.data ?? []) as Claim[]);
    setClientDocs((cdRes.data ?? []) as ClientDoc[]);
    setPolicyDocs((pdRes.data ?? []) as PolicyDoc[]);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleLogout = async () => { await signOut(); navigate({ to: "/login" }); };

  const today = useMemo(() => new Date(), []);
  const policiesWithDays = useMemo(
    () => policies.map((p) => ({
      ...p,
      daysToExpiry: Math.ceil((new Date(p.end_date).getTime() - today.getTime()) / 86400000),
      client: profiles.find((pr) => pr.user_id === p.user_id),
    })),
    [policies, profiles, today]
  );
  const urgent = policiesWithDays.filter((p) => p.daysToExpiry >= 0 && p.daysToExpiry <= 7);
  const soon = policiesWithDays.filter((p) => p.daysToExpiry > 7 && p.daysToExpiry <= 30);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: BG }}>
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6" style={{ color: PRIMARY }} strokeWidth={2.4} />
          <span className="text-lg font-bold" style={{ color: PRIMARY }}>Dicoon Seguros</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: `${ADMIN_PURPLE}15`, color: ADMIN_PURPLE }}>Administrador</span>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ backgroundColor: ADMIN_PURPLE }}>AD</div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed top-16 bottom-0 left-0 w-[195px] bg-gray-50 border-r border-gray-200 z-20 py-4 px-3 hidden md:block overflow-y-auto">
        <SectionLabel>Geral</SectionLabel>
        <NavItem icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" active={active === "dashboard"} onClick={() => setActive("dashboard")} />
        <Link
          to="/admin/importar-apolice"
          className="mx-1 my-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white shadow-sm hover:brightness-110 transition"
          style={{ backgroundColor: PRIMARY }}
        >
          <ScanLine className="w-4 h-4" /> Importar apólice
        </Link>

        <SectionLabel>Gestão</SectionLabel>
        <NavItem icon={<Users className="w-4 h-4" />} label="Clientes" active={active === "clientes"} onClick={() => setActive("clientes")} />
        <NavItem icon={<FileText className="w-4 h-4" />} label="Apólices" active={active === "apolices"} onClick={() => setActive("apolices")} />
        <NavItem icon={<CalendarClock className="w-4 h-4" />} label="Vencimentos" active={active === "vencimentos"} onClick={() => setActive("vencimentos")} badge={urgent.length} />
        <NavItem icon={<AlertTriangle className="w-4 h-4" />} label="Sinistros" active={active === "sinistros"} onClick={() => setActive("sinistros")} />

        <SectionLabel>Arquivos</SectionLabel>
        <NavItem icon={<FileText className="w-4 h-4" />} label="Documentos" active={active === "documentos"} onClick={() => setActive("documentos")} />
        <NavItem icon={<FileSpreadsheet className="w-4 h-4" />} label="Importar planilha" active={active === "importar"} onClick={() => setActive("importar")} />

        <SectionLabel>Análise</SectionLabel>
        <NavItem icon={<BarChart3 className="w-4 h-4" />} label="Relatórios" active={active === "relatorios"} onClick={() => setActive("relatorios")} />

        <SectionLabel>Sistema</SectionLabel>
        <NavItem icon={<Settings className="w-4 h-4" />} label="Configurações" active={active === "configuracoes"} onClick={() => setActive("configuracoes")} />
      </aside>

      {/* Main */}
      <main className="pt-16 md:pl-[195px]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {loading ? (
            <p className="text-sm text-gray-500">Carregando…</p>
          ) : (
            <>
              {active === "dashboard" && <DashboardView profiles={profiles} policies={policiesWithDays} urgent={urgent} soon={soon} />}
              {active === "clientes" && <ClientesView profiles={profiles} policies={policies} onReload={reload} />}
              {active === "apolices" && <ApolicesView profiles={profiles} policies={policiesWithDays} policyDocs={policyDocs} onReload={reload} onSwitch={setActive} />}
              {active === "vencimentos" && <VencimentosView urgent={urgent} soon={soon} />}
              {active === "sinistros" && <SinistrosView profiles={profiles} policies={policies} claims={claims} onReload={reload} />}
              {active === "documentos" && <DocumentosView profiles={profiles} clientDocs={clientDocs} policyDocs={policyDocs} policies={policies} onReload={reload} />}
              {active === "importar" && <ImportarPlanilhaView onReload={reload} />}
              {active === "relatorios" && <RelatoriosView profiles={profiles} policies={policies} claims={claims} />}
              {active === "configuracoes" && <ConfiguracoesView profiles={profiles} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{children}</p>;
}

function NavItem({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition text-left mb-0.5"
      style={active
        ? { backgroundColor: "white", color: PRIMARY, borderLeft: `3px solid ${PRIMARY}`, paddingLeft: 9 }
        : { color: "#4B5563" }}
    >
      <span style={{ color: active ? PRIMARY : "#9CA3AF" }}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 min-w-[18px] text-center">{badge}</span>
      ) : null}
    </button>
  );
}

/* ============================================================ */
/* SECTION 1 — DASHBOARD                                        */
/* ============================================================ */
function DashboardView({
  profiles, policies, urgent, soon,
}: { profiles: Profile[]; policies: (Policy & { daysToExpiry: number; client?: Profile })[]; urgent: typeof policies; soon: typeof policies }) {
  const activeCount = policies.filter((p) => p.status === "active").length;
  const recentClients = profiles.slice(0, 5);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total de clientes" value={profiles.length.toString()} color="#111827" />
        <MetricCard label="Apólices ativas" value={activeCount.toString()} color={PRIMARY} />
        <MetricCard label="Vencem em 30 dias" value={soon.length.toString()} color="#D97706" />
        <MetricCard label="Vencem em 7 dias" value={urgent.length.toString()} color="#DC2626" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <AlertBanner tone="red" title={`${urgent.length} apólice(s) vencendo em 7 dias`} action={
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-md text-xs font-semibold text-white" style={{ backgroundColor: "#DC2626" }}>
            Notificar todos
          </a>
        } />
        <AlertBanner tone="amber" title={`${soon.length} apólice(s) vencem em 30 dias`} />
      </div>

      <h2 className="text-sm font-semibold text-gray-800 mb-3">Alertas urgentes — vencem nos próximos 7 dias</h2>
      <ExpiryTable rows={urgent} tone="urgent" />

      <h2 className="text-sm font-semibold text-gray-800 mt-8 mb-3">Últimos clientes cadastrados</h2>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Cadastro</th>
            <th className="px-4 py-3 font-medium">Apólices</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr></thead>
          <tbody>
            {recentClients.map((c, i) => {
              const count = policies.filter((p) => p.user_id === c.user_id).length;
              return (
                <tr key={c.user_id} className={i > 0 ? "border-t border-gray-100" : ""}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 text-gray-600">{count}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Ativo</span></td>
                </tr>
              );
            })}
            {recentClients.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">Nenhum cliente ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs text-gray-500 mb-2 leading-snug">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function AlertBanner({ tone, title, action }: { tone: "red" | "amber"; title: string; action?: React.ReactNode }) {
  const styles = tone === "red"
    ? { bg: "#FEF2F2", border: "#FECACA", color: "#991B1B" }
    : { bg: "#FFFBEB", border: "#FDE68A", color: "#92400E" };
  return (
    <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ backgroundColor: styles.bg, border: `1px solid ${styles.border}` }}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5" style={{ color: styles.color }} />
        <p className="text-sm font-medium" style={{ color: styles.color }}>{title}</p>
      </div>
      {action}
    </div>
  );
}

function ExpiryTable({
  rows, tone,
}: { rows: (Policy & { daysToExpiry: number; client?: Profile })[]; tone: "urgent" | "soon" }) {
  const wrapperBg = tone === "urgent" ? "#FEF6F6" : "#FFFFFF";
  const badgeStyle = tone === "urgent"
    ? { backgroundColor: "#FEE2E2", color: "#B91C1C" }
    : { backgroundColor: "#FEF3C7", color: "#B45309" };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm" style={{ backgroundColor: wrapperBg }}>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
          <th className="px-4 py-3 font-medium">Cliente</th>
          <th className="px-4 py-3 font-medium">Apólice</th>
          <th className="px-4 py-3 font-medium">Tipo</th>
          <th className="px-4 py-3 font-medium">Vencimento</th>
          <th className="px-4 py-3 font-medium">Prazo</th>
          <th className="px-4 py-3 font-medium text-right">Ações</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={i > 0 ? "border-t border-gray-100" : ""}>
              <td className="px-4 py-3 text-gray-900 font-medium">{r.client?.name ?? "—"}</td>
              <td className="px-4 py-3 text-gray-600">{r.policy_number}</td>
              <td className="px-4 py-3 text-gray-600">{r.policy_type}</td>
              <td className="px-4 py-3 text-gray-600">{new Date(r.end_date).toLocaleDateString("pt-BR")}</td>
              <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold" style={badgeStyle}>{r.daysToExpiry} dias</span></td>
              <td className="px-4 py-3 text-right">
                <a href={WA_LINK} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-white" style={{ backgroundColor: WHATSAPP }}>
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </a>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400">Nenhum vencimento neste período.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================ */
/* SECTION 2 — CLIENTES                                         */
/* ============================================================ */
function ClientesView({ profiles, policies, onReload }: { profiles: Profile[]; policies: Policy[]; onReload: () => void }) {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [viewing, setViewing] = useState<Profile | null>(null);

  const filtered = profiles.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.cpf ?? "").includes(search) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
          <Plus className="w-4 h-4" /> Novo cliente
        </button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, CPF ou e-mail" className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm bg-white" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">CPF/CNPJ</th>
            <th className="px-4 py-3 font-medium">E-mail</th>
            <th className="px-4 py-3 font-medium">Apólices</th>
            <th className="px-4 py-3 font-medium text-right">Ações</th>
          </tr></thead>
          <tbody>
            {filtered.map((c, i) => {
              const count = policies.filter((p) => p.user_id === c.user_id).length;
              return (
                <tr key={c.user_id} className={i > 0 ? "border-t border-gray-100" : ""}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.cpf ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email}</td>
                  <td className="px-4 py-3 text-gray-600">{count}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setViewing(c)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-700 hover:bg-gray-100">
                      <Eye className="w-3 h-3" /> Ver
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">Nenhum cliente encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {showNew && <NovoClienteModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); onReload(); }} />}
      {viewing && <ClientePerfilDrawer profile={viewing} policies={policies.filter((p) => p.user_id === viewing.user_id)} onClose={() => setViewing(null)} />}
    </>
  );
}

function NovoClienteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "", cpf: "", email: "", phone: "", birth_date: "", address: "", password: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      const password = form.password || `Dicoon@${Math.random().toString(36).slice(2, 8)}`;
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password,
        options: { data: { name: form.name }, emailRedirectTo: `${window.location.origin}/login` },
      });
      if (error) throw error;
      if (data.user) {
        await supabase.from("profiles").update({
          cpf: form.cpf || null,
          phone: form.phone || null,
          birth_date: form.birth_date || null,
          address: form.address || null,
          name: form.name,
        }).eq("user_id", data.user.id);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Novo cliente" onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Nome completo" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Input label="CPF/CNPJ" value={form.cpf} onChange={(v) => setForm({ ...form, cpf: v })} />
        <Input label="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Input label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Input label="Data de nascimento" type="date" value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} />
        <Input label="Endereço" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <Input label="Senha inicial" type="text" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Deixe em branco para gerar" />
      </div>
      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white">Cancelar</button>
        <button onClick={save} disabled={saving || !form.name || !form.email} className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: PRIMARY }}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}

function ClientePerfilDrawer({ profile, policies, onClose }: { profile: Profile; policies: Policy[]; onClose: () => void }) {
  return (
    <Modal title={`Perfil — ${profile.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <KV k="E-mail" v={profile.email} />
          <KV k="CPF/CNPJ" v={profile.cpf ?? "—"} />
          <KV k="Telefone" v={profile.phone ?? "—"} />
          <KV k="Cadastro" v={new Date(profile.created_at).toLocaleDateString("pt-BR")} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Apólices ({policies.length})</h4>
          {policies.length === 0 ? (
            <p className="text-sm text-gray-400">Sem apólices.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {policies.map((p) => (
                <li key={p.id} className="px-3 py-2 text-sm">
                  <div className="font-medium text-gray-900">{p.policy_type} — {p.policy_number}</div>
                  <div className="text-xs text-gray-500">{p.insurer} · vence {new Date(p.end_date).toLocaleDateString("pt-BR")}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return <div><p className="text-[10px] uppercase text-gray-500">{k}</p><p className="text-sm text-gray-900">{v}</p></div>;
}

/* ============================================================ */
/* SECTION 3 — APÓLICES                                         */
/* ============================================================ */
function ApolicesView({
  profiles, policies, policyDocs, onReload, onSwitch,
}: {
  profiles: Profile[];
  policies: (Policy & { daysToExpiry: number; client?: Profile })[];
  policyDocs: PolicyDoc[];
  onReload: () => void;
  onSwitch: (k: NavKey) => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = policies.filter((p) =>
    p.policy_number.toLowerCase().includes(search.toLowerCase()) ||
    (p.client?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-gray-900">Apólices</h1>
        <div className="flex gap-2">
          <button onClick={() => onSwitch("importar")} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white">
            <FileSpreadsheet className="w-4 h-4" /> Importar planilha
          </button>
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
            <Plus className="w-4 h-4" /> Nova apólice
          </button>
        </div>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por apólice ou cliente" className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm bg-white" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3 font-medium">Apólice</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Seguradora</th>
            <th className="px-4 py-3 font-medium">Vencimento</th>
            <th className="px-4 py-3 font-medium">PDF</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr></thead>
          <tbody>
            {filtered.map((p, i) => {
              const hasDoc = policyDocs.some((d) => d.policy_id === p.id);
              return (
                <tr key={p.id} className={i > 0 ? "border-t border-gray-100" : ""}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.policy_number}</td>
                  <td className="px-4 py-3 text-gray-600">{p.client?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{p.policy_type}</td>
                  <td className="px-4 py-3 text-gray-600">{p.insurer}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(p.end_date).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${hasDoc ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                      {hasDoc ? "Anexado" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{p.status}</span></td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">Nenhuma apólice ainda.</td></tr>}
          </tbody>
        </table>
      </div>

      {showNew && <NovaApoliceModal profiles={profiles} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); onReload(); }} />}
    </>
  );
}

function NovaApoliceModal({ profiles, onClose, onSaved }: { profiles: Profile[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    user_id: "", policy_number: "", policy_type: "", insurer: "", item_label: "",
    start_date: "", end_date: "", premium: "", frequencia: "anual", coverages: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      const { data: newPolicy, error } = await supabase.from("policies").insert({
        user_id: form.user_id,
        policy_number: form.policy_number,
        policy_type: form.policy_type,
        insurer: form.insurer,
        item_label: form.item_label || null,
        start_date: form.start_date,
        end_date: form.end_date,
        premium: form.premium || null,
        coverages: form.coverages.split(",").map((s) => s.trim()).filter(Boolean),
        status: "active",
      }).select().single();
      if (error) throw error;

      if (file && newPolicy) {
        const ext = file.name.split(".").pop() ?? "pdf";
        const path = `${form.user_id}/${newPolicy.id}.${ext}`;
        const { error: upErr } = await supabase.storage.from("policy-documents").upload(path, file, { upsert: true, contentType: file.type });
        if (!upErr) {
          await supabase.from("policy_documents").insert({
            policy_id: newPolicy.id, user_id: form.user_id, file_path: path, file_name: file.name, doc_type: "apolice",
          });
        }
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nova apólice" onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-gray-700 mb-1 block">Cliente</label>
          <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white">
            <option value="">Selecionar cliente</option>
            {profiles.map((p) => <option key={p.user_id} value={p.user_id}>{p.name} — {p.email}</option>)}
          </select>
        </div>
        <Input label="Número da apólice" value={form.policy_number} onChange={(v) => setForm({ ...form, policy_number: v })} />
        <Input label="Tipo de seguro" value={form.policy_type} onChange={(v) => setForm({ ...form, policy_type: v })} />
        <Input label="Seguradora" value={form.insurer} onChange={(v) => setForm({ ...form, insurer: v })} />
        <Input label="Bem segurado" value={form.item_label} onChange={(v) => setForm({ ...form, item_label: v })} />
        <Input label="Data início" type="date" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
        <Input label="Data vencimento" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
        <Input label="Valor do prêmio (R$)" value={form.premium} onChange={(v) => setForm({ ...form, premium: v })} />
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Frequência</label>
          <select value={form.frequencia} onChange={(e) => setForm({ ...form, frequencia: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white">
            <option value="mensal">Mensal</option>
            <option value="anual">Anual</option>
            <option value="semestral">Semestral</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-gray-700 mb-1 block">Coberturas (separe por vírgula)</label>
          <textarea value={form.coverages} onChange={(e) => setForm({ ...form, coverages: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-gray-700 mb-1 block">PDF da apólice</label>
          <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          {file && <p className="text-xs text-gray-500 mt-1">{file.name}</p>}
        </div>
      </div>
      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white">Cancelar</button>
        <button onClick={save} disabled={saving || !form.user_id || !form.policy_number} className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: PRIMARY }}>
          {saving ? "Salvando..." : "Salvar apólice"}
        </button>
      </div>
    </Modal>
  );
}

/* ============================================================ */
/* SECTION 4 — VENCIMENTOS                                      */
/* ============================================================ */
function VencimentosView({
  urgent, soon,
}: {
  urgent: (Policy & { daysToExpiry: number; client?: Profile })[];
  soon: (Policy & { daysToExpiry: number; client?: Profile })[];
}) {
  const [alerts, setAlerts] = useState({ d60: false, d30: true, d15: true, d7: true, d0: true });
  const [savingAlerts, setSavingAlerts] = useState(false);

  useEffect(() => {
    supabase.from("alert_settings").select("*").maybeSingle().then(({ data }) => {
      if (data) setAlerts({ d60: data.d60, d30: data.d30, d15: data.d15, d7: data.d7, d0: data.d0 });
    });
  }, []);

  const saveAlerts = async () => {
    setSavingAlerts(true);
    await supabase.from("alert_settings").update({ ...alerts, updated_at: new Date().toISOString() }).eq("singleton", true);
    setSavingAlerts(false);
  };

  const toggle = (k: keyof typeof alerts) => setAlerts((a) => ({ ...a, [k]: !a[k] }));

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Vencimentos</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <AlertBanner tone="red" title={`${urgent.length} apólice(s) vencendo em até 7 dias`} action={
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-white" style={{ backgroundColor: WHATSAPP }}>
            <MessageCircle className="w-3 h-3" /> Notificar todos
          </a>
        } />
        <AlertBanner tone="amber" title={`${soon.length} apólice(s) em até 30 dias`} />
      </div>

      <h2 className="text-sm font-semibold text-gray-800 mb-3">Urgentes (≤ 7 dias)</h2>
      <ExpiryTable rows={urgent} tone="urgent" />

      <h2 className="text-sm font-semibold text-gray-800 mt-8 mb-3">Próximos (≤ 30 dias)</h2>
      <ExpiryTable rows={soon} tone="soon" />

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mt-8">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Alertas automáticos</h3>
        <p className="text-xs text-gray-500 mb-4">Quando o sistema deve enviar lembretes automáticos.</p>
        <div className="flex flex-wrap gap-3">
          {([
            ["d60", "60 dias antes"], ["d30", "30 dias antes"], ["d15", "15 dias antes"],
            ["d7", "7 dias antes"], ["d0", "No dia"],
          ] as const).map(([key, label]) => {
            const checked = alerts[key];
            return (
              <label key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer"
                style={{ borderColor: checked ? PRIMARY : "#E5E7EB", backgroundColor: checked ? `${PRIMARY}10` : "white" }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(key)} className="w-4 h-4" style={{ accentColor: PRIMARY }} />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            );
          })}
        </div>
        <button onClick={saveAlerts} disabled={savingAlerts} className="mt-4 px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: PRIMARY }}>
          {savingAlerts ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </>
  );
}

/* ============================================================ */
/* SECTION 5 — SINISTROS                                        */
/* ============================================================ */
function SinistrosView({ profiles, policies, claims, onReload }: {
  profiles: Profile[]; policies: Policy[]; claims: Claim[]; onReload: () => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = claims.filter((c) => c.protocol.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) =>
    s === "concluido" ? "bg-emerald-100 text-emerald-700"
      : s === "negado" ? "bg-red-100 text-red-700"
      : s === "aguardando_documentos" ? "bg-amber-100 text-amber-700"
      : "bg-blue-100 text-blue-700";

  const statusLabel = (s: string) => ({
    em_analise: "Em análise", aguardando_documentos: "Aguardando documentos", concluido: "Concluído", negado: "Negado",
  } as Record<string, string>)[s] ?? s;

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-gray-900">Sinistros</h1>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
          <Plus className="w-4 h-4" /> Registrar sinistro
        </button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por protocolo" className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm bg-white" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3 font-medium">Protocolo</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Abertura</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Ações</th>
          </tr></thead>
          <tbody>
            {filtered.map((c, i) => {
              const client = profiles.find((p) => p.user_id === c.user_id);
              return (
                <tr key={c.id} className={i > 0 ? "border-t border-gray-100" : ""}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.protocol}</td>
                  <td className="px-4 py-3 text-gray-600">{client?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.event_type}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(c.event_date).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(c.status)}`}>{statusLabel(c.status)}</span></td>
                  <td className="px-4 py-3 text-right">
                    <SinistroManageButton claim={c} onSaved={onReload} statusColor={statusColor} statusLabel={statusLabel} />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400">Nenhum sinistro registrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {showNew && <NovoSinistroModal profiles={profiles} policies={policies} onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); onReload(); }} />}
    </>
  );
}

function SinistroManageButton({
  claim, onSaved, statusColor, statusLabel,
}: {
  claim: Claim; onSaved: () => void;
  statusColor: (s: string) => string; statusLabel: (s: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(claim.status);
  const [notes, setNotes] = useState(claim.notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await supabase.from("claims").update({ status, notes, updated_at: new Date().toISOString() }).eq("id", claim.id);
    setSaving(false);
    setOpen(false);
    onSaved();
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-3 py-1 rounded text-xs text-gray-700 border border-gray-300 hover:bg-gray-50">Gerenciar</button>
      {open && (
        <Modal title={`Sinistro ${claim.protocol}`} onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(status)}`}>{statusLabel(status)}</span>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white">
                <option value="em_analise">Em análise</option>
                <option value="aguardando_documentos">Aguardando documentos</option>
                <option value="concluido">Concluído</option>
                <option value="negado">Negado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Observações</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 bg-white">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded-md text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: PRIMARY }}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function NovoSinistroModal({ profiles, policies, onClose, onSaved }: {
  profiles: Profile[]; policies: Policy[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    user_id: "", policy_id: "", event_type: "", event_date: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const userPolicies = policies.filter((p) => p.user_id === form.user_id);

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      const policy = policies.find((p) => p.id === form.policy_id);
      const { error } = await supabase.from("claims").insert({
        user_id: form.user_id,
        policy_id: form.policy_id || null,
        protocol: `S${Date.now().toString().slice(-8)}`,
        insurance_type: policy?.policy_type ?? "Outro",
        event_date: form.event_date || new Date().toISOString().slice(0, 10),
        event_type: form.event_type,
        status: "em_analise",
        notes: form.notes || null,
      });
      if (error) throw error;
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Registrar sinistro" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Cliente</label>
          <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value, policy_id: "" })} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white">
            <option value="">Selecionar</option>
            {profiles.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Apólice</label>
          <select value={form.policy_id} onChange={(e) => setForm({ ...form, policy_id: e.target.value })} disabled={!form.user_id} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm bg-white">
            <option value="">— (opcional)</option>
            {userPolicies.map((p) => <option key={p.id} value={p.id}>{p.policy_number} — {p.policy_type}</option>)}
          </select>
        </div>
        <Input label="Tipo de evento" value={form.event_type} onChange={(v) => setForm({ ...form, event_type: v })} />
        <Input label="Data do evento" type="date" value={form.event_date} onChange={(v) => setForm({ ...form, event_date: v })} />
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Descrição</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm" />
        </div>
      </div>
      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white">Cancelar</button>
        <button onClick={save} disabled={saving || !form.user_id || !form.event_type} className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: PRIMARY }}>
          {saving ? "Salvando..." : "Registrar"}
        </button>
      </div>
    </Modal>
  );
}

/* ============================================================ */
/* SECTION 6 — DOCUMENTOS                                       */
/* ============================================================ */
function DocumentosView({
  profiles, clientDocs, policyDocs, policies, onReload,
}: {
  profiles: Profile[]; clientDocs: ClientDoc[]; policyDocs: PolicyDoc[]; policies: Policy[]; onReload: () => void;
}) {
  const [filterClient, setFilterClient] = useState("");
  const [filterType, setFilterType] = useState("");

  type AnyDoc = { id: string; user_id: string; file_path: string; file_name: string; doc_type: string; bucket: "client-documents" | "policy-documents"; size?: number };
  const allDocs: AnyDoc[] = [
    ...clientDocs.map((d): AnyDoc => ({ ...d, bucket: "client-documents", size: d.size_bytes })),
    ...policyDocs.map((d): AnyDoc => ({ id: d.id, user_id: d.user_id, file_path: d.file_path, file_name: d.file_name, doc_type: d.doc_type, bucket: "policy-documents" })),
  ];
  const filtered = allDocs.filter((d) =>
    (!filterClient || d.user_id === filterClient) &&
    (!filterType || d.doc_type === filterType)
  );
  const grouped = filtered.reduce((acc, d) => {
    (acc[d.user_id] ??= []).push(d);
    return acc;
  }, {} as Record<string, AnyDoc[]>);

  const typeBadge = (t: string) => {
    const map: Record<string, string> = {
      apolice: "bg-blue-100 text-blue-700",
      recibo: "bg-emerald-100 text-emerald-700",
      cnh: "bg-gray-200 text-gray-700",
      rg: "bg-gray-200 text-gray-700",
      endosso: "bg-amber-100 text-amber-700",
    };
    return map[t] ?? "bg-gray-100 text-gray-600";
  };

  const download = async (d: AnyDoc) => {
    const { data } = await supabase.storage.from(d.bucket).createSignedUrl(d.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const removeDoc = async (d: AnyDoc) => {
    if (!confirm(`Excluir ${d.file_name}?`)) return;
    await supabase.storage.from(d.bucket).remove([d.file_path]);
    const table = d.bucket === "client-documents" ? "client_documents" : "policy_documents";
    await supabase.from(table).delete().eq("id", d.id);
    onReload();
  };

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Documentos</h1>
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="px-3 py-2 rounded-md border border-gray-300 text-sm bg-white">
          <option value="">Todos os clientes</option>
          {profiles.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 rounded-md border border-gray-300 text-sm bg-white">
          <option value="">Todos os tipos</option>
          <option value="apolice">Apólice</option>
          <option value="recibo">Recibo</option>
          <option value="cnh">CNH</option>
          <option value="rg">RG</option>
          <option value="endosso">Endosso</option>
        </select>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([userId, docs]) => {
          const client = profiles.find((p) => p.user_id === userId);
          return (
            <div key={userId} className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-900">{client?.name ?? "Cliente"}</div>
              <ul className="divide-y divide-gray-100">
                {docs.map((d) => (
                  <li key={`${d.bucket}-${d.id}`} className="px-4 py-3 flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{d.file_name}</p>
                      <p className="text-xs text-gray-500">{d.size ? `${Math.round(d.size / 1024)} KB · ` : ""}<span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${typeBadge(d.doc_type)}`}>{d.doc_type}</span></p>
                    </div>
                    <button onClick={() => download(d)} className="px-2 py-1 rounded text-xs text-gray-700 hover:bg-gray-100 inline-flex items-center gap-1"><Download className="w-3 h-3" />Baixar</button>
                    <button onClick={() => removeDoc(d)} className="px-2 py-1 rounded text-xs text-red-600 hover:bg-red-50 inline-flex items-center gap-1"><Trash2 className="w-3 h-3" />Excluir</button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {Object.keys(grouped).length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">Nenhum documento.</div>
        )}
      </div>
    </>
  );
}

/* ============================================================ */
/* SECTION 7 — IMPORTAR PLANILHA                                */
/* ============================================================ */
type ImportRow = {
  nome_cliente?: string; cpf_cnpj?: string; email?: string; telefone?: string;
  numero_apolice?: string; tipo_seguro?: string; seguradora?: string;
  data_inicio?: string; data_vencimento?: string; premio_valor?: string;
  coberturas?: string; bem_segurado?: string;
};

const IMPORT_COLUMNS = [
  "nome_cliente", "cpf_cnpj", "email", "telefone", "numero_apolice",
  "tipo_seguro", "seguradora", "data_inicio", "data_vencimento",
  "premio_valor", "coberturas", "bem_segurado",
];

function ImportarPlanilhaView({ onReload }: { onReload: () => void }) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFile = async (f: File) => {
    if (f.size > 20 * 1024 * 1024) { alert("Máximo 20 MB"); return; }
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const parsed = XLSX.utils.sheet_to_json<ImportRow>(ws);
    setRows(parsed);
    setResult(null);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([IMPORT_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Apolices");
    XLSX.writeFile(wb, "modelo-apolices.xlsx");
  };

  const process = async () => {
    setProcessing(true);
    let created = 0, skipped = 0;
    for (const r of rows) {
      try {
        // Find or create client
        let userId: string | undefined;
        if (r.cpf_cnpj) {
          const { data: profile } = await supabase.from("profiles").select("user_id").eq("cpf", r.cpf_cnpj).maybeSingle();
          userId = profile?.user_id;
        }
        if (!userId && r.email) {
          const password = `Dicoon@${Math.random().toString(36).slice(2, 8)}`;
          const { data: sign } = await supabase.auth.signUp({
            email: r.email, password,
            options: { data: { name: r.nome_cliente ?? r.email }, emailRedirectTo: `${window.location.origin}/login` },
          });
          userId = sign.user?.id;
          if (userId) {
            await supabase.from("profiles").update({
              cpf: r.cpf_cnpj ?? null, phone: r.telefone ?? null,
              name: r.nome_cliente ?? r.email,
            }).eq("user_id", userId);
          }
        }
        if (!userId) { skipped++; continue; }
        await supabase.from("policies").insert({
          user_id: userId,
          policy_number: r.numero_apolice ?? `IMP-${Date.now()}`,
          policy_type: r.tipo_seguro ?? "Outro",
          insurer: r.seguradora ?? "—",
          item_label: r.bem_segurado ?? null,
          start_date: r.data_inicio ?? new Date().toISOString().slice(0, 10),
          end_date: r.data_vencimento ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
          premium: r.premio_valor ?? null,
          coverages: (r.coberturas ?? "").split(",").map((s) => s.trim()).filter(Boolean),
          status: "active",
        });
        created++;
      } catch { skipped++; }
    }
    setResult(`${created} apólice(s) criadas, ${skipped} pulada(s).`);
    setProcessing(false);
    onReload();
  };

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Importar planilha</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-400 transition cursor-pointer"
          onClick={() => document.getElementById("xlsx-input")?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-800">Arraste ou clique para enviar .xlsx ou .csv</p>
          <p className="text-xs text-gray-500 mt-1">Máx. 20 MB</p>
          <input id="xlsx-input" type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        <div className="mt-4 flex items-start justify-between gap-3 flex-wrap">
          <div className="text-xs text-gray-600">
            <p className="font-semibold mb-1">Colunas esperadas:</p>
            <code className="text-[11px] bg-gray-50 rounded p-2 block">{IMPORT_COLUMNS.join(", ")}</code>
          </div>
          <button onClick={downloadTemplate} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 bg-white">
            <Download className="w-4 h-4" /> Baixar planilha modelo
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Prévia ({rows.length} linhas)</h3>
            <button onClick={process} disabled={processing} className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: PRIMARY }}>
              {processing ? "Processando..." : "Processar importação"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-gray-500 border-b border-gray-200">
                {IMPORT_COLUMNS.slice(0, 6).map((c) => <th key={c} className="px-2 py-2 font-medium">{c}</th>)}
              </tr></thead>
              <tbody>
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {IMPORT_COLUMNS.slice(0, 6).map((c) => <td key={c} className="px-2 py-1.5 text-gray-700">{(r as Record<string, string>)[c] ?? "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result && <p className="mt-3 text-sm text-emerald-700">{result}</p>}
        </div>
      )}
    </>
  );
}

/* ============================================================ */
/* SECTION 8 — RELATÓRIOS                                       */
/* ============================================================ */
function RelatoriosView({ profiles, policies, claims }: { profiles: Profile[]; policies: Policy[]; claims: Claim[] }) {
  const exportAll = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profiles), "Clientes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(policies), "Apolices");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(claims), "Sinistros");
    XLSX.writeFile(wb, `dicoon-export-${Date.now()}.xlsx`);
  };
  const exportSheet = (rows: object[], name: string) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
    XLSX.writeFile(wb, `${name}-${Date.now()}.xlsx`);
  };

  const next90 = policies.filter((p) => {
    const d = (new Date(p.end_date).getTime() - Date.now()) / 86400000;
    return d >= 0 && d <= 90;
  });

  const cards = [
    { icon: <FileText className="w-5 h-5" />, title: "Apólices por mês", desc: "Emissões e renovações", action: () => exportSheet(policies, "apolices") },
    { icon: <CalendarClock className="w-5 h-5" />, title: "Vencimentos 90 dias", desc: `${next90.length} apólices`, action: () => exportSheet(next90, "vencimentos") },
    { icon: <TrendingUp className="w-5 h-5" />, title: "Carteira de clientes", desc: `${profiles.length} clientes`, action: () => exportSheet(profiles, "clientes") },
    { icon: <DollarSign className="w-5 h-5" />, title: "Prêmios por período", desc: "Receita total", action: () => exportSheet(policies.map((p) => ({ apolice: p.policy_number, premio: p.premium })), "premios") },
    { icon: <Activity className="w-5 h-5" />, title: "Sinistros por tipo", desc: `${claims.length} registros`, action: () => exportSheet(claims, "sinistros") },
    { icon: <Download className="w-5 h-5" />, title: "Exportar tudo", desc: "Clientes + apólices + sinistros", action: exportAll },
  ];

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Relatórios</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.title} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${PRIMARY}15`, color: PRIMARY }}>{c.icon}</div>
            <h3 className="text-sm font-semibold text-gray-900">{c.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
            <button onClick={c.action} className="mt-4 w-full px-3 py-2 rounded-md text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
              Gerar
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ============================================================ */
/* SECTION 9 — CONFIGURAÇÕES                                    */
/* ============================================================ */
function ConfiguracoesView({ profiles }: { profiles: Profile[] }) {
  const [broker, setBroker] = useState({
    company_name: "Dicoon Seguros", contact_email: "", whatsapp: "(51) 98236-7904",
    whatsapp_link: WA_LINK, business_hours: "Seg–Sex 9h–18h",
  });
  const [savingBroker, setSavingBroker] = useState(false);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("broker_settings").select("*").maybeSingle().then(({ data }) => {
      if (data) setBroker({
        company_name: data.company_name, contact_email: data.contact_email,
        whatsapp: data.whatsapp, whatsapp_link: data.whatsapp_link,
        business_hours: data.business_hours,
      });
    });
  }, []);

  const saveBroker = async () => {
    setSavingBroker(true);
    await supabase.from("broker_settings").update({ ...broker, updated_at: new Date().toISOString() }).eq("singleton", true);
    setSavingBroker(false);
  };

  const changePwd = async () => {
    setPwdMsg(null);
    if (pwd.next !== pwd.confirm) { setPwdMsg("Senhas não conferem."); return; }
    if (pwd.next.length < 6) { setPwdMsg("Senha deve ter ao menos 6 caracteres."); return; }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user?.email) return;
    const { error: reauth } = await supabase.auth.signInWithPassword({ email: user.user.email, password: pwd.current });
    if (reauth) { setPwdMsg("Senha atual incorreta."); return; }
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    setPwdMsg(error ? error.message : "Senha alterada com sucesso.");
    if (!error) setPwd({ current: "", next: "", confirm: "" });
  };

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Configurações</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Dados da corretora</h3>
          <div className="space-y-3">
            <Input label="Nome da empresa" value={broker.company_name} onChange={(v) => setBroker({ ...broker, company_name: v })} />
            <Input label="E-mail de contato" value={broker.contact_email} onChange={(v) => setBroker({ ...broker, contact_email: v })} />
            <Input label="WhatsApp" value={broker.whatsapp} onChange={(v) => setBroker({ ...broker, whatsapp: v })} />
            <Input label="Link WhatsApp" value={broker.whatsapp_link} onChange={(v) => setBroker({ ...broker, whatsapp_link: v })} />
            <Input label="Horário de atendimento" value={broker.business_hours} onChange={(v) => setBroker({ ...broker, business_hours: v })} />
            <button onClick={saveBroker} disabled={savingBroker} className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: PRIMARY }}>
              {savingBroker ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Usuários</h3>
              <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-700"><Plus className="w-3 h-3" />Adicionar</button>
            </div>
            <ul className="divide-y divide-gray-100 text-sm">
              {profiles.slice(0, 6).map((p) => (
                <li key={p.user_id} className="py-2 flex justify-between">
                  <span>{p.name}</span>
                  <span className="text-xs text-gray-500">{p.email}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Alterar minha senha</h3>
            <div className="space-y-3">
              <Input label="Senha atual" type="password" value={pwd.current} onChange={(v) => setPwd({ ...pwd, current: v })} />
              <Input label="Nova senha" type="password" value={pwd.next} onChange={(v) => setPwd({ ...pwd, next: v })} />
              <Input label="Confirmar nova senha" type="password" value={pwd.confirm} onChange={(v) => setPwd({ ...pwd, confirm: v })} />
              <button onClick={changePwd} className="px-4 py-2 rounded-md text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>Alterar senha</button>
              {pwdMsg && <p className="text-sm text-gray-700">{pwdMsg}</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================================================ */
/* SHARED PRIMITIVES                                            */
/* ============================================================ */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, type = "text", placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-700 mb-1 block">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm"
      />
    </div>
  );
}
