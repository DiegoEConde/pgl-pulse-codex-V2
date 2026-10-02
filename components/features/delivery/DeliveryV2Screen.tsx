"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowDownToLine, CreditCard, PackageCheck, Plus, RefreshCw, Route, Save, Truck, Wallet, X } from "lucide-react";
import type { DeliveryData, Moneda, RolUsuario, RutaItemRow, RutaRow, UnitDestination, UUID } from "@/lib/local-db";
import styles from "./DeliveryV2Screen.module.css";

type DeliveryV2ScreenProps = {
  initialData: DeliveryData;
  activeRole?: RolUsuario;
  activeUserId?: UUID | null;
};

type RouteForm = {
  repartidor_id: string;
  fecha_programada: string;
  observaciones: string;
  compra_item_ids: string[];
  venta_item_ids: string[];
};

type TaskAction = "pickup" | "provider-payment" | "customer-collection";

const emptyData: DeliveryData = {
  rutas: [],
  ruta_items: [],
  repartidores: [],
  compras: [],
  compra_items: [],
  proveedores: [],
  ventas: [],
  venta_items: [],
  clientes: [],
  productos: [],
  unidades: [],
  movimientos_dinero: [],
};

export default function DeliveryV2Screen({ initialData, activeRole = "ADMINISTRADOR", activeUserId = null }: DeliveryV2ScreenProps) {
  const [data, setData] = useState<DeliveryData>(initialData ?? emptyData);
  const [query, setQuery] = useState("");
  const [courierFilter, setCourierFilter] = useState("TODOS");
  const [courierView, setCourierView] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RouteForm>(() => createEmptyForm());
  const [taskAction, setTaskAction] = useState<TaskAction | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [pickupDestination, setPickupDestination] = useState<UnitDestination>("REPARTIDOR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const maps = useMemo(() => buildMaps(data), [data]);
  const metrics = useMemo(() => buildMetrics(data), [data]);
  const courierOnly = activeRole === "REPARTIDOR";
  const filteredRoutes = useMemo(() => filterRoutes(data, maps, query, courierFilter, courierOnly, activeUserId), [activeUserId, courierFilter, courierOnly, data, maps, query]);
  const selectedRoute = filteredRoutes.find((route) => route.id === selectedRouteId) ?? filteredRoutes[0] ?? null;
  const selectedItems = selectedRoute ? data.ruta_items.filter((item) => item.ruta_id === selectedRoute.id).sort((a, b) => a.orden - b.orden) : [];
  const selectedTask = taskId ? data.ruta_items.find((item) => item.id === taskId) ?? null : null;
  const pendingPurchaseItems = courierOnly ? [] : data.compra_items.filter((item) => item.estado !== "CANCELADO" && !item.unidad_id && !hasActiveTask(data, "compra_item_id", item.id, "RETIRAR_PROVEEDOR"));
  const pendingSaleItems = courierOnly ? [] : data.venta_items.filter((item) => !["CANCELADO", "FINALIZADO", "GARANTIA", "ENTREGADO"].includes(item.estado) && !hasActiveTask(data, "venta_item_id", item.id, "ENTREGAR_CLIENTE"));

  async function refresh() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/delivery", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo actualizar.");
      setData(body.data);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  }

  async function sendPatch(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/delivery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const responseBody = await response.json();
      if (!response.ok) throw new Error(responseBody.error ?? "No se pudo guardar la ruta.");
      setData(responseBody.data);
      setTaskAction(null);
      setTaskId(null);
      return true;
    } catch (routeError) {
      setError(routeError instanceof Error ? routeError.message : "No se pudo guardar la ruta.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function createRouteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: form }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo crear la ruta.");
      setData(body.data);
      setForm(createEmptyForm());
      setFormOpen(false);
    } catch (routeError) {
      setError(routeError instanceof Error ? routeError.message : "No se pudo crear la ruta.");
    } finally {
      setSaving(false);
    }
  }

  async function pickupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    const formData = new FormData(event.currentTarget);
    await sendPatch({
      action: "pickup",
      routeItemId: selectedTask.id,
      values: {
        destino: pickupDestination,
        imei: String(formData.get("imei") ?? ""),
        serie: String(formData.get("serie") ?? ""),
        color: String(formData.get("color") ?? ""),
        identificador: String(formData.get("identificador") ?? ""),
      },
    });
  }

  async function moneySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask || !taskAction) return;
    const formData = new FormData(event.currentTarget);
    await sendPatch({
      action: taskAction,
      routeItemId: selectedTask.id,
      values: {
        importe: Number(formData.get("importe") ?? 0),
        moneda: String(formData.get("moneda") ?? "USD"),
        medio_pago: String(formData.get("medio_pago") ?? "EFECTIVO_USD"),
        venta_item_id: String(formData.get("venta_item_id") ?? "") || null,
      },
    });
  }

  return (
    <section className={`view ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <span className="eyebrow">Logistica</span>
          <h1>Reparto</h1>
          <p>Rutas, paradas, retiros, pagos, entregas y cobros en una sola pantalla operativa.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} onClick={refresh} disabled={saving} aria-label="Actualizar">
            <RefreshCw size={18} />
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setFormOpen(true)} disabled={courierOnly || !data.repartidores.length || (!pendingPurchaseItems.length && !pendingSaleItems.length)}>
            <Plus size={18} />
            Nueva ruta
          </button>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Indicadores de reparto">
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
              <span className="eyebrow">{courierView ? "Vista repartidor" : "Vista administrador"}</span>
              <h2>Rutas activas</h2>
            </div>
            <div className={styles.filters}>
              {!courierOnly && (
                <>
                  <button type="button" className={courierView ? styles.toggleOn : styles.toggle} onClick={() => setCourierView((value) => !value)}>
                    <Truck size={15} />
                    Repartidor
                  </button>
                  <select value={courierFilter} onChange={(event) => setCourierFilter(event.target.value)}>
                    <option value="TODOS">Todos</option>
                    {data.repartidores.map((courier) => <option key={courier.id} value={courier.id}>{courier.nombre}</option>)}
                  </select>
                </>
              )}
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ruta, repartidor o estado" />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className="table-wrap">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ruta</th>
                  <th>Repartidor</th>
                  <th>Tareas</th>
                  <th>Cobrar</th>
                  <th>Pagar</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((route) => {
                  const items = data.ruta_items.filter((item) => item.ruta_id === route.id);
                  return (
                    <tr key={route.id} className={selectedRoute?.id === route.id ? styles.selectedRow : undefined} onClick={() => setSelectedRouteId(route.id)}>
                      <td><span className="mono">{route.id.slice(0, 8)}</span></td>
                      <td>{maps.couriers.get(route.repartidor_id)?.nombre ?? "Repartidor"}</td>
                      <td>{items.filter((item) => item.estado !== "CANCELADA").length}</td>
                      <td>{formatMoney(sumExpected(items, "COBRAR_CLIENTE"), "USD")}</td>
                      <td>{formatMoney(sumExpected(items, "PAGAR_PROVEEDOR"), "USD")}</td>
                      <td><span className={`badge ${badgeForRoute(route)}`}>{route.estado}</span></td>
                    </tr>
                  );
                })}
                {!filteredRoutes.length && (
                  <tr>
                    <td colSpan={6} className={styles.empty}>Sin rutas cargadas</td>
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
              <h2>{selectedRoute ? `Ruta ${selectedRoute.id.slice(0, 8)}` : "Sin ruta seleccionada"}</h2>
            </div>
            {selectedRoute && <span className={`badge ${badgeForRoute(selectedRoute)}`}>{selectedRoute.estado}</span>}
          </div>

          {selectedRoute ? (
            <div className={styles.detailBody}>
              <div className={styles.summaryLine}>
                <span>{maps.couriers.get(selectedRoute.repartidor_id)?.nombre ?? "Repartidor"}</span>
                <strong>{formatDate(selectedRoute.fecha_programada)}</strong>
              </div>

              <div className={styles.routeActions}>
                <button type="button" className={styles.iconTextButton} onClick={() => void sendPatch({ action: "start-route", routeId: selectedRoute.id })} disabled={saving || selectedRoute.estado === "EN_CURSO"}>
                  <Route size={16} />
                  Iniciar
                </button>
                <button type="button" className={styles.iconTextButton} onClick={() => void sendPatch({ action: "open-next-day", routeId: selectedRoute.id })} disabled={saving}>
                  <Truck size={16} />
                  Sigue mañana
                </button>
                {!courierOnly && (
                  <button type="button" className={styles.iconTextButton} onClick={() => void sendPatch({ action: "partial-rendition", routeId: selectedRoute.id })} disabled={saving}>
                    <Wallet size={16} />
                    Rendición parcial
                  </button>
                )}
              </div>

              <div className={styles.taskList}>
                {selectedItems.map((item) => (
                  <article key={item.id} className={styles.taskCard}>
                    <div>
                      <span className={`badge ${badgeForTask(item)}`}>{taskTitle(item)}</span>
                      <strong>{taskPrimary(item, data, maps)}</strong>
                      <small>{taskSecondary(item, data, maps)}</small>
                    </div>
                    <div className={styles.taskMeta}>
                      <b>{item.importe_esperado ? formatMoney(item.importe_esperado, item.moneda ?? "USD") : item.estado}</b>
                      <small>{item.realizado_en ? formatDate(item.realizado_en) : "Pendiente"}</small>
                    </div>
                    <TaskButton item={item} saving={saving} onAction={(action) => { setPickupDestination("REPARTIDOR"); setTaskAction(action); setTaskId(item.id); }} onDelivery={() => void sendPatch({ action: "customer-delivery", routeItemId: item.id })} />
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <p className={styles.empty}>Selecciona una ruta para ver sus tareas.</p>
          )}
        </aside>
      </div>

      {formOpen && (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={createRouteSubmit}>
            <header className={styles.modalHeader}>
              <div>
                <span className="eyebrow">Nueva ruta</span>
                <h2>Armado operativo</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setFormOpen(false)} disabled={saving} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <div className={styles.formGrid}>
              <label>
                <span>Repartidor</span>
                <select value={form.repartidor_id} onChange={(event) => setForm({ ...form, repartidor_id: event.target.value })} required>
                  <option value="">Seleccionar</option>
                  {data.repartidores.filter((courier) => courier.activo).map((courier) => <option key={courier.id} value={courier.id}>{courier.nombre}</option>)}
                </select>
              </label>
              <label>
                <span>Fecha</span>
                <input type="datetime-local" value={form.fecha_programada} onChange={(event) => setForm({ ...form, fecha_programada: event.target.value })} />
              </label>
              <label>
                <span>Observaciones</span>
                <input value={form.observaciones} onChange={(event) => setForm({ ...form, observaciones: event.target.value })} />
              </label>
            </div>

            <div className={styles.pickLists}>
              <PickList title="Retiros a proveedor" empty="Sin compras pendientes" items={pendingPurchaseItems.map((item) => ({ id: item.id, label: purchaseItemLabel(item.id, data, maps) }))} selected={form.compra_item_ids} onToggle={(id) => setForm({ ...form, compra_item_ids: toggleId(form.compra_item_ids, id) })} />
              <PickList title="Entregas a cliente" empty="Sin ventas pendientes" items={pendingSaleItems.map((item) => ({ id: item.id, label: saleItemLabel(item.id, data, maps) }))} selected={form.venta_item_ids} onToggle={(id) => setForm({ ...form, venta_item_ids: toggleId(form.venta_item_ids, id) })} />
            </div>

            <footer className={styles.modalFooter}>
              <span>La ruta puede mezclar proveedores, clientes, pagos y cobros.</span>
              <button type="submit" className={styles.primaryButton} disabled={saving || (!form.compra_item_ids.length && !form.venta_item_ids.length)}>
                <Save size={18} />
                Guardar ruta
              </button>
            </footer>
          </form>
        </div>
      )}

      {selectedTask && taskAction === "pickup" && (
        <div className={styles.overlay}>
          <form className={styles.modalSmall} onSubmit={pickupSubmit}>
            <ModalHead title="Confirmar retiro" onClose={() => setTaskAction(null)} />
            <div className={styles.formGrid}>
              <label>
                <span>Destino</span>
                <select value={pickupDestination} onChange={(event) => setPickupDestination(event.target.value as UnitDestination)}>
                  <option value="REPARTIDOR">Queda con repartidor</option>
                  <option value="OFICINA">Deja en oficina</option>
                  <option value="ENTREGA_DIRECTA">Entrega directa</option>
                </select>
              </label>
              <label><span>IMEI</span><input name="imei" /></label>
              <label><span>Serie</span><input name="serie" /></label>
              <label><span>Color</span><input name="color" /></label>
              <label><span>Identificador</span><input name="identificador" /></label>
            </div>
            <footer className={styles.modalFooter}>
              <span>{pickupDestination === "ENTREGA_DIRECTA" ? "El retiro marca entrega al cliente vinculado." : "La unidad queda ubicada segun destino."}</span>
              <button type="submit" className={styles.primaryButton} disabled={saving}>Confirmar</button>
            </footer>
          </form>
        </div>
      )}

      {selectedTask && (taskAction === "provider-payment" || taskAction === "customer-collection") && (
        <div className={styles.overlay}>
          <form className={styles.modalSmall} onSubmit={moneySubmit}>
            <ModalHead title={taskAction === "provider-payment" ? "Pago a proveedor" : "Cobro a cliente"} onClose={() => setTaskAction(null)} />
            <div className={styles.formGrid}>
              <label>
                <span>Importe</span>
                <input name="importe" type="number" min="0.01" step="0.01" defaultValue={selectedTask.importe_esperado || ""} required />
              </label>
              <label>
                <span>Moneda</span>
                <select name="moneda" defaultValue={selectedTask.moneda ?? "USD"}>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </label>
              <label>
                <span>Medio</span>
                <select name="medio_pago" defaultValue={selectedTask.moneda === "ARS" ? "EFECTIVO_ARS" : "EFECTIVO_USD"}>
                  <option value="EFECTIVO_USD">EFECTIVO_USD</option>
                  <option value="EFECTIVO_ARS">EFECTIVO_ARS</option>
                  <option value="TRANSFERENCIA_ARS">TRANSFERENCIA_ARS</option>
                  <option value="CREDITO">CREDITO</option>
                  <option value="DEBITO">DEBITO</option>
                </select>
              </label>
              {taskAction === "customer-collection" && (
                <label>
                  <span>Aplica a</span>
                  <select name="venta_item_id" defaultValue="">
                    <option value="">Venta completa</option>
                    {saleItemsForCollection(selectedTask, data).map((item) => <option key={item.id} value={item.id}>{saleItemLabel(item.id, data, maps)}</option>)}
                  </select>
                </label>
              )}
            </div>
            <footer className={styles.modalFooter}>
              <span>El movimiento queda registrado para Caja.</span>
              <button type="submit" className={styles.primaryButton} disabled={saving}>Registrar</button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}

function TaskButton({ item, saving, onAction, onDelivery }: { item: RutaItemRow; saving: boolean; onAction: (action: TaskAction) => void; onDelivery: () => void }) {
  if (item.estado === "CONFIRMADA" || item.estado === "RENDIDA" || item.estado === "CANCELADA") return null;
  if (item.tipo === "RETIRAR_PROVEEDOR") return <button type="button" className={styles.iconTextButton} onClick={() => onAction("pickup")} disabled={saving}>Retirar</button>;
  if (item.tipo === "PAGAR_PROVEEDOR") return <button type="button" className={styles.iconTextButton} onClick={() => onAction("provider-payment")} disabled={saving}>Pagar</button>;
  if (item.tipo === "ENTREGAR_CLIENTE") return <button type="button" className={styles.iconTextButton} onClick={onDelivery} disabled={saving}>Entregar</button>;
  if (item.tipo === "COBRAR_CLIENTE") return <button type="button" className={styles.iconTextButton} onClick={() => onAction("customer-collection")} disabled={saving}>Cobrar</button>;
  return null;
}

function PickList({ title, empty, items, selected, onToggle }: { title: string; empty: string; items: { id: string; label: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <section className={styles.pickList}>
      <header>
        <span className="eyebrow">{title}</span>
        <strong>{items.length}</strong>
      </header>
      {items.map((item) => (
        <label key={item.id}>
          <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />
          <span>{item.label}</span>
        </label>
      ))}
      {!items.length && <p>{empty}</p>}
    </section>
  );
}

function ModalHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <header className={styles.modalHeader}>
      <div>
        <span className="eyebrow">Ruta</span>
        <h2>{title}</h2>
      </div>
      <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Cerrar">
        <X size={18} />
      </button>
    </header>
  );
}

function buildMaps(data: DeliveryData) {
  return {
    couriers: new Map(data.repartidores.map((courier) => [courier.id, courier])),
    purchases: new Map(data.compras.map((purchase) => [purchase.id, purchase])),
    purchaseItems: new Map(data.compra_items.map((item) => [item.id, item])),
    providers: new Map(data.proveedores.map((provider) => [provider.id, provider])),
    sales: new Map(data.ventas.map((sale) => [sale.id, sale])),
    saleItems: new Map(data.venta_items.map((item) => [item.id, item])),
    clients: new Map(data.clientes.map((client) => [client.id, client])),
    products: new Map(data.productos.map((product) => [product.id, product])),
    units: new Map(data.unidades.map((unit) => [unit.id, unit])),
  };
}

function buildMetrics(data: DeliveryData) {
  const openRoutes = data.rutas.filter((route) => !["CANCELADA", "RENDIDA"].includes(route.estado));
  const pendingPickups = data.ruta_items.filter((item) => item.tipo === "RETIRAR_PROVEEDOR" && item.estado === "PENDIENTE").length;
  const pendingDeliveries = data.ruta_items.filter((item) => item.tipo === "ENTREGAR_CLIENTE" && item.estado === "PENDIENTE").length;
  const collect = sumExpected(data.ruta_items.filter((item) => item.estado === "PENDIENTE"), "COBRAR_CLIENTE");
  const pay = sumExpected(data.ruta_items.filter((item) => item.estado === "PENDIENTE"), "PAGAR_PROVEEDOR");

  return [
    { label: "Rutas", value: String(openRoutes.length), detail: "Abiertas o programadas", color: "var(--blue)", icon: <Route size={17} /> },
    { label: "Retiros", value: String(pendingPickups), detail: "Proveedor pendiente", color: "var(--violet)", icon: <ArrowDownToLine size={17} /> },
    { label: "Entregas", value: String(pendingDeliveries), detail: "Cliente pendiente", color: "var(--green)", icon: <PackageCheck size={17} /> },
    { label: "Dinero", value: `${formatMoney(collect, "USD")} / ${formatMoney(pay, "USD")}`, detail: "Cobrar / pagar esperado", color: "var(--amber)", icon: <CreditCard size={17} /> },
  ];
}

function filterRoutes(data: DeliveryData, maps: ReturnType<typeof buildMaps>, query: string, courierFilter: string, courierOnly: boolean, courierOnlyId: UUID | null) {
  const normalized = query.trim().toLowerCase();
  return data.rutas.filter((route) => {
    if (courierOnly && !courierOnlyId) return false;
    if (courierOnly && route.repartidor_id !== courierOnlyId) return false;
    const courier = maps.couriers.get(route.repartidor_id)?.nombre ?? "";
    const text = [route.id, courier, route.estado, route.observaciones].filter(Boolean).join(" ").toLowerCase();
    return (!normalized || text.includes(normalized)) && (courierFilter === "TODOS" || route.repartidor_id === courierFilter);
  });
}

function createEmptyForm(): RouteForm {
  return {
    repartidor_id: "",
    fecha_programada: "",
    observaciones: "",
    compra_item_ids: [],
    venta_item_ids: [],
  };
}

function hasActiveTask(data: DeliveryData, field: "compra_item_id" | "venta_item_id", id: UUID, type: RutaItemRow["tipo"]) {
  return data.ruta_items.some((item) => item.tipo === type && item[field] === id && !["CANCELADA", "OMITIDA", "RENDIDA"].includes(item.estado));
}

function sumExpected(items: RutaItemRow[], type: RutaItemRow["tipo"]) {
  return items.filter((item) => item.tipo === type && item.moneda !== "ARS").reduce((sum, item) => sum + item.importe_esperado, 0);
}

function taskTitle(item: RutaItemRow) {
  const titles = {
    RETIRAR_PROVEEDOR: "Retirar",
    PAGAR_PROVEEDOR: "Pagar proveedor",
    ENTREGAR_CLIENTE: "Entregar",
    COBRAR_CLIENTE: "Cobrar",
    RENDIR_OFICINA: "Rendir",
  };
  return titles[item.tipo];
}

function taskPrimary(item: RutaItemRow, data: DeliveryData, maps: ReturnType<typeof buildMaps>) {
  if (item.proveedor_id) return maps.providers.get(item.proveedor_id)?.nombre ?? "Proveedor";
  if (item.cliente_id) return maps.clients.get(item.cliente_id)?.nombre ?? "Cliente";
  return item.destino_tipo;
}

function taskSecondary(item: RutaItemRow, data: DeliveryData, maps: ReturnType<typeof buildMaps>) {
  if (item.compra_item_id) return purchaseItemLabel(item.compra_item_id, data, maps);
  if (item.venta_item_id) return saleItemLabel(item.venta_item_id, data, maps);
  return item.direccion ?? "Sin detalle";
}

function purchaseItemLabel(itemId: UUID, data: DeliveryData, maps: ReturnType<typeof buildMaps>) {
  const item = maps.purchaseItems.get(itemId);
  if (!item) return "Compra no disponible";
  const purchase = maps.purchases.get(item.compra_id);
  const product = maps.products.get(item.producto_id)?.nombre ?? "Producto";
  return [`C-${purchase?.numero ?? "-"}`, product, formatMoney(item.costo_original, item.moneda)].join(" - ");
}

function saleItemLabel(itemId: UUID, data: DeliveryData, maps: ReturnType<typeof buildMaps>) {
  const item = maps.saleItems.get(itemId);
  if (!item) return "Venta no disponible";
  const sale = maps.sales.get(item.venta_id);
  const client = sale ? maps.clients.get(sale.cliente_id)?.nombre : null;
  const product = maps.products.get(item.producto_id)?.nombre ?? "Producto";
  return [`#${sale?.numero ?? "-"}`, client, product].filter(Boolean).join(" - ");
}

function saleItemsForCollection(routeItem: RutaItemRow, data: DeliveryData) {
  const deliveryItems = data.ruta_items.filter((item) => item.ruta_id === routeItem.ruta_id && item.cliente_id === routeItem.cliente_id && item.venta_item_id);
  const saleIds = new Set(deliveryItems.map((item) => data.venta_items.find((saleItem) => saleItem.id === item.venta_item_id)?.venta_id).filter(Boolean));
  return data.venta_items.filter((item) => saleIds.has(item.venta_id) && item.saldo_pendiente > 0);
}

function badgeForRoute(route: RutaRow) {
  if (route.estado === "RENDIDA") return "green";
  if (route.estado === "EN_CURSO") return "blue";
  if (route.estado === "ABIERTA_CON_PENDIENTES" || route.estado === "PARCIALMENTE_RENDIDA") return "amber";
  if (route.estado === "CANCELADA") return "red";
  return "violet";
}

function badgeForTask(item: RutaItemRow) {
  if (item.estado === "CONFIRMADA" || item.estado === "RENDIDA") return "green";
  if (item.estado === "ABIERTA") return "amber";
  if (item.estado === "CANCELADA" || item.estado === "OMITIDA") return "red";
  return "blue";
}

function toggleId(values: string[], id: string) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

function formatMoney(value: number, currency: Moneda) {
  if (currency === "ARS") return `$ ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
  return `US$ ${value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
