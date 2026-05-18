import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import pdfParse from "pdf-parse";

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
  "data_renovacao": "Data recomendada para renovação no formato YYYY-MM-DD (geralmente idêntica à data_vencimento)",
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

          // 1. Decodificar texto bruto do base64 para o scanner Regex de alta fidelidade
          const regexMatches: Record<string, any> = {};
          try {
            let rawText = "";
            if (body.mimeType === "application/pdf") {
              const buffer = Buffer.from(body.fileBase64, "base64");
              try {
                const data = await pdfParse(buffer);
                rawText = data.text || "";
              } catch (e) {
                console.error("PDF parse error:", e);
                rawText = buffer.toString("utf-8"); // fallback raw bytes
              }
            } else {
              rawText = Buffer.from(body.fileBase64, "base64").toString("utf-8");
            }

            // Email
            const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if (emailMatch) regexMatches.email = emailMatch[0];

            // CPF / CNPJ
            const cpfMatch = rawText.match(/(\d{3}\.\d{3}\.\d{3}-\d{2})/);
            const cnpjMatch = rawText.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
            if (cpfMatch) regexMatches.cpf_cnpj = cpfMatch[1].replace(/\D/g, "");
            else if (cnpjMatch) regexMatches.cpf_cnpj = cnpjMatch[1].replace(/\D/g, "");
            else {
              const rawCpf = rawText.match(/\b\d{11}\b/);
              if (rawCpf) regexMatches.cpf_cnpj = rawCpf[0];
            }

            // Telefone / WhatsApp
            const telMatch = rawText.match(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/);
            if (telMatch) regexMatches.telefone = telMatch[0].replace(/\D/g, "");

            // Seguradora
            const insurers = ["Porto Seguro", "Azul", "Tokio Marine", "Allianz", "Bradesco", "Mapfre", "Sompo", "Liberty", "HDI", "Zurich", "Suhai"];
            for (const ins of insurers) {
              if (new RegExp(ins, "i").test(rawText)) {
                regexMatches.seguradora = ins;
                break;
              }
            }

            // Tipo de Seguro
            if (/auto|veículo|carro|moto/i.test(rawText)) regexMatches.tipo_seguro = "Automóvel";
            else if (/resid|casa|apartamento/i.test(rawText)) regexMatches.tipo_seguro = "Residencial";
            else if (/vida|morte|acidente/i.test(rawText)) regexMatches.tipo_seguro = "Vida";
            else if (/saúde|medico|hospital/i.test(rawText)) regexMatches.tipo_seguro = "Saúde";

            // Vigências e datas
            const dates = [...rawText.matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g)];
            if (dates.length >= 2) {
              const formatD = (d: any) => `${d[3]}-${d[2]}-${d[1]}`;
              regexMatches.data_inicio = formatD(dates[0]);
              regexMatches.data_vencimento = formatD(dates[1]);
              regexMatches.data_renovacao = formatD(dates[1]);
            }
          } catch (e) {
            console.error("Erro na leitura rápida do texto:", e);
          }

          // 2. Chamar o Lovable AI Gateway com visão/PDF
          let aiExtracted: Record<string, any> = {};
          try {
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

            if (aiResponse.ok) {
              const aiJson = await aiResponse.json() as { choices: Array<{ message: { content: string } }> };
              let content = aiJson.choices?.[0]?.message?.content ?? "";
              content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
              try {
                aiExtracted = JSON.parse(content);
              } catch {
                const match = content.match(/\{[\s\S]*\}/);
                if (match) {
                  try { aiExtracted = JSON.parse(match[0]); } catch { /* noop */ }
                }
              }
            } else {
              console.warn("AI Gateway returned non-200 response, using fallback text OCR:", aiResponse.status);
            }
          } catch (aiErr) {
            console.error("AI Gateway call failed, falling back to text OCR:", aiErr);
          }

          // 3. Mesclar resultados da IA e Regex de alta fidelidade
          const finalExtracted = {
            nome_cliente: aiExtracted.nome_cliente || regexMatches.nome_cliente || "",
            cpf_cnpj: aiExtracted.cpf_cnpj || regexMatches.cpf_cnpj || "",
            birth_date: aiExtracted.birth_date || regexMatches.birth_date || "",
            email: aiExtracted.email || regexMatches.email || "",
            telefone: aiExtracted.telefone || regexMatches.telefone || "",
            endereco: aiExtracted.endereco || regexMatches.endereco || "",
            numero_apolice: aiExtracted.numero_apolice || regexMatches.numero_apolice || "",
            seguradora: aiExtracted.seguradora || regexMatches.seguradora || "",
            tipo_seguro: aiExtracted.tipo_seguro || regexMatches.tipo_seguro || "",
            bem_segurado: aiExtracted.bem_segurado || regexMatches.bem_segurado || "",
            data_inicio: aiExtracted.data_inicio || regexMatches.data_inicio || "",
            data_vencimento: aiExtracted.data_vencimento || regexMatches.data_vencimento || "",
            data_renovacao: aiExtracted.data_renovacao || aiExtracted.data_vencimento || regexMatches.data_renovacao || regexMatches.data_vencimento || "",
            premio_valor: aiExtracted.premio_valor || regexMatches.premio_valor || "",
            frequencia_pagamento: aiExtracted.frequencia_pagamento || regexMatches.frequencia_pagamento || "",
            coberturas: aiExtracted.coberturas || regexMatches.coberturas || []
          };

          console.log("Extracted policy data successfully:", JSON.stringify(finalExtracted));
          return Response.json({ extracted: finalExtracted });
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
