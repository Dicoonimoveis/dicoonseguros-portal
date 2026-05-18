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
      // If the user already exists, fall back to lookup.
      const msg = inviteRes.error.message?.toLowerCase() ?? '';
      const alreadyRegistered =
        msg.includes('already') || msg.includes('registered') || msg.includes('exists');
      if (!alreadyRegistered) {
        console.error('inviteUserByEmail failed:', inviteRes.error);
        throw new Error('Não foi possível enviar o convite. Tente novamente.');
      }
      alreadyExisted = true;
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
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (profileErr) {
      console.error('inviteClient profile upsert failed:', profileErr);
      throw new Error(`Falha ao salvar dados do cliente: ${profileErr.message}`);
    }

    return { userId, alreadyExisted };
  });
