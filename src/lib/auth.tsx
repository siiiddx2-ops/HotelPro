import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Profile, type Role } from "./supabase";

export type { Role };

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  role: Role | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: Role) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: { full_name?: string; phone?: string; avatar_url?: string }) => Promise<{ error: string | null }>;
  changePassword: (newPassword: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    if (error) {
      console.warn("profile load error", error.message);
      setProfile(null);
      return;
    }
    setProfile(data as Profile | null);
  }

  useEffect(() => {
    let mounted = true;
    let initialLoaded = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      initialLoaded = true;
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession) {
        // Avoid duplicate load on initial session event
        if (initialLoaded && event === "INITIAL_SESSION") return;
        initialLoaded = true;
        (async () => {
          await loadProfile(newSession.user.id);
          if (mounted) setLoading(false);
        })();
      } else {
        setProfile(null);
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }

  async function signUp(email: string, password: string, fullName: string, role: Role) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) return { error: error.message };
    if (data.user && !data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) return { error: signInError.message };
    }
    return { error: null };
  }

  async function updateProfile(updates: { full_name?: string; phone?: string; avatar_url?: string }) {
    if (!session) return { error: "Not signed in" };
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", session.user.id);
    if (error) return { error: error.message };
    await refreshProfile();
    return { error: null };
  }

  async function changePassword(newPassword: string) {
    if (newPassword.length < 6) return { error: "Password must be at least 6 characters" };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error ? error.message : null };
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error ? error.message : null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        role: profile?.role ?? null,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
        changePassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
