import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  FileText,
  AlertTriangle,
  FolderOpen,
  MessageCircle,
  Download,
  Eye,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signOut, getCurrentUser, refreshSessionState, onSessionChange } from "@/lib/auth";

export const Route = createFileRoute("/dashboard-cliente")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: ClientDashboard,
});

const PRIMARY = "#1D9E75";
const BG = "#F0F2F5";

type NavKey = "apolices" | "sinistros" | "documentos" | "corretor";

type Policy = {
  id: string;
  type: string;
  itemLabel?: string;
  number: string;
  insurer: string;
  startDate: string; // dd/mm/yyyy
  endDate: string;
  premium: string;
  coverages: string[];
  daysToExpiry: number;
  progress: number; // 0-100 of vigencia elapsed
};

const MOCK_POLICIES: Policy[] = [
  {
    id: "1",
    type: "Seguro Auto",
    itemLabel: "Honda Civic 2022",
    number: "#2024-8841",
    insurer: "Bradesco Seguros",
    startDate: "21/05/2025",
    endDate: "21/05/2026",
    premium: "R$ 287,00/mês",
    coverages: ["Colisão", "Roubo e furto", "Terceiros 100k", "Assistência 24h"],
    daysToExpiry: 7,
    progress: 98,
  },
  {
    id: "2",
    type: "Seguro Residencial",
    number: "#2023-5520",
    insurer: "Porto Seguro",
    startDate: "14/06/2025",
    endDate: "14/06/2026",
    premium: "R$ 1.140,00/ano",
    coverages: ["Incêndio", "Roubo", "Danos elétricos", "Vendaval"],
    daysToExpiry: 30,
    progress: 92,
  },
  {
    id: "3",
    type: "Seguro de Vida",
    number: "#2025-1103",
    insurer: "Zurich",
    startDate: "10/01/2026",
    endDate: "10/01/2027",
    premium: "Capital: R$ 300.000,00",
    coverages: ["Morte natural", "Invalidez", "Doenças graves"],
    daysToExpiry: 240,
    progress: 34,
  },
];

function ClientDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser());
  const [active, setActive] = useState<NavKey>("apolices");

  useEffect(() => {
    void refreshSessionState().then((u) => setUser(u));
    return onSessionChange(() => setUser(getCurrentUser()));
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const initials = useMemo(() => {
    const name = user?.name ?? user?.email ?? "U";
    return name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user]);

  const firstName = (user?.name ?? user?.email ?? "Cliente").split(" ")[0];

  const expiring7 = MOCK_POLICIES.filter((p) => p.daysToExpiry <= 7);
  const expiring30 = MOCK_POLICIES.filter((p) => p.daysToExpiry > 7 && p.daysToExpiry <= 30);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: BG }}>
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6" style={{ color: PRIMARY }} strokeWidth={2.4} />
          <span className="text-lg font-bold" style={{ color: PRIMARY }}>
            Dicoon Seguros
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden sm:block">
            Olá, <span className="font-semibold text-gray-900">{user?.name ?? firstName}</span>
          </span>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ backgroundColor: PRIMARY }}
            aria-label="Avatar"
          >
            {initials}
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
          <NavItem icon={<FileText className="w-4 h-4" />} label="Minhas apólices" active={active === "apolices"} onClick={() => setActive("apolices")} />
          <NavItem icon={<AlertTriangle className="w-4 h-4" />} label="Sinistros" active={active === "sinistros"} onClick={() => setActive("sinistros")} />
          <NavItem icon={<FolderOpen className="w-4 h-4" />} label="Documentos" active={active === "documentos"} onClick={() => setActive("documentos")} />
          <NavItem icon={<MessageCircle className="w-4 h-4" />} label="Falar com corretor" active={active === "corretor"} onClick={() => setActive("corretor")} />
        </nav>
      </aside>

      {/* Main */}
      <main className="pt-16 md:pl-60">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {active === "apolices" && (
            <>
              {/* Alerts */}
              <div className="space-y-3 mb-8">
                {expiring7.map((p) => (
                  <AlertCard
                    key={p.id}
                    tone="red"
                    title={`Apólice vence em ${p.daysToExpiry} dias — ${p.type}`}
                    subtitle={`${p.itemLabel ? p.itemLabel + " · " : ""}Vence em ${p.endDate}`}
                    actionLabel="Renovar"
                  />
                ))}
                {expiring30.map((p) => (
                  <AlertCard
                    key={p.id}
                    tone="amber"
                    title={`Vencimento em ${p.daysToExpiry} dias — ${p.type}`}
                    subtitle={`Vence em ${p.endDate}`}
                  />
                ))}
              </div>

              <h2 className="text-base font-semibold text-gray-800 mb-4">Minhas apólices</h2>
              <div className="space-y-4">
                {MOCK_POLICIES.map((p) => (
                  <PolicyCard key={p.id} policy={p} />
                ))}
              </div>
            </>
          )}

          {active === "sinistros" && <EmptyState icon={<AlertTriangle className="w-10 h-10" />} title="Nenhum sinistro registrado" description="Quando você abrir um sinistro, ele aparecerá aqui." />}
          {active === "documentos" && <EmptyState icon={<FolderOpen className="w-10 h-10" />} title="Seus documentos" description="Apólices, comprovantes e boletos ficarão organizados aqui." />}
          {active === "corretor" && <EmptyState icon={<MessageCircle className="w-10 h-10" />} title="Falar com corretor" description="Em breve você poderá conversar diretamente com seu corretor por aqui." />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left"
      style={
        active
          ? { backgroundColor: `${PRIMARY}15`, color: PRIMARY }
          : { color: "#4B5563" }
      }
    >
      <span style={{ color: active ? PRIMARY : "#9CA3AF" }}>{icon}</span>
      {label}
    </button>
  );
}

