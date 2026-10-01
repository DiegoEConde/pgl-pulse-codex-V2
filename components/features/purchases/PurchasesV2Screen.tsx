"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowDownToLine, Ban, DollarSign, PackagePlus, Plus, RefreshCw, Save, Truck, X } from "lucide-react";
import type { CompraRow, PurchaseData, UUID } from "@/lib/local-db";
import styles from "./PurchasesV2Screen.module.css";

type LineForm = {
  id: string;
  producto_id: string;
  costo_original: string;
  venta_item_id: string;
};

type PurchaseForm = {
  proveedor_id: string;
  repartidor_retiro_id: string;
  fecha_retiro_programada: string;
  moneda: "USD" | "ARS";
  paga_al_retirar: boolean;
  observaciones: string;
  items: LineForm[];
};

type PurchasesV2ScreenProps = {
  initialData: PurchaseData;
};

const emptyData: PurchaseData = {
  compras: [],
  compra_items: [],
  proveedores: [],
  productos: [],
  repartidores: [],
  ventas: [],
  venta_items: [],
  clientes: [],
  rutas: [],
  ruta_items: [],
};

export default function PurchasesV2Screen({ initialData }: PurchasesV2ScreenProps) {
  const [data, setData] = useState<PurchaseData>(initialData ?? emptyData);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PurchaseForm>(() => createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const maps = useMemo(() => buildMaps(data), [data]);
  const metrics = useMemo(() => buildMetrics(data), [data]);
  const filteredPurchases = useMemo(() => filterPurchases(data, maps, query), [data, maps, query]);
  const selectedPurchase = filteredPurchases.find((purchase) => purchase.id === selectedId) ?? filteredPurchases[0] ?? null;
  const selectedItems = selectedPurchase ? data.compra_items.filter((item) => item.compra_id === selectedPurchase.id) : [];
  const pendingSaleItems = useMemo(() => data.venta_items.filter((item) => !item.compra_item_id && item.estado !== "CANCELADO"), [data.venta_items]);

  async function refresh() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/purchases", { cache: "no-store" });
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
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: formToPayload(form) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo guardar la compra.");
      setData(body.data);
      setForm(createEmptyForm());
      setFormOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la compra.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelItem(itemId: UUID) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/purchases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel-item", itemId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo cancelar el item.");
      setData(body.data);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "No se pudo cancelar el item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`view ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <span className="eyebrow">Proveedores</span>
          <h1>Compras</h1>
          <p>Pedidos a proveedor con items individuales, retiro opcional por repartidor y origen de stock o venta sin stock.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} onClick={refresh} disabled={saving} aria-label="Actualizar">
            <RefreshCw size={18} />
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setFormOpen(true)} disabled={!data.proveedores.length || !data.productos.length}>
            <Plus size={18} />
            Nueva compra
          </button>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Indicadores de compras">
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

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <div>
              <span className="eyebrow">Pedidos</span>
              <h2>Compras a proveedor</h2>
            </div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar compra, proveedor o estado" />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className="table-wrap">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Compra</th>
                  <th>Proveedor</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Retiro</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((purchase) => {
                  const items = data.compra_items.filter((item) => item.compra_id === purchase.id);
                  const provider = maps.providers.get(purchase.proveedor_id)?.nombre ?? "Proveedor no disponible";
                  const courier = purchase.repartidor_retiro_id ? maps.couriers.get(purchase.repartidor_retiro_id)?.nombre ?? "Repartidor no disponible" : "Sin repartidor";
                  return (
                    <tr key={purchase.id} className={selectedPurchase?.id === purchase.id ? styles.selectedRow : undefined} onClick={() => setSelectedId(purchase.id)}>
                      <td><span className="mono">C-{purchase.numero}</span></td>
                      <td>{provider}</td>
                      <td>{items.filter((item) => item.estado !== "CANCELADO").length} activos</td>
                      <td>{formatMoney(purchase.total_estimado, purchase.moneda)}</td>
                      <td>{courier}</td>
                      <td><span className={`badge ${badgeForPurchase(purchase)}`}>{purchase.estado}</span></td>
                    </tr>
                  );
                })}
                {!filteredPurchases.length && (
                  <tr>
                    <td colSpan={6} className={styles.empty}>Sin compras cargadas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className={`${styles.panel} ${styles.detail}`}>
          <div className={styles.detailHeader}>
            <div>
              <span className="eyebrow">Detalle</span>
              <h2>{selectedPurchase ? `Compra C-${selectedPurchase.numero}` : "Sin compra seleccionada"}</h2>
            </div>
            {selectedPurchase && <span className={`badge ${selectedPurchase.paga_al_retirar ? "amber" : "violet"}`}>{selectedPurchase.paga_al_retirar ? "Paga al retirar" : "Proveedor fiado"}</span>}
          </div>

          {selectedPurchase ? (
            <div className={styles.itemList}>
              {selectedItems.map((item) => {
                const product = maps.products.get(item.producto_id)?.nombre ?? "Producto no disponible";
                const saleLabel = item.venta_item_id ? saleItemLabel(item.venta_item_id, data, maps) : "Stock oficina";
                const routeLabel = routeLabelForItem(item.id, data);
                return (
                  <article className={styles.itemCard} key={item.id}>
                    <div>
                      <strong>{product}</strong>
                      <span>{saleLabel}</span>
                    </div>
                    <div>
                      <b>{formatMoney(item.costo_original, item.moneda)}</b>
                      <small>{routeLabel}</small>
                    </div>
                    <button type="button" className={styles.iconButton} onClick={() => void cancelItem(item.id)} disabled={saving || item.estado === "CANCELADO"} aria-label="Cancelar item">
                      <Ban size={16} />
                    </button>
                    <span className={`badge ${item.estado === "CANCELADO" ? "red" : "blue"}`}>{item.estado}</span>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className={styles.empty}>Selecciona una compra para ver sus items.</p>
          )}
        </aside>
      </div>

      {formOpen && (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={save}>
            <header className={styles.modalHeader}>
              <div>
                <span className="eyebrow">Nueva compra</span>
                <h2>Pedido a proveedor</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setFormOpen(false)} disabled={saving} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <div className={styles.formGrid}>
              <label>
                <span>Proveedor</span>
                <select value={form.proveedor_id} onChange={(event) => setForm({ ...form, proveedor_id: event.target.value })} required>
                  <option value="">Seleccionar</option>
                  {data.proveedores.filter((provider) => provider.activo).map((provider) => <option key={provider.id} value={provider.id}>{provider.nombre}</option>)}
                </select>
              </label>

              <label>
                <span>Repartidor que retira</span>
                <select value={form.repartidor_retiro_id} onChange={(event) => setForm({ ...form, repartidor_retiro_id: event.target.value })}>
                  <option value="">Sin repartidor</option>
                  {data.repartidores.filter((courier) => courier.activo).map((courier) => <option key={courier.id} value={courier.id}>{courier.nombre}</option>)}
                </select>
              </label>

              <label>
                <span>Fecha retiro</span>
                <input type="datetime-local" value={form.fecha_retiro_programada} onChange={(event) => setForm({ ...form, fecha_retiro_programada: event.target.value })} />
              </label>

              <label>
                <span>Moneda</span>
                <select value={form.moneda} onChange={(event) => setForm({ ...form, moneda: event.target.value as "USD" | "ARS" })}>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </label>

              <label className={styles.check}>
                <input type="checkbox" checked={form.paga_al_retirar} onChange={(event) => setForm({ ...form, paga_al_retirar: event.target.checked })} />
                Paga al retirar
              </label>

              <label>
                <span>Observaciones</span>
                <input value={form.observaciones} onChange={(event) => setForm({ ...form, observaciones: event.target.value })} />
              </label>
            </div>

            <section className={styles.lines}>
              <header>
                <div>
                  <span className="eyebrow">Items</span>
                  <h3>Productos pedidos</h3>
                </div>
                <button type="button" className={styles.iconButton} onClick={() => setForm({ ...form, items: [...form.items, createLine()] })} aria-label="Agregar item">
                  <Plus size={17} />
                </button>
              </header>

              {form.items.map((line, index) => (
                <div className={styles.lineRow} key={line.id}>
                  <label>
                    <span>Producto</span>
                    <select value={line.producto_id} onChange={(event) => updateLine(form, setForm, line.id, { producto_id: event.target.value })} required>
                      <option value="">Seleccionar</option>
                      {data.productos.filter((product) => product.activo).map((product) => <option key={product.id} value={product.id}>{product.nombre}</option>)}
                    </select>
                  </label>

                  <label>
                    <span>Costo</span>
                    <input type="number" min="0" step="0.01" value={line.costo_original} onChange={(event) => updateLine(form, setForm, line.id, { costo_original: event.target.value })} required />
                  </label>

                  <label>
                    <span>Destino</span>
                    <select value={line.venta_item_id} onChange={(event) => updateLine(form, setForm, line.id, { venta_item_id: event.target.value })}>
                      <option value="">Stock oficina</option>
                      {pendingSaleItems.map((item) => <option key={item.id} value={item.id}>{saleItemLabel(item.id, data, maps)}</option>)}
                    </select>
                  </label>

                  <button type="button" className={styles.iconButton} onClick={() => setForm({ ...form, items: form.items.filter((item) => item.id !== line.id) })} disabled={form.items.length === 1} aria-label={`Quitar item ${index + 1}`}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </section>

            <footer className={styles.modalFooter}>
              <span>{form.paga_al_retirar ? "Se generaran tareas de retiro y pago si hay repartidor." : "Si hay repartidor, solo se generara retiro; el proveedor queda fiado."}</span>
              <button type="submit" className={styles.primaryButton} disabled={saving}>
                <Save size={18} />
                Guardar compra
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}

function buildMaps(data: PurchaseData) {
  return {
    providers: new Map(data.proveedores.map((provider) => [provider.id, provider])),
    products: new Map(data.productos.map((product) => [product.id, product])),
    couriers: new Map(data.repartidores.map((courier) => [courier.id, courier])),
    sales: new Map(data.ventas.map((sale) => [sale.id, sale])),
    clients: new Map(data.clientes.map((client) => [client.id, client])),
  };
}

function buildMetrics(data: PurchaseData) {
  const activeItems = data.compra_items.filter((item) => item.estado !== "CANCELADO");
  const assignedItems = activeItems.filter((item) => item.estado === "ASIGNADO_RUTA").length;
  const supplierDebt = data.compras.filter((purchase) => !purchase.paga_al_retirar && purchase.estado !== "CANCELADA").reduce((sum, purchase) => sum + purchase.total_estimado, 0);

  return [
    { label: "Compras", value: String(data.compras.length), detail: "Pedidos a proveedor", color: "var(--violet)", icon: <PackagePlus size={17} /> },
    { label: "Items activos", value: String(activeItems.length), detail: "No cancelados", color: "var(--blue)", icon: <ArrowDownToLine size={17} /> },
    { label: "Asignados a ruta", value: String(assignedItems), detail: "Retiro con repartidor", color: "var(--amber)", icon: <Truck size={17} /> },
    { label: "Fiado proveedor", value: formatMoney(supplierDebt, "USD"), detail: "Compras sin pago al retirar", color: "var(--red)", icon: <DollarSign size={17} /> },
  ];
}

function filterPurchases(data: PurchaseData, maps: ReturnType<typeof buildMaps>, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return data.compras;

  return data.compras.filter((purchase) => {
    const provider = maps.providers.get(purchase.proveedor_id)?.nombre ?? "";
    return [`C-${purchase.numero}`, provider, purchase.estado].some((value) => value.toLowerCase().includes(normalized));
  });
}

function formToPayload(form: PurchaseForm) {
  return {
    proveedor_id: form.proveedor_id,
    repartidor_retiro_id: form.repartidor_retiro_id || null,
    fecha_retiro_programada: form.fecha_retiro_programada || null,
    moneda: form.moneda,
    paga_al_retirar: form.paga_al_retirar,
    observaciones: form.observaciones,
    items: form.items.map((item) => ({
      producto_id: item.producto_id,
      costo_original: Number(item.costo_original),
      venta_item_id: item.venta_item_id || null,
    })),
  };
}

function updateLine(form: PurchaseForm, setForm: (form: PurchaseForm) => void, id: string, patch: Partial<LineForm>) {
  setForm({
    ...form,
    items: form.items.map((line) => line.id === id ? { ...line, ...patch } : line),
  });
}

function createEmptyForm(): PurchaseForm {
  return {
    proveedor_id: "",
    repartidor_retiro_id: "",
    fecha_retiro_programada: "",
    moneda: "USD",
    paga_al_retirar: true,
    observaciones: "",
    items: [createLine()],
  };
}

function createLine(): LineForm {
  return {
    id: crypto.randomUUID(),
    producto_id: "",
    costo_original: "",
    venta_item_id: "",
  };
}

function saleItemLabel(itemId: UUID, data: PurchaseData, maps: ReturnType<typeof buildMaps>) {
  const item = data.venta_items.find((row) => row.id === itemId);
  if (!item) return "Venta no disponible";

  const sale = maps.sales.get(item.venta_id);
  const client = sale ? maps.clients.get(sale.cliente_id)?.nombre : null;
  const product = maps.products.get(item.producto_id)?.nombre ?? "Producto";

  return [`Venta #${sale?.numero ?? "-"}`, client, product].filter(Boolean).join(" - ");
}

function routeLabelForItem(itemId: UUID, data: PurchaseData) {
  const routeItem = data.ruta_items.find((row) => row.compra_item_id === itemId);
  if (!routeItem) return "Sin ruta";
  const route = data.rutas.find((row) => row.id === routeItem.ruta_id);
  return route ? `Ruta ${route.id.slice(0, 8)}` : "Ruta asignada";
}

function badgeForPurchase(purchase: CompraRow) {
  if (purchase.estado === "CANCELADA") return "red";
  if (purchase.estado === "EN_RETIRO") return "violet";
  if (purchase.estado === "PEDIDA") return "blue";
  if (purchase.estado.includes("RECIBIDA") || purchase.estado === "CERRADA") return "green";
  return "muted-badge";
}

function formatMoney(value: number, currency: "USD" | "ARS") {
  if (currency === "ARS") return `$ ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
  return `US$ ${value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
