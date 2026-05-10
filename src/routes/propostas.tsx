import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Mail, Share2, Download, FileText } from "lucide-react";

export const Route = createFileRoute("/propostas")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: PropostasPage,
});

const mockPropostas = [
  { id: 1, client: "João Silva", insurer: "Itaú", value: 5500, status: "enviada", date: "Ontem", viewed: false },
  { id: 2, client: "Maria Santos", insurer: "Bradesco", value: 8200, status: "aberta", date: "Hoje", viewed: true },
  { id: 3, client: "Pedro Oliveira", insurer: "Allianz", value: 3800, status: "aceita", date: "2 dias", viewed: true },
];

function PropostasPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Vendas"
        title="Propostas"
        description="Acompanhamento de propostas enviadas aos clientes"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-border bg-card p-5 shadow-elegant">
          <p className="text-xs text-muted-foreground">Total enviadas</p>
          <p className="text-2xl font-semibold text-foreground mt-2">42</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-elegant">
          <p className="text-xs text-muted-foreground">Aguardando resposta</p>
          <p className="text-2xl font-semibold text-primary mt-2">12</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-elegant">
          <p className="text-xs text-muted-foreground">Aceitas este mês</p>
          <p className="text-2xl font-semibold text-success mt-2">8</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-elegant overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left font-medium px-6 py-4">Cliente</th>
              <th className="text-left font-medium px-6 py-4">Seguradora</th>
              <th className="text-right font-medium px-6 py-4">Valor</th>
              <th className="text-left font-medium px-6 py-4">Status</th>
              <th className="text-left font-medium px-6 py-4">Data</th>
              <th className="text-left font-medium px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {mockPropostas.map((prop) => (
              <tr key={prop.id} className="border-t border-border hover:bg-surface/50 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">{prop.client}</td>
                <td className="px-6 py-4 text-muted-foreground">{prop.insurer}</td>
                <td className="px-6 py-4 text-right font-mono">R$ {prop.value.toLocaleString("pt-BR")}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    prop.status === "aceita" ? "bg-green-500/10 text-green-700 dark:text-green-300" :
                    prop.status === "aberta" ? "bg-blue-500/10 text-blue-700 dark:text-blue-300" :
                    "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  }`}>
                    {prop.status.charAt(0).toUpperCase() + prop.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-xs">{prop.date}</td>
                <td className="px-6 py-4 flex gap-2">
                  <button className="p-1.5 rounded hover:bg-surface/50 transition-colors">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-surface/50 transition-colors">
                    <Share2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-surface/50 transition-colors">
                    <Download className="w-4 h-4 text-muted-foreground" />
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
