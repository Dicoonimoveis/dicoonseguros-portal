import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { kpis, productionSeries, tasks, opportunities } from "@/lib/mock-data";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Phone, FileText, Users2, Sparkles, TrendingUp, Clock, AlertCircle, CheckCircle2, ShieldCheck, Upload, X } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { inviteClientFromProposal } from "@/lib/proposal-invite.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const userEmail = user?.email ?? "Usuário";
  const [selectedOp, setSelectedOp] = useState<any>(null);
  const [isApoliceModalOpen, setIsApoliceModalOpen] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const inviteFromProposal = useServerFn(inviteClientFromProposal);

  const handleAttachApolice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAttaching(true);
    try {
      // Automation: when a proposal is attached, invite the client if they are new.
      let inviteMsg = "";
      if (selectedOp?.email) {
        const res = await inviteFromProposal({
          data: {
            clientId: selectedOp.clientId ?? null,
            email: selectedOp.email,
            name: selectedOp.client ?? null,
          },
        });
        inviteMsg = res.invited
          ? ` Cliente novo: convite de cadastro enviado para ${selectedOp.email}.`
          : " Cliente já cadastrado no sistema.";
      }
      setIsApoliceModalOpen(false);
      toast.success(`Apólice anexada com sucesso! Dados de ${selectedOp.client} migrados automaticamente.`, {
        description: `Todos os dados do veículo e cotação foram vinculados à nova apólice.${inviteMsg}`,
      });
    } catch (err: any) {
      toast.error("Falha ao processar a proposta.", {
        description: err?.message ?? "Tente novamente.",
      });
    } finally {
      setIsAttaching(false);
    }
  };





  return (
    <AppShell>
      <PageHeader
        eyebrow="Hoje · Quinta, 21 de novembro"
        title={`Bom dia, ${userEmail.split("@")[0]}.`}
        description="Você tem 4 follow-ups, 2 propostas para enviar e 3 renovações vencendo nesta semana."
        actions={
          <button className="h-9 px-4 rounded-md bg-surface border border-border text-sm hover:bg-surface-elevated transition-colors flex items-center gap-2">
            <TrendingUp className="size-3.5 text-primary" /> Insights
          </button>
        }
      />

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-gradient-surface p-5 shadow-elegant hover:border-primary/30 transition-colors cursor-pointer"
          >
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="font-display text-2xl font-semibold mt-2">{k.value}</div>
            <div
              className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${
                k.trend === "up" ? "text-success" : "text-destructive"
              }`}
            >
              {k.trend === "up" ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {k.delta}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Production Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-elegant">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Evolução de Cotações (30 dias)</h3>
              <p className="text-xs text-muted-foreground mt-1">Prêmio emitido em milhares (R$)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={productionSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
              <YAxis stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Line type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Tasks */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-elegant">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Agenda do dia
          </h3>
          <ul className="space-y-3">
            {tasks.map((t) => {
              const Icon = t.type === "call" ? Phone : t.type === "doc" ? FileText : Users2;
              return (
                <li key={t.id} className="flex items-start gap-3 group">
                  <div className="mt-0.5 size-8 rounded-md bg-secondary border border-border grid place-items-center shrink-0 group-hover:border-primary/40 transition-colors">
                    <Icon className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-mono text-primary">{t.time}</div>
                    <div className="text-sm leading-snug">{t.title}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Alerts */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-elegant">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Alertas
          </h3>
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200">Documentos faltando</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">5 clientes</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm">
              <p className="font-medium text-red-900 dark:text-red-200">Apólices vencendo</p>
              <p className="text-xs text-red-700 dark:text-red-300">3 apólices em 7 dias</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-6 shadow-elegant flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Próxima ação</h3>
            <p className="text-sm text-muted-foreground mt-1">3 clientes aguardam cotações</p>
          </div>
          <button
            onClick={() => navigate({ to: "/nova-cotacao" })}
            className="mt-4 w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Nova Cotação
          </button>
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-elegant">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Oportunidades recentes
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Últimas movimentações no pipeline</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Cliente</th>
                <th className="text-left font-medium px-4 py-2.5">Produto</th>
                <th className="text-right font-medium px-4 py-2.5">Valor</th>
                <th className="text-left font-medium px-4 py-2.5">Etapa</th>
                <th className="text-center font-medium px-4 py-2.5">Ações</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.slice(0, 5).map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-border hover:bg-surface transition-colors group"
                >
                  <td className="px-4 py-3 font-medium" onClick={() => navigate({ to: "/timeline", search: { op: o.id } as any })}>{o.client}</td>
                  <td className="px-4 py-3 text-muted-foreground" onClick={() => navigate({ to: "/timeline", search: { op: o.id } as any })}>{o.product}</td>
                  <td className="px-4 py-3 text-right font-mono" onClick={() => navigate({ to: "/timeline", search: { op: o.id } as any })}>R$ {o.value.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3" onClick={() => navigate({ to: "/timeline", search: { op: o.id } as any })}>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary border border-border">
                      {o.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOp(o);
                        setIsApoliceModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary text-xs font-semibold hover:text-primary-foreground transition-all border border-primary/20"
                    >
                      <ShieldCheck className="size-3.5" /> Apólice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apolice Upload Modal */}
      {isApoliceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Anexar Apólice</h2>
                  <p className="text-xs text-muted-foreground">Converter cotação de {selectedOp?.client}</p>
                </div>
              </div>
              <button onClick={() => setIsApoliceModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ao anexar o PDF, o sistema irá copiar automaticamente:
              </p>
              <ul className="mt-2 space-y-1">
                <li className="text-[11px] flex items-center gap-2">✅ Dados cadastrais do cliente</li>
                <li className="text-[11px] flex items-center gap-2">✅ Informações técnicas do veículo</li>
                <li className="text-[11px] flex items-center gap-2">✅ Coberturas e valores da cotação</li>
              </ul>
            </div>

            <form onSubmit={handleAttachApolice} className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors cursor-pointer bg-surface/50">
                <Upload className="size-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Clique para selecionar o PDF</p>
                <p className="text-xs text-muted-foreground mt-1">ou arraste e solte o arquivo aqui</p>
                <input type="file" className="hidden" accept=".pdf" />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApoliceModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-border font-medium text-sm hover:bg-surface transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAttaching}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all shadow-glow disabled:opacity-60"
                >
                  {isAttaching ? "Processando..." : "Confirmar e Converter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

