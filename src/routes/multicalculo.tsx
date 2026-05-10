import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Trophy, Shield, Percent, Scale, FileDown, MessageCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/multicalculo")({
  beforeLoad: async () => {
    const token = getAuthToken();
    if (!token) {
      throw redirect({ to: "/login" });
    }
  },
  component: MulticalcPage,
});

const mockQuotes = [
  { id: 1, insurer: "Itaú", price: 5200, monthly: 433, coverage: "Completa", franchise: 1000, assistance: 4, commission: 15 },
  { id: 2, insurer: "Bradesco", price: 4800, monthly: 400, coverage: "Completa", franchise: 1500, assistance: 3, commission: 12 },
  { id: 3, insurer: "Allianz", price: 5500, monthly: 458, coverage: "Premium", franchise: 500, assistance: 6, commission: 18 },
  { id: 4, insurer: "Sompo", price: 4900, monthly: 408, coverage: "Standard", franchise: 2000, assistance: 2, commission: 10 },
];

function MulticalcPage() {
  const [sortBy, setSortBy] = useState<"price" | "coverage" | "commission">("price");
  const [selectedQuotes, setSelectedQuotes] = useState<number[]>([]);

  const sorted = [...mockQuotes].sort((a, b) => {
    if (sortBy === "price") return a.price - b.price;
    if (sortBy === "coverage") return b.coverage.length - a.coverage.length;
    return b.commission - a.commission;
  });

  const handleSelectQuote = (id: number) => {
    setSelectedQuotes((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev.slice(-2), id]
    );
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Cotação · Auto · João Silva"
        title="Resultado do Multicálculo"
        description="Honda Civic 2022 · São Paulo (SP) · 32 anos, sem sinistros"
        actions={
          <>
            <button className="h-9 px-4 rounded-md border border-border bg-surface text-sm hover:bg-surface-elevated transition-colors flex items-center gap-2">
              <MessageCircle className="size-4" /> WhatsApp
            </button>
            <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors">
              <FileDown className="size-4" /> Gerar Proposta
            </button>
          </>
        }
      />

      {/* Ranking Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-medium text-muted-foreground">Melhor Preço</h3>
          </div>
          <p className="text-lg font-semibold text-foreground">R$ 4.800</p>
          <p className="text-xs text-muted-foreground mt-1">Bradesco</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-green-500" />
            <h3 className="text-xs font-medium text-muted-foreground">Melhor Cobertura</h3>
          </div>
          <p className="text-lg font-semibold text-foreground">Premium</p>
          <p className="text-xs text-muted-foreground mt-1">Allianz (6 assist.)</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Percent className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-medium text-muted-foreground">Melhor Comissão</h3>
          </div>
          <p className="text-lg font-semibold text-foreground">18%</p>
          <p className="text-xs text-muted-foreground mt-1">Allianz (~R$ 990)</p>
        </div>

        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-medium text-muted-foreground">Recomendado</h3>
          </div>
          <p className="text-lg font-semibold text-foreground">Allianz</p>
          <p className="text-xs text-primary mt-1">Melhor custo-benefício</p>
        </div>
      </div>

      {/* Sort Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { key: "price" as const, label: "Menor Preço" },
          { key: "coverage" as const, label: "Melhor Cobertura" },
          { key: "commission" as const, label: "Maior Comissão" },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setSortBy(btn.key)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === btn.key
                ? "bg-primary text-primary-foreground"
                : "bg-surface border border-border hover:bg-surface/50"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Quotes Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left font-medium px-6 py-4 w-8"></th>
              <th className="text-left font-medium px-6 py-4">Seguradora</th>
              <th className="text-right font-medium px-6 py-4">Prêmio</th>
              <th className="text-right font-medium px-6 py-4">Parcela</th>
              <th className="text-left font-medium px-6 py-4">Cobertura</th>
              <th className="text-right font-medium px-6 py-4">Franquia</th>
              <th className="text-center font-medium px-6 py-4">Assist.</th>
              <th className="text-right font-medium px-6 py-4">Comissão</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((quote) => {
              const isRecommended = quote.id === 3; // Allianz
              return (
                <tr  
                  key={quote.id}
                  className={`border-t border-border hover:bg-surface/50 transition-colors ${
                    isRecommended ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedQuotes.includes(quote.id)}
                      onChange={() => handleSelectQuote(quote.id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">
                    {quote.insurer}
                    {isRecommended && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">Recomendado</span>}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-semibold">R$ {quote.price.toLocaleString("pt-BR")}</td>
                  <td className="px-6 py-4 text-right">R$ {quote.monthly.toLocaleString("pt-BR")}</td>
                  <td className="px-6 py-4">{quote.coverage}</td>
                  <td className="px-6 py-4 text-right">R$ {quote.franchise.toLocaleString("pt-BR")}</td>
                  <td className="px-6 py-4 text-center">{quote.assistance}</td>
                  <td className="px-6 py-4 text-right text-primary font-medium">{quote.commission}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      {selectedQuotes.length > 0 && (
        <div className="mt-6 flex gap-3">
          <button className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-surface/50 font-medium">
            Comparar ({selectedQuotes.length})
          </button>
          <button className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
            Gerar Proposta
          </button>
        </div>
      )}
    </AppShell>
  );
}
