"use client";
import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { useOperation } from "@/hooks/useOperation";
import { runOperation } from "@/lib/supabase/operations";
import { sortedValues, type CategoryCharacteristic } from "@/lib/categories";
import purchaseStyles from "./PurchasesScreen.module.css";

type Props = {
  field: CategoryCharacteristic;
  lineKey?: number;
  inputId?: string;
  initialValue?: string;
  styles?: Record<string, string>;
  onValueAdded?: (value: string) => void;
  onBusyChange?: (busy: boolean) => void;
};

export default function CharacteristicInput({ field, lineKey = 0, inputId, initialValue = "", styles = purchaseStyles, onValueAdded, onBusyChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [value, setValue] = useState(initialValue);
  const [savedValues, setSavedValues] = useState<string[]>([]);
  const { busy, error, run, setError } = useOperation();
  const id = inputId ?? ((field.clave === "color" ? "color-" : "option-" + field.clave + "-") + lineKey);
  const values = sortedValues({ ...field, valores: [...new Set([...field.valores, ...savedValues])] });
  async function saveValue() {
    onBusyChange?.(true);
    try {
      await run(() => runOperation("pgl_add_category_value", { p_characteristic: field.id, p_value: draft }), saved => {
        setSavedValues(current => [...current, saved]); setValue(saved); setDraft(""); setAdding(false);
        onValueAdded?.(saved);
      });
    } finally { onBusyChange?.(false); }
  }
  return <div className={styles.field}>
    <label htmlFor={id}>{field.etiqueta}</label>
    {field.tipo === "entero" ? <input id={id} name={id} type="number" min={field.minimo ?? undefined} max={field.maximo ?? undefined} step="1" defaultValue={initialValue} required={field.obligatoria} /> : <>
      <div className={styles.inlineControl}>
        <select id={id} name={id} required={field.obligatoria} value={value} onChange={event => setValue(event.target.value)}><option value="">Seleccionar</option>{values.map(item => <option key={item}>{item}</option>)}</select>
        <button type="button" className={styles.iconButton} aria-label={`Agregar valor de ${field.etiqueta}`} title={`Agregar valor de ${field.etiqueta}`} onClick={() => { setAdding(true); setError(""); }}><Plus size={17} /></button>
      </div>
      {adding && <div className={styles.inlineControl}>
        <input aria-label={`Nuevo valor de ${field.etiqueta}`} maxLength={60} value={draft} disabled={busy} placeholder={field.clave === "ram" || field.clave === "rom" ? "Ej. 48 GB" : "Nuevo valor"} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} />
        <button type="button" className={styles.iconButton} title="Guardar valor" aria-label="Guardar valor" disabled={busy || !draft.trim()} onClick={() => void saveValue()}><Check size={17} /></button>
        <button type="button" className={styles.iconButton} title="Cancelar valor" aria-label="Cancelar valor" disabled={busy} onClick={() => setAdding(false)}><X size={17} /></button>
      </div>}
      {error && <p role="alert" className="operation-error">{error}</p>}
    </>}
  </div>;
}
