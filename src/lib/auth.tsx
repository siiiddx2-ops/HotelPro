import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiCurrentUser, apiLogin, apiRegister, apiUpdateProfile, type ApiUser } from "./api";
import type { Profile, Role } from "./supabase";

export type { Role };

interface Session {
  access_token: string;
  user: { id: string; email: string };
}

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

function toProfile(user: ApiUser): Profile {
  return {
    id: user.id,
    role: user.role,
    full_name: user.fullName,
    phone: user.phone,
    created_at: user.createdAt,
  };
}

function toSession(token: string, user: ApiUser): Session {
  return { access_token: token, user: { id: user.id, email: user.email } };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function restoreSession() {
    if (!localStorage.getItem("hotelpro_token")) {
      setLoading(false);
      return;
    }
    try {
      const { user } = await apiCurrentUser();
      setProfile(toProfile(user));
      setSession({ access_token: localStorage.getItem("hotelpro_token") as string, user: { id: user.id, email: user.email } });
    } catch {
      localStorage.removeItem("hotelpro_token");
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void restoreSession();
  }, []);

  async function refreshProfile() {
    try {
      const { user } = await apiCurrentUser();
      setProfile(toProfile(user));
    } catch {
      setProfile(null);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const result = await apiLogin(email, password);
      localStorage.setItem("hotelpro_token", result.token);
      setSession(toSession(result.token, result.user));
      setProfile(toProfile(result.user));
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  async function signUp(email: string, password: string, fullName: string, role: Role) {
    if (role !== "guest") return { error: "Staff and admin accounts must be created by an administrator." };
    try {
      const result = await apiRegister(email, password, fullName);
      localStorage.setItem("hotelpro_token", result.token);
      setSession(toSession(result.token, result.user));
      setProfile(toProfile(result.user));
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  async function updateProfile(updates: { full_name?: string; phone?: string; avatar_url?: string }) {
    try {
      const { user } = await apiUpdateProfile({ fullName: updates.full_name, phone: updates.phone });
      setProfile(toProfile(user));
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  async function changePassword(_newPassword: string) {
    return { error: "Password changes are not available in the new API yet." };
  }

  async function resetPassword(_email: string) {
    return { error: "Password reset is not available in the new API yet." };
  }

  async function signOut() {
    localStorage.removeItem("hotelpro_token");
    setProfile(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, role: profile?.role ?? null, signIn, signUp, signOut, refreshProfile, updateProfile, changePassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
