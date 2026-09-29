"use client";

import { createPortal } from "react-dom";
import CharacteristicInput from "@/components/features/purchases/CharacteristicInput";
import { categoryLabel, productAttributes, sameProduct } from "@/lib/product-catalog";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Boxes, Building2, Pencil, Plus, Search, Store, UsersRound, X, type LucideIcon } from "lucide-react";
import PagedTable from "@/components/ui/PagedTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { catalogConfig, type CatalogId, type MasterRecord } from "@/config/catalogs";
import { persistRecord, catalogError } from "@/lib/supabase/catalogs";
import { useProgram } from "@/contexts/ProgramContext";
import layout from "@/components/ui/OperationalLayout.module.css";
import styles from "./DataScreen.module.css";

const icons: Record<CatalogId, LucideIcon> = { products: Boxes, suppliers: Building2, clients: UsersRound, sellers: Store };

export default function DataScreen() {
  const { raw, refresh } = useProgram();
  const catalogs: Record<CatalogId, MasterRecord[]> = raw;
  const [activeCatalog, setActiveCatalog] = useState<CatalogId | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<MasterRecord | "new" | null>(null);
  const [formError, setFormError] = useState("");
  const [category, setCategory] = useState("");
  const categories = [...(raw.categories ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
  const selectedCategory = categories.find(item => item.nombre === category);
  const [addedValues, setAddedValues] = useState<Record<number, string[]>>({});
  const [addingValue, setAddingValue] = useState(false);
  const addingValueRef = useRef(false);
  const characteristics = (raw.categoryCharacteristics ?? []).filter(field => field.categoria_id === selectedCategory?.id && field.clave !== "color").map(field => ({ ...field, valores: [...new Set([...field.valores, ...(addedValues[field.id] ?? [])])] }));
  const catalogReady = Boolean(raw.categories && raw.categoryCharacteristics);
  const [dirty, setDirty] = useState(false);

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const filtered = useMemo(() => {
    const records = activeCatalog ? catalogs[activeCatalog] : [];
    return records.filter((record) => Object.values(record).flatMap(value => typeof value === "object" && value !== null ? Object.values(value) : value ?? "").join(" ").toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => b.id - a.id);
  }, [activeCatalog, catalogs, search]);

  function openCatalog(id: CatalogId) { setActiveCatalog(id); setSearch(""); }
  function requestClose() {
    if (savingRef.current || addingValueRef.current) return;
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Querés descartarlos?")) return;
    setEditing(null); setDirty(false);
  }
  async function saveRecord(formData: FormData) {
    if (savingRef.current || addingValueRef.current) return;
    if (!activeCatalog) return;
    const current = catalogs[activeCatalog];
    if (!editing) return;
    // El ID cero es solo local; PostgreSQL asigna el definitivo al crear.
    const record: MasterRecord = { id: editing === "new" ? 0 : editing.id, nombre: "" };
    for (const field of catalogConfig[activeCatalog].fields) {
      const value = String(formData.get(field.key) ?? "").trim();
      if (field.required && !value) { setFormError("Completá " + field.label.toLowerCase() + "."); return; }
      if (field.type === "number" && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 999.99)) { setFormError("Ingresá una comisión válida."); return; }
      record[field.key] = value === "" ? null : field.type === "number" ? Number(value) : value;
    }
    if (activeCatalog === "products") {
      if (!catalogReady || !selectedCategory) { setFormError("No se pudieron cargar las categorías. Actualizá los datos."); return; }
      const attributes: Record<string, string> = {};
      for (const field of characteristics) {
        const value = String(formData.get("attribute-" + field.clave) ?? "").trim();
        if (!value && !field.obligatoria) continue;
        if (!value || (field.tipo === "lista" ? !field.valores.includes(value) : !Number.isInteger(Number(value)) || Number(value) < (field.minimo ?? -Infinity) || Number(value) > (field.maximo ?? Infinity))) {
          setFormError("Revisá " + field.etiqueta.toLowerCase() + "."); return;
        }
        attributes[field.clave] = field.tipo === "entero" ? String(Number(value)) : value;
      }
      record.atributos = attributes;
      if (current.some(item => item.id !== record.id && sameProduct(item, record))) {
        const message = "Ya existe un producto con todos estos datos. Revisá el catálogo antes de guardar.";
        setFormError(message); window.alert(message); return;
      }
    }
    setFormError("");
    savingRef.current = true; setSaving(true);
    try {
      await persistRecord(activeCatalog, record, editing === "new");
      await refresh();
      setEditing(null); setDirty(false);
    } catch (error) {
      const message = catalogError(error);
      setFormError(message);
      if (activeCatalog === "products" && error && typeof error === "object" && "code" in error && error.code === "23505") window.alert(message);
    }
    finally { savingRef.current = false; setSaving(false); }
  }

  if (!activeCatalog) return <div className={`view ${layout.page}`}>
    <PageHeader title="Datos" action={<></>} />
    <section className={styles.catalogGrid}>{(Object.keys(catalogConfig) as CatalogId[]).map((id) => { const config = catalogConfig[id]; const Icon = icons[id]; const total = catalogs[id].length; return <button className={styles.catalogCard} key={id} onClick={() => openCatalog(id)}><div className={styles.cardHeading}><span className={styles.cardIcon}><Icon size={21} /></span><h2>{config.label}</h2></div><p>{config.description}</p><span className={styles.cardFooter}><b>{total}</b><span>{total === 1 ? "elemento creado" : "elementos creados"}</span></span></button>; })}</section>
  </div>;

  const config = catalogConfig[activeCatalog];
  return <div className={`view ${layout.page}`}>
    <PageHeader title={config.label} action={
      <div className={styles.headerActions}>
        <button className={`primary-btn ${styles.newButton}`} onClick={() => { setEditing("new"); setCategory(""); setDirty(false); setFormError(""); }}><Plus size={16} /> Nuevo {config.singular.toLowerCase()}</button>
      </div>
    } />
    <div className={styles.searchSection}>
      <button className={styles.back} onClick={() => setActiveCatalog(null)}><ArrowLeft size={14} /> Volver a Datos</button>
      <div className={layout.toolbar}>
        <label className={layout.searchWrap}><Search size={15} /><input className="search" aria-label={`Buscar ${config.label.toLowerCase()}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar ${config.label.toLowerCase()}…`} /></label>
      </div>
    </div>
    <section className="panel">
      <div className="table-wrap">
        {filtered.length ? <PagedTable>
          <thead><tr><th>ID</th>{config.fields.map((field) => <th key={field.key}>{field.label}</th>)}{activeCatalog === "products" && <th>Características</th>}<th>Acciones</th></tr></thead>
          <tbody>{filtered.map((record) => <tr key={record.id}>
            <td className="mono">{record.id}</td>
            {config.fields.map((field) => <td key={field.key} className={field.type === "textarea" ? styles.textCell : undefined}>
              {record[field.key] === null || record[field.key] === undefined ? "—" : field.type === "number" ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(Number(record[field.key])) + " %" : field.key === "categoria" ? categoryLabel(String(record[field.key])) : String(record[field.key])}
            </td>)}
            {activeCatalog === "products" && <td className={styles.textCell}>{Object.entries(productAttributes(record)).map(([key, value]) => (raw.categoryCharacteristics?.find(field => field.categoria_id === record.categoria_id && field.clave === key)?.etiqueta ?? key) + ": " + value).join(" / ") || "—"}</td>}
            <td><button className={styles.rowAction} onClick={() => { setEditing(record); setCategory(String(record.categoria ?? "").toLowerCase()); setDirty(false); setFormError(""); }}><Pencil size={13} /> Modificar</button></td>
          </tr>)}</tbody>
        </PagedTable> : <div className={styles.empty}>No hay registros que coincidan con la búsqueda.</div>}
      </div>
    </section>

    {editing && createPortal(<div className={styles.overlay}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="data-modal-title">
      <header className={styles.modalHeader}><div><span className="eyebrow">{editing === "new" ? "Nuevo registro" : "Registro " + editing.id}</span><h2 id="data-modal-title">{(editing === "new" ? "Nuevo " : "Modificar ") + config.singular.toLowerCase()}</h2></div><button type="button" className={styles.close} aria-label="Cerrar modal" disabled={saving || addingValue} onClick={requestClose}><X size={20} /></button></header>
      <form onSubmit={event => { event.preventDefault(); void saveRecord(new FormData(event.currentTarget)); }} onChange={() => setDirty(true)}>
        <fieldset disabled={saving || addingValue} className={styles.formFields}><div className={styles.form}>
          {formError && <p className={styles.formError} role="alert">{formError}</p>}
          {activeCatalog === "products" && <div className={styles.field}>
            <label htmlFor="categoria">Categoría</label><select id="categoria" name="categoria" required autoFocus value={category} onChange={event => { setCategory(event.target.value); setFormError(""); }}><option value="" disabled>Seleccionar categoría</option>{categories.map(item => <option key={item.id} value={item.nombre}>{categoryLabel(item.nombre)}</option>)}</select>
            {!catalogReady && <p role="alert" className={styles.formError}>No se pudieron cargar las categorías. Actualizá los datos.</p>}
          </div>}
          {(activeCatalog !== "products" || selectedCategory) && <div className={styles.inputGrid} key={activeCatalog === "products" ? category : activeCatalog}>
            {config.fields.filter(field => activeCatalog !== "products" || field.key !== "categoria").map(field => <div className={styles.field} key={field.key}>
              <label htmlFor={field.key}>{field.label}</label>
              {field.type === "textarea" ? <textarea id={field.key} name={field.key} defaultValue={editing === "new" ? "" : String(editing[field.key] ?? "")} /> : <input id={field.key} name={field.key} type={field.type ?? "text"} required={field.required} maxLength={field.maxLength} min={field.type === "number" ? 0 : undefined} max={field.type === "number" ? 999.99 : undefined} step={field.type === "number" ? "0.01" : field.type === "time" ? 1 : undefined} defaultValue={editing === "new" ? "" : String(editing[field.key] ?? "")} />}
            </div>)}
            {activeCatalog === "products" && characteristics.map(field => {
              const value = editing !== "new" && String(editing.categoria).toLowerCase() === category ? productAttributes(editing)[field.clave] ?? "" : "";
              const id = "attribute-" + field.clave;
              return <CharacteristicInput key={id} field={field} inputId={id} initialValue={value} styles={styles}
                onBusyChange={busy => { addingValueRef.current = busy; setAddingValue(busy); }}
                onValueAdded={saved => { setAddedValues(current => ({ ...current, [field.id]: [...(current[field.id] ?? []), saved] })); setDirty(true); setFormError(""); }} />;
            })}
          </div>}
        </div></fieldset>
        <footer className={styles.actions}><button type="button" className={styles.cancel} disabled={saving || addingValue} onClick={requestClose}>Cancelar</button><button type="submit" disabled={saving || addingValue || (activeCatalog === "products" && (!catalogReady || !selectedCategory))} className={"primary-btn " + styles.save}>{saving ? "Guardando…" : "Guardar"}</button></footer>
      </form>
    </section></div>, document.body)}
  </div>;
}
