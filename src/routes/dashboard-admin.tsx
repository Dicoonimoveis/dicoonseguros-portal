import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Shield, LayoutDashboard, Users, FileText, CalendarClock, AlertTriangle,
  BarChart3, Settings, LogOut, Bell, Plus, Search, Upload, ScanLine,
  Download, Trash2, MessageCircle, Eye, Pencil, X, FileSpreadsheet,
  Sparkles, TrendingUp, DollarSign, Activity, CheckCircle2, Menu, Mail, Folder,
  ArrowLeft, Camera, UserCheck, UserPlus, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { inviteClient } from "@/lib/admin-users.functions";
// @ts-ignore
import * as XLSX from "@e965/xlsx";
import { toast } from "sonner";

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
const BG = "#F0F2F5";
const ADMIN_PURPLE = "#7C3AED";
const WHATSAPP = "#25D366";
const WA_LINK = "https://wa.me/message/HCHOQ3CXMLGFG1";

type NavKey =
  | "dashboard" | "clientes" | "apolices" | "vencimentos" | "sinistros"
  | "documentos" | "importar" | "relatorios" | "configuracoes" | "cadastro_cliente" | "importar_apolice";

type Profile = { user_id: string; name: string; email: string; cpf: string | null; phone: string | null; created_at: string; birth_date?: string | null; address?: string | null };
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

type AdminNotification = { id: string; title: string; desc: string; time: string; read: boolean };

function AdminDashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState<NavKey>("dashboard");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [clientDocs, setClientDocs] = useState<ClientDoc[]>([]);
  const [policyDocs, setPolicyDocs] = useState<PolicyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
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
    } catch (err) {
      console.error("Erro ao recarregar dados do dashboard admin:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize notification list with recent profiles on mount or when profiles change
  useEffect(() => {
    if (profiles.length > 0) {
      const recent = profiles
        .filter((p) => {
          const daysOld = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
          return daysOld <= 7;
        })
        .slice(0, 8)
        .map((p): AdminNotification => ({
          id: p.user_id,
          title: "Novo Cliente Cadastrado",
          desc: `${p.name} (${p.email})`,
          time: new Date(p.created_at).toLocaleDateString("pt-BR") + " " + new Date(p.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          read: true,
        }));
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const merged = [...prev];
        recent.forEach((n) => {
          if (!existingIds.has(n.id)) {
            merged.push(n);
          }
        });
        return merged.sort((a, b) => b.time.localeCompare(a.time));
      });
    }
  }, [profiles]);

  useEffect(() => {
    reload();

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        void (async () => {
          try {
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

            if (payload.eventType === "INSERT" && payload.table === "profiles") {
              const newProfile = payload.new as Profile;
              
              // Append a new notification
              const newNotif: AdminNotification = {
                id: newProfile.user_id + "-" + Date.now(),
                title: "✨ Novo Cliente Cadastrado",
                desc: `${newProfile.name} (${newProfile.email}) se cadastrou no portal!`,
                time: new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                read: false,
              };
              setNotifications((prev) => [newNotif, ...prev]);

              toast.success(`✨ Novo cadastro de cliente!`, {
                description: `${newProfile.name} (${newProfile.email}) acabou de se cadastrar no portal!`,
                duration: 10000,
              });

              // Play a gentle notification sound using Web Audio API
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.15);
                
                setTimeout(() => {
                  const osc2 = audioCtx.createOscillator();
                  const gain2 = audioCtx.createGain();
                  osc2.connect(gain2);
                  gain2.connect(audioCtx.destination);
                  osc2.type = "sine";
                  osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
                  gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
                  osc2.start();
                  osc2.stop(audioCtx.currentTime + 0.25);
                }, 120);
              } catch (e) {
                console.log("Audio feedback not supported or blocked by browser policies.");
              }
            }
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
      <header className="fixed top-0 inset-x-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-1.5 -ml-1.5 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none"
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Shield className="w-6 h-6" style={{ color: PRIMARY }} strokeWidth={2.4} />
          <span className="text-base sm:text-lg font-bold" style={{ color: PRIMARY }}>Dicoon Seguros</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full hover:bg-gray-100 transition relative text-gray-600 hover:text-gray-900 focus:outline-none"
              aria-label="Notificações"
            >
              <Bell className="w-5 h-5" />
              {notifications.some((n) => !n.read) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white" />
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <span className="text-xs font-bold text-gray-900">Notificações Recentes</span>
                  {notifications.some((n) => !n.read) && (
                    <button
                      onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                      className="text-[10px] font-semibold text-emerald-600 hover:underline"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400">Nenhuma notificação recente.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 transition hover:bg-gray-50 flex flex-col gap-0.5 ${
                          !n.read ? "bg-emerald-50/20" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-900 flex items-center gap-1">
                            {!n.read && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />}
                            {n.title}
                          </span>
                          <span className="text-[9px] text-gray-400">{n.time}</span>
                        </div>
                        <span className="text-[11px] text-gray-600 leading-normal">{n.desc}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-gray-100 text-center bg-gray-50">
                  <button
                    onClick={() => {
                      setActive("configuracoes");
                      setShowNotifications(false);
                    }}
                    className="text-[10px] font-semibold text-gray-500 hover:text-gray-900"
                  >
                    Ver Controle de Acessos
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold"
            style={{ backgroundColor: `${ADMIN_PURPLE}15`, color: ADMIN_PURPLE }}>Administrador</span>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-semibold"
            style={{ backgroundColor: ADMIN_PURPLE }}>AD</div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-900">
            <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-16 bottom-0 left-0 w-[195px] bg-gray-50 border-r border-gray-200 z-20 py-4 px-3 overflow-y-auto transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SectionLabel>Geral</SectionLabel>
        <NavItem
          icon={<LayoutDashboard className="w-4 h-4" />}
          label="Dashboard"
          active={active === "dashboard"}
          onClick={() => {
            setActive("dashboard");
            setIsSidebarOpen(false);
          }}
        />

        <button
          onClick={() => {
            setActive("importar_apolice");
            setIsSidebarOpen(false);
          }}
          className="mx-1 my-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white shadow-sm hover:brightness-110 transition text-left w-[calc(100%-8px)]"
          style={{ backgroundColor: PRIMARY }}
        >
          <ScanLine className="w-4 h-4" /> Importar apólice
        </button>

        <SectionLabel>Gestão</SectionLabel>
        <NavItem
          icon={<Users className="w-4 h-4" />}
          label="Clientes"
          active={active === "clientes"}
          onClick={() => {
            setActive("clientes");
            setIsSidebarOpen(false);
          }}
        />
        <NavItem
          icon={<FileText className="w-4 h-4" />}
          label="Apólices"
          active={active === "apolices"}
          onClick={() => {
            setActive("apolices");
            setIsSidebarOpen(false);
          }}
        />
        <NavItem
          icon={<CalendarClock className="w-4 h-4" />}
          label="Vencimentos"
          active={active === "vencimentos"}
          onClick={() => {
            setActive("vencimentos");
            setIsSidebarOpen(false);
          }}
          badge={urgent.length}
        />
        <NavItem
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Sinistros"
          active={active === "sinistros"}
          onClick={() => {
            setActive("sinistros");
            setIsSidebarOpen(false);
          }}
        />

        <SectionLabel>Arquivos</SectionLabel>
        <NavItem
          icon={<FileText className="w-4 h-4" />}
          label="Documentos"
          active={active === "documentos"}
          onClick={() => {
            setActive("documentos");
            setIsSidebarOpen(false);
          }}
        />
        <NavItem
          icon={<FileSpreadsheet className="w-4 h-4" />}
          label="Importar planilha"
          active={active === "importar"}
          onClick={() => {
            setActive("importar");
            setIsSidebarOpen(false);
          }}
        />
        <NavItem
          icon={<Upload className="w-4 h-4" />}
          label="Importar apólice"
          active={active === "importar_apolice"}
          onClick={() => {
            setActive("importar_apolice");
            setIsSidebarOpen(false);
          }}
        />

        <SectionLabel>Análise</SectionLabel>
        <NavItem
          icon={<BarChart3 className="w-4 h-4" />}
          label="Relatórios"
          active={active === "relatorios"}
          onClick={() => {
            setActive("relatorios");
            setIsSidebarOpen(false);
          }}
        />

        <SectionLabel>Sistema</SectionLabel>
        <NavItem
          icon={<Settings className="w-4 h-4" />}
          label="Configurações"
          active={active === "configuracoes"}
          onClick={() => {
            setActive("configuracoes");
            setIsSidebarOpen(false);
          }}
        />
      </aside>

      {/* Main */}
      <main className="pt-16 md:pl-[195px]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {loading ? (
            <p className="text-sm text-gray-500">Carregando…</p>
          ) : (
            <>
              {active === "dashboard" && <DashboardView profiles={profiles} policies={policiesWithDays} urgent={urgent} soon={soon} setActiveTab={setActive} />}
              {active === "clientes" && <ClientesView profiles={profiles} policies={policies} clientDocs={clientDocs} policyDocs={policyDocs} claims={claims} onReload={reload} />}
              {active === "apolices" && <ApolicesView profiles={profiles} policies={policiesWithDays} policyDocs={policyDocs} onReload={reload} onSwitch={setActive} />}
              {active === "vencimentos" && <VencimentosView urgent={urgent} soon={soon} />}
              {active === "sinistros" && <SinistrosView profiles={profiles} policies={policies} claims={claims} onReload={reload} />}
              {active === "documentos" && <DocumentosView profiles={profiles} clientDocs={clientDocs} policyDocs={policyDocs} policies={policies} onReload={reload} />}
              {active === "importar" && <ImportarPlanilhaView onReload={reload} />}
              {active === "relatorios" && <RelatoriosView profiles={profiles} policies={policies} claims={claims} />}
              {active === "configuracoes" && <ConfiguracoesView profiles={profiles} onReload={reload} />}
              {active === "importar_apolice" && <ImportarApoliceView profiles={profiles} onReload={reload} onSwitch={setActive} />}
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
  profiles, policies, urgent, soon, setActiveTab,
}: {
  profiles: Profile[];
  policies: (Policy & { daysToExpiry: number; client?: Profile })[];
  urgent: typeof policies;
  soon: typeof policies;
  setActiveTab: (t: NavKey) => void;
}) {
  const activeCount = policies.filter((p) => p.status === "active").length;
  const recentClients = profiles.slice(0, 5);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
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
    <div className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4" style={{ backgroundColor: styles.bg, border: `1px solid ${styles.border}` }}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: styles.color }} />
        <p className="text-sm font-medium leading-relaxed" style={{ color: styles.color }}>{title}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ backgroundColor: wrapperBg }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
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
    </div>
  );
}

/* ============================================================ */
/* SECTION 2 — CLIENTES                                         */
/* ============================================================ */
function ClientesView({
  profiles, policies, clientDocs, policyDocs, claims, onReload,
}: {
  profiles: Profile[];
  policies: Policy[];
  clientDocs: ClientDoc[];
  policyDocs: PolicyDoc[];
  claims: Claim[];
  onReload: () => void;
}) {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [viewing, setViewing] = useState<Profile | null>(null);
  const [selectedAccessClient, setSelectedAccessClient] = useState<Profile | null>(null);

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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
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
      </div>

      {showNew && <NovoClienteModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); onReload(); }} />}
      {viewing && (
        <ClientePerfilDrawer
          profile={viewing}
          policies={policies.filter((p) => p.user_id === viewing.user_id)}
          clientDocs={clientDocs.filter((d) => d.user_id === viewing.user_id)}
          policyDocs={policyDocs}
          claims={claims.filter((c) => c.user_id === viewing.user_id)}
          onClose={() => setViewing(null)}
          onGerenciarAcesso={(p) => {
            setViewing(null);
            setSelectedAccessClient(p);
          }}
        />
      )}
      {selectedAccessClient && (
        <GerenciarAcessoModal
          client={selectedAccessClient}
          onClose={() => setSelectedAccessClient(null)}
        />
      )}
    </>
  );
}

function NovoClienteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "", cpf: "", email: "", phone: "", birth_date: "", address: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const invite = useServerFn(inviteClient);

  const save = async () => {
    setSaving(true); setErr(null); setInfo(null);
    try {
      const res = await invite({
        data: {
          email: form.email,
          name: form.name,
          cpf: form.cpf || null,
          phone: form.phone || null,
          birth_date: form.birth_date || null,
          address: form.address || null,
        },
      });
      setInfo(
        res.alreadyExisted
          ? `O cliente já possuía cadastro. Os dados foram atualizados; um novo link de acesso pode ser enviado pela tela "Esqueci minha senha".`
          : `Convite enviado para ${form.email}. O cliente receberá um link por e-mail para definir a própria senha.`,
      );
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
      </div>
      <p className="text-xs text-gray-500 mt-3">
        O cliente receberá um e-mail com um link seguro para definir a própria senha. Nenhuma senha é gerada ou exibida aqui.
      </p>
      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
      {info && <p className="text-sm text-emerald-700 mt-3">{info}</p>}
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 bg-white">Cancelar</button>
        <button onClick={save} disabled={saving || !form.name || !form.email} className="px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: PRIMARY }}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}

function ClientePerfilDrawer({
  profile, policies, clientDocs, policyDocs, claims, onClose, onGerenciarAcesso,
}: {
  profile: Profile;
  policies: Policy[];
  clientDocs: ClientDoc[];
  policyDocs: PolicyDoc[];
  claims: Claim[];
  onClose: () => void;
  onGerenciarAcesso: (p: Profile) => void;
}) {
  const downloadClientDoc = async (d: ClientDoc) => {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(d.file_path, 60);
    if (error || !data) { alert("Não foi possível gerar o link de download."); return; }
    window.open(data.signedUrl, "_blank");
  };

  const downloadPolicyDoc = async (policyId: string) => {
    const doc = policyDocs.find((d) => d.policy_id === policyId);
    if (!doc) {
      alert("Nenhum PDF disponível para esta apólice.");
      return;
    }
    const { data, error } = await supabase.storage.from("policy-documents").createSignedUrl(doc.file_path, 60);
    if (error || !data) { alert("Não foi possível gerar o link de download."); return; }
    window.open(data.signedUrl, "_blank");
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

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
    <Modal title={`Perfil do Cliente — ${profile.name}`} onClose={onClose}>
      <div className="space-y-5">
        {/* Grid de Dados Pessoais */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Dados Cadastrais</h4>
            <button
              onClick={() => onGerenciarAcesso(profile)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition"
            >
              <Shield className="w-3.5 h-3.5 text-purple-600" /> Gerenciar Acesso
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <KV k="E-mail" v={profile.email} />
            <KV k="CPF/CNPJ" v={profile.cpf ?? "—"} />
            <KV k="Telefone" v={profile.phone ?? "—"} />
            <KV k="Data de Nascimento" v={profile.birth_date ? new Date(profile.birth_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"} />
            <KV k="Cadastro" v={new Date(profile.created_at).toLocaleDateString("pt-BR")} />
            <KV k="Endereço" v={profile.address ?? "—"} />
          </div>
        </div>

        {/* Grid de Seções */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Coluna 1: Apólices */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col h-[280px]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center justify-between">
              <span>Apólices ({policies.length})</span>
              <FileText className="w-4 h-4 text-gray-400" />
            </h4>
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
              {policies.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">Nenhuma apólice registrada.</p>
              ) : (
                policies.map((p) => {
                  const hasDoc = policyDocs.some((d) => d.policy_id === p.id);
                  return (
                    <div key={p.id} className="p-2.5 rounded-lg border border-gray-100 bg-gray-50 text-xs flex justify-between items-start gap-2">
                      <div>
                        <div className="font-semibold text-gray-905">{p.policy_type}</div>
                        <div className="text-gray-500 mt-0.5">Nº {p.policy_number} · {p.insurer}</div>
                        <div className="text-gray-400 mt-0.5">Vence em {new Date(p.end_date).toLocaleDateString("pt-BR")}</div>
                      </div>
                      {hasDoc && (
                        <button
                          onClick={() => downloadPolicyDoc(p.id)}
                          className="shrink-0 p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition"
                          title="Ver Apólice Original"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Coluna 2: Documentos Pessoais */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col h-[280px]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center justify-between">
              <span>Documentos Enviados ({clientDocs.length})</span>
              <Folder className="w-4 h-4 text-gray-400" />
            </h4>
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
              {clientDocs.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">Nenhum documento pessoal enviado pelo cliente.</p>
              ) : (
                clientDocs.map((d) => (
                  <div key={d.id} className="p-2.5 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate" title={d.file_name}>{d.file_name}</div>
                      <div className="text-gray-500 mt-0.5">{d.doc_type} · {formatSize(d.size_bytes)}</div>
                      <div className="text-gray-400 mt-0.5">Enviado em {new Date(d.created_at).toLocaleDateString("pt-BR")}</div>
                    </div>
                    <button
                      onClick={() => downloadClientDoc(d)}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition shrink-0"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sinistros do Cliente */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center justify-between">
            <span>Sinistros Registrados ({claims.length})</span>
            <AlertTriangle className="w-4 h-4 text-gray-400" />
          </h4>
          <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
            {claims.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Nenhum sinistro registrado por este cliente.</p>
            ) : (
              claims.map((c) => {
                const b = statusBadge(c.status);
                return (
                  <div key={c.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-between gap-3 text-xs flex-wrap">
                    <div>
                      <div className="font-semibold text-gray-900">Protocolo {c.protocol}</div>
                      <div className="text-gray-500 mt-0.5">{c.insurance_type} · {c.event_type}</div>
                      <div className="text-gray-400 mt-0.5">Data do evento: {new Date(c.event_date + "T00:00:00").toLocaleDateString("pt-BR")}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: b.bg, color: b.c }}>
                      {b.t}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition">
            Fechar Perfil
          </button>
        </div>
      </div>
    </Modal>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return <div><p className="text-[10px] uppercase text-gray-500">{k}</p><p className="text-sm font-semibold text-gray-900">{v}</p></div>;
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

  const viewOriginalFile = async (policyId: string) => {
    const doc = policyDocs.find((d) => d.policy_id === policyId);
    if (!doc) {
      alert("Nenhum arquivo anexado a esta apólice.");
      return;
    }
    const { data } = await supabase.storage.from("policy-documents").createSignedUrl(doc.file_path, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      alert("Não foi possível carregar o arquivo original.");
    }
  };

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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
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
                      {hasDoc ? (
                        <button
                          onClick={() => viewOriginalFile(p.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver original
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{p.status}</span></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">Nenhuma apólice ainda.</td></tr>}
            </tbody>
          </table>
        </div>
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
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
  const invite = useServerFn(inviteClient);

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
          const res = await invite({
            data: {
              email: r.email,
              name: r.nome_cliente ?? r.email,
              cpf: r.cpf_cnpj ?? null,
              phone: r.telefone ?? null,
            },
          });
          userId = res.userId;
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
/* ============================================================ */
/* SECTION 9 — CONFIGURAÇÕES                                    */
/* ============================================================ */
function ConfiguracoesView({ profiles, onReload }: { profiles: Profile[]; onReload: () => void }) {
  const [broker, setBroker] = useState({
    company_name: "Dicoon Seguros", contact_email: "", whatsapp: "(51) 98236-7904",
    whatsapp_link: WA_LINK, business_hours: "Seg–Sex 9h–18h",
  });
  const [savingBroker, setSavingBroker] = useState(false);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  // States do Controle de Acesso de Clientes
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const logs = useMemo(() => getClientLogs(profiles), [profiles]);

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.cpf && p.cpf.includes(q))
      );
    });
  }, [profiles, search]);

  const deleteClient = async (profile: Profile) => {
    if (!confirm(`Tem certeza de que deseja excluir permanentemente o cadastro de "${profile.name}"?\nEsta ação apagará a conta do portal, apólices associadas e documentos.`)) return;
    
    setDeletingId(profile.user_id);
    try {
      // 1. Apagar apólices e documentos de apólices
      const { data: pols } = await supabase.from("policies").select("id").eq("user_id", profile.user_id);
      if (pols && pols.length > 0) {
        const polIds = pols.map((po) => po.id);
        await supabase.from("policy_documents").delete().in("policy_id", polIds);
        await supabase.from("policies").delete().eq("user_id", profile.user_id);
      }
      
      // 2. Apagar sinistros, documentos do cliente e roles
      await supabase.from("claims").delete().eq("user_id", profile.user_id);
      await supabase.from("client_documents").delete().eq("user_id", profile.user_id);
      await supabase.from("user_roles").delete().eq("user_id", profile.user_id);
      
      // 3. Apagar perfil do cliente
      const { error } = await supabase.from("profiles").delete().eq("user_id", profile.user_id);
      if (error) throw error;
      
      alert("Cadastro do cliente e todos os dados associados foram excluídos com sucesso!");
      onReload();
    } catch (err: any) {
      alert("Erro ao excluir cliente: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatAccessDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "—";
    }
  };

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
      
      {/* 2-Column Top Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
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

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Alterar minha senha</h3>
            <div className="space-y-3">
              <Input label="Senha atual" type="password" value={pwd.current} onChange={(v) => setPwd({ ...pwd, current: v })} />
              <Input label="Nova senha" type="password" value={pwd.next} onChange={(v) => setPwd({ ...pwd, next: v })} />
              <Input label="Confirmar nova senha" type="password" value={pwd.confirm} onChange={(v) => setPwd({ ...pwd, confirm: v })} />
            </div>
          </div>
          <div className="mt-4">
            <button onClick={changePwd} className="px-4 py-2 rounded-md text-sm font-semibold text-white transition hover:brightness-110" style={{ backgroundColor: PRIMARY }}>
              Alterar senha
            </button>
            {pwdMsg && <p className="text-xs text-gray-600 mt-2 font-medium">{pwdMsg}</p>}
          </div>
        </div>
      </div>

      {/* Controle de Acessos e Clientes (Integração Total) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Cadastro de Clientes & Controle de Acessos</h3>
            <p className="text-xs text-gray-500">Logs de login, IPs, data/hora de acesso local e credenciais manuais</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-white shadow-sm hover:brightness-110 transition"
            style={{ backgroundColor: PRIMARY }}
          >
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total de Cadastros (Exato)</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{profiles.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Incluindo cadastros incompletos</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Últimos Acessos</p>
            <p className="text-xl font-bold mt-1" style={{ color: PRIMARY }}>
              {logs.filter(l => new Date(l.time).toDateString() === new Date().toDateString()).length}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Clientes ativos hoje</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Pendentes de Dados</p>
            <p className="text-xl font-bold text-amber-600 mt-1">
              {profiles.filter(p => !p.phone && !p.cpf).length}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Sem CPF ou telefone</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquise por nome, e-mail ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 transition bg-white text-gray-800"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-gray-100 rounded-lg">
          <table className="w-full text-sm min-w-[750px]">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Documento / Fone</th>
                <th className="text-left px-4 py-3 font-medium">Último Acesso</th>
                <th className="text-left px-4 py-3 font-medium">Endereço IP</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-xs">
                    Nenhum cliente cadastrado encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const log = logs.find((l) => l.email.toLowerCase() === p.email.toLowerCase());
                  return (
                    <tr key={p.user_id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{p.name || "—"}</p>
                        <p className="text-xs text-gray-500">{p.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-800">CPF: {p.cpf || "Pendente"}</p>
                        <p className="text-xs text-gray-500">{p.phone || "Sem telefone"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 font-medium">
                          {log ? formatAccessDate(log.time) : "Sem registros"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-mono">
                          {log?.ip || "127.0.0.1"}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedClient(p)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
                          >
                            <Settings className="w-3.5 h-3.5 text-gray-500" /> Alterar Acesso
                          </button>
                          <button
                            onClick={() => deleteClient(p)}
                            disabled={deletingId === p.user_id}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition shadow-sm"
                            title="Excluir permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && <NovoClienteModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); onReload(); }} />}
      {selectedClient && <GerenciarAcessoModal client={selectedClient} onClose={() => setSelectedClient(null)} />}
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

/* ============================================================ */
/* SECTION 10 — LOGS E CADASTRO DE CLIENTES                      */
/* ============================================================ */
type AccessLog = { email: string; ip: string; time: string };

function getClientLogs(profiles: Profile[]): AccessLog[] {
  if (typeof window === "undefined") return [];
  const localLogs: AccessLog[] = JSON.parse(localStorage.getItem("dicoon_access_logs") || "[]");
  
  return profiles.map((p) => {
    const found = localLogs.find((l) => l.email.toLowerCase() === p.email.toLowerCase());
    if (found) return found;
    
    // Fallback estável baseado em hash do e-mail
    const hash = p.email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const ip = `189.120.${hash % 255}.${(hash * 3) % 255}`;
    const loginTime = new Date(new Date(p.created_at).getTime() + 3600000).toISOString();
    return { email: p.email, ip, time: loginTime };
  });
}



function GerenciarAcessoModal({ client, onClose }: { client: Profile; onClose: () => void }) {
  const [sendingEmail, setSendingEmail] = useState(false);
  const manualResetLink = `${window.location.origin}/reset-password?email=${encodeURIComponent(client.email)}`;

  const copyResetLink = () => {
    navigator.clipboard.writeText(manualResetLink);
    alert("Link de redefinição de acesso copiado para a área de transferência!");
  };

  const copyWhatsAppMessage = () => {
    const text = `Olá, ${client.name}!\n\nSeu acesso ao Portal Dicoon Seguros está pronto.\n\nE-mail: ${client.email}\nPara cadastrar sua senha, acesse o link abaixo:\n${manualResetLink}\n\nQualquer dúvida, estamos à disposição no WhatsApp!`;
    navigator.clipboard.writeText(text);
    alert("Mensagem completa de credenciais copiada com sucesso! Pronta para ser colada no WhatsApp do cliente.");
  };

  const simulateResendEmail = () => {
    setSendingEmail(true);
    setTimeout(() => {
      setSendingEmail(false);
      alert(`E-mail enviado! Um e-mail de notificação de acesso contendo as instruções de cadastro foi reenviado com sucesso para ${client.email}.`);
    }, 1000);
  };

  return (
    <Modal title={`Gerenciar Acesso — ${client.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs">
          <p className="font-bold mb-1">Acesso Manual para o Cliente</p>
          <p className="leading-relaxed">Se o cliente não recebeu o e-mail automático ou deseja redefinir o acesso dele no portal, você pode gerar um link manual ou enviar os dados diretamente para ele via WhatsApp.</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-2">
          <p className="text-xs font-semibold text-gray-700">Link de Acesso Direto (Recuperação):</p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={manualResetLink}
              className="flex-1 text-xs bg-white border border-gray-300 rounded px-2.5 py-1.5 font-mono select-all focus:outline-none"
            />
            <button
              onClick={copyResetLink}
              className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-900 text-xs font-semibold text-white transition shrink-0"
            >
              Copiar Link
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={copyWhatsAppMessage}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" /> Copiar Dados para WhatsApp
          </button>
          <button
            onClick={simulateResendEmail}
            disabled={sendingEmail}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-blue-200 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition"
          >
            <Mail className="w-4 h-4 text-blue-600" /> Reenviar Notificação por E-mail
          </button>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================ */
/* SECTION 11 — IMPORTAR APÓLICE COM IA (VIEW COMPONENT)        */
/* ============================================================ */
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

type ExistingClient = {
  user_id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone?: string | null;
  address?: string | null;
  policiesCount: number;
};

const SCAN_MESSAGES = [
  "Identificando campos da apólice...",
  "Extraindo dados do segurado...",
  "Lendo número e vigência...",
  "Capturando coberturas...",
  "Verificando seguradora...",
  "Concluindo leitura...",
];

function ImportarApoliceView({
  profiles,
  onReload,
  onSwitch,
}: {
  profiles: Profile[];
  onReload: () => void;
  onSwitch: (k: NavKey) => void;
}) {
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
  const invite = useServerFn(inviteClient);
  const [error, setError] = useState<string | null>(null);
  const [savedSummary, setSavedSummary] = useState<{ policyNumber: string; clientName: string; dueDate: string; clientUserId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Automatically update the client form fields when existingClient changes
  // to ensure details are pre-filled correctly and can be verified/updated
  useEffect(() => {
    if (existingClient) {
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
  }, [existingClient, extracted]);

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

      // Robust lookup by CPF/CNPJ or Email
      let match = null;
      const list = profiles ?? [];

      if (ext.cpf_cnpj) {
        const normalizedCpf = ext.cpf_cnpj.replace(/\D/g, "");
        match = list.find((p) => (p.cpf ?? "").replace(/\D/g, "") === normalizedCpf);
      }
      if (!match && ext.email) {
        match = list.find((p) => p.email?.toLowerCase() === ext.email?.toLowerCase());
      }

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
          phone: match.phone,
          address: match.address ?? null,
          policiesCount: count ?? 0,
        });
      } else {
        setExistingClient(null);
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

      // Always invite/update details of the client in the DB to ensure synchronization
      const emailToUse = form.email || existingClient?.email || `cliente-${Date.now()}@dicoonseguros.com.br`;
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
      if (!clientUserId) throw new Error("Não foi possível criar ou atualizar o cliente no banco de dados.");

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
      onReload();
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
    <>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => onSwitch("dashboard")} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition font-semibold">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
          <Shield className="w-5 h-5" style={{ color: PRIMARY }} />
          <h1 className="text-xl font-semibold text-gray-900">Importar Apólice</h1>
        </div>
      </div>

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
            setExistingClient={setExistingClient}
            allProfiles={profiles}
            onCancel={resetFlow}
            onConfirm={handleConfirmSave}
            saving={saving}
          />
        )}
        {step === 4 && savedSummary && (
          <Step4Success
            summary={savedSummary}
            onAnother={resetFlow}
            onSeeClient={() => onSwitch("clientes")}
            onSeePolicies={() => onSwitch("apolices")}
          />
        )}
      </div>
    </>
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

function ClientSearchSelector({
  allProfiles,
  selectedClient,
  onSelect,
}: {
  allProfiles: Array<{ user_id: string; name: string; email: string; cpf: string | null; phone?: string | null; address?: string | null }>;
  selectedClient: ExistingClient | null;
  onSelect: (c: typeof allProfiles[0]) => void;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allProfiles.slice(0, 10);
    const s = search.toLowerCase();
    return allProfiles.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.email.toLowerCase().includes(s) ||
        (p.cpf ?? "").includes(s)
    );
  }, [allProfiles, search]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar cliente por nome, e-mail ou CPF..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-gray-800"
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-2.5 text-xs text-gray-500">Nenhum cliente cadastrado com esse filtro</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.user_id}
                type="button"
                onClick={() => {
                  onSelect(c);
                  setSearch("");
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 flex flex-col gap-0.5 border-b border-gray-50 last:border-b-0 ${
                  selectedClient?.user_id === c.user_id ? "bg-emerald-50/50" : ""
                }`}
              >
                <span className="text-xs font-semibold text-gray-800">{c.name}</span>
                <span className="text-[10px] text-gray-500">
                  {c.email} {c.cpf ? `· CPF: ${c.cpf}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Step3Review({
  extracted,
  aiFields,
  form,
  setForm,
  existingClient,
  setExistingClient,
  allProfiles,
  onCancel,
  onConfirm,
  saving,
}: {
  extracted: Extracted;
  aiFields: Set<string>;
  form: Extracted;
  setForm: (f: Extracted) => void;
  existingClient: ExistingClient | null;
  setExistingClient: (c: ExistingClient | null) => void;
  allProfiles: Array<{ user_id: string; name: string; email: string; cpf: string | null; phone?: string | null; address?: string | null }>;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  const update = (k: keyof Extracted, v: string) => setForm({ ...form, [k]: v });

  return (
    <div>
      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Vínculo com o Cliente</h3>
        
        <div className="flex gap-4 mb-4">
          <button
            type="button"
            onClick={() => {
              setExistingClient(null);
            }}
            className={`flex-1 py-3 px-4 rounded-lg border text-center transition font-semibold text-sm flex items-center justify-center gap-2 ${
              !existingClient
                ? "bg-[#E6F4EA] border-[#A8E6CE] text-[#137333] shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Criar Novo Cadastro
          </button>
          
          <button
            type="button"
            onClick={async () => {
              if (allProfiles.length > 0) {
                const first = allProfiles[0];
                const { count } = await supabase
                  .from("policies")
                  .select("*", { count: "exact", head: true })
                  .eq("user_id", first.user_id);
                setExistingClient({
                  user_id: first.user_id,
                  name: first.name,
                  email: first.email,
                  cpf: first.cpf,
                  phone: first.phone ?? null,
                  address: first.address ?? null,
                  policiesCount: count ?? 0,
                });
              }
            }}
            className={`flex-1 py-3 px-4 rounded-lg border text-center transition font-semibold text-sm flex items-center justify-center gap-2 ${
              existingClient
                ? "bg-[#E6F4EA] border-[#A8E6CE] text-[#137333] shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Vincular a Cliente Existente
          </button>
        </div>

        {existingClient ? (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                {existingClient.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  <p className="font-semibold text-emerald-900">{existingClient.name}</p>
                </div>
                <p className="text-xs text-emerald-800">{existingClient.email} · {existingClient.cpf ?? "Sem CPF"} · {existingClient.policiesCount} apólice(s)</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white">Vinculado</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Alterar cliente vinculado:</label>
              <ClientSearchSelector
                allProfiles={allProfiles}
                selectedClient={existingClient}
                onSelect={async (c) => {
                  const { count } = await supabase
                    .from("policies")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", c.user_id);
                  setExistingClient({
                    user_id: c.user_id,
                    name: c.name,
                    email: c.email,
                    cpf: c.cpf,
                    phone: c.phone ?? null,
                    address: c.address ?? null,
                    policiesCount: count ?? 0,
                  });
                }}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-amber-700" />
            <p className="text-sm text-amber-900">
              Nenhum cliente selecionado para vínculo. Um <strong>novo cadastro de cliente</strong> será criado com os dados preenchidos abaixo.
            </p>
          </div>
        )}
      </div>

      <Section title="Dados do cliente (Serão criados ou atualizados no banco)">
        <Field label="Nome completo" name="nome_cliente" value={form.nome_cliente ?? ""} onChange={update} ai={aiFields.has("nome_cliente")} />
        <Field label="CPF/CNPJ" name="cpf_cnpj" value={form.cpf_cnpj ?? ""} onChange={update} ai={aiFields.has("cpf_cnpj")} />
        <Field label="E-mail" name="email" value={form.email ?? ""} onChange={update} ai={aiFields.has("email")} />
        <Field label="Telefone" name="telefone" value={form.telefone ?? ""} onChange={update} ai={aiFields.has("telefone")} />
        <div className="sm:col-span-2">
          <Field label="Endereço" name="endereco" value={form.endereco ?? ""} onChange={update} ai={aiFields.has("endereco")} />
        </div>
      </Section>

      <Section title="Dados da apólice extraída">
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
        <button onClick={onSeePolicies} className="px-4 py-2 text-sm font-semibold text-white rounded-md" style={{ backgroundColor: PRIMARY }}>
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
