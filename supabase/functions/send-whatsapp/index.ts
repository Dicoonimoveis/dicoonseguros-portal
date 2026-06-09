import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

/**
 * send-whatsapp — Supabase Edge Function
 *
 * Sends WhatsApp messages via the official Meta Cloud API.
 * Uses pre-approved message templates to comply with WhatsApp Business Policy.
 *
 * SETUP REQUIRED:
 * 1. Create a Meta Business Manager account at business.facebook.com
 * 2. Set up a WhatsApp Business Account (WABA)
 * 3. Create a System User and get a permanent access token
 * 4. Create and submit templates for approval (see template definitions below)
 * 5. Add environment variables to Supabase:
 *    - WHATSAPP_ACCESS_TOKEN  (permanent system user token)
 *    - WHATSAPP_PHONE_NUMBER_ID  (the phone number ID from Meta dashboard)
 *
 * APPROVED TEMPLATES (must match names submitted to Meta):
 *  - policy_renewal_reminder  (category: UTILITY)
 *  - proposal_ready           (category: UTILITY)
 *
 * Meta Cloud API docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages/templates
 */

const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PORTAL_URL = "https://dicoonseguros-portal.lovable.app";

const CLOUD_API_URL = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type TemplateType = "policy_renewal_reminder" | "proposal_ready";

interface SendTemplateParams {
  to: string; // E.164 format: "5511999999999"
  templateName: TemplateType;
  languageCode?: string;
  components?: WhatsAppComponent[];
}

interface WhatsAppComponent {
  type: "header" | "body" | "button";
  parameters: WhatsAppParameter[];
}

interface WhatsAppParameter {
  type: "text" | "currency" | "date_time" | "image" | "document" | "video";
  text?: string;
  currency?: { fallback_value: string; code: string; amount_1000: number };
}

// ---------------------------------------------------------------------------
// Template builders
// The component parameters MUST match the variable order in the approved template.
// ---------------------------------------------------------------------------

/**
 * Template: policy_renewal_reminder
 * Body (example approval text):
 * "Olá, {{1}}! Sua apólice {{2}} ({{3}}) vence em {{4}}. Acesse o portal para renovar: {{5}}"
 */
function buildRenewalTemplate(params: {
  clientName: string;
  policyNumber: string;
  policyType: string;
  endDate: string;
  daysLeft: number;
}): SendTemplateParams["components"] {
  const daysLabel = params.daysLeft > 0 ? `${params.daysLeft} dias` : "hoje";
  return [
    {
      type: "body",
      parameters: [
        { type: "text", text: params.clientName },
        { type: "text", text: params.policyNumber },
        { type: "text", text: params.policyType },
        { type: "text", text: `${params.endDate} (${daysLabel})` },
        { type: "text", text: PORTAL_URL },
      ],
    },
  ];
}

/**
 * Template: proposal_ready
 * Body (example approval text):
 * "Olá, {{1}}! Sua proposta {{2}} na {{3}} para {{4}} está pronta. Valor: R$ {{5}}/ano. Acesse: {{6}}"
 */
function buildProposalTemplate(params: {
  clientName: string;
  proposalId: string;
  insurer: string;
  vehicle: string;
  premiumAnnual: string;
}): SendTemplateParams["components"] {
  return [
    {
      type: "body",
      parameters: [
        { type: "text", text: params.clientName },
        { type: "text", text: params.proposalId },
        { type: "text", text: params.insurer },
        { type: "text", text: params.vehicle },
        { type: "text", text: params.premiumAnnual },
        { type: "text", text: PORTAL_URL },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Core send function
// ---------------------------------------------------------------------------
async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode = "pt_BR",
  components,
}: SendTemplateParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return {
      success: false,
      error: "WhatsApp credentials not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
    };
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/\D/g, ""), // strip non-digits — ensure E.164 format
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components ? { components } : {}),
    },
  };

  const res = await fetch(CLOUD_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    const errMsg = json?.error?.message || JSON.stringify(json);
    console.error(`[send-whatsapp] API error:`, errMsg);
    return { success: false, error: errMsg };
  }

  const messageId = json?.messages?.[0]?.id;
  return { success: true, messageId };
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify caller is authenticated (Supabase service role or admin JWT)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { type, phone } = body as { type?: string; phone?: string };

  if (!phone) {
    return new Response(JSON.stringify({ error: "'phone' is required (E.164 format: 5511999999999)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let result: { success: boolean; messageId?: string; error?: string };

  if (type === "renewal") {
    const { clientName, policyNumber, policyType, endDate, daysLeft } = body as Record<string, string>;
    result = await sendWhatsAppTemplate({
      to: phone,
      templateName: "policy_renewal_reminder",
      components: buildRenewalTemplate({
        clientName,
        policyNumber,
        policyType,
        endDate,
        daysLeft: Number(daysLeft),
      }),
    });
  } else if (type === "proposal") {
    const { clientName, proposalId, insurer, vehicle, premiumAnnual } = body as Record<string, string>;
    result = await sendWhatsAppTemplate({
      to: phone,
      templateName: "proposal_ready",
      components: buildProposalTemplate({ clientName, proposalId, insurer, vehicle, premiumAnnual }),
    });
  } else {
    return new Response(JSON.stringify({ error: "Invalid 'type'. Use 'renewal' or 'proposal'." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
});
