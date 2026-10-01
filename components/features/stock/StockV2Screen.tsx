"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { ArchiveRestore, BadgeCheck, Boxes, PackageCheck, Plus, RefreshCw, Save, ShieldAlert, Truck, X } from "lucide-react";
import type { StockData, UnidadRow, UnitDestination, UUID } from "@/lib/local-db";
import styles from "./StockV2Screen.module.css";

type StockV2ScreenProps = {
  initialData: StockData;
};

const emptyData: StockData = {
  unidades: [],
  productos: [],
  compras: [],
  compra_items: [],
  proveedores: [],
  ventas: [],
  venta_items: [],
  clientes: [],
  repartidores: [],
  rutas: [],
  ruta_items: [],
  historial_eventos: [],
};

export default function StockV2Screen({ initialData }: StockV2ScreenProps) {
  const [data, setData] = useState<StockData>(initialData ?? emptyData);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("TODOS");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveDestination, setReceiveDestination] = useState<UnitDestination>("OFICINA");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const maps = useMemo(() => buildMaps(data), [data]);
  const metrics = useMemo(() => buildMetrics(data), [data]);
  const filteredUnits = useMemo(() => filterUnits(data, maps, query, stateFilter), [data, maps, query, stateFilter]);
  const selectedUnit = filteredUnits.find((unit) => unit.id === selectedId) ?? filteredUnits[0] ?? null;
  const pendingPurchaseItems = data.compra_items.filter((item) => item.estado !== "CANCELADO" && !item.unidad_id);
  const unitHistory = selectedUnit ? data.historial_eventos.filter((event) => event.entidad_id === selectedUnit.id).slice(0, 5) : [];

  async function refresh() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/stock", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo actualizar.");
      setData(body.data);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  }

  async function patchStock(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const responseBody = await response.json();
      if (!response.ok) throw new Error(responseBody.error ?? "No se pudo guardar stock.");
      setData(responseBody.data);
      return true;
    } catch (stockError) {
      setError(stockError instanceof Error ? stockError.message : "No se pudo guardar stock.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function receiveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await patchStock({
      action: "receive-item",
      values: {
        compra_item_id: String(form.get("compra_item_id") ?? ""),
        destino: receiveDestination,
        repartidor_id: receiveDestination === "REPARTIDOR" ? String(form.get("repartidor_id") ?? "") : null,
        imei: String(form.get("imei") ?? ""),
        serie: String(form.get("serie") ?? ""),
        color: String(form.get("color") ?? ""),
        atributos: attributePayload(String(form.get("identificador") ?? "")),
      },
    });
    if (ok) setReceiveOpen(false);
  }

  async function updateIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUnit) return;
    const form = new FormData(event.currentTarget);
    await patchStock({
      action: "update-identity",
      unitId: selectedUnit.id,
      values: {
        imei: String(form.get("imei") ?? ""),
        serie: String(form.get("serie") ?? ""),
        color: String(form.get("color") ?? ""),
        atributos: attributePayload(String(form.get("identificador") ?? ""), selectedUnit.atributos),
      },
    });
  }

  async function warrantyUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUnit) return;
    const form = new FormData(event.currentTarget);
    await patchStock({
      action: "warranty-unit",
      unitId: selectedUnit.id,
      values: { motivo: String(form.get("motivo") ?? "") },
    });
  }

  return (
    <section className={`view ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <span className="eyebrow">Inventario</span>
          <h1>Stock y unidades</h1>
          <p>Unidades reales, IMEI, ubicacion fisica, entrega, finalizacion y garantia.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} onClick={refresh} disabled={saving} aria-label="Actualizar">
            <RefreshCw size={18} />
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setReceiveOpen(true)} disabled={!pendingPurchaseItems.length}>
            <Plus size={18} />
            Recepcionar
          </button>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Indicadores de stock">
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
              <span className="eyebrow">Unidades</span>
              <h2>Stock trazable</h2>
            </div>
            <div className={styles.filters}>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto, IMEI, cliente o proveedor" />
              <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
                <option value="TODOS">Todos</option>
                {unitStates(data).map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className="table-wrap">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Unidad</th>
                  <th>Producto</th>
                  <th>Ubicacion</th>
                  <th>Origen</th>
                  <th>Venta</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => (
                  <tr key={unit.id} className={selectedUnit?.id === unit.id ? styles.selectedRow : undefined} onClick={() => setSelectedId(unit.id)}>
                    <td><span className="mono">{identityLabel(unit)}</span></td>
                    <td>{maps.products.get(unit.producto_id)?.nombre ?? "Producto no disponible"}</td>
                    <td>{locationLabel(unit, data, maps)}</td>
                    <td>{purchaseLabel(unit.compra_item_id, data, maps)}</td>
                    <td>{saleLabel(unit.venta_item_id, data, maps)}</td>
                    <td><span className={`badge ${badgeForUnit(unit)}`}>{unit.estado}</span></td>
                  </tr>
                ))}
                {!filteredUnits.length && (
                  <tr>
                    <td colSpan={6} className={styles.empty}>Sin unidades cargadas</td>
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
              <h2>{selectedUnit ? identityLabel(selectedUnit) : "Sin unidad seleccionada"}</h2>
            </div>
            {selectedUnit && <span className={`badge ${badgeForUnit(selectedUnit)}`}>{selectedUnit.estado}</span>}
          </div>

          {selectedUnit ? (
            <div className={styles.detailBody}>
              <div className={styles.summaryLine}>
                <span>{maps.products.get(selectedUnit.producto_id)?.nombre ?? "Producto no disponible"}</span>
                <strong>{locationLabel(selectedUnit, data, maps)}</strong>
              </div>

              <div className={styles.infoGrid}>
                <Info label="IMEI" value={selectedUnit.imei ?? "-"} />
                <Info label="Serie" value={selectedUnit.serie ?? "-"} />
                <Info label="Color" value={selectedUnit.color ?? "-"} />
                <Info label="Origen" value={purchaseLabel(selectedUnit.compra_item_id, data, maps)} />
                <Info label="Venta" value={saleLabel(selectedUnit.venta_item_id, data, maps)} />
                <Info label="Finalizada" value={selectedUnit.finalizada_en ? formatDate(selectedUnit.finalizada_en) : "-"} />
              </div>

              <form className={styles.identityForm} key={selectedUnit.id} onSubmit={updateIdentity}>
                <label>
                  <span>IMEI</span>
                  <input name="imei" defaultValue={selectedUnit.imei ?? ""} disabled={selectedUnit.estado === "FINALIZADA"} />
                </label>
                <label>
                  <span>Serie</span>
                  <input name="serie" defaultValue={selectedUnit.serie ?? ""} disabled={selectedUnit.estado === "FINALIZADA"} />
                </label>
                <label>
                  <span>Color</span>
                  <input name="color" defaultValue={selectedUnit.color ?? ""} disabled={selectedUnit.estado === "FINALIZADA"} />
                </label>
                <label>
                  <span>Identificador</span>
                  <input name="identificador" defaultValue={String(selectedUnit.atributos.identificador ?? "")} disabled={selectedUnit.estado === "FINALIZADA"} />
                </label>
                <button type="submit" className={styles.primaryButton} disabled={saving || selectedUnit.estado === "FINALIZADA"}>
                  <Save size={17} />
                  Guardar
                </button>
              </form>

              <div className={styles.actionGrid}>
                <button type="button" className={styles.iconTextButton} onClick={() => void patchStock({ action: "deliver-unit", unitId: selectedUnit.id })} disabled={saving || !canDeliver(selectedUnit)}>
                  <Truck size={16} />
                  Entregar
                </button>
                <button type="button" className={styles.iconTextButton} onClick={() => void patchStock({ action: "finalize-unit", unitId: selectedUnit.id })} disabled={saving || !canFinalize(selectedUnit, data)}>
                  <BadgeCheck size={16} />
                  Finalizar
                </button>
              </div>

              <form className={styles.warrantyForm} onSubmit={warrantyUnit}>
                <input name="motivo" placeholder="Motivo de garantia" disabled={saving || selectedUnit.estado === "GARANTIA" || selectedUnit.estado === "CANCELADA"} />
                <button type="submit" className={styles.iconTextButton} disabled={saving || selectedUnit.estado === "GARANTIA" || selectedUnit.estado === "CANCELADA"}>
                  <ShieldAlert size={16} />
                  Garantia
                </button>
              </form>

              <div className={styles.historyList}>
                {unitHistory.map((event) => (
                  <article key={event.id}>
                    <span>{event.tipo}</span>
                    <strong>{formatDate(event.creado_en)}</strong>
                  </article>
                ))}
                {!unitHistory.length && <p className={styles.empty}>Sin historial para esta unidad.</p>}
              </div>
            </div>
          ) : (
            <p className={styles.empty}>Selecciona una unidad para ver su detalle.</p>
          )}
        </aside>
      </div>

      {receiveOpen && (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={receiveItem}>
            <header className={styles.modalHeader}>
              <div>
                <span className="eyebrow">Recepcion</span>
                <h2>Crear unidad desde compra</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setReceiveOpen(false)} disabled={saving} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <div className={styles.formGrid}>
              <label>
                <span>Item de compra</span>
                <select name="compra_item_id" required>
                  <option value="">Seleccionar</option>
                  {pendingPurchaseItems.map((item) => <option key={item.id} value={item.id}>{purchaseItemLabel(item, data, maps)}</option>)}
                </select>
              </label>

              <label>
                <span>Destino</span>
                <select value={receiveDestination} onChange={(event) => setReceiveDestination(event.target.value as UnitDestination)}>
                  <option value="OFICINA">Oficina</option>
                  <option value="REPARTIDOR">Repartidor</option>
                  <option value="ENTREGA_DIRECTA">Entrega directa</option>
                </select>
              </label>

              {receiveDestination === "REPARTIDOR" && (
                <label>
                  <span>Repartidor</span>
                  <select name="repartidor_id" required>
                    <option value="">Seleccionar</option>
                    {data.repartidores.filter((courier) => courier.activo).map((courier) => <option key={courier.id} value={courier.id}>{courier.nombre}</option>)}
                  </select>
                </label>
              )}

              <label>
                <span>IMEI</span>
                <input name="imei" />
              </label>
              <label>
                <span>Serie</span>
                <input name="serie" />
              </label>
              <label>
                <span>Color</span>
                <input name="color" />
              </label>
              <label>
                <span>Identificador</span>
                <input name="identificador" />
              </label>
            </div>

            <footer className={styles.modalFooter}>
              <span>{receiveDestination === "ENTREGA_DIRECTA" ? "La unidad queda entregada al cliente vinculado." : "La unidad queda trazable con compra, ubicacion y estado fisico."}</span>
              <button type="submit" className={styles.primaryButton} disabled={saving}>
                <ArchiveRestore size={18} />
                Recepcionar
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoItem}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function buildMaps(data: StockData) {
  return {
    products: new Map(data.productos.map((product) => [product.id, product])),
    purchases: new Map(data.compras.map((purchase) => [purchase.id, purchase])),
    purchaseItems: new Map(data.compra_items.map((item) => [item.id, item])),
    providers: new Map(data.proveedores.map((provider) => [provider.id, provider])),
    sales: new Map(data.ventas.map((sale) => [sale.id, sale])),
    saleItems: new Map(data.venta_items.map((item) => [item.id, item])),
    clients: new Map(data.clientes.map((client) => [client.id, client])),
    couriers: new Map(data.repartidores.map((courier) => [courier.id, courier])),
  };
}

function buildMetrics(data: StockData) {
  const available = data.unidades.filter((unit) => unit.estado === "EN_OFICINA_DISPONIBLE").length;
  const reserved = data.unidades.filter((unit) => unit.estado === "EN_OFICINA_RESERVADA").length;
  const missingIdentity = data.unidades.filter((unit) => unit.estado !== "FINALIZADA" && unit.estado !== "CANCELADA" && !hasIdentifier(unit)).length;
  const finalizable = data.unidades.filter((unit) => canFinalize(unit, data)).length;

  return [
    { label: "Disponibles", value: String(available), detail: "En oficina sin venta", color: "var(--green)", icon: <Boxes size={17} /> },
    { label: "Reservadas", value: String(reserved), detail: "Asociadas a venta", color: "var(--blue)", icon: <PackageCheck size={17} /> },
    { label: "Pendiente ID", value: String(missingIdentity), detail: "IMEI, serie o identificador", color: "var(--amber)", icon: <ArchiveRestore size={17} /> },
    { label: "Finalizables", value: String(finalizable), detail: "Entregadas, pagadas e identificadas", color: "var(--violet)", icon: <BadgeCheck size={17} /> },
  ];
}

function filterUnits(data: StockData, maps: ReturnType<typeof buildMaps>, query: string, stateFilter: string) {
  const normalized = query.trim().toLowerCase();
  return data.unidades.filter((unit) => {
    const product = maps.products.get(unit.producto_id)?.nombre ?? "";
    const purchase = purchaseLabel(unit.compra_item_id, data, maps);
    const sale = saleLabel(unit.venta_item_id, data, maps);
    const text = [product, purchase, sale, unit.imei, unit.serie, unit.color, unit.estado, locationLabel(unit, data, maps)].filter(Boolean).join(" ").toLowerCase();
    return (!normalized || text.includes(normalized)) && (stateFilter === "TODOS" || unit.estado === stateFilter);
  });
}

function unitStates(data: StockData) {
  return [...new Set(data.unidades.map((unit) => unit.estado))].sort((a, b) => a.localeCompare(b, "es"));
}

function purchaseItemLabel(item: StockData["compra_items"][number], data: StockData, maps: ReturnType<typeof buildMaps>) {
  const product = maps.products.get(item.producto_id)?.nombre ?? "Producto no disponible";
  const purchase = maps.purchases.get(item.compra_id);
  const provider = purchase ? maps.providers.get(purchase.proveedor_id)?.nombre : null;
  const sale = item.venta_item_id ? saleLabel(item.venta_item_id, data, maps) : "Stock oficina";
  return [`C-${purchase?.numero ?? "-"}`, provider, product, sale].filter(Boolean).join(" - ");
}

function purchaseLabel(itemId: UUID | null, data: StockData, maps: ReturnType<typeof buildMaps>) {
  const item = itemId ? maps.purchaseItems.get(itemId) : null;
  if (!item) return "Sin compra";
  const purchase = maps.purchases.get(item.compra_id);
  const provider = purchase ? maps.providers.get(purchase.proveedor_id)?.nombre : null;
  return [`C-${purchase?.numero ?? "-"}`, provider].filter(Boolean).join(" - ");
}

function saleLabel(itemId: UUID | null, data: StockData, maps: ReturnType<typeof buildMaps>) {
  const item = itemId ? maps.saleItems.get(itemId) : null;
  if (!item) return "Sin venta";
  const sale = maps.sales.get(item.venta_id);
  const client = sale ? maps.clients.get(sale.cliente_id)?.nombre : null;
  return [`#${sale?.numero ?? "-"}`, client].filter(Boolean).join(" - ");
}

function locationLabel(unit: UnidadRow, data: StockData, maps: ReturnType<typeof buildMaps>) {
  if (unit.ubicacion_tipo === "CLIENTE" && unit.ubicacion_cliente_id) return maps.clients.get(unit.ubicacion_cliente_id)?.nombre ?? "Cliente";
  if (unit.ubicacion_tipo === "REPARTIDOR" && unit.ubicacion_usuario_id) return maps.couriers.get(unit.ubicacion_usuario_id)?.nombre ?? "Repartidor";
  if (unit.ubicacion_tipo === "PROVEEDOR" && unit.ubicacion_proveedor_id) return maps.providers.get(unit.ubicacion_proveedor_id)?.nombre ?? "Proveedor";
  return unit.ubicacion_tipo;
}

function identityLabel(unit: UnidadRow) {
  return unit.imei || unit.serie || String(unit.atributos.identificador ?? "") || unit.id.slice(0, 8);
}

function badgeForUnit(unit: UnidadRow) {
  if (unit.estado === "FINALIZADA" || unit.estado === "EN_OFICINA_DISPONIBLE") return "green";
  if (unit.estado === "ENTREGADA" || unit.estado === "EN_OFICINA_RESERVADA") return "blue";
  if (unit.estado === "EN_PODER_REPARTIDOR" || unit.estado === "ESPERADA_PROVEEDOR") return "violet";
  if (unit.estado === "GARANTIA") return "amber";
  if (unit.estado === "CANCELADA") return "red";
  return "muted-badge";
}

function canDeliver(unit: UnidadRow) {
  return Boolean(unit.venta_item_id && !["ENTREGADA", "FINALIZADA", "GARANTIA", "CANCELADA"].includes(unit.estado));
}

function canFinalize(unit: UnidadRow, data: StockData) {
  const saleItem = unit.venta_item_id ? data.venta_items.find((item) => item.id === unit.venta_item_id) : null;
  return Boolean(unit.estado === "ENTREGADA" && hasIdentifier(unit) && saleItem && saleItem.saldo_pendiente === 0);
}

function hasIdentifier(unit: UnidadRow) {
  return Boolean(unit.imei || unit.serie || Object.values(unit.atributos).some((value) => typeof value === "string" && value.trim().length > 0));
}

function attributePayload(identifier: string, current: Record<string, unknown> = {}) {
  const value = identifier.trim();
  return value ? { ...current, identificador: value } : current;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(value));
}
