export const kpis = [
  { label: "Produção do mês", value: "R$ 248.530", delta: "+12,4%", trend: "up" as const },
  { label: "Cotações ativas", value: "84", delta: "+9", trend: "up" as const },
  { label: "Conversão", value: "31,2%", delta: "+2,1pp", trend: "up" as const },
  { label: "Renovações 30d", value: "23", delta: "−4", trend: "down" as const },
];

export const productionSeries = [
  { m: "Jan", v: 142 }, { m: "Fev", v: 168 }, { m: "Mar", v: 154 },
  { m: "Abr", v: 198 }, { m: "Mai", v: 212 }, { m: "Jun", v: 248 },
];

export const tasks = [
  { id: 1, time: "09:30", title: "Retornar Marina Souza — auto Civic", type: "call" },
  { id: 2, time: "11:00", title: "Enviar proposta — Gabriel Lemos", type: "doc" },
  { id: 3, time: "14:15", title: "Reunião renovação — Construtora Aral", type: "meet" },
  { id: 4, time: "16:00", title: "Follow-up cotação vida — família Tavares", type: "call" },
];

export type Stage = "Novo" | "Cotando" | "Proposta" | "Negociação" | "Fechado";

export const opportunities: {
  id: string; client: string; product: string; value: number; stage: Stage; days: number; insurer?: string; email?: string; clientId?: string;
}[] = [
  { id: "OP-1042", client: "Marina Souza", product: "Auto — Civic 2022", value: 4280, stage: "Novo", days: 1, email: "marina.souza@email.com" },
  { id: "OP-1041", client: "Gabriel Lemos", product: "Vida 500k", value: 2150, stage: "Novo", days: 2, email: "gabriel.lemos@email.com" },
  { id: "OP-1039", client: "Construtora Aral", product: "Empresarial", value: 18900, stage: "Cotando", days: 3, email: "contato@construtoraaral.com" },
  { id: "OP-1037", client: "Família Tavares", product: "Vida familiar", value: 3870, stage: "Cotando", days: 4, email: "familia.tavares@email.com" },
  { id: "OP-1035", client: "Lucas Andrade", product: "Auto — HRV 2024", value: 5120, stage: "Proposta", days: 5, insurer: "Porto", email: "lucas.andrade@email.com" },
  { id: "OP-1031", client: "Beatriz Nunes", product: "Residencial Premium", value: 2940, stage: "Proposta", days: 6, insurer: "Bradesco", email: "beatriz.nunes@email.com" },
  { id: "OP-1028", client: "Studio Norte", product: "Empresarial", value: 12400, stage: "Negociação", days: 8, insurer: "Allianz", email: "contato@studionorte.com" },
  { id: "OP-1024", client: "Rafael Pires", product: "Auto — Compass", value: 4790, stage: "Fechado", days: 11, insurer: "Porto", email: "rafael.pires@email.com" },
];

export const leads = [
  { name: "Marina Souza", origin: "Landing — Auto", score: 92, status: "Quente" },
  { name: "Gabriel Lemos", origin: "Indicação", score: 81, status: "Quente" },
  { name: "Família Tavares", origin: "Tráfego pago", score: 74, status: "Morno" },
  { name: "Camila Ferraz", origin: "Site institucional", score: 58, status: "Morno" },
  { name: "Rodrigo Dantas", origin: "Landing — Vida", score: 41, status: "Frio" },
];

export const renewals = [
  { client: "Carla Mendes", product: "Auto Corolla", insurer: "Porto", premium: 3890, due: "em 5 dias", risk: "alto" },
  { client: "Tech Lab Ltda", product: "Empresarial", insurer: "Allianz", premium: 14200, due: "em 12 dias", risk: "medio" },
  { client: "Ana Beatriz", product: "Residencial", insurer: "Bradesco", premium: 1840, due: "em 18 dias", risk: "baixo" },
  { client: "Felipe Cardoso", product: "Vida individual", insurer: "MetLife", premium: 2360, due: "em 22 dias", risk: "medio" },
];

export type Quote = {
  insurer: string;
  logoColor: string;
  price: number;
  coverage: number; // 0-100
  franchise: number;
  assistance: number; // count
  commission: number; // %
  highlights: string[];
};

export const quotes: Quote[] = [
  { insurer: "Porto Seguro", logoColor: "oklch(0.65 0.21 22)", price: 4280, coverage: 92, franchise: 3200, assistance: 14, commission: 18, highlights: ["Carro reserva 30d", "Vidros sem franquia"] },
  { insurer: "Bradesco Auto", logoColor: "oklch(0.62 0.18 25)", price: 4490, coverage: 88, franchise: 2900, assistance: 12, commission: 16, highlights: ["Cobertura nacional", "App de sinistro"] },
  { insurer: "Allianz", logoColor: "oklch(0.55 0.15 245)", price: 3990, coverage: 78, franchise: 4100, assistance: 10, commission: 14, highlights: ["Melhor preço", "Desconto perfil"] },
  { insurer: "SulAmérica", logoColor: "oklch(0.70 0.15 145)", price: 4620, coverage: 95, franchise: 2400, assistance: 18, commission: 17, highlights: ["Cobertura premium", "Assistência 24h"] },
  { insurer: "Mapfre", logoColor: "oklch(0.65 0.20 35)", price: 4120, coverage: 82, franchise: 3500, assistance: 11, commission: 20, highlights: ["Maior comissão", "Renovação fácil"] },
  { insurer: "HDI", logoColor: "oklch(0.60 0.18 280)", price: 4350, coverage: 85, franchise: 3000, assistance: 13, commission: 15, highlights: ["Equilibrado", "Bom histórico"] },
];

export function rankBy(quotes: Quote[]) {
  const minP = Math.min(...quotes.map(q => q.price));
  const maxC = Math.max(...quotes.map(q => q.coverage));
  const maxCom = Math.max(...quotes.map(q => q.commission));
  return {
    bestPrice: [...quotes].sort((a,b) => a.price - b.price)[0],
    bestCoverage: [...quotes].sort((a,b) => b.coverage - a.coverage)[0],
    bestCommission: [...quotes].sort((a,b) => b.commission - a.commission)[0],
    bestBalance: [...quotes].sort((a,b) => {
      const sa = (minP/a.price)*0.4 + (a.coverage/maxC)*0.4 + (a.commission/maxCom)*0.2;
      const sb = (minP/b.price)*0.4 + (b.coverage/maxC)*0.4 + (b.commission/maxCom)*0.2;
      return sb - sa;
    })[0],
    score: (q: Quote) => Math.round(((minP/q.price)*0.4 + (q.coverage/maxC)*0.4 + (q.commission/maxCom)*0.2) * 100),
  };
}
