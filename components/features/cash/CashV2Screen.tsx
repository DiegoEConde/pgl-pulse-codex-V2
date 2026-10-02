"use client";

import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, CreditCard, HandCoins, Plus, RefreshCw, Save, Scale, Wallet, X } from "lucide-react";
import type {
  CashData,
  MedioPago,
  Moneda,
  MovimientoDineroRow,
  UUID,
} from "@/lib/local-db";
import styles from "./CashV2Screen.module.css";

type CashV2ScreenProps = {
  initialData: CashData;
};

type CashAction = "sale-payment" | "supplier-payment" | "courier-advance" | "route-rendition" | "adjustment" | "close-cash";

const emptyData: CashData = {
  movimientos_dinero: [],
  ventas: [],
  venta_items: [],
  clientes: [],
  compras: [],
  compra_items: [],
  proveedores: [],
  rutas: [],
  ruta_items: [],
  usuarios: [],
  repartidores: [],
  productos: [],
  saldos: { USD: 0, ARS: 0 },
  deudas_clientes: [],
  deudas_proveedores: [],
  rendiciones: [],
  ultimo_cierre: null,
};

export default function CashV2Screen({ initialData }: CashV2ScreenProps) {
  const [data, setData] = useState<CashData>(initialData ?? emptyData);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("TODOS");
  const [action, setAction] = useState<CashAction | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string>("");
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>("");
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const maps = useMemo(() => buildMaps(data), [data]);
  const metrics = useMemo(() => buildMetrics(data), [data]);
  const filteredMovements = useMemo(() => filterMovements(data, maps, query, typeFilter), [data, maps, query, typeFilter]);
  const selectedSale = data.deudas_clientes.find((sale) => sale.venta_id === selectedSaleId) ?? data.deudas_clientes[0] ?? null;
  const selectedPurchase = data.deudas_proveedores.find((purchase) => purchase.compra_id === selectedPurchaseId) ?? data.deudas_proveedores[0] ?? null;
  const selectedRoute = data.rendiciones.find((route) => route.ruta_id === selectedRouteId) ?? data.rendiciones[0] ?? null;

  async function refresh() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/cash", { cache: "no-store" });
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
      const response = await fetch("/api/local-db/cash", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const responseBody = await response.json();
      if (!response.ok) throw new Error(responseBody.error ?? "No se pudo guardar el movimiento.");
      setData(responseBody.data);
      setAction(null);
      return true;
    } catch (cashError) {
      setError(cashError instanceof Error ? cashError.message : "No se pudo guardar el movimiento.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function openAction(nextAction: CashAction, id = "") {
    setAction(nextAction);
    if (nextAction === "sale-payment") setSelectedSaleId(id || data.deudas_clientes[0]?.venta_id || "");
    if (nextAction === "supplier-payment") setSelectedPurchaseId(id || data.deudas_proveedores[0]?.compra_id || "");
    if (nextAction === "courier-advance" || nextAction === "route-rendition") setSelectedRouteId(id || data.rendiciones[0]?.ruta_id || "");
  }

  async function submitSalePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSale) return;
    const form = new FormData(event.currentTarget);
    await sendPatch({
      action: "sale-payment",
      saleId: selectedSale.venta_id,
      values: {
        importe: Number(form.get("importe") ?? 0),
        moneda: String(form.get("moneda") ?? selectedSale.moneda),
        medio_pago: String(form.get("medio_pago") ?? defaultPaymentMethod(selectedSale.moneda)),
        venta_item_id: String(form.get("venta_item_id") ?? "") || null,
        observaciones: String(form.get("observaciones") ?? ""),
      },
    });
  }

  async function submitSupplierPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPurchase) return;
    const form = new FormData(event.currentTarget);
    await sendPatch({
      action: "supplier-payment",
      values: {
        compra_id: selectedPurchase.compra_id,
        compra_item_id: String(form.get("compra_item_id") ?? "") || null,
        importe: Number(form.get("importe") ?? 0),
        moneda: selectedPurchase.moneda,
        medio_pago: String(form.get("medio_pago") ?? defaultPaymentMethod(selectedPurchase.moneda)),
        observaciones: String(form.get("observaciones") ?? ""),
      },
    });
  }

  async function submitCourierAdvance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoute) return;
    const form = new FormData(event.currentTarget);
    const currency = String(form.get("moneda") ?? "USD") as Moneda;
    await sendPatch({
      action: "courier-advance",
      values: {
        ruta_id: selectedRoute.ruta_id,
        importe: Number(form.get("importe") ?? 0),
        moneda: currency,
        medio_pago: String(form.get("medio_pago") ?? defaultPaymentMethod(currency)),
        observaciones: String(form.get("observaciones") ?? ""),
      },
    });
  }

  async function submitRouteRendition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoute) return;
    const form = new FormData(event.currentTarget);
    await sendPatch({
      action: "route-rendition",
      values: {
        ruta_id: selectedRoute.ruta_id,
        devoluciones: [
          { importe: Number(form.get("usd") ?? 0), moneda: "USD", medio_pago: "EFECTIVO_USD" },
          { importe: Number(form.get("ars") ?? 0), moneda: "ARS", medio_pago: "EFECTIVO_ARS" },
        ],
        observaciones: String(form.get("observaciones") ?? ""),
      },
    });
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currency = String(form.get("moneda") ?? "USD") as Moneda;
    await sendPatch({
      action: "adjustment",
      values: {
        importe: Number(form.get("importe") ?? 0),
        moneda: currency,
        medio_pago: String(form.get("medio_pago") ?? defaultPaymentMethod(currency)),
        signo: String(form.get("signo") ?? "INGRESO"),
        observaciones: String(form.get("observaciones") ?? ""),
      },
    });
  }

  async function submitCloseCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await sendPatch({
      action: "close-cash",
      values: {
        fecha_desde: String(form.get("fecha_desde") ?? "") || null,
        fecha_hasta: String(form.get("fecha_hasta") ?? "") || null,
        observaciones: String(form.get("observaciones") ?? ""),
      },
    });
  }

  return (
    <section className={`view ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <span className="eyebrow">Finanzas</span>
          <h1>Caja</h1>
          <p>Cobros, pagos, entregas a repartidores, rendiciones, diferencias, ajustes y cierres desde un unico libro de movimientos.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} onClick={refresh} disabled={saving} aria-label="Actualizar">
            <RefreshCw size={18} />
          </button>
          <button type="button" className={styles.iconTextButton} onClick={() => openAction("adjustment")} disabled={saving}>
            <Plus size={17} />
            Ajuste
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => openAction("close-cash")} disabled={saving}>
            <CheckCircle2 size={18} />
            Cerrar caja
          </button>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Indicadores de caja">
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
              <span className="eyebrow">Libro real</span>
              <h2>Movimientos de caja</h2>
            </div>
            <div className={styles.filters}>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="TODOS">Todos</option>
                <option value="COBRO_CLIENTE">Cobros</option>
                <option value="PAGO_PROVEEDOR">Pagos</option>
                <option value="ENTREGA_REPARTIDOR">Entregas</option>
                <option value="RENDICION_REPARTIDOR">Rendiciones</option>
                <option value="DIFERENCIA_RENDICION">Diferencias</option>
                <option value="CIERRE_CAJA">Cierres</option>
              </select>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar movimiento, referencia o cierre" />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className="table-wrap">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Referencia</th>
                  <th>Importe</th>
                  <th>Medio</th>
                  <th>Cierre</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{formatDate(movement.fecha)}</td>
                    <td><span className={`badge ${badgeForMovement(movement)}`}>{movement.tipo}</span></td>
                    <td>{movementSubject(movement, data, maps)}</td>
                    <td><strong className={styles[movement.signo === "EGRESO" ? "out" : movement.signo === "INGRESO" ? "in" : "flat"]}>{formatSignedMoney(movement)}</strong></td>
                    <td>{movement.medio_pago}</td>
                    <td>{movement.cierre_codigo ?? "Abierto"}</td>
                  </tr>
                ))}
                {!filteredMovements.length && (
                  <tr>
                    <td colSpan={6} className={styles.empty}>Sin movimientos cargados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className={`${styles.panel} ${styles.side}`}>
          <SectionHead title="Cobros pendientes" meta={String(data.deudas_clientes.length)} />
          <div className={styles.stack}>
            {data.deudas_clientes.slice(0, 4).map((debt) => (
              <DebtCard key={debt.venta_id} title={`Venta #${debt.numero}`} detail={maps.clients.get(debt.cliente_id)?.nombre ?? "Cliente"} amount={formatMoney(debt.saldo_pendiente, debt.moneda)} onClick={() => openAction("sale-payment", debt.venta_id)} action="Cobrar" />
            ))}
            {!data.deudas_clientes.length && <p className={styles.emptyMini}>Sin deudas de clientes</p>}
          </div>

          <SectionHead title="Pagos a proveedores" meta={String(data.deudas_proveedores.length)} />
          <div className={styles.stack}>
            {data.deudas_proveedores.slice(0, 4).map((debt) => (
              <DebtCard key={debt.compra_id} title={`Compra C-${debt.numero}`} detail={maps.providers.get(debt.proveedor_id)?.nombre ?? "Proveedor"} amount={formatMoney(debt.saldo_pendiente, debt.moneda)} onClick={() => openAction("supplier-payment", debt.compra_id)} action="Pagar" />
            ))}
            {!data.deudas_proveedores.length && <p className={styles.emptyMini}>Sin deudas con proveedores</p>}
          </div>

          <SectionHead title="Rendiciones" meta={String(data.rendiciones.length)} />
          <div className={styles.stack}>
            {data.rendiciones.slice(0, 5).map((route) => (
              <article className={styles.routeCard} key={route.ruta_id}>
                <div>
                  <span className={`badge ${route.diferencia.USD || route.diferencia.ARS ? "amber" : "blue"}`}>Ruta {route.ruta_id.slice(0, 8)}</span>
                  <strong>{maps.couriers.get(route.repartidor_id)?.nombre ?? "Repartidor"}</strong>
                  <small>Esperado {formatTotals(route.esperado)} / devuelto {formatTotals(route.devuelto)}</small>
                </div>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.iconTextButton} onClick={() => openAction("courier-advance", route.ruta_id)} disabled={saving || route.estado === "RENDIDA"}>
                    Entregar
                  </button>
                  <button type="button" className={styles.iconTextButton} onClick={() => openAction("route-rendition", route.ruta_id)} disabled={saving || route.estado === "RENDIDA"}>
                    Rendir
                  </button>
                </div>
              </article>
            ))}
            {!data.rendiciones.length && <p className={styles.emptyMini}>Sin rutas para rendir</p>}
          </div>
        </aside>
      </div>

      {action === "sale-payment" && selectedSale && (
        <CashModal title="Cobro a cliente" onClose={() => setAction(null)}>
          <form onSubmit={submitSalePayment} className={styles.formGrid}>
            <label><span>Venta</span><select value={selectedSaleId} onChange={(event) => setSelectedSaleId(event.target.value)}>{data.deudas_clientes.map((debt) => <option key={debt.venta_id} value={debt.venta_id}>#{debt.numero} - {maps.clients.get(debt.cliente_id)?.nombre}</option>)}</select></label>
            <label><span>Importe</span><input name="importe" type="number" min="0.01" step="0.01" defaultValue={selectedSale.saldo_pendiente} required /></label>
            <label><span>Moneda</span><select name="moneda" defaultValue={selectedSale.moneda}><option value="USD">USD</option><option value="ARS">ARS</option></select></label>
            <label><span>Medio</span><select name="medio_pago" defaultValue={defaultPaymentMethod(selectedSale.moneda)}>{paymentMethodsFor(selectedSale.moneda).map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
            <label><span>Aplica a</span><select name="venta_item_id" defaultValue=""><option value="">Venta completa</option>{selectedSale.item_debts.map((item) => <option key={item.venta_item_id} value={item.venta_item_id}>{productName(item.producto_id, maps)} - {formatMoney(item.saldo_pendiente, selectedSale.moneda)}</option>)}</select></label>
            <label><span>Observaciones</span><input name="observaciones" /></label>
            <ModalFooter saving={saving} />
          </form>
        </CashModal>
      )}

      {action === "supplier-payment" && selectedPurchase && (
        <CashModal title="Pago a proveedor" onClose={() => setAction(null)}>
          <form onSubmit={submitSupplierPayment} className={styles.formGrid}>
            <label><span>Compra</span><select value={selectedPurchaseId} onChange={(event) => setSelectedPurchaseId(event.target.value)}>{data.deudas_proveedores.map((debt) => <option key={debt.compra_id} value={debt.compra_id}>C-{debt.numero} - {maps.providers.get(debt.proveedor_id)?.nombre}</option>)}</select></label>
            <label><span>Importe</span><input name="importe" type="number" min="0.01" step="0.01" defaultValue={selectedPurchase.saldo_pendiente} required /></label>
            <label><span>Medio</span><select name="medio_pago" defaultValue={defaultPaymentMethod(selectedPurchase.moneda)}>{paymentMethodsFor(selectedPurchase.moneda).map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
            <label><span>Aplica a</span><select name="compra_item_id" defaultValue=""><option value="">Compra completa</option>{selectedPurchase.item_debts.map((item) => <option key={item.compra_item_id} value={item.compra_item_id}>{productName(item.producto_id, maps)} - {formatMoney(item.saldo_pendiente, selectedPurchase.moneda)}</option>)}</select></label>
            <label><span>Observaciones</span><input name="observaciones" /></label>
            <ModalFooter saving={saving} />
          </form>
        </CashModal>
      )}

      {action === "courier-advance" && selectedRoute && (
        <CashModal title="Entrega a repartidor" onClose={() => setAction(null)}>
          <form onSubmit={submitCourierAdvance} className={styles.formGrid}>
            <RouteSelect data={data} maps={maps} value={selectedRouteId} onChange={setSelectedRouteId} />
            <label><span>Importe</span><input name="importe" type="number" min="0.01" step="0.01" required /></label>
            <label><span>Moneda</span><select name="moneda" defaultValue="USD"><option value="USD">USD</option><option value="ARS">ARS</option></select></label>
            <label><span>Medio</span><select name="medio_pago" defaultValue="EFECTIVO_USD"><option value="EFECTIVO_USD">EFECTIVO_USD</option><option value="EFECTIVO_ARS">EFECTIVO_ARS</option></select></label>
            <label><span>Observaciones</span><input name="observaciones" /></label>
            <ModalFooter saving={saving} />
          </form>
        </CashModal>
      )}

      {action === "route-rendition" && selectedRoute && (
        <CashModal title="Rendicion de ruta" onClose={() => setAction(null)}>
          <form onSubmit={submitRouteRendition} className={styles.formGrid}>
            <RouteSelect data={data} maps={maps} value={selectedRouteId} onChange={setSelectedRouteId} />
            <label><span>Devuelve USD</span><input name="usd" type="number" min="0" step="0.01" defaultValue={Math.max(0, selectedRoute.esperado.USD)} /></label>
            <label><span>Devuelve ARS</span><input name="ars" type="number" min="0" step="0.01" defaultValue={Math.max(0, selectedRoute.esperado.ARS)} /></label>
            <label><span>Esperado</span><input value={formatTotals(selectedRoute.esperado)} readOnly /></label>
            <label><span>Observaciones</span><input name="observaciones" /></label>
            <ModalFooter saving={saving} />
          </form>
        </CashModal>
      )}

      {action === "adjustment" && (
        <CashModal title="Ajuste de caja" onClose={() => setAction(null)}>
          <form onSubmit={submitAdjustment} className={styles.formGrid}>
            <label><span>Signo</span><select name="signo" defaultValue="INGRESO"><option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso</option><option value="NEUTRO">Neutro</option></select></label>
            <label><span>Importe</span><input name="importe" type="number" min="0" step="0.01" required /></label>
            <label><span>Moneda</span><select name="moneda" defaultValue="USD"><option value="USD">USD</option><option value="ARS">ARS</option></select></label>
            <label><span>Medio</span><select name="medio_pago" defaultValue="EFECTIVO_USD"><option value="EFECTIVO_USD">EFECTIVO_USD</option><option value="EFECTIVO_ARS">EFECTIVO_ARS</option><option value="TRANSFERENCIA_ARS">TRANSFERENCIA_ARS</option></select></label>
            <label><span>Observaciones</span><input name="observaciones" /></label>
            <ModalFooter saving={saving} />
          </form>
        </CashModal>
      )}

      {action === "close-cash" && (
        <CashModal title="Cierre de caja" onClose={() => setAction(null)}>
          <form onSubmit={submitCloseCash} className={styles.formGrid}>
            <label><span>Desde</span><input name="fecha_desde" type="datetime-local" /></label>
            <label><span>Hasta</span><input name="fecha_hasta" type="datetime-local" /></label>
            <label><span>Saldo actual</span><input value={formatTotals(data.saldos)} readOnly /></label>
            <label><span>Observaciones</span><input name="observaciones" /></label>
            <ModalFooter saving={saving} />
          </form>
        </CashModal>
      )}
    </section>
  );
}

function SectionHead({ title, meta }: { title: string; meta: string }) {
  return (
    <header className={styles.sectionHead}>
      <h3>{title}</h3>
      <span className="badge blue">{meta}</span>
    </header>
  );
}

function DebtCard({ title, detail, amount, action, onClick }: { title: string; detail: string; amount: string; action: string; onClick: () => void }) {
  return (
    <article className={styles.debtCard}>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <b>{amount}</b>
      <button type="button" className={styles.iconTextButton} onClick={onClick}>{action}</button>
    </article>
  );
}

function CashModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className={styles.overlay}>
      <section className={styles.modal}>
        <header className={styles.modalHeader}>
          <div>
            <span className="eyebrow">Caja</span>
            <h2>{title}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function ModalFooter({ saving }: { saving: boolean }) {
  return (
    <footer className={styles.modalFooter}>
      <span>El movimiento queda en el libro real de caja.</span>
      <button type="submit" className={styles.primaryButton} disabled={saving}>
        <Save size={18} />
        Guardar
      </button>
    </footer>
  );
}

function RouteSelect({ data, maps, value, onChange }: { data: CashData; maps: ReturnType<typeof buildMaps>; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span>Ruta</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {data.rendiciones.map((route) => <option key={route.ruta_id} value={route.ruta_id}>Ruta {route.ruta_id.slice(0, 8)} - {maps.couriers.get(route.repartidor_id)?.nombre}</option>)}
      </select>
    </label>
  );
}

function buildMaps(data: CashData) {
  return {
    clients: new Map(data.clientes.map((client) => [client.id, client])),
    providers: new Map(data.proveedores.map((provider) => [provider.id, provider])),
    products: new Map(data.productos.map((product) => [product.id, product])),
    sales: new Map(data.ventas.map((sale) => [sale.id, sale])),
    purchases: new Map(data.compras.map((purchase) => [purchase.id, purchase])),
    couriers: new Map(data.repartidores.map((courier) => [courier.id, courier])),
  };
}

function buildMetrics(data: CashData) {
  const customerDebt = totalsByCurrency(data.deudas_clientes, (debt) => debt.saldo_pendiente, (debt) => debt.moneda);
  const supplierDebt = totalsByCurrency(data.deudas_proveedores, (debt) => debt.saldo_pendiente, (debt) => debt.moneda);
  const differences = data.movimientos_dinero.filter((movement) => movement.tipo === "DIFERENCIA_RENDICION" && movement.estado !== "ANULADO").length;
  return [
    { label: "Caja USD", value: formatMoney(data.saldos.USD, "USD"), detail: "Saldo por movimientos", color: "var(--green)", icon: <Wallet size={17} /> },
    { label: "Caja ARS", value: formatMoney(data.saldos.ARS, "ARS"), detail: "Saldo por movimientos", color: "var(--cyan)", icon: <CreditCard size={17} /> },
    { label: "Clientes", value: formatTotals(customerDebt), detail: "Deuda pendiente", color: "var(--amber)", icon: <HandCoins size={17} /> },
    { label: "Proveedores", value: formatTotals(supplierDebt), detail: `${differences} diferencias`, color: "var(--red)", icon: <Scale size={17} /> },
  ];
}

function filterMovements(data: CashData, maps: ReturnType<typeof buildMaps>, query: string, type: string) {
  const normalized = query.trim().toLowerCase();
  return data.movimientos_dinero.filter((movement) => {
    const subject = movementSubject(movement, data, maps);
    const text = [movement.tipo, movement.medio_pago, movement.cierre_codigo, movement.observaciones, subject].filter(Boolean).join(" ").toLowerCase();
    return (type === "TODOS" || movement.tipo === type) && (!normalized || text.includes(normalized));
  });
}

function movementSubject(movement: MovimientoDineroRow, data: CashData, maps: ReturnType<typeof buildMaps>) {
  if (movement.venta_id) {
    const sale = maps.sales.get(movement.venta_id);
    const client = sale ? maps.clients.get(sale.cliente_id)?.nombre : null;
    return [`Venta #${sale?.numero ?? "-"}`, client].filter(Boolean).join(" - ");
  }
  if (movement.compra_id) {
    const purchase = maps.purchases.get(movement.compra_id);
    const provider = purchase ? maps.providers.get(purchase.proveedor_id)?.nombre : null;
    return [`Compra C-${purchase?.numero ?? "-"}`, provider].filter(Boolean).join(" - ");
  }
  if (movement.ruta_id) {
    const route = data.rutas.find((item) => item.id === movement.ruta_id);
    return `Ruta ${movement.ruta_id.slice(0, 8)} - ${maps.couriers.get(route?.repartidor_id ?? "")?.nombre ?? "Repartidor"}`;
  }
  return movement.observaciones ?? "Caja general";
}

function badgeForMovement(movement: MovimientoDineroRow) {
  if (movement.tipo === "COBRO_CLIENTE" || movement.tipo === "RENDICION_REPARTIDOR") return "green";
  if (movement.tipo === "PAGO_PROVEEDOR" || movement.tipo === "ENTREGA_REPARTIDOR") return "red";
  if (movement.tipo === "DIFERENCIA_RENDICION") return "amber";
  if (movement.tipo === "CIERRE_CAJA") return "violet";
  return "blue";
}

function paymentMethodsFor(currency: Moneda): MedioPago[] {
  if (currency === "USD") return ["EFECTIVO_USD"];
  return ["EFECTIVO_ARS", "TRANSFERENCIA_ARS", "CREDITO", "DEBITO"];
}

function defaultPaymentMethod(currency: Moneda): MedioPago {
  return currency === "USD" ? "EFECTIVO_USD" : "EFECTIVO_ARS";
}

function productName(productId: UUID, maps: ReturnType<typeof buildMaps>) {
  return maps.products.get(productId)?.nombre ?? "Producto";
}

function totalsByCurrency<Row>(rows: Row[], valueOf: (row: Row) => number, currencyOf: (row: Row) => Moneda) {
  return rows.reduce((totals, row) => {
    totals[currencyOf(row)] += valueOf(row);
    return totals;
  }, { USD: 0, ARS: 0 });
}

function formatSignedMoney(movement: MovimientoDineroRow) {
  if (movement.signo === "NEUTRO") return formatMoney(movement.importe, movement.moneda);
  const prefix = movement.signo === "INGRESO" ? "+" : "-";
  return `${prefix} ${formatMoney(movement.importe, movement.moneda)}`;
}

function formatTotals(totals: Record<Moneda, number>) {
  const parts = [
    totals.USD ? formatMoney(totals.USD, "USD") : "",
    totals.ARS ? formatMoney(totals.ARS, "ARS") : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" / ") : formatMoney(0, "USD");
}

function formatMoney(value: number, currency: Moneda) {
  if (currency === "ARS") return `$ ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
  return `US$ ${value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
