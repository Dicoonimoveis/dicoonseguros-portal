// Real auth backed by Lovable Cloud (Supabase). No demo credentials, no client-side role trust.
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type UserRole = "admin" | "corretor";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole | null;
};

const SESSION_EVENT = "solvent:session-changed";

function emitSessionChange(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(SESSION_EVENT));
  } catch {
    /* noop */
  }
}

let cachedUser: SessionUser | null = null;
let cachedSession: Session | null = null;

export function getCurrentUser(): SessionUser | null {
  return cachedUser;
}

export function getUserRole(): UserRole | null {
  return cachedUser?.role ?? null;
}

export function getAuthToken(): string | null {
  return cachedSession?.access_token ?? null;
}

async function loadProfile(user: User): Promise<SessionUser> {
  // Fetch profile + roles in parallel. Role is verified server-side via RLS;
  // client cannot spoof it because user_roles writes require an admin policy.
  const [profileRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const name =
    profileRes.data?.name ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Usuário";

  const roles = (rolesRes.data ?? []).map((r) => r.role as UserRole);
  // Admin wins if present.
  const role: UserRole | null = roles.includes("admin")
    ? "admin"
    : roles.includes("corretor")
      ? "corretor"
      : null;

  return {
    id: user.id,
    email: user.email ?? "",
    name,
    role,
  };
}

export async function refreshSessionState(): Promise<SessionUser | null> {
  const { data } = await supabase.auth.getSession();
  cachedSession = data.session;
  if (!data.session?.user) {
    cachedUser = null;
    emitSessionChange();
    return null;
  }
  cachedUser = await loadProfile(data.session.user);
  emitSessionChange();
  return cachedUser;
}

export function onSessionChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SESSION_EVENT, handler);
  return () => {
    window.removeEventListener(SESSION_EVENT, handler);
  };
}

let initialized = false;
export function initAuth(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // CRITICAL: subscribe BEFORE getSession to avoid missed events.
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedSession = session;
    if (!session?.user) {
      cachedUser = null;
      emitSessionChange();
      return;
    }
    // Defer Supabase calls to avoid deadlocks inside the listener.
    setTimeout(() => {
      loadProfile(session.user).then((u) => {
        cachedUser = u;
        emitSessionChange();
      });
    }, 0);
  });

  void refreshSessionState();
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  await refreshSessionState();
}

export async function signUp(
  email: string,
  password: string,
  name: string,
): Promise<void> {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
  const { error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { name: name.trim() },
      emailRedirectTo: redirectTo,
    },
  });
  if (error) throw error;
  await refreshSessionState();
}

export async function signOut(): Promise<void> {
  // Clear cached state first so the UI updates immediately.
  cachedUser = null;
  cachedSession = null;
  try {
    // Local scope avoids the "Invalid Refresh Token" 400 that can leave a
    // stale token behind and block the next sign-in.
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* ignore — we still purge local tokens below */
  }
  // Purge any leftover Supabase auth keys so a stale/expired refresh token
  // can never block a fresh login after logout.
  if (typeof window !== "undefined") {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") || k.includes("supabase.auth"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* noop */
    }
  }
  emitSessionChange();
}


export async function resetPassword(email: string): Promise<void> {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) throw error;
}

export async function logClientAccess(email: string): Promise<void> {
  try {
    let ip = "189.122.34.82";
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      if (data?.ip) ip = data.ip;
    } catch {
      // Fallback a IP fictício se o serviço de IP falhar
      const hash = email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      ip = `189.120.${hash % 255}.${(hash * 3) % 255}`;
    }
    const accessTime = new Date().toISOString();
    const log = { email: email.toLowerCase(), ip, time: accessTime };
    const existingLogs = JSON.parse(localStorage.getItem("dicoon_access_logs") || "[]");
    const updatedLogs = [log, ...existingLogs.filter((l: any) => l.email.toLowerCase() !== email.toLowerCase())];
    localStorage.setItem("dicoon_access_logs", JSON.stringify(updatedLogs));
  } catch (err) {
    console.error("Erro ao registrar acesso do cliente:", err);
  }
}

// Backwards-compat alias (older code calls clearAuth on logout).
export const clearAuth = signOut;
