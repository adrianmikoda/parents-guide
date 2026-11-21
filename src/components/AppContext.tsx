"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_PARAMS, Params } from "@/lib/params";

type Session = { id: string; imie: string; nazwisko: string; wlasne?: boolean } | null;
type Ctx = {
  session: Session;
  loading: boolean;
  params: Params;
  profile: any;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  reloadParams: () => Promise<void>;
};
const C = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [profile, setProfile] = useState<any>(null);
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(true);

  const reloadParams = useCallback(async () => {
    const r = await fetch("/api/params").then((r) => r.json());
    setParams(r.params);
  }, []);

  const refresh = useCallback(async () => {
    const s = await fetch("/api/auth/mobywatel").then((r) => r.json());
    setSession(s.session);
    if (s.session) {
      const p = await fetch("/api/zus/profile").then((r) => r.json());
      setProfile(p);
    } else setProfile(null);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/mobywatel", { method: "DELETE" });
    setSession(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    refresh();
    reloadParams();
  }, [refresh, reloadParams]);

  return <C.Provider value={{ session, profile, params, loading, refresh, logout, reloadParams }}>{children}</C.Provider>;
}

export const useApp = () => useContext(C)!;

export async function api<T = any>(url: string, body?: unknown, method?: string): Promise<T> {
  const r = await fetch(url, {
    method: method || (body !== undefined ? "POST" : "GET"),
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return r.json();
}
