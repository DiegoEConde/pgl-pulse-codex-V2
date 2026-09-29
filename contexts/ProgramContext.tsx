"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { deriveOperations } from "@/lib/operations";
import { operationalDate } from "@/lib/dates";
import type { Snapshot } from "@/types/operations";

const empty: Snapshot = { products: [], suppliers: [], clients: [], sellers: [], orders: [], lines: [], units: [], charts: [] };
type Value = ReturnType<typeof deriveOperations> & {
  raw: Snapshot; today: string; loading: boolean; error: string; refreshing: boolean; refresh: () => Promise<void>;
};
const Context = createContext<Value | null>(null);
export function ProgramProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<Snapshot>(empty);
  const [today, setToday] = useState(operationalDate);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  // Ignora respuestas viejas si otra actualización terminó antes o se desmontó el proveedor.
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setRefreshing(true);
    try {
      const { data, error } = await getSupabase().rpc("pgl_snapshot");
      if (error) throw error;
      if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(empty).some(key => !Array.isArray(data[key]))) throw new Error("Respuesta incompleta");
      if (request === generation.current) { setRaw(data as unknown as Snapshot); setError(""); setToday(operationalDate()); }
    } catch {
      if (request === generation.current) setError("No se pudieron actualizar los datos. Revisá la conexión y volvé a intentar.");
    } finally {
      if (request === generation.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);
  const cancelRefresh = useCallback(() => { generation.current++; }, []);
  useEffect(() => {
    const kickoff = setTimeout(() => { void refresh(); }, 0);
    // La fecha cambia incluso en segundo plano; los datos se consultan si la pestaña está visible.
    const interval = setInterval(() => { setToday(operationalDate()); if (!document.hidden) void refresh(); }, 30000);
    const focus = () => { void refresh(); };
    const visibility = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visibility);
    return () => { clearTimeout(kickoff); clearInterval(interval); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visibility); cancelRefresh(); };
  }, [refresh, cancelRefresh]);
  const derived = useMemo(() => deriveOperations(raw), [raw]);
  return <Context.Provider value={{ raw, today, loading, refreshing, error, refresh, ...derived }}>{children}</Context.Provider>;
}
export function useProgram() {
  const context = useContext(Context);
  if (!context) throw new Error("useProgram requiere ProgramProvider");
  return context;
}
