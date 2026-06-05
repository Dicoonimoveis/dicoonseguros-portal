import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const inviteSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(1).max(255),
  cpf: z.string().trim().max(32).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  birth_date: z.string().trim().max(32).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
});

async function ensureCallerIsAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  if (error) throw new Error('Falha ao verificar permissões.');
  const isAdmin = (data ?? []).some((r) => r.role === 'admin');
  if (!isAdmin) throw new Error('Acesso negado. Apenas administradores podem convidar clientes.');
}

/**
 * Admin-only: invite a new client by email.
 *
 * - No password is generated on the client.
 * - No password is ever returned to the browser.
 * - Supabase sends a magic invite link to the user's email; the user sets
 *   their own password on first login.
 * - If the email already has an auth user, we reuse it (idempotent).
 * - Profile fields are upserted server-side via the service-role client.
 */
export const inviteClient = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureCallerIsAdmin(context.userId);

    const email = data.email.toLowerCase();
    let userId: string | null = null;
    let alreadyExisted = false;

    // Try to invite (sends magic-link email; user sets own password).
    const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { name: data.name },
    });

    if (inviteRes.error) {
      const msg = inviteRes.error.message?.toLowerCase() ?? '';
      const alreadyRegistered =
        msg.includes('already') || msg.includes('registered') || msg.includes('exists');
      if (alreadyRegistered) {
        alreadyExisted = true;
      } else {
        // Email sending may not be configured. Fall back to creating the user
        // directly so the account exists; the client can use "Esqueci minha
        // senha" to set a password later.
        const created = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { name: data.name },
        });
        if (created.error) {
          const cMsg = created.error.message?.toLowerCase() ?? '';
          if (cMsg.includes('already') || cMsg.includes('registered') || cMsg.includes('exists')) {
            alreadyExisted = true;
          } else {
            console.error('createUser fallback failed:', created.error);
            throw new Error('Não foi possível criar o cliente. Tente novamente.');
          }
        } else {
          userId = created.data.user?.id ?? null;
        }
      }
    } else {
      userId = inviteRes.data.user?.id ?? null;
    }

    if (!userId) {
      // Look up by email via admin listUsers (handles already-exists case).
      const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = list.data.users.find((u) => u.email?.toLowerCase() === email);
      if (!match) throw new Error('Cliente não encontrado após convite.');
      userId = match.id;
    }

    // Upsert profile fields (guarantees the profile exists and is up to date).
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId,
        email: email,
        name: data.name,
        cpf: data.cpf || null,
        phone: data.phone || null,
        birth_date: data.birth_date || null,
        address: data.address || null,
        status: 'approved',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (profileErr) {
      console.error('inviteClient profile upsert failed:', profileErr);
      throw new Error(`Falha ao salvar dados do cliente: ${profileErr.message}`);
    }

    return { userId, alreadyExisted };
  });
