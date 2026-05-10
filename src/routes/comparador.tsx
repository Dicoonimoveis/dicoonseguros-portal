import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Check, X, ArrowRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/comparador")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: ComparadorPage,
});

const comparisonQuotes = [
  {
    id: 1,
    insurer: "Bradesco",
    price: 4800,
    monthly: 400,
    coverage: "Completa",
    franchise: 1500,
    theft: true,
    casco: true,
    rc: true,
    assistance: 3,
    assistance_types: ["Guincho", "Manutenção", "Troca de Pneu"],
    network_size: 450,
    deductible_options: [500, 1000, 1500],
    best_price: true,
  },
  {
    id: 2,
    insurer: "Allianz",
    price: 5500,
    monthly: 458,
    coverage: "Premium",
    franchise: 500,
    theft: true,
    casco: true,
    rc: true,
    assistance: 6,
    assistance_types: ["Guincho", "Manutenção", "Troca de Pneu", "Reboque", "Táxi", "Hospedagem"],
    network_size: 800,
    deductible_options: [0, 500, 1000],
    recommended: true,
  },
  {
    id: 3,
    insurer: "Itaú",
    price: 5200,
    monthly: 433,
    coverage: "Completa",
    franchise: 1000,
    theft: true,
    casco: true,
    rc: true,
    assistance: 4,
    assistance_types: ["Guincho", "Manutenção", "Troca de Pneu", "Reboque"],
    network_size: 600,
    deductible_options: [500, 1000, 1500, 2000],
  },
];

function ComparadorPage() {
  const [selectedTabIdx, setSelectedTabIdx] = useState(0);

  const tabs = [
    { label: "Preços", key: "prices" },
    { label: "Coberturas", key: "coverage" },
    { label: "Assistências", key: "assistance" },
    { label: "Rede", key: "network" },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Multicálculo · Comparativo Detalhado"
        title="Comparação de 3 Seguradoras"
        description="Honda Civic 2022 · Análise completa de preços, coberturas e benefícios"
      />

      {/* Comparison Tabs */}
      <div className="mb-6 border-b border-border flex gap-8">
        {tabs.map((tab, idx) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTabIdx(idx)}
            className={`pb-4 font-medium text-sm border-b-2 transition-colors ${
              idx === selectedTabIdx
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {selectedTabIdx === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {comparisonQuotes.map((quote) => (
            <div
              key={quote.id}
              className={`rounded-xl border p-6 ${
                quote.best_price
                  ? "border-amber-300 bg-amber-50/50"
                  : quote.recommended
                    ? "border-primary/50 bg-primary/5"
                    : "border-border"
              }`}
            >
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">{quote.insurer}</h3>
                {quote.best_price && <span className="text-xs bg-amber-100 text-amber-900 px-2 py-1 rounded mt-1 inline-block">Melhor Preço</span>}
                {quote.recommended && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded mt-1 inline-block">Recomendado</span>}
              </div>

              <div className="mb-6">
                <p className="text-4xl font-bold text-foreground">
                  R$ {quote.price.toLocaleString("pt-BR")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {quote.monthly.toLocaleString("pt-BR")} /parcela
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Cobertura</p>
                  <p className="text-sm font-medium text-foreground">{quote.coverage}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Franquia</p>
                  <p className="text-sm font-medium text-foreground">R$ {quote.franchise.toLocaleString("pt-BR")}</p>
                </div>
              </div>

              <button className="w-full mt-6 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                Selecionar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedTabIdx === 1 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="text-left font-medium px-6 py-4 text-xs">Cobertura</th>
                {comparisonQuotes.map((q) => (
                  <th key={q.id} className="text-center font-medium px-6 py-4 text-xs">
                    {q.insurer}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Furto/Roubo", key: "theft" },
                { label: "Casco Parcial", key: "casco" },
                { label: "RC Obrigatória", key: "rc" },
              ].map((cov) => (
                <tr key={cov.key} className="border-t border-border hover:bg-surface/50">
                  <td className="px-6 py-4 font-medium text-foreground">{cov.label}</td>
                  {comparisonQuotes.map((q) => (
                    <td key={q.id} className="text-center px-6 py-4">
                      {q[cov.key as keyof typeof q] ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-red-500 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTabIdx === 2 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="text-left font-medium px-6 py-4 text-xs">Assistência</th>
                {comparisonQuotes.map((q) => (
                  <th key={q.id} className="text-center font-medium px-6 py-4 text-xs">
                    {q.insurer} ({q.assistance} serviços)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["Guincho", "Manutenção", "Troca de Pneu", "Reboque", "Táxi", "Hospedagem"].map((asst) => (
                <tr key={asst} className="border-t border-border hover:bg-surface/50">
                  <td className="px-6 py-4 font-medium text-foreground">{asst}</td>
                  {comparisonQuotes.map((q) => (
                    <td key={q.id} className="text-center px-6 py-4">
                      {q.assistance_types.includes(asst) ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTabIdx === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {comparisonQuotes.map((quote) => (
            <div key={quote.id} className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">{quote.insurer}</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Tamanho da Rede</p>
                  <p className="text-2xl font-bold text-primary">{quote.network_size}+</p>
                  <p className="text-xs text-muted-foreground">oficinas credenciadas</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Opções de Franquia</p>
                  <div className="flex flex-wrap gap-2">
                    {quote.deductible_options.map((opt) => (
                      <span key={opt} className="px-2 py-1 bg-secondary text-xs rounded">
                        R$ {opt.toLocaleString("pt-BR")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="mt-8 pt-6 border-t border-border flex gap-3">
        <button className="flex-1 px-6 py-3 rounded-lg border border-border hover:bg-surface/50 font-medium">
          Voltar ao Multicálculo
        </button>
        <button className="flex-1 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
          Gerar Proposta para Selecionada
        </button>
      </div>
    </AppShell>
  );
}
