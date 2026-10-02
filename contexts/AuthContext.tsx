"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { demoUsers, type DemoUser } from "@/lib/demo-users";

type LoginResult = {
  ok: boolean;
  message?: string;
};

type AuthContextValue = {
  user: DemoUser | null;
  users: DemoUser[];
  login: (username: string, password: string) => LoginResult;
  logout: () => void;
};

const STORAGE_KEY = "pgl-pulse-v2-demo-user";
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => (
    typeof window === "undefined" ? null : window.sessionStorage.getItem(STORAGE_KEY)
  ));

  const user = useMemo(() => demoUsers.find((current) => current.id === userId) ?? null, [userId]);

  function login(username: string, password: string): LoginResult {
    const normalized = username.trim().toLowerCase();
    const found = demoUsers.find((current) => (
      current.username === normalized
      || current.nombre.toLowerCase() === normalized
      || current.email.toLowerCase() === normalized
    ));

    if (!found || found.password !== password) {
      return { ok: false, message: "Usuario o contrasena incorrectos." };
    }

    window.sessionStorage.setItem(STORAGE_KEY, found.id);
    setUserId(found.id);
    return { ok: true };
  }

  function logout() {
    window.sessionStorage.removeItem(STORAGE_KEY);
    setUserId(null);
  }

  return <AuthContext.Provider value={{ user, users: demoUsers, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  return context;
}
