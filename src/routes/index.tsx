import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
    
    // Fetch the authenticated user's role to redirect correctly
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id);
      
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    throw redirect({ to: isAdmin ? "/dashboard-admin" : "/dashboard-cliente" });
  },
  component: () => null,
});