function AlertCard({ tone, title, subtitle, actionLabel }: { tone: "red" | "amber"; title: string; subtitle: string; actionLabel?: string }) {
  const styles =
    tone === "red"
      ? { bg: "#FEF2F2", border: "#EF4444", text: "#B91C1C" }
      : { bg: "#FFFBEB", border: "#F59E0B", text: "#B45309" };
  return (
    <div
      className="rounded-lg flex items-center justify-between gap-4 p-4 border-l-4"
      style={{ backgroundColor: styles.bg, borderLeftColor: styles.border }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: styles.border }} />
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: styles.text }}>{title}</p>
          <p className="text-xs mt-0.5" style={{ color: styles.text, opacity: 0.85 }}>{subtitle}</p>
        </div>
      </div>
      {actionLabel && (
        <button
          className="shrink-0 px-4 py-1.5 rounded-md text-xs font-semibold bg-white border hover:bg-gray-50 transition"
          style={{ color: styles.text, borderColor: `${styles.border}60` }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function PolicyCard({ policy }: { policy: Policy }) {
  const isUrgent = policy.daysToExpiry <= 7;
  const isWarn = policy.daysToExpiry <= 30 && !isUrgent;

  const barColor = isUrgent ? "#EF4444" : isWarn ? "#F59E0B" : PRIMARY;
  const badge = isUrgent
    ? { text: `Vence em ${policy.daysToExpiry} dias`, bg: "#FEE2E2", color: "#B91C1C" }
    : isWarn
      ? { text: `Vence em ${policy.daysToExpiry} dias`, bg: "#FEF3C7", color: "#B45309" }
      : { text: "Ativa", bg: "#D1FAE5", color: "#047857" };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">
            {policy.type}
            {policy.itemLabel && <span className="text-gray-500 font-normal"> · {policy.itemLabel}</span>}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Apólice {policy.number} · {policy.insurer}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Vigência: {policy.startDate} a {policy.endDate} · Prêmio: {policy.premium}
          </p>
        </div>
        <span
          className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: badge.bg, color: badge.color }}
        >
          {badge.text}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {policy.coverages.map((c) => (
          <span key={c} className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
            {c}
          </span>
        ))}
      </div>

      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${policy.progress}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
          <Eye className="w-3.5 h-3.5" /> Ver apólice
        </button>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
          <Download className="w-3.5 h-3.5" /> Baixar PDF
        </button>
        {isUrgent && (
          <button
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition hover:brightness-110"
            style={{ backgroundColor: PRIMARY }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Renovar agora
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 py-16 px-6 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  );
}
