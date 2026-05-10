import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, Shield } from "lucide-react";
import { signIn, signUp, resetPassword } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(1, "Informe a senha").max(72),
});

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres")
    .max(72, "A senha deve ter no máximo 72 caracteres"),
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [name, setName] = useState("");
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
        await signIn(parsed.data.email, parsed.data.password);
        navigate({ to: "/" });
      } else if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ name, email, password });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Dados inválidos");
          setIsLoading(false);
          return;
        }
        await signUp(parsed.data.email, parsed.data.password, parsed.data.name);
        setInfo("Conta criada! Redirecionando...");
        setTimeout(() => navigate({ to: "/" }), 1500);
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
      setError(err instanceof Error ? err.message : "Falha na operação");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#111827] p-6">
      {/* Logo Container */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-24 h-24 bg-black rounded-lg flex items-center justify-center p-2 mb-2">
          <svg viewBox="0 0 100 100" className="w-full h-full text-[#0070f3] fill-current">
            <path d="M20 20 C 60 20, 80 40, 80 50 C 80 60, 60 80, 20 80 L 20 60 C 40 60, 60 50, 60 50 C 60 50, 40 40, 20 40 Z" />
            <path d="M30 45 L 30 55 L 50 55 L 50 45 Z" opacity="0.8" />
          </svg>
        </div>
      </div>

      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
            {mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}
          </h1>
        </div>

        <div className="rounded-2xl bg-[#1f2937] p-8 shadow-2xl border border-white/5">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400 text-center">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-sm text-blue-400 text-center">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Shield className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#e8f0fe] text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#e8f0fe] text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {mode !== "forgot" && (
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-[#e8f0fe] text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-[#0070f3] text-white font-bold text-lg hover:bg-[#0060df] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-500/20"
            >
              {isLoading ? (
                <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"
              )}
            </button>
          </form>

          <div className="mt-8 space-y-4 text-center">
            {mode === "signin" && (
              <>
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(""); setInfo(""); }}
                  className="block w-full text-[#f97316] font-medium hover:underline transition-all"
                >
                  Esqueci minha senha
                </button>
                <div className="text-gray-400 text-sm">
                  Não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
                    className="text-[#f97316] font-bold hover:underline transition-all"
                  >
                    Criar conta
                  </button>
                </div>
              </>
            )}

            {(mode === "signup" || mode === "forgot") && (
              <button
                type="button"
                onClick={() => { setMode("signin"); setError(""); setInfo(""); }}
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium underline underline-offset-4"
              >
                Voltar para o login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
