import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const EXTRACTION_PROMPT = `Você é um extrator especialista em apólices de seguro brasileiras. 
Analise a apólice fornecida (PDF ou Imagem) e extraia todas as informações solicitadas.
Você DEVE retornar obrigatoriamente um objeto JSON válido. Não adicione nenhuma explicação nem formatação markdown. Retorne apenas o JSON.
Se um campo não for encontrado ou não estiver no documento, preencha o valor como null.

Estrutura do JSON:
{
  "nome_cliente": "Nome completo do segurado ou cliente",
  "cpf_cnpj": "CPF ou CNPJ do cliente (apenas números)",
  "birth_date": "Data de nascimento do cliente no formato YYYY-MM-DD ou null",
  "email": "E-mail de contato do cliente",
  "telefone": "WhatsApp ou telefone com DDD (apenas números)",
  "endereco": "Endereço completo do cliente",
  "numero_apolice": "Número identificador da apólice",
  "seguradora": "Nome da companhia seguradora (ex: Porto Seguro, Azul, Tokio Marine, Allianz, Bradesco, etc.)",
  "tipo_seguro": "Tipo de seguro (ex: Automóvel, Residencial, Vida, Saúde, Empresarial, etc.)",
  "bem_segurado": "Descrição do bem segurado (ex: placa do carro, chassi, modelo ou endereço do imóvel)",
  "data_inicio": "Data de início da vigência no formato YYYY-MM-DD",
  "data_vencimento": "Data de término da vigência no formato YYYY-MM-DD",
  "premio_valor": "Valor do prêmio/preço total do seguro (apenas número ou decimal, ex: 1530.45)",
  "frequencia_pagamento": "Frequência de pagamento: \"mensal\", \"anual\", \"semestral\" ou null",
  "coberturas": ["Lista de coberturas principais descritas no documento"]
}`;

export const Route = createFileRoute("/api/extract-policy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Auth check
          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }
          const token = authHeader.slice(7);
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
          );
          const { data: claims } = await supabase.auth.getClaims(token);
          if (!claims?.claims?.sub) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", claims.claims.sub);
          const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
          if (!isAdmin) {
            return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
          }

          const body = await request.json() as { fileBase64: string; mimeType: string };
          if (!body.fileBase64 || !body.mimeType) {
            return new Response(JSON.stringify({ error: "Missing file" }), { status: 400 });
          }

          // Call Lovable AI Gateway with vision/PDF
          console.log(`Sending document to AI extraction using google/gemini-1.5-flash (type: ${body.mimeType})`);
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-1.5-flash",
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: EXTRACTION_PROMPT },
                    {
                      type: "image_url",
                      image_url: { url: `data:${body.mimeType};base64,${body.fileBase64}` },
                    },
                  ],
                },
              ],
            }),
          });

          if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            if (aiResponse.status === 429) {
              return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em instantes." }), { status: 429 });
            }
            if (aiResponse.status === 402) {
              return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), { status: 402 });
            }
            return new Response(JSON.stringify({ error: "Falha na IA", detail: errText }), { status: 500 });
          }

          const aiJson = await aiResponse.json() as { choices: Array<{ message: { content: string } }> };
          let content = aiJson.choices?.[0]?.message?.content ?? "";
          // Strip markdown fences if present
          content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
          let extracted: Record<string, unknown> = {};
          try {
            extracted = JSON.parse(content);
          } catch {
            // Try to find JSON object inside text
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
              try { extracted = JSON.parse(match[0]); } catch { /* noop */ }
            }
          }

          console.log("Extracted policy data successfully:", JSON.stringify(extracted));
          return Response.json({ extracted });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
            { status: 500 }
          );
        }
      },
    },
  },
});
