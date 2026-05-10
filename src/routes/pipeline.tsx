import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { GripHorizontal, MoreVertical } from "lucide-react";

export const Route = createFileRoute("/pipeline")({
  beforeLoad: async () => {
    const token = getAuthToken();
    if (!token) {
      throw redirect({ to: "/login" });
    }
  },
  component: PipelinePage,
});

const stages = [
  { id: "novo", label: "Novo Lead", color: "bg-blue-500" },
  { id: "qualificacao", label: "Qualificação", color: "bg-purple-500" },
  { id: "cotacao", label: "Cotação", color: "bg-amber-500" },
  { id: "proposta", label: "Proposta Enviada", color: "bg-cyan-500" },
  { id: "negociacao", label: "Negociação", color: "bg-orange-500" },
  { id: "ganho", label: "Ganho", color: "bg-green-500" },
];

const mockOpportunities = [
  { id: 1, stage: "novo", name: "João Silva", value: 85000, product: "Auto", days: 1 },
  { id: 2, stage: "qualificacao", name: "Maria Santos", value: 125000, product: "Saúde", days: 3 },
  { id: 3, stage: "cotacao", name: "Pedro Oliveira", value: 95000, product: "Residencial", days: 2 },
  { id: 4, stage: "proposta", name: "Ana Costa", value: 150000, product: "Empresarial", days: 5 },
  { id: 5, stage: "negociacao", name: "Carlos Mendes", value: 110000, product: "Auto", days: 7 },
  { id: 6, stage: "ganho", name: "Julia Silva", value: 200000, product: "Saúde", days: 1 },
];

function PipelinePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Vendas"
        title="Pipeline Comercial"
        description="Kanban com oportunidades por etapa do funil"
      />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const opportunities = mockOpportunities.filter((o) => o.stage === stage.id);
          const total = opportunities.reduce((sum, o) => sum + o.value, 0);

          return (
            <div key={stage.id} className="flex-shrink-0 w-96 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{stage.label}</h3>
                    <p className="text-xs text-muted-foreground">{opportunities.length} oportunidades</p>
                  </div>
                </div>
                <p className="text-xs font-mono text-muted-foreground">R$ {(total / 1000).toFixed(0)}k</p>
              </div>

              <div className="space-y-2">
                {opportunities.map((opp) => (
                  <div key={opp.id} className="p-3 rounded-lg bg-surface border border-border hover:border-primary/50 transition-colors cursor-move group">
                    <div className="flex items-start gap-3">
                      <GripHorizontal className="w-4 h-4 text-muted-foreground group-hover:text-primary mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{opp.name}</p>
                        <p className="text-xs text-muted-foreground">{opp.product}</p>
                      </div>
                      <button className="p-1 rounded hover:bg-muted-foreground/10 transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border/50 text-xs font-mono text-primary">
                      R$ {opp.value.toLocaleString("pt-BR")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total em Aberto</p>
          <p className="text-2xl font-bold text-foreground mt-2">R$ 765k</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Taxa de Ganho</p>
          <p className="text-2xl font-bold text-success mt-2">32%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Valor Potencial</p>
          <p className="text-2xl font-bold text-primary mt-2">R$ 2,4M</p>
        </div>
      </div>
    </AppShell>
  );
}
