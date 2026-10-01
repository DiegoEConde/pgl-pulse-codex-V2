"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Boxes, Building2, Pencil, Plus, Power, RefreshCw, Save, Search, Users, X } from "lucide-react";
import type { ClienteRow, MasterData, MasterKind, ProductoRow, ProveedorRow } from "@/lib/local-db";
import styles from "./MastersScreen.module.css";

type MasterRow = ProductoRow | ClienteRow | ProveedorRow;
type ActiveFilter = "todos" | "activos" | "inactivos";

type FormState = {
  categoria: string;
  marca: string;
  modelo: string;
  nombre: string;
  telefono: string;
  direccion: string;
  localidad: string;
  horario: string;
  observaciones: string;
  atributos: string;
  activo: boolean;
};

type EditingState = {
  kind: MasterKind;
  id: string | null;
  title: string;
  form: FormState;
};

type MastersScreenProps = {
  initialData: MasterData;
};

const emptyData: MasterData = {
  productos: [],
  clientes: [],
  proveedores: [],
};

const tabs: Array<{ kind: MasterKind; label: string; icon: typeof Boxes }> = [
  { kind: "productos", label: "Productos", icon: Boxes },
  { kind: "clientes", label: "Clientes", icon: Users },
  { kind: "proveedores", label: "Proveedores", icon: Building2 },
];

