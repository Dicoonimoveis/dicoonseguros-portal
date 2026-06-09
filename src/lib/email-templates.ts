/**
 * email-templates.ts
 * Centralized e-mail templates for Dicoon Seguros.
 *
 * Design principles:
 * - Every template exports BOTH html and text (plain) to maximize deliverability.
 * - No tracking pixels, no click-tracking redirects — all URLs are direct.
 * - Subject lines: no emojis, no ALL-CAPS, concise and descriptive.
 * - Sender best-practice: Reply-To is the human address; From is the verified subdomain.
 */

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const BRAND_COLOR = "#1a56db";
const BRAND_NAME = "Dicoon Seguros";
const PORTAL_URL = "https://dicoonseguros-portal.lovable.app";
const REPLY_TO = "contato.dicoonseguros@gmail.com";
const FROM_ADDRESS = `${BRAND_NAME} <noreply@mail.dicoonseguros.com.br>`;

export { REPLY_TO, FROM_ADDRESS };

function htmlWrapper(body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND_NAME}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="background:${BRAND_COLOR};padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${BRAND_NAME}</p>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:12px;">Sistema de Gestão de Seguros</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;">
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                Este e-mail foi enviado por ${BRAND_NAME} a pedido do seu corretor de seguros.<br>
                Para duvidas, responda este e-mail ou entre em contato: ${REPLY_TO}<br>
                Voce esta recebendo este e-mail pois possui uma apolice ativa ou proposta pendente.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background:${BRAND_COLOR};border-radius:6px;">
        <a href="${url}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${text}</a>
      </td>
    </tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// 1. Policy Expiry Notifications (60d / 30d / 7d / 0d)
// ---------------------------------------------------------------------------

export type ExpiryDays = 60 | 30 | 7 | 0;

interface PolicyExpiryParams {
  clientName: string;
  policyNumber: string;
  policyType: string;
  endDate: string; // formatted date string, e.g. "10/11/2024"
  daysLeft: ExpiryDays;
  portalUrl?: string;
}

const EXPIRY_COPY: Record<ExpiryDays, { subject: string; headline: string; body: string; urgency: string }> = {
  60: {
    subject: "Dicoon Seguros: Sua apolice vence em 60 dias",
    headline: "Aviso de Vencimento — 60 dias",
    body: "Gostaríamos de informar que a sua apólice de seguro está se aproximando da data de vencimento. Já estamos preparando as melhores opções de renovação para você.",
    urgency: "Informativo",
  },
  30: {
    subject: "Dicoon Seguros: Lembrete — apolice vence em 30 dias",
    headline: "Lembrete de Renovação — 30 dias",
    body: "Este é o segundo aviso sobre o vencimento da sua apólice. Para garantir continuidade da sua cobertura sem interrupções, recomendamos iniciar o processo de renovação.",
    urgency: "Atenção",
  },
  7: {
    subject: "Dicoon Seguros: Apolice vence em 7 dias — acao necessaria",
    headline: "Aviso Urgente — 7 dias para o vencimento",
    body: "Sua apólice está prestes a vencer. Para evitar a interrupção da sua cobertura securitária, entre em contato com seu corretor ou acesse o portal para renovar.",
    urgency: "Urgente",
  },
  0: {
    subject: "Dicoon Seguros: Sua apolice vence hoje",
    headline: "Apólice com vencimento hoje",
    body: "Sua apólice de seguro vence hoje. Entre em contato imediatamente com seu corretor para garantir a continuidade da sua proteção.",
    urgency: "Critico",
  },
};

export function buildPolicyExpiryEmail(params: PolicyExpiryParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { clientName, policyNumber, policyType, endDate, daysLeft, portalUrl = PORTAL_URL } = params;
  const copy = EXPIRY_COPY[daysLeft];

  const htmlBody = `
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${copy.urgency}</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#0f172a;">${copy.headline}</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">Olá, ${clientName},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">${copy.body}</p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9;border-radius:6px;margin:20px 0;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 8px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;">Dados da Apólice</p>
          <p style="margin:0 0 4px;font-size:14px;color:#1e293b;"><strong>Número:</strong> ${policyNumber}</p>
          <p style="margin:0 0 4px;font-size:14px;color:#1e293b;"><strong>Tipo:</strong> ${policyType}</p>
          <p style="margin:0;font-size:14px;color:#1e293b;"><strong>Vencimento:</strong> ${endDate}${daysLeft > 0 ? ` (em ${daysLeft} dias)` : " (hoje)"}</p>
        </td>
      </tr>
    </table>

    ${btn("Acessar o Portal Dicoon Seguros", portalUrl)}

    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
      Caso já esteja tratando a renovação com seu corretor, desconsidere este aviso.<br>
      Para contato direto: <a href="mailto:${REPLY_TO}" style="color:${BRAND_COLOR};">${REPLY_TO}</a>
    </p>
  `;

  const text = `${copy.headline}

Olá, ${clientName},

${copy.body}

Dados da Apólice:
- Número: ${policyNumber}
- Tipo: ${policyType}
- Vencimento: ${endDate}${daysLeft > 0 ? ` (em ${daysLeft} dias)` : " (hoje)"}

Acesse o portal para mais detalhes:
${portalUrl}

Para contato: ${REPLY_TO}

--
${BRAND_NAME}
Este e-mail é transacional — enviado automaticamente pelo sistema.`;

  return {
    subject: copy.subject,
    html: htmlWrapper(htmlBody),
    text,
  };
}

