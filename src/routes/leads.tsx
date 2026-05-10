import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Search, Plus } from "lucide-react";

export const Route = createFileRoute("/leads")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: LeadsPage,
});

const mockLeads = [
  {
    id: 1,
    name: "João Silva",
    origin: "site",
    product: "Auto",
    status: "novo",
    phone: "(11) 98765-4321",
    email: "joao@email.com",
    date: "Hoje",
    manager: "Ana",
  },
  {
    id: 2,
    name: "Maria Santos",
    origin: "indicação",
    product: "Saúde",
    status: "qualificado",
    phone: "(11) 99876-5432",
    email: "maria@email.com",
    date: "Ontem",
    manager: "Carlos",
  },
  {
    id: 3,
    name: "Pedro Oliveira",
    origin: "campanha",
    product: "Residencial",
    status: "novo",
    phone: "(11) 97654-3210",
    email: "pedro@email.com",
    date: "2 dias",
    manager: "Julia",
  },
];

function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filteredLeads = mockLeads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterStatus || lead.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = [
    { label: "Total de leads", value: mockLeads.length },
    { label: "Novos (7d)", value: 12 },
    { label: "Qualificados", value: 8 },
    { label: "Sem retorno", value: 5 },
  ];

  const originBadgeColor = (origin: string) => {
    const colors: Record<string, string> = {
      site: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
      indicação: "bg-green-500/10 text-green-700 dark:text-green-300",
      campanha: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
      whatsapp: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      manual: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
    };
    return colors[origin] || colors.manual;
  };

  const statusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      novo: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
      qualificado: "bg-green-500/10 text-green-700 dark:text-green-300",
      "em cotação": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      descartado: "bg-red-500/10 text-red-700 dark:text-red-300",
    };
    return colors[status] || colors.novo;
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="CRM"
        title="Leads"
        description="Oportunidades captadas por diferentes canais"
        actions={
          <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Plus className="size-3.5" /> Novo Lead
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-elegant">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-semibold text-foreground mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <select
          value={filterStatus || ""}
          onChange={(e) => setFilterStatus(e.target.value || null)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
        >
          <option value="">Todos os status</option>
          <option value="novo">Novo</option>
          <option value="qualificado">Qualificado</option>
          <option value="em cotação">Em cotação</option>
          <option value="descartado">Descartado</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-elegant overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left font-medium px-6 py-4">Nome</th>
              <th className="text-left font-medium px-6 py-4">Origem</th>
              <th className="text-left font-medium px-6 py-4">Produto</th>
              <th className="text-left font-medium px-6 py-4">Status</th>
              <th className="text-left font-medium px-6 py-4">Gerenciador</th>
              <th className="text-left font-medium px-6 py-4">Data</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="border-t border-border hover:bg-surface/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground">{lead.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{lead.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${originBadgeColor(lead.origin)}`}>
                    {lead.origin.charAt(0).toUpperCase() + lead.origin.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-foreground">{lead.product}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeColor(lead.status)}`}>
                    {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-foreground">{lead.manager}</td>
                <td className="px-6 py-4 text-muted-foreground text-xs">{lead.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