export default function MastersScreen({ initialData }: MastersScreenProps) {
  const [data, setData] = useState<MasterData>(initialData ?? emptyData);
  const [activeKind, setActiveKind] = useState<MasterKind>("productos");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("todos");
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => filterRows(data[activeKind], activeKind, query, activeFilter), [activeFilter, activeKind, data, query]);
  const metrics = useMemo(() => buildMetrics(data), [data]);

  async function refresh() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/masters", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo actualizar.");
      setData(body.data);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/masters", {
        method: editing.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: editing.kind,
          id: editing.id,
          values: valuesForKind(editing.kind, editing.form),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo guardar.");
      setData(body.data);
      setEditing(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(kind: MasterKind, row: MasterRow) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/masters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id: row.id, values: { activo: !row.activo } }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo actualizar.");
      setData(body.data);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  }

  const activeTab = tabs.find((tab) => tab.kind === activeKind) ?? tabs[0];

  return (
    <section className={`view ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <span className="eyebrow">Maestros</span>
          <h1>Datos</h1>
          <p>Productos, clientes y proveedores conectados a la base local v2.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} onClick={refresh} disabled={saving} aria-label="Actualizar">
            <RefreshCw size={18} />
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setEditing(newRecord(activeKind))}>
            <Plus size={18} />
            {activeTab.label}
          </button>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Indicadores de datos">
        {metrics.map((metric) => (
          <article className="metric" key={metric.label} style={{ "--accent": metric.color } as CSSProperties}>
            <div className="metric-top">
              <span>{metric.label}</span>
              <i className="metric-icon">{metric.icon}</i>
            </div>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <div className={styles.tabs} role="tablist" aria-label="Tipo de dato">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.kind}
                  type="button"
                  role="tab"
                  aria-selected={tab.kind === activeKind}
                  className={tab.kind === activeKind ? styles.tabActive : styles.tab}
                  onClick={() => setActiveKind(tab.kind)}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className={styles.filters}>
            <label className={styles.search}>
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" />
            </label>
            <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)} aria-label="Estado">
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className="table-wrap">
          <table className={styles.table}>
            <thead>{renderHead(activeKind)}</thead>
            <tbody>
              {filtered.map((row) => renderRow(activeKind, row, setEditing, toggleActive, saving))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} className={styles.empty}>Sin registros</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={save}>
            <header className={styles.modalHeader}>
              <div>
                <span className="eyebrow">{editing.id ? "Editar" : "Nuevo"}</span>
                <h2>{editing.title}</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setEditing(null)} disabled={saving} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <div className={styles.formGrid}>{renderForm(editing, setEditing)}</div>

            <footer className={styles.modalFooter}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={editing.form.activo}
                  onChange={(event) => setEditing({ ...editing, form: { ...editing.form, activo: event.target.checked } })}
                />
                Activo
              </label>
              <button type="submit" className={styles.primaryButton} disabled={saving}>
                <Save size={18} />
                Guardar
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}

function buildMetrics(data: MasterData) {
  const activeProducts = data.productos.filter((row) => row.activo).length;
  const activeClients = data.clientes.filter((row) => row.activo).length;
  const activeSuppliers = data.proveedores.filter((row) => row.activo).length;

  return [
    { label: "Productos", value: String(data.productos.length), detail: `${activeProducts} activos`, color: "var(--green)", icon: <Boxes size={17} /> },
    { label: "Clientes", value: String(data.clientes.length), detail: `${activeClients} activos`, color: "var(--blue)", icon: <Users size={17} /> },
    { label: "Proveedores", value: String(data.proveedores.length), detail: `${activeSuppliers} activos`, color: "var(--violet)", icon: <Building2 size={17} /> },
    { label: "Inactivos", value: String(data.productos.length + data.clientes.length + data.proveedores.length - activeProducts - activeClients - activeSuppliers), detail: "Ocultables por filtro", color: "var(--amber)", icon: <Power size={17} /> },
  ];
}

function renderHead(kind: MasterKind) {
  if (kind === "productos") {
    return (
      <tr>
        <th>Producto</th>
        <th>Categoria</th>
        <th>Marca</th>
        <th>Modelo</th>
        <th>Estado</th>
        <th>Acciones</th>
      </tr>
    );
  }

  if (kind === "clientes") {
    return (
      <tr>
        <th>Cliente</th>
        <th>Telefono</th>
        <th>Direccion</th>
        <th>Localidad</th>
        <th>Estado</th>
        <th>Acciones</th>
      </tr>
    );
  }

  return (
    <tr>
      <th>Proveedor</th>
      <th>Telefono</th>
      <th>Direccion</th>
      <th>Horario</th>
      <th>Estado</th>
      <th>Acciones</th>
    </tr>
  );
}

function renderRow(
  kind: MasterKind,
  row: MasterRow,
  setEditing: (state: EditingState) => void,
  toggleActive: (kind: MasterKind, row: MasterRow) => void,
  saving: boolean,
) {
  const cells = cellsForRow(kind, row);

  return (
    <tr key={row.id}>
      {cells.map((cell, index) => <td key={`${row.id}-${index}`}>{index === 0 ? <span className="mono">{cell}</span> : cell}</td>)}
      <td><span className={`badge ${row.activo ? "green" : "muted-badge"}`}>{row.activo ? "Activo" : "Inactivo"}</span></td>
      <td>
        <div className={styles.rowActions}>
          <button type="button" className={styles.iconButton} onClick={() => setEditing(editRecord(kind, row))} disabled={saving} aria-label="Editar">
            <Pencil size={16} />
          </button>
          <button type="button" className={styles.iconButton} onClick={() => void toggleActive(kind, row)} disabled={saving} aria-label={row.activo ? "Desactivar" : "Activar"}>
            <Power size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function cellsForRow(kind: MasterKind, row: MasterRow) {
  if (kind === "productos") {
    const product = row as ProductoRow;
    return [product.nombre, product.categoria, product.marca, product.modelo];
  }

  if (kind === "clientes") {
    const client = row as ClienteRow;
    return [client.nombre, client.telefono ?? "-", client.direccion ?? "-", client.localidad ?? "-"];
  }

  const supplier = row as ProveedorRow;
  return [supplier.nombre, supplier.telefono ?? "-", supplier.direccion ?? "-", supplier.horario ?? "-"];
}

function renderForm(editing: EditingState, setEditing: (state: EditingState) => void) {
  const update = (field: keyof FormState, value: string) => setEditing({ ...editing, form: { ...editing.form, [field]: value } });

  if (editing.kind === "productos") {
    return (
      <>
        <Field label="Nombre" value={editing.form.nombre} onChange={(value) => update("nombre", value)} required />
        <Field label="Categoria" value={editing.form.categoria} onChange={(value) => update("categoria", value)} required />
        <Field label="Marca" value={editing.form.marca} onChange={(value) => update("marca", value)} required />
        <Field label="Modelo" value={editing.form.modelo} onChange={(value) => update("modelo", value)} required />
        <Field label="Atributos" value={editing.form.atributos} onChange={(value) => update("atributos", value)} className={styles.full} />
      </>
    );
  }

  if (editing.kind === "clientes") {
    return (
      <>
        <Field label="Nombre" value={editing.form.nombre} onChange={(value) => update("nombre", value)} required />
        <Field label="Telefono" value={editing.form.telefono} onChange={(value) => update("telefono", value)} />
        <Field label="Direccion" value={editing.form.direccion} onChange={(value) => update("direccion", value)} />
        <Field label="Localidad" value={editing.form.localidad} onChange={(value) => update("localidad", value)} />
        <Field label="Observaciones" value={editing.form.observaciones} onChange={(value) => update("observaciones", value)} className={styles.full} />
      </>
    );
  }

  return (
    <>
      <Field label="Nombre" value={editing.form.nombre} onChange={(value) => update("nombre", value)} required />
      <Field label="Telefono" value={editing.form.telefono} onChange={(value) => update("telefono", value)} />
      <Field label="Direccion" value={editing.form.direccion} onChange={(value) => update("direccion", value)} />
      <Field label="Horario" value={editing.form.horario} onChange={(value) => update("horario", value)} />
      <Field label="Observaciones" value={editing.form.observaciones} onChange={(value) => update("observaciones", value)} className={styles.full} />
    </>
  );
}

function Field({ label, value, onChange, required, className }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; className?: string }) {
  return (
    <label className={className}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function newRecord(kind: MasterKind): EditingState {
  return {
    kind,
    id: null,
    title: titleForKind(kind),
    form: emptyForm(),
  };
}

function editRecord(kind: MasterKind, row: MasterRow): EditingState {
  const form = emptyForm();

  if (kind === "productos") {
    const product = row as ProductoRow;
    return {
      kind,
      id: product.id,
      title: product.nombre,
      form: {
        ...form,
        categoria: product.categoria,
        marca: product.marca,
        modelo: product.modelo,
        nombre: product.nombre,
        atributos: attributesToText(product.atributos),
        activo: product.activo,
      },
    };
  }

  if (kind === "clientes") {
    const client = row as ClienteRow;
    return {
      kind,
      id: client.id,
      title: client.nombre,
      form: {
        ...form,
        nombre: client.nombre,
        telefono: client.telefono ?? "",
        direccion: client.direccion ?? "",
        localidad: client.localidad ?? "",
        observaciones: client.observaciones ?? "",
        activo: client.activo,
      },
    };
  }

  const supplier = row as ProveedorRow;
  return {
    kind,
    id: supplier.id,
    title: supplier.nombre,
    form: {
      ...form,
      nombre: supplier.nombre,
      telefono: supplier.telefono ?? "",
      direccion: supplier.direccion ?? "",
      horario: supplier.horario ?? "",
      observaciones: supplier.observaciones ?? "",
      activo: supplier.activo,
    },
  };
}

function valuesForKind(kind: MasterKind, form: FormState) {
  if (kind === "productos") {
    return {
      categoria: form.categoria,
      marca: form.marca,
      modelo: form.modelo,
      nombre: form.nombre,
      atributos: textToAttributes(form.atributos),
      activo: form.activo,
    };
  }

  if (kind === "clientes") {
    return {
      nombre: form.nombre,
      telefono: form.telefono,
      direccion: form.direccion,
      localidad: form.localidad,
      observaciones: form.observaciones,
      activo: form.activo,
    };
  }

  return {
    nombre: form.nombre,
    telefono: form.telefono,
    direccion: form.direccion,
    horario: form.horario,
    observaciones: form.observaciones,
    activo: form.activo,
  };
}

function filterRows(rows: MasterRow[], kind: MasterKind, query: string, activeFilter: ActiveFilter) {
  const normalizedQuery = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (activeFilter === "activos" && !row.activo) return false;
    if (activeFilter === "inactivos" && row.activo) return false;
    if (!normalizedQuery) return true;

    return cellsForRow(kind, row).some((cell) => cell.toLowerCase().includes(normalizedQuery));
  });
}

function titleForKind(kind: MasterKind) {
  if (kind === "productos") return "Producto";
  if (kind === "clientes") return "Cliente";
  return "Proveedor";
}

function emptyForm(): FormState {
  return {
    categoria: "",
    marca: "",
    modelo: "",
    nombre: "",
    telefono: "",
    direccion: "",
    localidad: "",
    horario: "",
    observaciones: "",
    atributos: "",
    activo: true,
  };
}

function attributesToText(attributes: Record<string, unknown>) {
  return Object.entries(attributes).map(([key, value]) => `${key}: ${String(value)}`).join(", ");
}

function textToAttributes(value: string) {
  return value.split(",").reduce<Record<string, string>>((attributes, item) => {
    const [rawKey, ...rawValue] = item.split(":");
    const key = rawKey?.trim();
    const nextValue = rawValue.join(":").trim();
    if (key && nextValue) attributes[key] = nextValue;
    return attributes;
  }, {});
}
