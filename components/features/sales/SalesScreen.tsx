"use client";
import { useRef, useState, type FormEvent } from "react";
import { Eye, Plus, Search, X } from "lucide-react";
import WorkspaceTabs from "@/components/ui/WorkspaceTabs";
import PagedTable from "@/components/ui/PagedTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useProgram } from "@/contexts/ProgramContext";
import { useOperation } from "@/hooks/useOperation";
import { runOperation } from "@/lib/supabase/operations";
import { formatUsd } from "@/lib/formatters";
import { formatDate, previousDate } from "@/lib/dates";
import { categoryLabel } from "@/lib/product-catalog";
import type { Sale } from "@/types/operations";
import layout from "@/components/ui/OperationalLayout.module.css";
import styles from "./SalesScreen.module.css";

type SalePayload = {
  p_unit: number;
  p_client: number;
  p_seller: number;
  p_date: string;
  p_price: number;
  p_commission: number;
  p_amount: number;
  p_delivered: boolean;
  p_request: string;
};

export default function SalesScreen() {
  const { raw, sales, stock, today } = useProgram();
  const { busy, error, setError, run } = useOperation();
  const available = stock.filter(unit => unit.state === "STOCK");
  const [search, setSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const detail = sales.find(sale => sale.id === detailId);
  const [creating, setCreating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saleCategory, setSaleCategory] = useState("");
  const [unitId, setUnitId] = useState("");
  const selected = available.find(unit => String(unit.databaseId) === unitId);
  const [belowCostSale, setBelowCostSale] = useState<{ payload: SalePayload; price: number; cost: number } | null>(null);
  const availableCategories = [...new Set(available.map(unit => unit.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  const unitsForCategory = available.filter(unit => unit.category === saleCategory);
  const unitSpecs = (unit: typeof available[number]) => [unit.variant, unit.ram, unit.color].filter(Boolean).join(" · ");
  // La RPC reutiliza este UUID en reintentos y bloquea la unidad para evitar ventas dobles.
  const requestId = useRef("");
  const paymentRequest = useRef("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const paymentsReady = Array.isArray(raw.salePayments);
  const missingSaleRequirements = [!available.length && "una unidad en stock", !raw.clients.length && "un cliente", !raw.sellers.length && "un vendedor"].filter(Boolean);
  function openDetail(id: number) {
    setDetailId(id); setPaymentAmount(""); paymentRequest.current = crypto.randomUUID(); setDirty(false); setError("");
  }
  function addPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !paymentsReady) return;
    const form = new FormData(event.currentTarget);
    void run(() => runOperation("pgl_add_sale_payment", { p_id: detail.id, p_amount: Number(paymentAmount), p_request: paymentRequest.current, p_delivered: form.get("delivered") === "on" }), () => {
      setPaymentAmount(""); setDirty(false); paymentRequest.current = crypto.randomUUID();
    });
  }
  const matches = (sale: Sale) => `${sale.id} ${sale.product} ${sale.client} ${sale.seller}`.toLowerCase().includes(search.toLowerCase());
  const salesToday = sales.filter(sale => sale.date === today && matches(sale));
  const history = sales.filter(sale => sale.date !== today && (!historyDate || sale.date === historyDate) && matches(sale));
  function close() {
    if (busy) return;
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Querés descartarlos?")) return;
    setCreating(false); setDetailId(null); setDirty(false); setError(""); setBelowCostSale(null);
  }
  function submitSale(payload: SalePayload) {
    void run(() => runOperation("pgl_create_sale_partial", payload), id => { setCreating(false); setDirty(false); setBelowCostSale(null); openDetail(Number(id)); });
  }
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentsReady) return;
    if (!selected) { setError("La unidad seleccionada ya no está disponible."); return; }
    const form = new FormData(event.currentTarget);
    const price = Number(form.get("price"));
    const sellerId = Number(form.get("seller"));
    const seller = raw.sellers.find(item => item.id === sellerId);
    if (!seller) { setError("Seleccioná un vendedor."); return; }
    const payload = { p_unit: selected.databaseId, p_client: Number(form.get("client")), p_seller: sellerId,
      p_date: String(form.get("date")), p_price: price, p_commission: Math.round(price * seller.porcentaje_comision) / 100,
      p_amount: Number(form.get("amount")), p_delivered: form.get("delivered") === "on", p_request: requestId.current };
    if (price < selected.costUsd) { setBelowCostSale({ payload, price, cost: selected.costUsd }); return; }
    submitSale(payload);
  }
  function table(source: Sale[]) {
    return source.length ? <PagedTable><thead><tr><th>Venta</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th>Total</th><th>Pago</th><th></th></tr></thead><tbody>{source.map(sale => <tr key={sale.id} onClick={() => { openDetail(sale.id); }}><td className="mono">#{sale.id}</td><td>{sale.client}</td><td>{formatDate(sale.date)}</td><td><span className={`badge ${sale.status === "ENTREGADA" ? "green" : "violet"}`}>{sale.status === "ENTREGADA" ? "Entregada" : "En reparto"}</span></td><td>{formatUsd(sale.priceUsd)}</td><td>{formatUsd(sale.paidUsd)} abonado · {formatUsd(sale.pendingUsd)} pendiente</td><td><button className={styles.rowAction} aria-label={`Ver venta ${sale.id}`}><Eye size={14} /> Ver</button></td></tr>)}</tbody></PagedTable> : <div className={styles.empty}>No hay ventas que coincidan con esta búsqueda.</div>;
  }
  return <div className={`view ${layout.page}`}>
    <PageHeader title="Ventas" action={<button className={`primary-btn ${layout.headAction}`} disabled={!paymentsReady || !available.length || !raw.clients.length || !raw.sellers.length} onClick={() => { setSaleCategory(""); setUnitId(""); setBelowCostSale(null); requestId.current = crypto.randomUUID(); setCreating(true); setDirty(false); setError(""); }}><Plus size={16} /> Nueva venta</button>} />
    {!paymentsReady && <p role="status">El registro de cobros todavía no está habilitado. Podés consultar las ventas existentes.</p>}
    {paymentsReady && missingSaleRequirements.length > 0 && <p role="status">Para crear una venta necesitás cargar: {missingSaleRequirements.join(", ")}. Los clientes y vendedores se cargan en Datos.</p>}
    <div className={layout.toolbar}><label className={layout.searchWrap}><Search size={15} /><input className="search" aria-label="Buscar ventas" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar venta, cliente o producto…" /></label>{historyOpen && <label className={layout.dateFilter}><span>Fecha del historial</span><input type="date" value={historyDate} max={previousDate(today)} onChange={e => setHistoryDate(e.target.value)} /></label>}</div>
    <WorkspaceTabs labels={["Ventas de hoy", "Historial"]} onChange={index => setHistoryOpen(index === 1)}>
    <section className="panel"><header className="panel-head"><div><span className="eyebrow">{formatDate(today)}</span><h2>Ventas de hoy</h2></div><span className="badge blue">{salesToday.length} ventas</span></header><div className="table-wrap">{table(salesToday)}</div></section>
    <section className="panel"><header className="panel-head"><h2>Historial</h2><span className="badge muted-badge">{history.length} resultados</span></header><div className="table-wrap">{table(history)}</div></section>
    </WorkspaceTabs>
    {detail && !creating && <div className={styles.modalOverlay}><section className={styles.modal} role="dialog" aria-modal="true" aria-label={`Venta ${detail.id}`}><header className={styles.modalHeader}><h2>Venta #{detail.id}</h2><button className={styles.close} aria-label="Cerrar venta" disabled={busy} onClick={close}><X size={20} /></button></header>
      <div className={styles.detailGrid}>{[["Cliente",detail.client],["Vendedor",detail.seller],["Fecha de venta",formatDate(detail.date)],["Producto",detail.product],["Total",formatUsd(detail.priceUsd)],["Costo con envío",formatUsd(detail.costUsd)],["Comisión",formatUsd(detail.commissionUsd)],["Ganancia",formatUsd(detail.priceUsd-detail.costUsd-detail.commissionUsd)],["Estado",detail.status],["Abonado",formatUsd(detail.paidUsd)],["Pendiente",formatUsd(detail.pendingUsd)],["Entrega",formatDate(detail.deliveredAt)]].map(([label,value]) => <div className={styles.detailItem} key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
      <div className={styles.detailBody}>
        <h3>Historial de abonos</h3>
        {detail.openingPaidUsd > 0 && <p>Saldo inicial registrado: {formatUsd(detail.openingPaidUsd)}. Sin fecha ni desglose de abonos anteriores.</p>}
        {detail.payments.length ? <ul>{detail.payments.map(payment => <li key={payment.id}>{formatDate(payment.registrado_en)} · {formatUsd(payment.importe_usd)}</li>)}</ul> : <p>No hay abonos individuales registrados.</p>}
        {paymentsReady && detail.pendingUsd > 0 && <form onSubmit={addPayment} onChange={() => setDirty(true)}><fieldset disabled={busy} className="form-fields">
          <div className={styles.field}><label htmlFor="payment-amount">Nuevo abono USD</label><input id="payment-amount" type="number" min="0.01" max={detail.pendingUsd} step="0.01" required value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} /></div>
          {detail.status !== "ENTREGADA" && <label className={styles.check}><input name="delivered" type="checkbox" required={Number(paymentAmount) >= detail.pendingUsd} />Confirmo que el cliente retiró la unidad (obligatorio para completar el pago).</label>}
          <button className="primary-btn" type="submit">{busy ? "Guardando…" : "Registrar abono"}</button>
        </fieldset></form>}
        {error && <p role="alert" className="operation-error">{error}</p>}
      </div>
    </section></div>}
    {creating && <div className={styles.modalOverlay}><section className={styles.modal} role="dialog" aria-modal="true" aria-label="Registrar venta"><header className={styles.modalHeader}><h2>Registrar venta</h2><button className={styles.close} aria-label="Cerrar venta" disabled={busy} onClick={close}><X size={20} /></button></header><form onSubmit={create} onChange={() => setDirty(true)}><fieldset disabled={busy} className="form-fields"><div className={styles.form}><div className={styles.formGrid}>
      <div className={styles.field}><label htmlFor="sale-category">Categoría</label><select id="sale-category" value={saleCategory} onChange={event => { setSaleCategory(event.target.value); setUnitId(""); setBelowCostSale(null); }} required><option value="" disabled>Seleccionar categoría</option>{availableCategories.map(category => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></div>
      {saleCategory && <div className={styles.field}><label htmlFor="unit">Unidad en stock</label><select id="unit" value={unitId} onChange={e => { setUnitId(e.target.value); setBelowCostSale(null); }} required><option value="" disabled>{unitsForCategory.length ? "Seleccionar unidad" : "Sin unidades disponibles"}</option>{unitsForCategory.map(unit => <option key={unit.databaseId} value={unit.databaseId}>{[unit.product, unitSpecs(unit)].filter(Boolean).join(" · ")}</option>)}</select></div>}
      {selected && <div className={`${styles.unitPreview} ${styles.wide}`}><strong>{selected.product}</strong><small>{selected.variant} · {selected.color} · Costo con envío: {formatUsd(selected.costUsd)}</small></div>}
      <div className={styles.field}><label htmlFor="client">Cliente</label><select id="client" name="client" required defaultValue=""><option value="" disabled>Seleccionar cliente</option>{raw.clients.map(client => <option key={client.id} value={client.id}>{client.nombre}</option>)}</select></div>
      <div className={styles.field}><label htmlFor="seller">Vendedor</label><select id="seller" name="seller" required defaultValue=""><option value="" disabled>Seleccionar vendedor</option>{raw.sellers.map(seller => <option key={seller.id} value={seller.id}>{seller.nombre} · {seller.porcentaje_comision}%</option>)}</select></div>
      <div className={styles.field}><label htmlFor="price">Precio de venta USD</label><input id="price" name="price" type="number" min="0" step="0.01" required key={unitId} defaultValue={selected?.salePriceUsd ?? ""} /></div>
      <div className={styles.field}><label htmlFor="date">Fecha de venta</label><input id="date" name="date" type="date" required defaultValue={today} min={selected?.receivedAt} max={today} /></div>
      <div className={styles.field}><label htmlFor="amount">Importe abonado USD</label><input id="amount" name="amount" type="number" min="0" step="0.01" required defaultValue="0" /></div>
      <label className={styles.check}><input name="delivered" type="checkbox" />Confirmo que el cliente retiró la unidad.</label>
    </div>{error && <p role="alert" className="operation-error">{error}</p>}<p>Indicá cero si no hubo pago. El pago total requiere confirmar que el cliente retiró la unidad.</p></div><footer className={styles.actions}><button className={styles.cancel} type="button" onClick={close}>Cancelar</button><button className="primary-btn" type="submit" disabled={!selected}>{busy ? "Guardando…" : "Guardar venta"}</button></footer></fieldset></form></section></div>}
    {belowCostSale && <div className={`${styles.modalOverlay} ${styles.confirmOverlay}`}><section className={styles.confirmModal} role="dialog" aria-modal="true" aria-label="Confirmar venta bajo costo"><header className={styles.modalHeader}><h2>Confirmar venta bajo costo</h2><button className={styles.close} aria-label="Cerrar confirmación" disabled={busy} onClick={() => setBelowCostSale(null)}><X size={20} /></button></header><div className={styles.confirmBody}><p>El precio de venta es menor que el costo de compra.</p><dl><div><dt>Precio de venta</dt><dd>{formatUsd(belowCostSale.price)}</dd></div><div><dt>Costo de compra</dt><dd>{formatUsd(belowCostSale.cost)}</dd></div><div><dt>Diferencia</dt><dd>{formatUsd(belowCostSale.cost - belowCostSale.price)}</dd></div></dl><p>Confirmá solo si querés registrar la venta con pérdida.</p></div><footer className={styles.actions}><button className={styles.cancel} type="button" disabled={busy} onClick={() => setBelowCostSale(null)}>Volver</button><button className="primary-btn" type="button" disabled={busy} onClick={() => submitSale(belowCostSale.payload)}>{busy ? "Guardando…" : "Confirmar venta"}</button></footer></section></div>}
  </div>;
}
