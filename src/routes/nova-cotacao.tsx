import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/nova-cotacao")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: NovaCotagemPage,
});

const steps = [
  { id: 1, title: "Tipo de Seguro", label: "Qual seguro?" },
  { id: 2, title: "Veículo", label: "Placa e dados" },
  { id: 3, title: "Cliente", label: "Dados pessoais" },
  { id: 4, title: "Motorista", label: "Principais dirigentes" },
  { id: 5, title: "Uso", label: "Como usa?" },
  { id: 6, title: "Cobertura", label: "Franquias" },
  { id: 7, title: "Resumo", label: "Revisar tudo" },
];

function NovaCotagemPage() {
  const [currentStep, setCurrentStep] = useState(1);

  const formData = {
    1: (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground mb-4">Tipo de Seguro</h3>
        {["Seguro Auto", "Seguro Residencial", "Seguro Empresarial", "Vida e Renda"].map((type) => (
          <label key={type} className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-surface/50 cursor-pointer">
            <input type="radio" name="insurance_type" className="w-4 h-4" defaultChecked={type === "Seguro Auto"} />
            <span className="text-sm font-medium">{type}</span>
          </label>
        ))}
      </div>
    ),
    2: (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground mb-4">Dados do Veículo</h3>
        <div>
          <label className="block text-sm font-medium mb-2">Placa</label>
          <input type="text" placeholder="ABC1234 ou ABC1D23" className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" defaultValue="ABC1234" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Marca/Modelo/Ano</label>
          <input type="text" placeholder="Honda Civic 2022" className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" defaultValue="Honda Civic 2022" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Km Estimado/Ano</label>
          <input type="number" placeholder="15000" className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" defaultValue="15000" />
        </div>
      </div>
    ),
    3: (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground mb-4">Dados do Cliente</h3>
        <div>
          <label className="block text-sm font-medium mb-2">CPF</label>
          <input type="text" placeholder="000.000.000-00" className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" value="123.456.789-00" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Nome</label>
          <input type="text" placeholder="João Silva" className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" defaultValue="João Silva" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">E-mail</label>
          <input type="email" placeholder="joao@email.com" className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" defaultValue="joao@email.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Telefone</label>
          <input type="tel" placeholder="(11) 98765-4321" className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" defaultValue="(11) 98765-4321" />
        </div>
      </div>
    ),
    4: (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground mb-4">Principais Motoristas</h3>
        <div className="space-y-3">
          {[1, 2].map((driver) => (
            <div key={driver} className="rounded-lg border border-border p-4 space-y-3">
              <h4 className="font-medium text-sm">Motorista {driver}</h4>
              <input type="text" placeholder="Nome completo" className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary" defaultValue={driver === 1 ? "João Silva" : "Maria Silva"} />
              <input type="text" placeholder="CPF" className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary" defaultValue={driver === 1 ? "123.456.789-00" : "987.654.321-00"} />
              <input type="text" placeholder="Data de Nascimento (DD/MM/AAAA)" className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary" defaultValue={driver === 1 ? "15/03/1980" : "22/07/1985"} />
            </div>
          ))}
        </div>
      </div>
    ),
    5: (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground mb-4">Uso do Veículo</h3>
        <div>
          <label className="block text-sm font-medium mb-2">Principal Uso</label>
          <select className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <option>Uso Particular</option>
            <option>Táxi</option>
            <option>Aluguel</option>
            <option>Transporte</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Garagem à Noite?</label>
          <div className="flex gap-2">
            {[true, false].map((has) => (
              <button key={String(has)} className={`flex-1 px-4 py-2 rounded-lg border font-medium transition-colors ${has ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-surface"}`}>
                {has ? "Sim" : "Não"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Sinistros nos últimos 36 meses?</label>
          <input type="number" placeholder="0" className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" defaultValue="0" />
        </div>
      </div>
    ),
    6: (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground mb-4">Opções de Cobertura</h3>
        {[
          { name: "Casco", checked: true },
          { name: "Roubo/Furto", checked: true },
          { name: "RCF (Obrigatória)", checked: true },
        ].map((cov) => (
          <label key={cov.name} className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-surface/50">
            <input type="checkbox" defaultChecked={cov.checked} className="w-4 h-4" />
            <span className="text-sm font-medium">{cov.name}</span>
          </label>
        ))}
        <div>
          <label className="block text-sm font-medium mb-2">Franquia Casco</label>
          <select className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            {[500, 1000, 1500, 2000].map((val) => (
              <option key={val}>R$ {val.toLocaleString("pt-BR")}</option>
            ))}
          </select>
        </div>
      </div>
    ),
    7: (
      <div className="space-y-6">
        <h3 className="font-semibold text-foreground mb-4">Resumo da Cotação</h3>
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tipo de Seguro</span>
            <span className="font-medium">Seguro Auto</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Veículo</span>
            <span className="font-medium">Honda Civic 2022 (ABC1234)</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cliente</span>
            <span className="font-medium">João Silva</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Motoristas</span>
            <span className="font-medium">2 registrados</span>
          </div>
          <div className="flex justify-between text-sm pb-3 border-b border-border">
            <span className="text-muted-foreground">Uso</span>
            <span className="font-medium">Particular</span>
          </div>
          <div className="flex justify-between text-sm pt-3">
            <span className="text-muted-foreground font-medium">Próximo passo</span>
            <span className="font-semibold text-primary">Consultar seguradoras</span>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Nova Cotação"
        title="Seguro Automotivo"
        description="Preencha os dados do veículo e do cliente para gerar um multicálculo"
      />

      {/* Progress Steps */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
        {steps.map((step, idx) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(step.id)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              currentStep === step.id
                ? "bg-primary text-primary-foreground"
                : currentStep > step.id
                  ? "bg-green-100 text-green-900"
                  : "bg-surface border border-border text-muted-foreground"
            }`}
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-current bg-opacity-20 text-xs">
              {step.id}
            </span>
            <span className="hidden sm:inline">{step.title}</span>
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="rounded-xl border border-border bg-card p-6 mb-6">
        {formData[currentStep as keyof typeof formData]}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border hover:bg-surface/50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(7, currentStep + 1))}
          disabled={currentStep === 7}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {currentStep === 7 ? "Gerar Multicálculo" : <>Próximo <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </AppShell>
  );
}
