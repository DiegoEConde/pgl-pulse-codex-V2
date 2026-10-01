"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { CreditCard, Download, FileText, PackageCheck, Plus, RefreshCw, Save, Send, Truck, Wallet, X } from "lucide-react";
import type { MedioPago, Moneda, SalesData, UUID, VentaRow } from "@/lib/local-db";
import styles from "./SalesV2Screen.module.css";

type LineForm = {
  id: string;
  producto_id: string;
  origen: "stock" | "compra";
  unidad_id: string;
  compra_item_id: string;
  precio_venta: string;
  moneda: Moneda;
};

type SaleForm = {
  cliente_id: string;
  vendedor_id: string;
  moneda_principal: Moneda;
  con_envio: boolean;
  direccion_entrega: string;
  repartidor_entrega_id: string;
  observaciones: string;
  emitir_comprobante: boolean;
  pago_importe: string;
  pago_moneda: Moneda;
  medio_pago: MedioPago;
  pago_line_index: string;
  items: LineForm[];
};

type PaymentForm = {
  importe: string;
  moneda: Moneda;
  medio_pago: MedioPago;
  venta_item_id: string;
};

type ReceiptSnapshot = {
  numero?: number;
  estado?: string;
  venta_numero?: number;
  cliente?: string;
  total?: number;
  saldo_pendiente?: number;
  moneda?: Moneda;
  items?: {
    producto?: string;
    precio?: number;
    moneda?: Moneda;
    saldo_pendiente?: number;
  }[];
};

type SalesV2ScreenProps = {
  initialData: SalesData;
};

const emptyData: SalesData = {
  ventas: [],
  venta_items: [],
  clientes: [],
  productos: [],
  vendedores: [],
  repartidores: [],
  unidades: [],
  compra_items: [],
  movimientos_dinero: [],
  rutas: [],
  ruta_items: [],
};

