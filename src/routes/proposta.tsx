import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Download, Mail, Share2, Eye, FileCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { ProposalPDF } from "@/components/ProposalPDF";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

export const Route = createFileRoute("/proposta")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      throw redirect({ to: "/acesso-negado" });
    }
  },
  component: PropostaPage,
});

const proposalData = {
  id: "PRO-2025-001234",
  client: "João Silva",
  cpf: "123.456.789-00",
  email: "joao@email.com",
  phone: "(11) 98765-4321",
  vehicle: "Honda Civic 2022 (ABC1234)",
  insurer: "Allianz",
  premium: 5500,
  monthly: 458,
  coverage: "Completa com Casco",
  franchise: 1000,
  assistance: 6,
  validUntil: "30/12/2025",
  createdAt: "15/01/2025",
};

function PropostaPage() {
  const [template, setTemplate] = useState<"padrao" | "premium" | "simplificada">("padrao");
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExportPDF = async () => {
    setIsGenerating(true);
    const element = document.getElementById("proposal-content");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`proposta-${proposalData.client.replace(/\s+/g, "-").toLowerCase()}-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`);
      toast.success("PDF gerado com sucesso!", {
        description: "O documento premium foi salvo em sua pasta de downloads.",
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const templates = [
    { id: "padrao", name: "Padrão", description: "Modelo corporativo com logo e todos os dados" },
    { id: "premium", name: "Premium", description: "Design sofisticado com destaque para coberturas" },
    { id: "simplificada", name: "Simplificada", description: "Versão enxuta para impressão e envio rápido" },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Proposta de Cotação"
        title="PRO-2025-001234"
        description="Allianz · Honda Civic 2022 · R$ 5.500/ano"
        actions={
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 h-9 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-surface-elevated transition-colors"
          >
            <Eye className="w-4 h-4" /> Visualizar
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Proposta Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cliente Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Dados do Cliente</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-medium">Nome</p>
                <p className="text-foreground font-medium">{proposalData.client}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">CPF</p>
                <p className="text-foreground font-medium">{proposalData.cpf}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">E-mail</p>
                <p className="text-foreground font-medium">{proposalData.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">Telefone</p>
                <p className="text-foreground font-medium">{proposalData.phone}</p>
              </div>
            </div>
          </div>

          {/* 车Cobertura Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Cobertura Contratada</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">Veículo</p>
                  <p className="text-foreground font-medium">{proposalData.vehicle}</p>
                </div>
                <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">Ativo</span>
              </div>
              <div className="pt-3 border-t border-border grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">Seguradora</p>
                  <p className="text-foreground font-medium">{proposalData.insurer}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">Cobertura</p>
                  <p className="text-foreground font-medium">{proposalData.coverage}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">Franquia Casco</p>
                  <p className="text-foreground font-medium">R$ {proposalData.franchise.toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">Assistências</p>
                  <p className="text-foreground font-medium">{proposalData.assistance} serviços 24h</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Valores</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prêmio Anual</span>
                <span className="font-mono font-semibold">R$ {proposalData.premium.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Parcelado em 12x</span>
                <span className="font-mono font-semibold">R$ {proposalData.monthly.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between text-sm pb-2 border-b border-border">
                <span className="text-muted-foreground font-medium">Taxa (Dicoon)</span>
                <span className="font-mono font-medium text-primary">15% (~R$ 825)</span>
              </div>
              <div className="flex justify-between">
                <span>Seu Lucro Esperado</span>
                <span className="text-lg font-bold text-green-600">R$ 825</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Válida até: {proposalData.validUntil}</p>
          </div>

          {/* Template Selection */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Modelo de Proposta</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setTemplate(tpl.id as any)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    template === tpl.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-6 h-fit lg:sticky lg:top-20 space-y-3">
          <h3 className="font-semibold text-foreground text-sm mb-4">Ações</h3>

          <div className="hidden">
            <ProposalPDF data={proposalData} />
          </div>

          <button 
            onClick={handleExportPDF}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm transition-all shadow-glow disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Exportar PDF Premium
          </button>

          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-surface/50 font-medium text-sm transition-colors">
            <Mail className="w-4 h-4" /> Enviar por E-mail
          </button>

          <button 
            onClick={() => {
              const phone = proposalData.phone.replace(/\D/g, "");
              const message = encodeURIComponent(
                `Olá ${proposalData.client}, aqui está a sua proposta de seguro (${proposalData.id}) para o veículo ${proposalData.vehicle} na ${proposalData.insurer}. O valor total é de R$ ${proposalData.premium.toLocaleString("pt-BR")} ou 12x de R$ ${proposalData.monthly.toLocaleString("pt-BR")}. Qualquer dúvida, estou à disposição!`
              );
              window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[#25D366] text-[#25D366] hover:bg-[#25D366]/5 font-medium text-sm transition-colors"
          >
            <Share2 className="w-4 h-4" /> Enviar WhatsApp
          </button>

          <div className="pt-4 border-t border-border text-xs space-y-2">
            <p className="text-muted-foreground">
              <strong>Próximas ações:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Cliente receberá proposta</li>
              <li>Você será notificado de leitura</li>
              <li>Prazo resposta: 7 dias</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto p-8">
            <div className="mb-6 pb-6 border-b">
              <h2 className="text-2xl font-bold text-foreground">PROPOSTA DE COTAÇÃO</h2>
              <p className="text-muted-foreground">PRO-2025-001234</p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">SEGURADO</h3>
                <p className="text-sm">{proposalData.client}</p>
                <p className="text-sm">CPF: {proposalData.cpf}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">VEICULO</h3>
                <p className="text-sm">{proposalData.vehicle}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">COBERTURA</h3>
                <table className="w-full text-sm border-collapse">
                  <tr className="border-b">
                    <td className="py-2">Cobertura</td>
                    <td className="py-2 text-right">{proposalData.coverage}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Franquia</td>
                    <td className="py-2 text-right">R$ {proposalData.franchise.toLocaleString("pt-BR")}</td>
                  </tr>
                </table>
              </div>

              <div>
                <h3 className="font-semibold mb-2">PREMIOS</h3>
                <table className="w-full text-sm border-collapse border-b">
                  <tr className="border-b">
                    <td className="py-2">Prêmio Anual</td>
                    <td className="py-2 text-right">R$ {proposalData.premium.toLocaleString("pt-BR")}</td>
                  </tr>
                  <tr>
                    <td className="py-2">Parcelado (12x)</td>
                    <td className="py-2 text-right">R$ {proposalData.monthly.toLocaleString("pt-BR")}</td>
                  </tr>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                Documento válido até {proposalData.validUntil}. Para mais informações, entre em contato com nosso time.
              </p>
            </div>

            <button
              onClick={() => setShowPreview(false)}
              className="mt-6 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
      </div>
    </AppShell>
  );
}
