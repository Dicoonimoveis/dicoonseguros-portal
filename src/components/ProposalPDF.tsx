import { useRef } from "react";
import { ShieldCheck, CheckCircle2, User, FileText, Phone, Mail, Globe, MapPin } from "lucide-react";

interface ProposalPDFProps {
  data: any;
}

export function ProposalPDF({ data }: ProposalPDFProps) {
  return (
    <div className="bg-white text-slate-900 p-12 font-sans max-w-[800px] mx-auto border shadow-xl" id="proposal-content">
      {/* HEADER / PAPEL TIMBRADO */}
      <header className="flex justify-between items-start border-b-2 border-primary pb-8 mb-8">
        <div className="flex items-center gap-4">
          <div className="size-16 bg-slate-900 rounded-xl flex items-center justify-center p-2">
             <svg viewBox="0 0 100 100" className="w-full h-full text-[#826a50] fill-current">
              <path d="M20 20 C 60 20, 80 40, 80 50 C 80 60, 60 80, 20 80 L 20 60 C 40 60, 60 50, 60 50 C 60 50, 40 40, 20 40 Z" />
              <path d="M30 45 L 30 55 L 50 55 L 50 45 Z" opacity="0.8" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">DICOON IMÓVEIS</h1>
            <p className="text-xs text-slate-500 font-medium">NEGÓCIOS IMOBILIÁRIOS & SEGUROS</p>
          </div>
        </div>
        <div className="text-right text-[10px] text-slate-500 space-y-0.5 uppercase tracking-wider">
          <p className="font-bold text-slate-700">CNPJ: 00.000.000/0001-00</p>
          <p className="flex items-center justify-end gap-1"><Phone className="size-2" /> (11) 98765-4321</p>
          <p className="flex items-center justify-end gap-1"><Mail className="size-2" /> comercial@dicoon.com.br</p>
          <p className="flex items-center justify-end gap-1"><Globe className="size-2" /> www.dicoon.com.br</p>
          <p className="flex items-center justify-end gap-1"><MapPin className="size-2" /> São Paulo, SP</p>
        </div>
      </header>

      <div className="space-y-8">
        {/* SEÇÃO 1 - DADOS DO CLIENTE */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <User className="size-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800">Dados do Segurado</h2>
          </div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Nome Completo</p>
              <p className="text-sm font-medium">{data.client}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">CPF / CNPJ</p>
              <p className="text-sm font-medium">{data.cpf}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">E-mail</p>
              <p className="text-sm font-medium">{data.email}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Telefone de Contato</p>
              <p className="text-sm font-medium">{data.phone}</p>
            </div>
          </div>
        </section>

        {/* SEÇÃO 2 - RESUMO DA PROPOSTA */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="size-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800">Especificações do Plano</h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-left p-4 font-semibold text-xs uppercase tracking-wider">Descrição</th>
                  <th className="text-right p-4 font-semibold text-xs uppercase tracking-wider">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-4 text-slate-600">Seguradora</td>
                  <td className="p-4 text-right font-bold text-slate-900">{data.insurer}</td>
                </tr>
                <tr>
                  <td className="p-4 text-slate-600">Veículo / Bem</td>
                  <td className="p-4 text-right font-medium text-slate-900">{data.vehicle}</td>
                </tr>
                <tr>
                  <td className="p-4 text-slate-600">Cobertura Principal</td>
                  <td className="p-4 text-right font-medium text-slate-900">{data.coverage}</td>
                </tr>
                <tr>
                  <td className="p-4 text-slate-600">Franquia Estimada</td>
                  <td className="p-4 text-right font-medium text-slate-900">R$ {data.franchise.toLocaleString("pt-BR")}</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-4 font-bold text-primary italic">Investimento Anual</td>
                  <td className="p-4 text-right text-lg font-black text-slate-900">R$ {data.premium.toLocaleString("pt-BR")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SEÇÃO 3 - BENEFÍCIOS */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="size-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800">Benefícios e Diferenciais</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { t: "Assistência 24h", d: "Guincho ilimitado e reparos rápidos." },
              { t: "Carro Reserva", d: "Até 15 dias em caso de sinistro." },
              { t: "Suporte Dicoon", d: "Atendimento prioritário em sinistros." },
            ].map((b, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                <CheckCircle2 className="size-4 text-green-500 mb-2" />
                <p className="text-xs font-bold text-slate-800 mb-1">{b.t}</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SEÇÃO 4 - OBSERVAÇÕES */}
        <section className="bg-slate-900 text-slate-300 p-6 rounded-2xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-3">Observações Importantes</h3>
          <ul className="space-y-2 text-[10px] leading-relaxed opacity-80">
            <li>• Proposta válida até {data.validUntil}. Sujeita a análise de risco da seguradora.</li>
            <li>• Valores expressos em Reais (BRL). Condições conforme manual do segurado.</li>
            <li>• A vigência inicia-se às 24h da data de aceitação da proposta pela companhia.</li>
          </ul>
        </section>

        {/* SEÇÃO 5 - ASSINATURAS */}
        <section className="pt-12 grid grid-cols-2 gap-12">
          <div className="text-center">
            <div className="border-t border-slate-300 pt-2">
              <p className="text-xs font-bold text-slate-800">{data.client}</p>
              <p className="text-[10px] text-slate-500 uppercase">Assinatura do Segurado</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-slate-300 pt-2">
              <p className="text-xs font-bold text-slate-800">RICARDO DICOON</p>
              <p className="text-[10px] text-slate-500 uppercase">Consultor Responsável</p>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-12 pt-8 border-t border-slate-100 text-center">
        <p className="text-[9px] text-slate-400 font-medium tracking-tighter">
          ESTE DOCUMENTO É UMA PROPOSTA COMERCIAL E NÃO SUBSTITUI A APÓLICE DE SEGURO DEFINITIVA.
        </p>
      </footer>
    </div>
  );
}
