import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Phone, Mail, FileText, CheckCircle2, AlertCircle, MessageCircle, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/timeline")({
  beforeLoad: async () => {
    const token = getAuthToken();
    if (!token) {
      throw redirect({ to: "/login" });
    }
  },
  component: TimelinePage,
});

const timelineEvents = [
  {
    id: 1,
    type: "proposal",
    title: "Proposta Gerada",
    description: "Proposta PRO-2025-001234 criada para Allianz",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    icon: FileText,
    color: "primary",
    metadata: "Prêmio: R$ 5.500",
  },
  {
    id: 2,
    type: "email",
    title: "Envio de Proposta",
    description: "Proposta enviada para joao@email.com",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    icon: Mail,
    color: "blue",
    metadata: "Status: Entregue",
  },
  {
    id: 3,
    type: "viewed",
    title: "Proposta Visualizada",
    description: "Cliente abriu a proposta",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    icon: CheckCircle2,
    color: "green",
    metadata: "14/01/2025 14:45",
  },
  {
    id: 4,
    type: "message",
    title: "Mensagem Recebida",
    description: '"Gostei da proposta da Allianz, mas quero comparar com Bradesco"',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    icon: MessageCircle,
    color: "amber",
    metadata: "João via WhatsApp",
  },
  {
    id: 5,
    type: "quotation",
    title: "Cotação Criada",
    description: "Multicálculo para Honda Civic 2022 (ABC1234) finalizado",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    icon: FileText,
    color: "cyan",
    metadata: "4 seguradoras consultadas",
  },
  {
    id: 6,
    type: "lead",
    title: "Lead Criado",
    description: "João Silva convertido de Lead para Oportunidade",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    icon: Plus,
    color: "purple",
    metadata: "Origem: Portal",
  },
  {
    id: 7,
    type: "call",
    title: "Primeira Ligação",
    description: "Contato inicial para descoberta de necessidades",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    icon: Phone,
    color: "green",
    metadata: "Duração: 12 min",
  },
];

const getIconColor = (color: string) => {
  const colors: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-600",
    cyan: "bg-cyan-100 text-cyan-600",
    purple: "bg-purple-100 text-purple-600",
  };
  return colors[color] || colors.primary;
};

function TimelinePage() {
  const formatTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Oportunidade · João Silva"
        title="Timeline de Atividades"
        description="Histórico completo de interações desde o primeiro contato até a proposta"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Total de Eventos</p>
          <p className="text-2xl font-bold text-foreground mt-1">{timelineEvents.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Dias desde Lead</p>
          <p className="text-2xl font-bold text-foreground mt-1">1</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Mensagens Trocadas</p>
          <p className="text-2xl font-bold text-foreground mt-1">3</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Status Esperado</p>
          <p className="text-lg font-bold text-amber-600 mt-1">Pendente</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="space-y-0">
          {timelineEvents.map((event, idx) => {
            const Icon = event.icon;
            const isLast = idx === timelineEvents.length - 1;

            return (
              <div key={event.id} className="relative flex gap-6 pb-8">
                {/* Timeline Line */}
                {!isLast && (
                  <div className="absolute left-7 top-12 bottom-0 w-px bg-gradient-to-b from-border to-transparent"></div>
                )}

                {/* Icon Circle */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center ${getIconColor(event.color)}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-foreground">{event.title}</h3>
                    <span className="text-xs text-muted-foreground font-medium">{formatTime(event.timestamp)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                  {event.metadata && (
                    <p className="text-xs text-muted-foreground italic">
                      {event.type === "message" ? (
                        <span className="not-italic bg-surface/50 rounded px-2 py-1 inline-block">{event.metadata}</span>
                      ) : (
                        event.metadata
                      )}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button className="flex-1 px-6 py-3 rounded-lg border border-border hover:bg-surface/50 font-medium">
          + Adicionar Evento Manual
        </button>
        <button className="flex-1 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
          Próxima Ação
        </button>
      </div>
    </AppShell>
  );
}
