import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Shield } from "lucide-react";
import { signIn, resetPassword } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      throw redirect({ to: isAdmin ? "/dashboard-admin" : "/dashboard-cliente" });
    }
  },
  component: LoginPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(1, "Informe a senha").max(72),
});

const PRIMARY = "#1D9E75";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);
    try {
      if (mode === "signin") {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
          setIsLoading(false);
          return;
        }
        try {
          await signIn(parsed.data.email, parsed.data.password);
        } catch {
          setError("E-mail ou senha incorretos. Tente novamente.");
          setIsLoading(false);
          return;
        }
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        let isAdmin = false;
        if (userId) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);
          isAdmin = (roles ?? []).some((r) => r.role === "admin");
        }
        navigate({ to: isAdmin ? "/dashboard-admin" : "/dashboard-cliente" });
      } else {
        if (!email.trim() || !email.includes("@")) {
          setError("Informe um e-mail válido");
          setIsLoading(false);
          return;
        }
        await resetPassword(email);
        setInfo("Link de recuperação enviado!");
        setMode("signin");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Falha na operação. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-4 font-sans">
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-black/5 p-8">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6" style={{ color: PRIMARY }} strokeWidth={2.4} />
            <h1 className="text-xl font-bold" style={{ color: PRIMARY }}>
              Dicoon Seguros
            </h1>
          </div>
          <p className="text-xs text-gray-500">Portal do Cliente &amp; Administração</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 text-center">
            {error}
          </div>
        )}
        {info && (
          <div
            className="mb-4 p-3 rounded-lg text-xs text-center"
            style={{ backgroundColor: `${PRIMARY}15`, color: PRIMARY, border: `1px solid ${PRIMARY}40` }}
          >
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition"
              required
            />
          </div>

          {mode === "signin" && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition disabled:opacity-60 hover:brightness-110 active:brightness-95"
            style={{ backgroundColor: PRIMARY }}
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === "signin" ? (
              "Entrar"
            ) : (
              "Enviar link"
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => { setMode("forgot"); setError(""); setInfo(""); }}
              className="text-sm font-medium hover:underline"
              style={{ color: PRIMARY }}
            >
              Esqueci minha senha
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(""); setInfo(""); }}
              className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-4"
            >
              Voltar para o login
            </button>
          )}
        </div>

        <p className="mt-6 text-[11px] text-gray-400 text-center leading-relaxed">
          Acesso apenas por convite do administrador.
        </p>
      </div>
    </div>
  );
}
