import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Shield } from "lucide-react";
import { signIn, signUp, resetPassword, logClientAccess } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

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
  const [mode, setMode] = useState<"signin" | "forgot" | "signup">("signin");
  const [userType, setUserType] = useState<"client" | "admin">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
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

        if (userType === "admin" && !isAdmin) {
          setError("Acesso negado. Esta conta não possui perfil administrativo.");
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        if (!isAdmin) {
          await logClientAccess(parsed.data.email);
        }

        navigate({ to: isAdmin ? "/dashboard-admin" : "/dashboard-cliente" });
      } else if (mode === "signup") {
        if (!name.trim()) {
          setError("Informe seu nome completo");
          setIsLoading(false);
          return;
        }
        if (!email.trim() || !email.includes("@")) {
          setError("Informe um e-mail válido");
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("A senha deve ter no mínimo 6 caracteres");
          setIsLoading(false);
          return;
        }
        if (!cpf.trim() || cpf.replace(/\D/g, "").length < 11) {
          setError("Informe um CPF válido");
          setIsLoading(false);
          return;
        }
        if (!phone.trim()) {
          setError("Informe seu WhatsApp/Telefone");
          setIsLoading(false);
          return;
        }

        // 1. Sign up in Auth
        await signUp(email, password, name);

        // 2. Retrieve user
        const { data: sessionData } = await supabase.auth.getSession();
        const authUser = sessionData.session?.user;
        if (authUser) {
          // 3. Upsert client data in profiles table to ensure robust sync
          const { error: profileErr } = await supabase
            .from("profiles")
            .upsert({
              user_id: authUser.id,
              name: name.trim().toUpperCase(),
              email: email.trim().toLowerCase(),
              cpf: cpf.trim(),
              phone: phone.trim(),
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

          if (profileErr) {
            console.error("Profile sync error:", profileErr);
          }

          setInfo("Cadastro realizado com sucesso!");
          await logClientAccess(email);
          navigate({ to: "/dashboard-cliente" });
        } else {
          setInfo("Cadastro efetuado! Verifique seu e-mail para confirmar a conta.");
          setMode("signin");
        }
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
    } catch (err: any) {
      console.error("Auth action error:", err);
      setError(err.message ?? "Falha na operação. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setInfo("");
    setIsLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError("Não foi possível entrar com o Google. Tente novamente.");
        setIsLoading(false);
        return;
      }
      if (result.redirected) {
        // Browser will redirect to Google.
        return;
      }
      // Session set — decide destination by role.
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
    } catch {
      setError("Não foi possível entrar com o Google. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-4 py-8 font-sans">
      <div className="w-full max-w-[390px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-2 mb-1 justify-center">
            <Shield className="w-6 h-6" style={{ color: PRIMARY }} strokeWidth={2.4} />
            <h1 className="text-xl font-bold" style={{ color: PRIMARY }}>
              Dicoon Seguros
            </h1>
          </div>
          <p className="text-xs text-gray-400">
            Portal de Acesso
          </p>
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

        {/* Custom Tab Selector (Cliente / Administrador) */}
        {mode === "signin" && (
          <div className="flex bg-[#F0F2F5] p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setUserType("client");
                setError("");
                setInfo("");
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                userType === "client"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Cliente
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType("admin");
                setError("");
                setInfo("");
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                userType === "admin"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Administrador
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Nome Completo
              </label>
              <input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
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

          {mode === "signup" && (
            <>
              <div>
                <label htmlFor="cpf" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  CPF
                </label>
                <input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  WhatsApp / Celular
                </label>
                <input
                  id="phone"
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition"
                  required
                />
              </div>
            </>
          )}

          {mode !== "forgot" && (
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "••••••••"}
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
            ) : mode === "signup" ? (
              "Cadastrar e Acessar"
            ) : (
              "Enviar link"
            )}
          </button>
        </form>

        {mode !== "forgot" && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">ou</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 flex items-center justify-center gap-2 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Continuar com Google
            </button>
          </>
        )}



        <div className="mt-5 text-center flex flex-col gap-3">
          {mode === "signin" ? (
            <>
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(""); setInfo(""); }}
                className="text-xs font-semibold hover:underline block mx-auto text-[#1D9E75]"
              >
                Esqueci minha senha
              </button>
              {userType === "client" && (
                <p className="text-xs text-gray-500">
                  Não tem uma conta?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
                    className="font-semibold text-[#1D9E75] hover:underline"
                  >
                    Cadastre-se
                  </button>
                </p>
              )}
            </>
          ) : mode === "signup" ? (
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(""); setInfo(""); }}
              className="text-xs font-semibold hover:underline"
              style={{ color: PRIMARY }}
            >
              Já tem cadastro? Entrar no portal
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(""); setInfo(""); }}
              className="text-xs font-semibold hover:underline"
              style={{ color: PRIMARY }}
            >
              Voltar para o login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
