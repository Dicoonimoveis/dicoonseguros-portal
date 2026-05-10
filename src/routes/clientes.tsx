import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Search, Plus } from "lucide-react";

export const Route = createFileRoute("/clientes")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: ClientesPage,
});

const mockClientes = [
  {
    id: 1,
    name: "João Silva",
    cpf: "123.456.789-00",
    type: "PF",
    phone: "(11) 98765-4321",
    email: "joao@email.com",
    city: "São Paulo",
    lastContact: "Ontem",
    nextRenewal: "30/11",
    status: "ativo",
  },
  {
    id: 2,
    name: "Empresa XYZ Ltda",
    cpf: "12.345.678/0001-90",
    type: "PJ",
    phone: "(11) 3456-7890",
    email: "contato@xyz.com",
    city: "São Paulo",
    lastContact: "3 dias",
    nextRenewal: "15/11",
    status: "ativo",
  },
];

function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClientes = mockClientes.filter((cliente) =>
    cliente.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cpf.includes(searchTerm)
  );

  const stats = [
    { label: "Total de clientes", value: 145 },
    { label: "Clientes novos mês", value: 12 },
    { label: "Em carteira", value: "R$ 2,5M" },
    { label: "Em risco", value: 8 },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="CRM"
        title="Clientes"
        description="Gestão centralizada de clientes e apólices"
        actions={
          <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Plus className="size-3.5" /> Novo Cliente
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-elegant">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-semibold text-foreground mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome ou CPF/CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-elegant overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left font-medium px-6 py-4">Nome</th>
              <th className="text-left font-medium px-6 py-4">Tipo</th>
              <th className="text-left font-medium px-6 py-4">CPF/CNPJ</th>
              <th className="text-left font-medium px-6 py-4">Telefone</th>
              <th className="text-left font-medium px-6 py-4">Cidade</th>
              <th className="text-left font-medium px-6 py-4">Última renovação</th>
              <th className="text-left font-medium px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredClientes.map((cliente) => (
              <tr key={cliente.id} className="border-t border-border hover:bg-surface/50 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">{cliente.name}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300">
                    {cliente.type}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{cliente.cpf}</td>
                <td className="px-6 py-4 text-muted-foreground">{cliente.phone}</td>
                <td className="px-6 py-4 text-muted-foreground">{cliente.city}</td>
                <td className="px-6 py-4 text-muted-foreground text-xs">{cliente.nextRenewal}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-300">
                    Ativo
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
