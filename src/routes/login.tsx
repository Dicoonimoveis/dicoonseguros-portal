import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Shield, CheckCircle2 } from "lucide-react";
import { signIn, signUp } from "@/lib/auth";
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
        setInfo("Conta criada. Entrando…");
        navigate({ to: "/" });
      } else {
        // forgot mode
        if (!email.trim() || !email.includes("@")) {
          setError("Informe um e-mail válido");
          setIsLoading(false);
          return;
        }
        await resetPassword(email);
        setInfo("Link de recuperação enviado para o seu e-mail.");
        setMode("signin");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha na operação";
      if (/invalid login credentials/i.test(message)) {
        setError("E-mail ou senha incorretos");
      } else if (/already registered|already exists/i.test(message)) {
        setError("Este e-mail já está cadastrado. Faça login.");
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    {
      icon: Shield,
      title: "Segurança Premium",
      description: "Autenticação criptografada gerenciada pelo backend",
    },
    {
      icon: CheckCircle2,
      title: "Integração Completa",
      description: "Cotações simultâneas em várias seguradoras",
    },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-foreground">Dicoonseguros</span>
          </div>

          <div className="mt-16">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              Centralize cotações, propostas e conversões
            </h1>
            <p className="text-lg text-muted-foreground mb-12">
              Uma plataforma premium para impulsionar suas vendas de seguros.
            </p>

            <div className="space-y-6">
              {benefits.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">Dicoonseguros</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant">
            {mode !== "forgot" && (
              <div className="flex gap-1 p-1 mb-6 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setError(""); setInfo(""); }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === "signin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Criar conta
                </button>
              </div>
            )}

            <h2 className="text-2xl font-bold text-foreground mb-2">
              {mode === "signin" ? "Acessar plataforma" : mode === "signup" ? "Crie sua conta" : "Recuperar senha"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {mode === "signin"
                ? "Use suas credenciais corporativas"
                : mode === "signup"
                  ? "Novos cadastros entram como corretor. Admins liberam permissões."
                  : "Enviaremos um link de recuperação para o seu e-mail."}
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                {error}
              </div>
            )}
            {info && (
              <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary">
                {info}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">Nome completo</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">E-mail</label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  autoComplete="email"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>

              {mode !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium text-foreground">Senha</label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => { setMode("forgot"); setError(""); setInfo(""); }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      maxLength={72}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <p className="text-xs text-muted-foreground mt-1.5">Mínimo 8 caracteres.</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    {mode === "signin" ? "Entrando…" : mode === "signup" ? "Criando conta…" : "Enviando…"}
                  </>
                ) : mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
              </button>

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setError(""); setInfo(""); }}
                  className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voltar para o login
                </button>
              )}
            </form>
          </div>

          <p className="mt-8 text-xs text-muted-foreground text-center">
            Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
          </p>
        </div>
      </div>
    </div>
  );
}
