import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  LayoutDashboard,
  Users,
  FileText,
  CalendarClock,
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";

export const Route = createFileRoute("/dashboard-admin")({
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", sessionData.session.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw redirect({ to: "/dashboard-cliente" });
  },
  component: AdminDashboard,
});

const PRIMARY = "#1D9E75";
const BG = "#F0F2F5";
const ADMIN_PURPLE = "#7C3AED";

type NavKey =
  | "dashboard"
  | "clientes"
  | "apolices"
  | "vencimentos"
  | "sinistros"
  | "relatorios"
  | "configuracoes";

type ExpiryRow = {
  client: string;
  policy: string;
  type: string;
  dueDate: string;
  days: number;
};

const URGENT_ROWS: ExpiryRow[] = [
  { client: "Carlos Mendes", policy: "#2021-9901", type: "Empresarial", dueDate: "17/05/2026", days: 3 },
  { client: "Maria Oliveira", policy: "#2022-3310", type: "Vida", dueDate: "19/05/2026", days: 5 },
  { client: "João Silva", policy: "#2024-8841", type: "Auto", dueDate: "21/05/2026", days: 7 },
];

const SOON_ROWS: ExpiryRow[] = [
  { client: "Fernanda Ramos", policy: "#2025-0044", type: "Vida", dueDate: "28/05/2026", days: 14 },
  { client: "Pedro Lima", policy: "#2024-7712", type: "Auto", dueDate: "01/06/2026", days: 18 },
  { client: "Ana Costa", policy: "#2023-5520", type: "Residencial", dueDate: "14/06/2026", days: 30 },
];

function AdminDashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState<NavKey>("dashboard");

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const urgentCount = URGENT_ROWS.length;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: BG }}>
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6" style={{ color: PRIMARY }} strokeWidth={2.4} />
          <span className="text-lg font-bold" style={{ color: PRIMARY }}>
            Dicoon Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: `${ADMIN_PURPLE}15`, color: ADMIN_PURPLE }}
          >
            Administrador
          </span>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ backgroundColor: ADMIN_PURPLE }}
          >
            AD
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed top-16 bottom-0 left-0 w-60 bg-white border-r border-gray-200 z-20 py-6 px-3 hidden md:block">
        <nav className="space-y-1">
          <NavItem icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" active={active === "dashboard"} onClick={() => setActive("dashboard")} />
          <NavItem icon={<Users className="w-4 h-4" />} label="Clientes" active={active === "clientes"} onClick={() => setActive("clientes")} />
          <NavItem icon={<FileText className="w-4 h-4" />} label="Apólices" active={active === "apolices"} onClick={() => setActive("apolices")} />
          <NavItem icon={<CalendarClock className="w-4 h-4" />} label="Vencimentos" active={active === "vencimentos"} onClick={() => setActive("vencimentos")} badge={urgentCount} />
          <NavItem icon={<AlertTriangle className="w-4 h-4" />} label="Sinistros" active={active === "sinistros"} onClick={() => setActive("sinistros")} />
          <NavItem icon={<BarChart3 className="w-4 h-4" />} label="Relatórios" active={active === "relatorios"} onClick={() => setActive("relatorios")} />
          <NavItem icon={<Settings className="w-4 h-4" />} label="Configurações" active={active === "configuracoes"} onClick={() => setActive("configuracoes")} />
        </nav>
      </aside>

      {/* Main */}
      <main className="pt-16 md:pl-60">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {active === "dashboard" && <DashboardView />}
          {active === "vencimentos" && <VencimentosView />}
          {active === "clientes" && <PlaceholderView title="Clientes" description="Gerencie os clientes da corretora." />}
          {active === "apolices" && <PlaceholderView title="Apólices" description="Visualize e administre apólices ativas." />}
          {active === "sinistros" && <PlaceholderView title="Sinistros" description="Acompanhe sinistros em andamento." />}
          {active === "relatorios" && <PlaceholderView title="Relatórios" description="Relatórios gerenciais e exportações." />}
          {active === "configuracoes" && <PlaceholderView title="Configurações" description="Configurações do sistema." />}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left"
      style={active ? { backgroundColor: `${PRIMARY}15`, color: PRIMARY } : { color: "#4B5563" }}
    >
      <span style={{ color: active ? PRIMARY : "#9CA3AF" }}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 min-w-[18px] text-center">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function DashboardView() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total de clientes" value="148" color="#111827" />
        <MetricCard label="Apólices ativas" value="312" color={PRIMARY} />
        <MetricCard label="Vencem em 30 dias" value="18" color="#D97706" />
        <MetricCard label="Vencem em 7 dias" value="3" color="#DC2626" />
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Alertas urgentes — vencem nos próximos 7 dias
        </h2>
        <ExpiryTable rows={URGENT_ROWS} tone="urgent" />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Vencimentos em 30 dias</h2>
        <ExpiryTable rows={SOON_ROWS} tone="soon" />
      </section>
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

