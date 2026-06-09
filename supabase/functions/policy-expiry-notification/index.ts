import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { differenceInDays, parseISO, startOfDay, format } from "https://esm.sh/date-fns@4.1.0";
import { ptBR } from "https://esm.sh/date-fns@4.1.0/locale";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";

// E-mail identity — uses a dedicated subdomain to isolate sending reputation.
// SPF, DKIM and DMARC must be configured for mail.dicoonseguros.com.br.
// See docs/DNS_SETUP.md for the required DNS records.
const FROM_ADDRESS = "Dicoon Seguros <noreply@mail.dicoonseguros.com.br>";
const REPLY_TO = "contato.dicoonseguros@gmail.com";
const PORTAL_URL = "https://dicoonseguros-portal.lovable.app";
const BRAND_COLOR = "#1a56db";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ExpiryDays = 60 | 30 | 7 | 0;

interface PolicyRow {
  id: string;
  policy_number: string;
  policy_type: string;
  end_date: string;
  status: string;
  profile: { email: string | null; name: string | null; phone: string | null } | null;
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Template engine
// ---------------------------------------------------------------------------
const COPY: Record<ExpiryDays, { subject: string; headline: string; body: string; badge: string }> = {
  60: {
    subject: "Dicoon Seguros: Sua apolice vence em 60 dias",
    headline: "Aviso de Vencimento — 60 dias",
    body:
      "Gostaríamos de informar que a sua apólice está se aproximando da data de vencimento. Já estamos preparando as melhores opções de renovação.",
    badge: "Informativo",
  },
  30: {
    subject: "Dicoon Seguros: Lembrete — apolice vence em 30 dias",
    headline: "Lembrete de Renovação — 30 dias",
    body:
      "Este é o segundo aviso sobre o vencimento da sua apólice. Para garantir continuidade da cobertura sem interrupções, recomendamos iniciar o processo de renovação agora.",
    badge: "Atenção",
  },
  7: {
    subject: "Dicoon Seguros: Apolice vence em 7 dias — acao necessaria",
    headline: "Aviso Urgente — 7 dias para o vencimento",
    body:
      "Sua apólice está prestes a vencer. Para evitar interrupção da sua cobertura securitária, acesse o portal ou entre em contato com seu corretor.",
    badge: "Urgente",
  },
  0: {
    subject: "Dicoon Seguros: Sua apolice vence hoje",
    headline: "Apólice com vencimento hoje",
    body:
      "Sua apólice de seguro vence hoje. Entre em contato imediatamente para garantir a continuidade da sua proteção.",
    badge: "Crítico",
  },
};

function htmlWrapper(body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Dicoon Seguros</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f6f8;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr>
        <td style="background:${BRAND_COLOR};padding:24px 32px;">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">Dicoon Seguros</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:12px;">Sistema de Gestão de Seguros</p>
        </td>
      </tr>
      <tr><td style="padding:32px;">${body}</td></tr>
      <tr>
        <td style="padding:16px 32px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
            Este e-mail foi enviado automaticamente por Dicoon Seguros.<br>
            Para dúvidas, responda este e-mail ou contate: ${REPLY_TO}<br>
            Você recebe este aviso pois possui uma apólice ativa em nossa base.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildEmail(
  clientName: string,
  policyNumber: string,
  policyType: string,
  endDateFormatted: string,
  daysLeft: ExpiryDays,
): EmailContent {
  const copy = COPY[daysLeft];
  const daysLabel = daysLeft > 0 ? `em ${daysLeft} dias` : "hoje";

  const htmlBody = `
    <p style="margin:0 0 6px;font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">${copy.badge}</p>
    <h1 style="margin:0 0 20px;font-size:21px;font-weight:700;color:#0f172a;">${copy.headline}</h1>
    <p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.7;">Olá, ${clientName},</p>
    <p style="margin:0 0 18px;font-size:15px;color:#334155;line-height:1.7;">${copy.body}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9;border-radius:6px;margin:0 0 24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;">Dados da Apólice</p>
        <p style="margin:0 0 4px;font-size:14px;color:#1e293b;"><strong>Número:</strong> ${policyNumber}</p>
        <p style="margin:0 0 4px;font-size:14px;color:#1e293b;"><strong>Tipo:</strong> ${policyType}</p>
        <p style="margin:0;font-size:14px;color:#1e293b;"><strong>Vencimento:</strong> ${endDateFormatted} (${daysLabel})</p>
      </td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        <td style="background:${BRAND_COLOR};border-radius:6px;">
          <a href="${PORTAL_URL}" style="display:inline-block;padding:12px 28px;color:#fff;text-decoration:none;font-size:14px;font-weight:600;">Acessar o Portal Dicoon Seguros</a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
      Já está tratando a renovação com seu corretor? Desconsidere este aviso.<br>
      Contato direto: <a href="mailto:${REPLY_TO}" style="color:${BRAND_COLOR};">${REPLY_TO}</a>
    </p>`;

  const text = `${copy.headline}

Olá, ${clientName},

${copy.body}

Dados da Apólice:
  Número: ${policyNumber}
  Tipo: ${policyType}
  Vencimento: ${endDateFormatted} (${daysLabel})

Acesse o portal para renovar ou obter mais informações:
${PORTAL_URL}

Contato: ${REPLY_TO}

--
Dicoon Seguros — Sistema de Gestão de Seguros
Este e-mail é uma notificação automática. Não é necessário responder a este endereço.`;

  return { subject: copy.subject, html: htmlWrapper(htmlBody), text };
}

// ---------------------------------------------------------------------------
// Send via Resend (anti-spam configuration)
// ---------------------------------------------------------------------------
async function sendEmail(
  to: string,
  content: EmailContent,
  policyId: string,
): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      reply_to: REPLY_TO,
      to: [to],
      subject: content.subject,
      html: content.html,
      text: content.text, // dual-body — critical for deliverability
      headers: {
        // Unique reference per policy prevents duplicate threads in inbox
        "X-Entity-Ref-ID": policyId,
      },
      // Tag as transactional so Resend's sending infrastructure treats it correctly
      tags: [{ name: "category", value: "transactional" }],
      // NOTE: Resend disables click/open tracking for emails tagged as transactional
      // when the account setting "Disable tracking for transactional" is ON.
      // Enable that setting in the Resend dashboard → Settings → Email → Tracking.
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[policy-expiry] Resend error for policy ${policyId}:`, err);
  }
  return res.ok;
}

// ---------------------------------------------------------------------------
// Send via WhatsApp Business Cloud API
// ---------------------------------------------------------------------------
async function sendWhatsApp(
  phone: string,
  clientName: string,
  policyNumber: string,
  policyType: string,
  endDate: string,
  daysLeft: number,
): Promise<boolean> {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.log("[policy-expiry] WhatsApp credentials not configured. Skipping WhatsApp notification.");
    return false;
  }

  const cleanPhone = phone.replace(/\D/g, "");
  if (!cleanPhone) return false;

  // Add Brazil country code 55 if missing and phone number doesn't have it
  const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
  const daysLabel = daysLeft > 0 ? `${daysLeft} dias` : "hoje";

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedPhone,
    type: "template",
    template: {
      name: "policy_renewal_reminder",
      language: { code: "pt_BR" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: clientName },
            { type: "text", text: policyNumber },
            { type: "text", text: policyType },
            { type: "text", text: `${endDate} (${daysLabel})` },
            { type: "text", text: PORTAL_URL },
          ],
        },
      ],
    },
  };

  try {
    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[policy-expiry] WhatsApp API error for policy ${policyNumber}:`, errText);
      return false;
    }
    console.log(`[policy-expiry] WhatsApp sent successfully to ${formattedPhone}`);
    return true;
  } catch (err) {
    console.error(`[policy-expiry] WhatsApp connection error:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async () => {
  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: policies, error: policiesErr } = await supabase
      .from("policies")
      .select("*, profile:profiles(*)")
      .eq("status", "active") as { data: PolicyRow[] | null; error: unknown };

    if (policiesErr) throw policiesErr;

    const today = startOfDay(new Date());
    const NOTIFY_AT: ExpiryDays[] = [60, 30, 7, 0];
    const sent: { policy_id: string; daysLeft: number; emailRecipient: string | null; phoneRecipient: string | null; emailSent: boolean; whatsappSent: boolean }[] = [];
    const skipped: { policy_id: string; reason: string }[] = [];

    for (const policy of policies ?? []) {
      if (!policy.end_date) { skipped.push({ policy_id: policy.id, reason: "no_end_date" }); continue; }

      const clientEmail = policy.profile?.email;
      const clientName = policy.profile?.name || "Cliente";
      const clientPhone = policy.profile?.phone;

      if (!clientEmail && !clientPhone) {
        skipped.push({ policy_id: policy.id, reason: "no_email_and_no_phone" });
        continue;
      }

      const end = startOfDay(parseISO(policy.end_date));
      const daysLeft = differenceInDays(end, today);

      if (!(NOTIFY_AT as number[]).includes(daysLeft)) continue;

      const endDateFormatted = format(end, "dd/MM/yyyy", { locale: ptBR });
      
      let emailSentOk = false;
      let whatsappSentOk = false;

      if (clientEmail) {
        const content = buildEmail(
          clientName,
          policy.policy_number,
          policy.policy_type,
          endDateFormatted,
          daysLeft as ExpiryDays,
        );
        emailSentOk = await sendEmail(clientEmail, content, policy.id);
      }

      if (clientPhone) {
        whatsappSentOk = await sendWhatsApp(
          clientPhone,
          clientName,
          policy.policy_number,
          policy.policy_type,
          endDateFormatted,
          daysLeft,
        );
      }

      if (emailSentOk || whatsappSentOk) {
        sent.push({
          policy_id: policy.id,
          daysLeft,
          emailRecipient: clientEmail || null,
          phoneRecipient: clientPhone || null,
          emailSent: emailSentOk,
          whatsappSent: whatsappSentOk,
        });
      } else {
        skipped.push({ policy_id: policy.id, reason: "failed_all_deliveries" });
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, skipped }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
