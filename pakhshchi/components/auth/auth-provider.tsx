"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthDialog, type AuthMode } from "@/components/layout/auth-dialog";

export interface ClientUser {
  id: string;
  name: string;
  mobile: string;
  isAdmin: boolean;
  isAdvertiser: boolean;
  isPublisher: boolean;
}

interface AuthContextValue {
  user: ClientUser | null;
  ready: boolean;
  openAuth: (mode: AuthMode) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ initialUser, children }: { initialUser: ClientUser | null; children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<ClientUser | null>(initialUser);
  const [mode, setMode] = useState<AuthMode | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      setUser(res.ok && data && !data.error ? (data as ClientUser) : null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    setUser(null);
    router.push("/");
    router.refresh();
  }, [router]);

  const openAuth = useCallback((nextMode: AuthMode) => setMode(nextMode), []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready: user !== null, openAuth, logout, refresh }),
    [user, openAuth, logout, refresh],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthDialog
        mode={mode}
        onClose={() => setMode(null)}
        onSuccess={() => {
          setMode(null);
          void refresh();
          router.refresh();
        }}
      />
    </AuthContext.Provider>
  );
}

export function useSession(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSession must be used inside <AuthProvider>");
  return ctx;
}
