import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/acesso-negado")({
  component: AcessoNegado,
});

function AcessoNegado() {
  const navigate = useNavigate();
  const [targetPanel, setTargetPanel] = useState<"/dashboard-cliente" | "/dashboard-admin" | "/login">("/login");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setTargetPanel("/login");
        return;
      }
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id)
        .then(({ data: roles }) => {
          const isAdmin = (roles ?? []).some((r) => r.role === "admin");
          setTargetPanel(isAdmin ? "/dashboard-admin" : "/dashboard-cliente");
        });
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-4 font-sans">
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-black/5 p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
        <p className="text-sm text-gray-600 mb-6">Você não tem permissão para acessar esta página.</p>
        <button
          onClick={() => navigate({ to: targetPanel })}
          className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition"
          style={{ backgroundColor: "#1D9E75" }}
        >
          Voltar para o meu painel
        </button>
      </div>
    </div>
  );
}
