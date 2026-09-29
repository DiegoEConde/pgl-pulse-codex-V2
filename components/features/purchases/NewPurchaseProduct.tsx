"use client";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useOperation } from "@/hooks/useOperation";
import { useProgram } from "@/contexts/ProgramContext";
import { runOperation } from "@/lib/supabase/operations";
import styles from "./PurchasesScreen.module.css";

export default function NewPurchaseProduct({ defaultCategoryId, onClose, onCreated }: { defaultCategoryId?: number; onClose: () => void; onCreated: (id: number, categoryId: number) => void }) {
  const { raw } = useProgram();
  const { busy, error, run } = useOperation();
  return createPortal(<div className={`${styles.modalOverlay} ${styles.catalogOverlay}`}><section className={styles.modal} role="dialog" aria-modal="true" aria-label="Nuevo producto">
    <header className={styles.modalHeader}><h2>Nuevo producto</h2><button type="button" className={styles.close} aria-label="Cerrar nuevo producto" disabled={busy} onClick={onClose}><X size={20} /></button></header>
    <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); const categoryId = Number(data.get("category")); void run(() => runOperation("pgl_create_product", { p_category: categoryId, p_name: String(data.get("name")), p_brand: String(data.get("brand") ?? "") }), id => onCreated(id, categoryId)); }}>
      <fieldset className="form-fields" disabled={busy}><div className={styles.form}>
        <div className={styles.field}><label htmlFor="new-category">Categoría</label><select id="new-category" name="category" defaultValue={defaultCategoryId ? String(defaultCategoryId) : ""} required><option value="" disabled>Seleccionar categoría</option>{raw.categories?.map(category => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="new-name">Nombre del producto</label><input id="new-name" name="name" required maxLength={150} /></div>
        <div className={styles.field}><label htmlFor="new-brand">Marca (opcional)</label><input id="new-brand" name="brand" maxLength={80} /></div>
        {error && <p role="alert" className="operation-error">{error}</p>}
      </div><footer className={styles.modalActions}><button type="button" className={styles.cancel} onClick={onClose}>Cancelar</button><button type="submit" className="primary-btn">{busy ? "Guardando…" : "Crear producto"}</button></footer></fieldset>
    </form>
  </section></div>, document.body);
}