// ---------------------------------------------------------------------------
// 2. Proposal Invite Email (convite para novo cliente acessar o portal)
// ---------------------------------------------------------------------------

interface ProposalInviteParams {
  clientName: string;
  inviteLink: string;
  proposalId?: string;
  proposerName?: string;
}

export function buildProposalInviteEmail(params: ProposalInviteParams): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    clientName,
    inviteLink,
    proposalId,
    proposerName = "Equipe Dicoon Seguros",
  } = params;

  const subject = proposalId
    ? `Dicoon Seguros: Acesso ao portal — Proposta ${proposalId}`
    : "Dicoon Seguros: Convite de acesso ao portal";

  const htmlBody = `
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#0f172a;">Seu acesso ao portal esta pronto</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">Olá, ${clientName},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
      ${proposerName} preparou ${proposalId ? `a proposta <strong>${proposalId}</strong>` : "informações"} para você no portal da Dicoon Seguros.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      Clique no botão abaixo para criar sua senha e acessar o portal. O link é válido por <strong>24 horas</strong>.
    </p>

    ${btn("Criar senha e acessar o portal", inviteLink)}

    <p style="margin:16px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
      Se o botão não funcionar, copie e cole este link no seu navegador:<br>
      <span style="word-break:break-all;color:${BRAND_COLOR};">${inviteLink}</span>
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#64748b;">
      Se você não solicitou acesso ou não reconhece este contato, ignore este e-mail com segurança.
    </p>
  `;

  const text = `Seu acesso ao portal Dicoon Seguros esta pronto

Olá, ${clientName},

${proposerName} preparou ${proposalId ? `a proposta ${proposalId}` : "informações"} para você no portal da Dicoon Seguros.

Para criar sua senha e acessar o portal, copie e cole o link abaixo no seu navegador:

${inviteLink}

O link é válido por 24 horas.

Se você não reconhece este contato, ignore este e-mail.

--
${BRAND_NAME}
Contato: ${REPLY_TO}`;

  return { subject, html: htmlWrapper(htmlBody), text };
}

// ---------------------------------------------------------------------------
// 3. Policy Renewal Notification via WhatsApp (template text)
// ---------------------------------------------------------------------------

interface WhatsAppRenewalParams {
  clientName: string;
  policyNumber: string;
  policyType: string;
  endDate: string;
  daysLeft: number;
  portalUrl?: string;
}

/**
 * Returns the pre-approved WhatsApp template message body.
 * Use this text with the WhatsApp Business Cloud API (template: policy_renewal_reminder).
 */
export function buildWhatsAppRenewalMessage(params: WhatsAppRenewalParams): string {
  const { clientName, policyNumber, policyType, endDate, daysLeft, portalUrl = PORTAL_URL } = params;

  return `Olá, ${clientName}!

Sua apólice de seguro está se aproximando do vencimento:

- Número: ${policyNumber}
- Tipo: ${policyType}
- Vencimento: ${endDate}${daysLeft > 0 ? ` (em ${daysLeft} dias)` : " (hoje)"}

Para acompanhar todos os detalhes e iniciar a renovação, acesse o portal Dicoon Seguros:
${portalUrl}

Em caso de dúvidas, responda esta mensagem ou entre em contato com seu corretor.

Dicoon Seguros`;
}

/**
 * Returns the WhatsApp message for sending a proposal.
 * Template name (pre-approved): proposal_ready
 */
export function buildWhatsAppProposalMessage(params: {
  clientName: string;
  proposalId: string;
  insurer: string;
  vehicle: string;
  premiumAnnual: number;
  premiumMonthly: number;
  portalUrl?: string;
}): string {
  const { clientName, proposalId, insurer, vehicle, premiumAnnual, premiumMonthly, portalUrl = PORTAL_URL } = params;

  return `Olá, ${clientName}!

Sua proposta de seguro está pronta:

- Proposta: ${proposalId}
- Seguradora: ${insurer}
- Veículo: ${vehicle}
- Valor: R$ ${premiumAnnual.toLocaleString("pt-BR")}/ano
- Parcelado: 12x de R$ ${premiumMonthly.toLocaleString("pt-BR")}

Para consultar todos os detalhes da cobertura e assinar digitalmente, acesse:
${portalUrl}

Qualquer dúvida, estou à disposição.

Dicoon Seguros`;
}
