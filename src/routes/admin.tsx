import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Construction } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administração · Dicoon Seguros" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      throw redirect({ to: "/acesso-negado" });
    }
  },
  component: () => (
    <AppShell>
      <PageHeader eyebrow="Configurações" title="Administração" description="Usuários, permissões, integrações e regras comerciais." />
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-16 text-center">
        <div className="size-12 rounded-xl bg-secondary mx-auto grid place-items-center mb-4">
          <Construction className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Painel de seguradoras, credenciais e RBAC será habilitado quando ativarmos Lovable Cloud.
        </p>
      </div>
    </AppShell>
  ),
});
