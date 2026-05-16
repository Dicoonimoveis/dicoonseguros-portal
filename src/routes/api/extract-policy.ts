import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const EXTRACTION_PROMPT = `Você é um extrator de dados de apólices de seguro brasileiras. Leia o documento e retorne APENAS um JSON válido (sem markdown, sem texto adicional) com os seguintes campos. Use null para campos não encontrados.

{
  "nome_cliente": string | null,
  "cpf_cnpj": string | null,
  "email": string | null,
  "telefone": string | null,
  "endereco": string | null,
  "numero_apolice": string | null,
  "seguradora": string | null,
  "tipo_seguro": string | null,
  "bem_segurado": string | null,
  "data_inicio": string | null,  // formato YYYY-MM-DD
  "data_vencimento": string | null,  // formato YYYY-MM-DD
  "premio_valor": string | null,  // apenas números, ex "1234.56"
  "frequencia_pagamento": string | null,  // "mensal" | "anual" | "semestral"
  "coberturas": string[] | null
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
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-pro",
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