export default function SalesV2Screen({ initialData }: SalesV2ScreenProps) {
  const [data, setData] = useState<SalesData>(initialData ?? emptyData);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SaleForm>(() => createEmptyForm());
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(() => createEmptyPaymentForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const maps = useMemo(() => buildMaps(data), [data]);
  const metrics = useMemo(() => buildMetrics(data), [data]);
  const filteredSales = useMemo(() => filterSales(data, maps, query), [data, maps, query]);
  const selectedSale = filteredSales.find((sale) => sale.id === selectedId) ?? filteredSales[0] ?? null;
  const selectedItems = selectedSale ? data.venta_items.filter((item) => item.venta_id === selectedSale.id) : [];
  const selectedPayments = selectedSale ? data.movimientos_dinero.filter((movement) => movement.venta_id === selectedSale.id) : [];

  async function refresh() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/sales", { cache: "no-store" });
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
      const response = await fetch("/api/local-db/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: formToPayload(form) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo guardar la venta.");
      setData(body.data);
      setForm(createEmptyForm());
      setFormOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la venta.");
    } finally {
      setSaving(false);
    }
  }

  async function registerPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSale) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payment", saleId: selectedSale.id, values: paymentToPayload(paymentForm) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo registrar el cobro.");
      setData(body.data);
      setPaymentForm(createEmptyPaymentForm());
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "No se pudo registrar el cobro.");
    } finally {
      setSaving(false);
    }
  }

  async function upsertReceipt(saleId: UUID) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receipt", saleId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo emitir el comprobante.");
      setData(body.data);
    } catch (receiptError) {
      setError(receiptError instanceof Error ? receiptError.message : "No se pudo emitir el comprobante.");
    } finally {
      setSaving(false);
    }
  }

  function updateLine(id: string, patch: Partial<LineForm>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((line) => line.id === id ? { ...line, ...patch } : line),
    }));
  }

  return (
    <section className={`view ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <span className="eyebrow">Comercial</span>
          <h1>Ventas</h1>
          <p>Ventas con items, stock o abastecimiento vinculado, cobros reales y comprobante desde el detalle.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} onClick={refresh} disabled={saving} aria-label="Actualizar">
            <RefreshCw size={18} />
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setFormOpen(true)} disabled={!data.clientes.length || !data.vendedores.length || !data.productos.length}>
            <Plus size={18} />
            Nueva venta
          </button>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Indicadores de ventas">
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
              <span className="eyebrow">Operaciones</span>
              <h2>Ventas registradas</h2>
            </div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar venta, cliente o estado" />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className="table-wrap">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Cliente</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Saldo</th>
                  <th>Comprobante</th>
                  <th>Entrega</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => {
                  const items = data.venta_items.filter((item) => item.venta_id === sale.id);
                  const client = maps.clients.get(sale.cliente_id)?.nombre ?? "Cliente no disponible";
                  return (
                    <tr key={sale.id} className={selectedSale?.id === sale.id ? styles.selectedRow : undefined} onClick={() => setSelectedId(sale.id)}>
                      <td><span className="mono">#{sale.numero}</span></td>
                      <td>{client}</td>
                      <td>{items.length}</td>
                      <td>{formatMoney(sale.total, sale.moneda_principal)}</td>
                      <td><span className={`badge ${sale.saldo_pendiente > 0 ? "amber" : "green"}`}>{formatMoney(sale.saldo_pendiente, sale.moneda_principal)}</span></td>
                      <td><span className={`badge ${badgeForReceipt(sale)}`}>{sale.comprobante_numero ? `#${sale.comprobante_numero} ${sale.comprobante_estado}` : "Sin emitir"}</span></td>
                      <td>{sale.con_envio ? maps.couriers.get(sale.repartidor_entrega_id ?? "")?.nombre ?? "Envio" : "Local"}</td>
                    </tr>
                  );
                })}
                {!filteredSales.length && (
                  <tr>
                    <td colSpan={7} className={styles.empty}>Sin ventas cargadas</td>
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
              <h2>{selectedSale ? `Venta #${selectedSale.numero}` : "Sin venta seleccionada"}</h2>
            </div>
            {selectedSale && <span className={`badge ${badgeForSale(selectedSale)}`}>{selectedSale.estado}</span>}
          </div>

          {selectedSale ? (
            <div className={styles.detailBody}>
              <div className={styles.summaryLine}>
                <span>{maps.clients.get(selectedSale.cliente_id)?.nombre ?? "Cliente no disponible"}</span>
                <strong>{formatMoney(selectedSale.total, selectedSale.moneda_principal)}</strong>
              </div>

              <div className={styles.itemList}>
                {selectedItems.map((item) => {
                  const product = maps.products.get(item.producto_id)?.nombre ?? "Producto no disponible";
                  const origin = item.unidad_id ? unitLabel(item.unidad_id, data) : purchaseItemLabel(item.compra_item_id, data);
                  return (
                    <article className={styles.itemCard} key={item.id}>
                      <div>
                        <strong>{product}</strong>
                        <span>{origin}</span>
                      </div>
                      <div>
                        <b>{formatMoney(item.precio_venta, item.moneda)}</b>
                        <small>Saldo {formatMoney(item.saldo_pendiente, item.moneda)}</small>
                      </div>
                      <span className={`badge ${item.saldo_pendiente > 0 ? "amber" : "green"}`}>{item.estado}</span>
                    </article>
                  );
                })}
              </div>

              <div className={styles.receiptActions}>
                <button type="button" className={styles.iconTextButton} onClick={() => void upsertReceipt(selectedSale.id)} disabled={saving} title={selectedSale.comprobante_numero ? "Reimprimir comprobante" : "Emitir comprobante"}>
                  <FileText size={16} />
                  {selectedSale.comprobante_numero ? "Reimprimir" : "Emitir"}
                </button>
                <button type="button" className={styles.iconTextButton} onClick={() => void downloadReceipt(selectedSale, data, maps)} disabled={!selectedSale.comprobante_numero} title="Descargar PDF">
                  <Download size={16} />
                  PDF
                </button>
                <button type="button" className={styles.iconTextButton} onClick={() => sendReceipt(selectedSale, data, maps)} disabled={!selectedSale.comprobante_numero} title="Enviar por WhatsApp">
                  <Send size={16} />
                  Enviar
                </button>
              </div>

              {selectedPayments.length > 0 && (
                <div className={styles.paymentList}>
                  {selectedPayments.map((movement) => (
                    <article key={movement.id}>
                      <span>{movement.medio_pago}</span>
                      <strong>{formatMoney(movement.importe, movement.moneda)}</strong>
                    </article>
                  ))}
                </div>
              )}

              {selectedSale.saldo_pendiente > 0 && (
                <form className={styles.paymentForm} onSubmit={registerPayment}>
                  <label>
                    <span>Cobro</span>
                    <input type="number" min="0.01" step="0.01" value={paymentForm.importe} onChange={(event) => setPaymentForm({ ...paymentForm, importe: event.target.value })} required />
                  </label>
                  <label>
                    <span>Moneda</span>
                    <select value={paymentForm.moneda} onChange={(event) => setPaymentForm({ ...paymentForm, moneda: event.target.value as Moneda, medio_pago: defaultPaymentMethod(event.target.value as Moneda) })}>
                      <option value="USD">USD</option>
                      <option value="ARS">ARS</option>
                    </select>
                  </label>
                  <label>
                    <span>Medio</span>
                    <select value={paymentForm.medio_pago} onChange={(event) => setPaymentForm({ ...paymentForm, medio_pago: event.target.value as MedioPago })}>
                      {paymentMethodsFor(paymentForm.moneda).map((method) => <option key={method} value={method}>{method}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Aplica a</span>
                    <select value={paymentForm.venta_item_id} onChange={(event) => setPaymentForm({ ...paymentForm, venta_item_id: event.target.value })}>
                      <option value="">Venta completa</option>
                      {selectedItems.filter((item) => item.saldo_pendiente > 0).map((item) => <option key={item.id} value={item.id}>{maps.products.get(item.producto_id)?.nombre ?? "Item"}</option>)}
                    </select>
                  </label>
                  <button type="submit" className={styles.primaryButton} disabled={saving}>
                    <CreditCard size={17} />
                    Registrar cobro
                  </button>
                </form>
              )}
            </div>
          ) : (
            <p className={styles.empty}>Selecciona una venta para ver su detalle.</p>
          )}
        </aside>
      </div>

      {formOpen && (
        <div className={styles.overlay}>
          <form className={styles.modal} onSubmit={save}>
            <header className={styles.modalHeader}>
              <div>
                <span className="eyebrow">Nueva venta</span>
                <h2>Operacion comercial</h2>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setFormOpen(false)} disabled={saving} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <div className={styles.formGrid}>
              <label>
                <span>Cliente</span>
                <select value={form.cliente_id} onChange={(event) => setForm({ ...form, cliente_id: event.target.value })} required>
                  <option value="">Seleccionar</option>
                  {data.clientes.filter((client) => client.activo).map((client) => <option key={client.id} value={client.id}>{client.nombre}</option>)}
                </select>
              </label>

              <label>
                <span>Vendedor</span>
                <select value={form.vendedor_id} onChange={(event) => setForm({ ...form, vendedor_id: event.target.value })} required>
                  <option value="">Seleccionar</option>
                  {data.vendedores.filter((seller) => seller.activo).map((seller) => <option key={seller.id} value={seller.id}>{seller.nombre}</option>)}
                </select>
              </label>

              <label>
                <span>Moneda principal</span>
                <select value={form.moneda_principal} onChange={(event) => setForm({ ...form, moneda_principal: event.target.value as Moneda })}>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </label>

              <label className={styles.check}>
                <input type="checkbox" checked={form.con_envio} onChange={(event) => setForm({ ...form, con_envio: event.target.checked })} />
                Envio por repartidor
              </label>

              {form.con_envio && (
                <>
                  <label>
                    <span>Direccion</span>
                    <input value={form.direccion_entrega} onChange={(event) => setForm({ ...form, direccion_entrega: event.target.value })} />
                  </label>
                  <label>
                    <span>Repartidor</span>
                    <select value={form.repartidor_entrega_id} onChange={(event) => setForm({ ...form, repartidor_entrega_id: event.target.value })} required>
                      <option value="">Seleccionar</option>
                      {data.repartidores.filter((courier) => courier.activo).map((courier) => <option key={courier.id} value={courier.id}>{courier.nombre}</option>)}
                    </select>
                  </label>
                </>
              )}

              <label>
                <span>Observaciones</span>
                <input value={form.observaciones} onChange={(event) => setForm({ ...form, observaciones: event.target.value })} />
              </label>

              <label className={styles.check}>
                <input type="checkbox" checked={form.emitir_comprobante} onChange={(event) => setForm({ ...form, emitir_comprobante: event.target.checked })} />
                Emitir comprobante
              </label>
            </div>

            <section className={styles.lines}>
              <header>
                <div>
                  <span className="eyebrow">Items</span>
                  <h3>Productos vendidos</h3>
                </div>
                <button type="button" className={styles.iconButton} onClick={() => setForm({ ...form, items: [...form.items, createLine()] })} aria-label="Agregar item">
                  <Plus size={17} />
                </button>
              </header>

              {form.items.map((line, index) => {
                const units = availableUnitsForProduct(data, line.producto_id);
                const purchaseItems = availablePurchaseItemsForProduct(data, line.producto_id);
                return (
                  <div className={styles.lineRow} key={line.id}>
                    <label>
                      <span>Producto</span>
                      <select value={line.producto_id} onChange={(event) => updateLine(line.id, { producto_id: event.target.value, unidad_id: "", compra_item_id: "" })} required>
                        <option value="">Seleccionar</option>
                        {data.productos.filter((product) => product.activo).map((product) => <option key={product.id} value={product.id}>{product.nombre}</option>)}
                      </select>
                    </label>

                    <label>
                      <span>Origen</span>
                      <select value={line.origen} onChange={(event) => updateLine(line.id, { origen: event.target.value as "stock" | "compra", unidad_id: "", compra_item_id: "" })}>
                        <option value="stock">Stock</option>
                        <option value="compra">Compra</option>
                      </select>
                    </label>

                    {line.origen === "stock" ? (
                      <label>
                        <span>Unidad</span>
                        <select value={line.unidad_id} onChange={(event) => updateLine(line.id, { unidad_id: event.target.value })} required>
                          <option value="">Seleccionar</option>
                          {units.map((unit) => <option key={unit.id} value={unit.id}>{unitLabel(unit.id, data)}</option>)}
                        </select>
                      </label>
                    ) : (
                      <label>
                        <span>Item compra</span>
                        <select value={line.compra_item_id} onChange={(event) => updateLine(line.id, { compra_item_id: event.target.value })} required>
                          <option value="">Seleccionar</option>
                          {purchaseItems.map((item) => <option key={item.id} value={item.id}>{purchaseItemLabel(item.id, data)}</option>)}
                        </select>
                      </label>
                    )}

                    <label>
                      <span>Precio</span>
                      <input type="number" min="0" step="0.01" value={line.precio_venta} onChange={(event) => updateLine(line.id, { precio_venta: event.target.value })} required />
                    </label>

                    <label>
                      <span>Moneda</span>
                      <select value={line.moneda} onChange={(event) => updateLine(line.id, { moneda: event.target.value as Moneda })}>
                        <option value="USD">USD</option>
                        <option value="ARS">ARS</option>
                      </select>
                    </label>

                    <button type="button" className={styles.iconButton} onClick={() => setForm({ ...form, items: form.items.filter((item) => item.id !== line.id) })} disabled={form.items.length === 1} aria-label={`Quitar item ${index + 1}`}>
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </section>

            <section className={styles.paymentBox}>
              <header>
                <div>
                  <span className="eyebrow">Cobro inicial</span>
                  <h3>Pago al crear</h3>
                </div>
              </header>
              <div className={styles.paymentGrid}>
                <label>
                  <span>Importe</span>
                  <input type="number" min="0" step="0.01" value={form.pago_importe} onChange={(event) => setForm({ ...form, pago_importe: event.target.value })} />
                </label>
                <label>
                  <span>Moneda</span>
                  <select value={form.pago_moneda} onChange={(event) => setForm({ ...form, pago_moneda: event.target.value as Moneda, medio_pago: defaultPaymentMethod(event.target.value as Moneda) })}>
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                </label>
                <label>
                  <span>Medio</span>
                  <select value={form.medio_pago} onChange={(event) => setForm({ ...form, medio_pago: event.target.value as MedioPago })}>
                    {paymentMethodsFor(form.pago_moneda).map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </label>
                <label>
                  <span>Aplica a</span>
                  <select value={form.pago_line_index} onChange={(event) => setForm({ ...form, pago_line_index: event.target.value })}>
                    <option value="">Venta completa</option>
                    {form.items.map((line, index) => <option key={line.id} value={index}>{itemLineLabel(line, data, index)}</option>)}
                  </select>
                </label>
              </div>
            </section>

            <footer className={styles.modalFooter}>
              <span>{form.con_envio ? "Se generara una ruta de entrega y cobro pendiente si queda saldo." : "La entrega queda preparada para retiro local."}</span>
              <button type="submit" className={styles.primaryButton} disabled={saving}>
                <Save size={18} />
                Guardar venta
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}

function buildMaps(data: SalesData) {
  return {
    clients: new Map(data.clientes.map((client) => [client.id, client])),
    products: new Map(data.productos.map((product) => [product.id, product])),
    sellers: new Map(data.vendedores.map((seller) => [seller.id, seller])),
    couriers: new Map(data.repartidores.map((courier) => [courier.id, courier])),
  };
}

function buildMetrics(data: SalesData) {
  const activeSales = data.ventas.filter((sale) => sale.estado !== "CANCELADA");
  const total = totalsByCurrency(activeSales, (sale) => sale.total, (sale) => sale.moneda_principal);
  const pending = totalsByCurrency(activeSales, (sale) => sale.saldo_pendiente, (sale) => sale.moneda_principal);
  const noStock = data.venta_items.filter((item) => item.compra_item_id && item.estado !== "CANCELADO").length;
  const receipts = activeSales.filter((sale) => sale.comprobante_numero).length;

  return [
    { label: "Ventas", value: String(activeSales.length), detail: "Confirmadas locales", color: "var(--blue)", icon: <PackageCheck size={17} /> },
    { label: "Total vendido", value: formatTotals(total), detail: "Segun moneda principal", color: "var(--green)", icon: <Wallet size={17} /> },
    { label: "Saldo pendiente", value: formatTotals(pending), detail: "Cobros por registrar", color: "var(--amber)", icon: <CreditCard size={17} /> },
    { label: "Sin stock", value: String(noStock), detail: `${receipts} comprobantes`, color: "var(--violet)", icon: <Truck size={17} /> },
  ];
}

function filterSales(data: SalesData, maps: ReturnType<typeof buildMaps>, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return data.ventas;

  return data.ventas.filter((sale) => {
    const client = maps.clients.get(sale.cliente_id)?.nombre ?? "";
    return [`#${sale.numero}`, client, sale.estado, sale.comprobante_estado ?? ""].some((value) => value.toLowerCase().includes(normalized));
  });
}

function formToPayload(form: SaleForm) {
  const paymentAmount = Number(form.pago_importe || 0);

  return {
    cliente_id: form.cliente_id,
    vendedor_id: form.vendedor_id,
    moneda_principal: form.moneda_principal,
    con_envio: form.con_envio,
    direccion_entrega: form.direccion_entrega || null,
    repartidor_entrega_id: form.con_envio ? form.repartidor_entrega_id || null : null,
    observaciones: form.observaciones,
    emitir_comprobante: form.emitir_comprobante,
    items: form.items.map((item) => ({
      producto_id: item.producto_id,
      precio_venta: Number(item.precio_venta),
      moneda: item.moneda,
      unidad_id: item.origen === "stock" ? item.unidad_id || null : null,
      compra_item_id: item.origen === "compra" ? item.compra_item_id || null : null,
    })),
    pago_inicial: paymentAmount > 0 ? {
      importe: paymentAmount,
      moneda: form.pago_moneda,
      medio_pago: form.medio_pago,
      line_index: form.pago_line_index === "" ? null : Number(form.pago_line_index),
    } : null,
  };
}

function paymentToPayload(form: PaymentForm) {
  return {
    importe: Number(form.importe),
    moneda: form.moneda,
    medio_pago: form.medio_pago,
    venta_item_id: form.venta_item_id || null,
  };
}

function createEmptyForm(): SaleForm {
  return {
    cliente_id: "",
    vendedor_id: "",
    moneda_principal: "USD",
    con_envio: false,
    direccion_entrega: "",
    repartidor_entrega_id: "",
    observaciones: "",
    emitir_comprobante: true,
    pago_importe: "0",
    pago_moneda: "USD",
    medio_pago: "EFECTIVO_USD",
    pago_line_index: "",
    items: [createLine()],
  };
}

function createLine(): LineForm {
  return {
    id: crypto.randomUUID(),
    producto_id: "",
    origen: "stock",
    unidad_id: "",
    compra_item_id: "",
    precio_venta: "",
    moneda: "USD",
  };
}

function createEmptyPaymentForm(): PaymentForm {
  return {
    importe: "",
    moneda: "USD",
    medio_pago: "EFECTIVO_USD",
    venta_item_id: "",
  };
}

function availableUnitsForProduct(data: SalesData, productId: string) {
  return data.unidades.filter((unit) => unit.producto_id === productId && unit.estado === "EN_OFICINA_DISPONIBLE" && !unit.venta_item_id);
}

function availablePurchaseItemsForProduct(data: SalesData, productId: string) {
  return data.compra_items.filter((item) => item.producto_id === productId && item.estado !== "CANCELADO" && !item.venta_item_id);
}

function unitLabel(unitId: UUID | null, data: SalesData) {
  const unit = data.unidades.find((row) => row.id === unitId);
  if (!unit) return "Unidad no disponible";
  return [unit.imei || unit.serie || unit.id.slice(0, 8), unit.color, unit.estado].filter(Boolean).join(" - ");
}

function purchaseItemLabel(itemId: UUID | null, data: SalesData) {
  const item = data.compra_items.find((row) => row.id === itemId);
  if (!item) return "Compra no disponible";
  const product = data.productos.find((row) => row.id === item.producto_id)?.nombre ?? "Producto";
  return `${product} - compra ${item.id.slice(0, 8)} - ${formatMoney(item.costo_original, item.moneda)}`;
}

function itemLineLabel(line: LineForm, data: SalesData, index: number) {
  const product = data.productos.find((row) => row.id === line.producto_id)?.nombre;
  return product ? `${index + 1}. ${product}` : `Item ${index + 1}`;
}

function paymentMethodsFor(currency: Moneda): MedioPago[] {
  if (currency === "USD") return ["EFECTIVO_USD"];
  return ["EFECTIVO_ARS", "TRANSFERENCIA_ARS", "CREDITO", "DEBITO"];
}

function defaultPaymentMethod(currency: Moneda): MedioPago {
  return currency === "USD" ? "EFECTIVO_USD" : "EFECTIVO_ARS";
}

function badgeForSale(sale: VentaRow) {
  if (sale.estado === "CANCELADA") return "red";
  if (sale.saldo_pendiente === 0) return "green";
  if (sale.con_envio) return "violet";
  return "amber";
}

function badgeForReceipt(sale: VentaRow) {
  if (!sale.comprobante_numero) return "muted-badge";
  if (sale.comprobante_estado === "PAGADO") return "green";
  if (sale.comprobante_estado === "ANULADO") return "red";
  return "blue";
}

function totalsByCurrency<Row>(rows: Row[], valueOf: (row: Row) => number, currencyOf: (row: Row) => Moneda) {
  return rows.reduce((totals, row) => {
    totals[currencyOf(row)] += valueOf(row);
    return totals;
  }, { USD: 0, ARS: 0 });
}

function formatTotals(totals: Record<Moneda, number>) {
  const values = [
    totals.USD > 0 ? formatMoney(totals.USD, "USD") : "",
    totals.ARS > 0 ? formatMoney(totals.ARS, "ARS") : "",
  ].filter(Boolean);
  return values.length ? values.join(" / ") : formatMoney(0, "USD");
}

function formatMoney(value: number, currency: Moneda) {
  if (currency === "ARS") return `$ ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
  return `US$ ${value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

async function downloadReceipt(sale: VentaRow, data: SalesData, maps: ReturnType<typeof buildMaps>) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const lines = receiptLines(sale, data, maps);

  doc.setFontSize(16);
  doc.text(`Comprobante #${sale.comprobante_numero ?? "-"}`, 14, 18);
  doc.setFontSize(10);
  lines.forEach((line, index) => doc.text(line, 14, 32 + index * 7));
  doc.save(`comprobante-${sale.comprobante_numero ?? sale.numero}.pdf`);
}

function sendReceipt(sale: VentaRow, data: SalesData, maps: ReturnType<typeof buildMaps>) {
  const text = encodeURIComponent(receiptLines(sale, data, maps).join("\n"));
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}

function receiptLines(sale: VentaRow, data: SalesData, maps: ReturnType<typeof buildMaps>) {
  const snapshot = sale.comprobante_snapshot as ReceiptSnapshot;
  const client = snapshot.cliente ?? maps.clients.get(sale.cliente_id)?.nombre ?? "Cliente no disponible";
  const items = Array.isArray(snapshot.items) && snapshot.items.length
    ? snapshot.items.map((item) => `${item.producto ?? "Producto"} - ${formatMoney(item.precio ?? 0, item.moneda ?? sale.moneda_principal)} - saldo ${formatMoney(item.saldo_pendiente ?? 0, item.moneda ?? sale.moneda_principal)}`)
    : data.venta_items
      .filter((item) => item.venta_id === sale.id)
      .map((item) => `${maps.products.get(item.producto_id)?.nombre ?? "Producto"} - ${formatMoney(item.precio_venta, item.moneda)} - saldo ${formatMoney(item.saldo_pendiente, item.moneda)}`);

  return [
    `Venta #${snapshot.venta_numero ?? sale.numero}`,
    `Cliente: ${client}`,
    `Estado: ${snapshot.estado ?? sale.comprobante_estado ?? "EMITIDO"}`,
    `Total: ${formatMoney(snapshot.total ?? sale.total, snapshot.moneda ?? sale.moneda_principal)}`,
    `Saldo: ${formatMoney(snapshot.saldo_pendiente ?? sale.saldo_pendiente, snapshot.moneda ?? sale.moneda_principal)}`,
    ...items,
  ];
}