function ExpiryTable({ rows, tone }: { rows: ExpiryRow[]; tone: "urgent" | "soon" }) {
  const wrapperBg = tone === "urgent" ? "#FEF6F6" : "#FFFFFF";
  const badgeStyle = tone === "urgent"
    ? { backgroundColor: "#FEE2E2", color: "#B91C1C" }
    : { backgroundColor: "#FEF3C7", color: "#B45309" };

  return (
    <div
      className="rounded-xl border border-gray-200 overflow-hidden shadow-sm"
      style={{ backgroundColor: wrapperBg }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Apólice</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Vencimento</th>
            <th className="px-4 py-3 font-medium">Prazo</th>
            <th className="px-4 py-3 font-medium text-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.policy} className={i > 0 ? "border-t border-gray-100" : ""}>
              <td className="px-4 py-3 text-gray-900 font-medium">{r.client}</td>
              <td className="px-4 py-3 text-gray-600">{r.policy}</td>
              <td className="px-4 py-3 text-gray-600">{r.type}</td>
              <td className="px-4 py-3 text-gray-600">{r.dueDate}</td>
              <td className="px-4 py-3">
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={badgeStyle}
                >
                  {r.days} dias
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {tone === "urgent" ? (
                  <button className="px-3 py-1.5 rounded-md text-xs font-semibold text-white hover:brightness-110 transition" style={{ backgroundColor: "#DC2626" }}>
                    Contatar
                  </button>
                ) : (
                  <button className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 transition">
                    Contatar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VencimentosView() {
  const allRows = useMemo(() => [...URGENT_ROWS, ...SOON_ROWS], []);
  const [alerts, setAlerts] = useState({
    d60: false,
    d30: true,
    d15: true,
    d7: true,
    d0: true,
  });

  const toggle = (key: keyof typeof alerts) => setAlerts((a) => ({ ...a, [key]: !a[key] }));

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Vencimentos</h1>
          <p className="text-sm text-gray-500">Apólices que vencem nos próximos 30 dias.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white hover:brightness-110 transition"
          style={{ backgroundColor: PRIMARY }}
        >
          <Bell className="w-4 h-4" /> Notificar todos
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Alertas automáticos</h3>
        <p className="text-xs text-gray-500 mb-4">
          Selecione quando o sistema deve enviar lembretes automáticos para o cliente e o corretor.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            { key: "d60", label: "60 dias antes" },
            { key: "d30", label: "30 dias antes" },
            { key: "d15", label: "15 dias antes" },
            { key: "d7", label: "7 dias antes" },
            { key: "d0", label: "No dia do vencimento" },
          ].map((opt) => {
            const checked = alerts[opt.key as keyof typeof alerts];
            return (
              <label
                key={opt.key}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition"
                style={{
                  borderColor: checked ? PRIMARY : "#E5E7EB",
                  backgroundColor: checked ? `${PRIMARY}10` : "white",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.key as keyof typeof alerts)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: PRIMARY }}
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-800 mb-3">Próximos vencimentos</h2>
      <ExpiryTable rows={allRows} tone="soon" />
    </>
  );
}

function PlaceholderView({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
      <p className="text-xs text-gray-400 mt-4">Em desenvolvimento.</p>
    </div>
  );
}
