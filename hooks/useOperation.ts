"use client";
import { useRef, useState } from "react";
import { useProgram } from "@/contexts/ProgramContext";
import { operationError } from "@/lib/supabase/operations";

export function useOperation() {
  const { refresh } = useProgram();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run<T>(action: () => Promise<T>, done?: (value: T) => void) {
    // El ref bloquea dobles envíos antes de que React actualice el botón.
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError("");
    try { const value = await action(); await refresh(); done?.(value); return true; }
    catch (cause) { setError(operationError(cause)); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, error, setError, run };
}
