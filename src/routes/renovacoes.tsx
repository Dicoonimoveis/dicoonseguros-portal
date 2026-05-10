import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { AlertCircle, Phone, FileText } from "lucide-react";

export const Route = createFileRoute("/renovacoes")({
  beforeLoad: async () => {
    const token = getAuthToken();
    if (!token) {
      throw redirect({ to: "/login" });
    }
  },
  component: RenovacoesPage,
});

const mockRenovacoes = [
  { id: 1, client:  "João Silva", apolicy: "POL-2024-001", ends: "10/11/2024", premium: 5500, status: "não contatado", days: 5 },
  { id: 2, client: "Maria Santos", apolicy: "POL-2024-002", ends: "15/11/2024", premium: 8200, status: "em negociação", days: 10 },
  { id: 3, client: "Pedro Oliveira", apolicy: "POL-2024-003", ends: "20/11/2024", premium: 3800, status: "não contatado", days: 15 },
];

function RenovacoesPage() {
  const stats = [
    { label: "Vencimentos 7 dias", value: 3 },
    { label: "Vencimentos 15 dias", value: 8 },
    { label: "Vencimentos 30 dias", value: 15 },
    { label: "Sem ação registrada", value: 5 },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operação"
        title="Renovações"
        description="Acompanhamento de apólices próximas do vencimento"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className={`rounded-xl border p-5 shadow-elegant ${
            i === 0 ? "border-red-500/30 bg-red-500/5" : "border-border bg-card"
          }`}>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-semibold text-foreground mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-elegant overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left font-medium px-6 py-4">Cliente</th>
              <th className="text-left font-medium px-6 py-4">Apólice</th>
              <th className="text-left font-medium px-6 py-4">Vigência Final</th>
              <th className="text-left font-medium px-6 py-4">Prêmio</th>
              <th className="text-left font-medium px-6 py-4">Status</th>
              <th className="text-left font-medium px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {mockRenovacoes.map((renovacao) => (
              <tr key={renovacao.id} className="border-t border-border hover:bg-surface/50 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">{renovacao.client}</td>
                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{renovacao.apolicy}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    renovacao.days < 7 ? "bg-red-500/10 text-red-700 dark:text-red-300" :  "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  }`}>
                    {renovacao.ends} ({renovacao.days}d)
                  </span>
                </td>
                <td className="px-6 py-4 font-mono">R$ {renovacao.premium.toLocaleString("pt-BR")}</td>
                <td className="px-6 py-4 text-muted-foreground text-xs">{renovacao.status}</td>
                <td className="px-6 py-4 flex gap-2">
                  <button className="p-1.5 rounded hover:bg-surface/50 transition-colors" title="Contato">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-surface/50 transition-colors" title="Proposta">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
