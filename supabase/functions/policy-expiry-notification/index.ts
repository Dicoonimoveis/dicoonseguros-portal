import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { differenceInDays, parseISO, startOfDay } from "https://esm.sh/date-fns@4.1.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    // Fetch all active policies with client profile details
    const { data: policies, error: policiesErr } = await supabase
      .from("policies")
      .select("*, profile:profiles(*)")
      .eq("status", "active");

    if (policiesErr) throw policiesErr;

    const today = startOfDay(new Date());
    const sentNotifications = [];

    for (const policy of policies || []) {
      if (!policy.end_date) continue;
      
      const end = startOfDay(parseISO(policy.end_date));
      const daysLeft = differenceInDays(end, today);

      let subject = "";
      let html = "";
      let isEligible = false;

      const clientEmail = policy.profile?.email;
      const clientName = policy.profile?.name || "Cliente";

      if (daysLeft === 60) {
        isEligible = true;
        subject = `Aviso de Vencimento: Sua apólice vence em 60 dias - Dicoon Seguros`;
        html = `<p>Olá, ${clientName},</p>
                <p>Gostaríamos de lembrar que sua apólice de seguro <strong>${policy.policy_type}</strong> (Nº ${policy.policy_number}) vencerá em 60 dias (no dia ${new Date(policy.end_date).toLocaleDateString("pt-BR")}).</p>
                <p>Já estamos preparando as melhores opções de renovação para você. Em breve entraremos em contato!</p>
                <p>Atenciosamente,<br/><strong>Dicoon Seguros</strong></p>`;
      } else if (daysLeft === 30) {
        isEligible = true;
        subject = `Segundo Aviso: Sua apólice vence em 30 dias - Dicoon Seguros`;
        html = `<p>Olá, ${clientName},</p>
                <p>Este é o segundo aviso de que sua apólice de seguro <strong>${policy.policy_type}</strong> (Nº ${policy.policy_number}) vencerá em 30 dias.</p>
                <p>Para garantir que você continue totalmente protegido, recomendamos iniciar o processo de renovação agora mesmo.</p>
                <p>Fale conosco para mais detalhes!</p>
                <p>Atenciosamente,<br/><strong>Dicoon Seguros</strong></p>`;
      } else if (daysLeft === 7) {
        isEligible = true;
        subject = `🚨 AVISO URGENTE: Sua apólice vence em 7 dias! - Dicoon Seguros`;
        html = `<p>Olá, ${clientName},</p>
                <p><strong>🚨 ATENÇÃO:</strong> Sua apólice de seguro <strong>${policy.policy_type}</strong> (Nº ${policy.policy_number}) vencerá em apenas <strong>7 dias</strong>!</p>
                <p>Evite ficar desprotegido. Entre em contato conosco hoje mesmo para garantir sua renovação!</p>
                <p>Atenciosamente,<br/><strong>Dicoon Seguros</strong></p>`;
      } else if (daysLeft === 0) {
        isEligible = true;
        subject = `⚠️ NOTIFICAÇÃO: Sua apólice vence hoje! - Dicoon Seguros`;
        html = `<p>Olá, ${clientName},</p>
                <p><strong>⚠️ IMPORTANTE:</strong> Sua apólice de seguro <strong>${policy.policy_type}</strong> (Nº ${policy.policy_number}) <strong>vence hoje</strong>!</p>
                <p>Entre em contato urgente para evitar a interrupção da sua cobertura securitária.</p>
                <p>Atenciosamente,<br/><strong>Dicoon Seguros</strong></p>`;
      }

      if (isEligible && clientEmail && RESEND_API_KEY) {
        // Send email using Resend API
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Dicoon Seguros <contato@dicoonseguros.com.br>",
            to: [clientEmail, "contato@dicoonseguros.com.br"], // sends to client and admin
            subject,
            html,
          }),
        });

        if (res.ok) {
          sentNotifications.push({ policy_id: policy.id, daysLeft, recipient: clientEmail });
        } else {
          const errText = await res.text();
          console.error(`Failed to send email to ${clientEmail}: ${errText}`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sentNotifications }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
