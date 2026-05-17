import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Shield } from "lucide-react";

const PRIMARY = "#1D9E75";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Check if we have a recovery session or PKCE code
    const checkSession = async () => {
      // Handle PKCE flow (URL has ?code=...)
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError("O link é inválido ou expirou. Por favor, solicite um novo.");
        } else if (data.session) {
          setHasSession(true);
        }
        // Remove code from URL to prevent reusing
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        // Fallback for implicit flow (hash fragment) or existing session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setHasSession(true);
        } else {
          // Listen for session established via hash fragment
          const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
              setHasSession(true);
            }
          });
          return () => {
            authListener.subscription.unsubscribe();
          };
        }
      }
    };
    
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres");
      setIsLoading(false);
      return;
    }

    if (!hasSession) {
      setError("Sessão não encontrada. O link pode ter expirado. Solicite um novo na tela de login.");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setInfo("Senha atualizada com sucesso! Redirecionando...");
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 2000);
    } catch (err: any) {
      setError(err?.message === "Auth session missing!" 
        ? "Sessão inválida ou expirada. Solicite um novo link de redefinição."
        : (err instanceof Error ? err.message : "Falha ao atualizar senha"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-4 font-sans">
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-black/5 p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6" style={{ color: PRIMARY }} strokeWidth={2.4} />
            <h1 className="text-xl font-bold" style={{ color: PRIMARY }}>
              Dicoon Seguros
            </h1>
          </div>
          <p className="text-xs text-gray-500">
            Portal de Acesso
          </p>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Definir nova senha</h2>
          <p className="text-xs text-gray-500">
            Escolha uma senha forte para proteger sua conta.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nova Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={72}
                className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">Mínimo 8 caracteres.</p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !hasSession}
            className="w-full mt-6 py-2.5 rounded-lg text-white text-sm font-semibold transition disabled:opacity-60 hover:brightness-110 active:brightness-95 flex items-center justify-center gap-2"
            style={{ backgroundColor: PRIMARY }}
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Atualizando…
              </>
            ) : (
              "Atualizar senha"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
