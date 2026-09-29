"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, Plus, Search, X } from "lucide-react";
import WorkspaceTabs from "@/components/ui/WorkspaceTabs";
import PagedTable from "@/components/ui/PagedTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useProgram } from "@/contexts/ProgramContext";
import { useOperation } from "@/hooks/useOperation";
import { runOperation } from "@/lib/supabase/operations";
import CharacteristicInput from "./CharacteristicInput";
import NewPurchaseProduct from "./NewPurchaseProduct";
import { memoryLabel } from "@/lib/purchase-details";
import { formatUsd } from "@/lib/formatters";
import { formatDate, previousDate } from "@/lib/dates";
import { categoryLabel } from "@/lib/product-catalog";
import type { PurchaseOrder, PurchaseStatus } from "@/types/operations";
import layout from "@/components/ui/OperationalLayout.module.css";
import styles from "./PurchasesScreen.module.css";

const statusClass: Record<PurchaseStatus, string> = { BORRADOR: "muted-badge", PEDIDO: "amber", "ENVÍO": "blue", RECIBIDO: "green" };
export default function PurchasesScreen() {
  const { raw, orders, today } = useProgram();
  const { busy, error, setError, run } = useOperation();
  const [search, setSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const detail = orders.find(order => order.id === detailId);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [receiving, setReceiving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Record<number, number>>({});
  const [selectedProducts, setSelectedProducts] = useState<Record<number, number>>({});
  const [newProductLine, setNewProductLine] = useState<number | null>(null);
  const catalogReady = Boolean(raw.categories && raw.categoryCharacteristics);
  const productCategoryId = (product: typeof raw.products[number]) =>
    product.categoria_id ?? raw.categories?.find(category => category.nombre === product.categoria.toLowerCase())?.id;
  const productsFor = (key: number) => raw.products.filter(product => productCategoryId(product) === selectedCategories[key]);
  const fieldsFor = (key: number) => {
    if (!selectedProducts[key]) return [];
    return (raw.categoryCharacteristics ?? []).filter(field => field.categoria_id === selectedCategories[key]);
  };
  const [lineKeys, setLineKeys] = useState([0]);
  const lineCounter = useRef(0);
  // Se mantiene el mismo UUID al reintentar: la RPC evita crear pedidos duplicados.
  const requestId = useRef("");
  const modalOpen = creating || detailId !== null;
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [modalOpen]);
  const matches = (order: PurchaseOrder) => `${order.id} ${order.supplier} ${order.products.join(" ")}`.toLowerCase().includes(search.toLowerCase());
  const todayOrders = orders.filter(order => order.date === today && !order.closed && matches(order));
  const history = orders.filter(order => (order.date !== today || order.closed) && (!historyDate || order.date === historyDate) && matches(order));
  // La recepción pide un registro por unidad física, no uno por línea de compra.
  const receiptRows = detail?.lines.flatMap(line => Array.from({ length: line.cantidad }, (_, index) => ({ line, key: line.id + "-" + index }))) ?? [];

  function removeLine(key: number) {
    setLineKeys(keys => keys.filter(item => item !== key));
    setSelectedCategories(current => { const next = { ...current }; delete next[key]; return next; });
    setSelectedProducts(current => { const next = { ...current }; delete next[key]; return next; });
    setDirty(true);
  }
  function close() {
    if (busy) return;
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Querés descartarlos?")) return;
    setCreating(false); setReceiving(false); setDetailId(null); setDirty(false); setError("");
  }
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!catalogReady) { setError("Las categorías todavía no están disponibles para guardar."); return; }
    if (lineKeys.some(key => !selectedCategories[key] || !selectedProducts[key])) { setError("Seleccioná categoría y producto en cada línea."); return; }
    const form = new FormData(event.currentTarget);
    const lines = lineKeys.map(key => ({ producto_id: selectedProducts[key], color: String(form.get("color-" + key) ?? "").trim(), cantidad: Number(form.get("quantity-" + key)), precio_costo_usd: Number(form.get("cost-" + key)), atributos: Object.fromEntries(fieldsFor(key).filter(field => field.clave !== "color").map(field => [field.clave, String(form.get("option-" + field.clave + "-" + key) ?? "")])) }));
    void run(() => runOperation("pgl_create_order", {
      p_supplier: Number(form.get("supplier")), p_date: today, p_expected: null,
      p_shipping: 0, p_notes: String(form.get("notes") ?? ""), p_lines: lines, p_request: requestId.current,
    }), id => { setCreating(false); setReceiving(false); setDirty(false); setDetailId(null); setNotice(`Compra #${Number(id)} guardada como borrador. Podés continuar trabajando y retomar el pedido más tarde.`); });
  }
  function receive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const form = new FormData(event.currentTarget);
    const units = receiptRows.map(({ line, key }) => ({
      detalle_id: line.id, variante: String(form.get("variant-" + key) ?? ""),
      ram: String(form.get("ram-" + key) ?? ""), precio_sugerido_usd: String(form.get("price-" + key) ?? ""),
    }));
    void run(() => runOperation("pgl_receive_order", { p_id: detail.id, p_units: units }), () => { setReceiving(false); setDirty(false); });
  }
  function table(source: PurchaseOrder[], empty: string) {
    return source.length ? <PagedTable><thead><tr><th>Pedido</th><th>Proveedor</th><th>Fecha</th><th>Estado</th><th>Total</th><th></th></tr></thead><tbody>{source.map(order => <tr key={order.id} onClick={() => { setDetailId(order.id); setError(""); }}><td className="mono">#{order.id}</td><td>{order.supplier}</td><td>{formatDate(order.date)}</td><td><span className={`badge ${statusClass[order.status]}`}>{order.status}</span></td><td>{formatUsd(order.merchandiseUsd + order.shippingUsd)}</td><td><button className={styles.tableButton} aria-label={`Ver pedido ${order.id}`}><Eye size={14} /> Ver</button></td></tr>)}</tbody></PagedTable> : <div className={styles.empty}>{empty}</div>;
  }
  return <div className={`view ${layout.page}`}>
    <PageHeader title="Compras" action={<button className={`primary-btn ${layout.headAction}`} disabled={!raw.suppliers.length} onClick={() => { requestId.current = crypto.randomUUID(); setLineKeys([++lineCounter.current]); setSelectedCategories({}); setSelectedProducts({}); setCreating(true); setNotice(""); setDirty(false); setError(""); }}><Plus size={16} /> Nueva compra</button>} />
    {notice && <p role="status">{notice}</p>}
    {!raw.suppliers.length && <p>Creá un proveedor en Datos para registrar compras.</p>}
    <div className={layout.toolbar}><label className={layout.searchWrap}><Search size={15} /><input className="search" aria-label="Buscar compras" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pedido, proveedor o producto…" /></label>{historyOpen && <label className={layout.dateFilter}><span>Fecha del historial</span><input type="date" value={historyDate} max={previousDate(today)} onChange={e => setHistoryDate(e.target.value)} /></label>}</div>
    <WorkspaceTabs labels={["Pedidos de hoy", "Historial"]} onChange={index => setHistoryOpen(index === 1)}>
    <section className="panel"><header className="panel-head"><div><span className="eyebrow">Operación del día · {formatDate(today)}</span><h2>Pedidos de hoy</h2></div><span className="badge blue">{todayOrders.length} pedidos</span></header><div className="table-wrap">{table(todayOrders, "No hay pedidos abiertos para hoy.")}</div></section>
    <section className="panel"><header className="panel-head"><h2>Historial</h2><span className="badge muted-badge">{history.length} resultados</span></header><div className="table-wrap">{table(history, "No hay pedidos que coincidan con la búsqueda.")}</div></section>
    </WorkspaceTabs>
    {detail && !creating && <div className={styles.modalOverlay}><section className={styles.modal} role="dialog" aria-modal="true" aria-label={`Pedido ${detail.id}`}>
      <header className={styles.modalHeader}><h2>Pedido #{detail.id}</h2><button className={styles.close} aria-label="Cerrar detalle" disabled={busy} onClick={close}><X size={20} /></button></header>
      <div className={styles.detailGrid}>{[["Proveedor", detail.supplier], ["Estado", detail.status], ["Mercadería", formatUsd(detail.merchandiseUsd)], ["Total", formatUsd(detail.merchandiseUsd + detail.shippingUsd)]].map(([label,value]) => <div className={styles.detailItem} key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
      <div className={styles.detailBody}><h3>Resumen de lo solicitado</h3><div className="table-wrap"><table><thead><tr><th>Producto</th><th>Color</th><th>Unidades</th><th>Unitario</th><th>Total</th></tr></thead><tbody>{detail.lines.map(line => <tr key={line.id}><td>{line.product}<small className="record-note">{[memoryLabel(line.ram, line.rom), line.variant].filter(Boolean).join(" · ")}</small></td><td>{line.color}</td><td>{line.cantidad}</td><td>{formatUsd(line.precio_costo_usd)}</td><td>{formatUsd(line.cantidad * line.precio_costo_usd)}</td></tr>)}</tbody></table></div>{detail.notes && <p>{detail.notes}</p>}{error && <p className="operation-error" role="alert">{error}</p>}</div>
      {!receiving && <footer className={styles.modalActions}>
        {detail.status === "BORRADOR" && <button className="primary-btn" disabled={busy} onClick={() => void run(() => runOperation("pgl_order_status", { p_id: detail.id, p_status: "PEDIDO" }))}>Confirmar pedido</button>}
        {detail.status === "PEDIDO" && <button className={styles.cancel} disabled={busy} onClick={() => void run(() => runOperation("pgl_order_status", { p_id: detail.id, p_status: "ENVÍO" }))}>Marcar en envío</button>}
        {(detail.status === "PEDIDO" || detail.status === "ENVÍO") && <button className="primary-btn" disabled={busy} onClick={() => { setReceiving(true); setError(""); }}>Registrar recepción</button>}
        {detail.status === "RECIBIDO" && <span className="badge green">{detail.receivedUnits} unidades recibidas</span>}
      </footer>}
      {receiving && <form onSubmit={receive} onChange={() => setDirty(true)}><fieldset className="form-fields" disabled={busy}><div className={styles.form}><h3>Recepción completa · {receiptRows.length} unidades</h3><p>Podés agregar variante, RAM y precio sugerido ahora o completar esos datos después desde Stock.</p>{receiptRows.map(({ line, key }, index) => <div className={styles.receiptLine} key={key}><h4>{index + 1}. {line.product} · {line.color}</h4><div className={styles.formGrid}>{[["variant","Variante / almacenamiento",120],["ram","RAM",60]].map(([name,label,max]) => <div className={styles.field} key={String(name)}><label htmlFor={name + "-" + key}>{label}</label><input id={name + "-" + key} name={name + "-" + key} maxLength={Number(max)} defaultValue={name === "ram" ? line.ram : [line.rom, line.variant].filter(Boolean).join(" · ")} /></div>)}<div className={styles.field}><label htmlFor={"price-" + key}>Precio sugerido USD</label><input id={"price-" + key} name={"price-" + key} type="number" min="0" step="0.01" /></div></div></div>)}</div><footer className={styles.modalActions}><button className="primary-btn" type="submit">{busy ? "Guardando…" : "Confirmar recepción"}</button></footer></fieldset></form>}
    </section></div>}
    {creating && <div className={styles.modalOverlay}><section className={`${styles.modal} ${styles.purchaseModal}`} role="dialog" aria-modal="true" aria-label="Nueva compra"><header className={styles.modalHeader}><h2>Nueva compra</h2><button className={styles.close} aria-label="Cerrar compra" disabled={busy} onClick={close}><X size={20} /></button></header>
      <form onSubmit={create} onChange={() => setDirty(true)}><fieldset className="form-fields" disabled={busy}><div className={styles.form}><div className={styles.formGrid}>
        <div className={styles.field}><label htmlFor="supplier">Proveedor</label><select id="supplier" name="supplier" required defaultValue=""><option value="" disabled>Seleccionar proveedor</option>{raw.suppliers.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="date">Fecha del pedido</label><input id="date" type="date" value={today} disabled readOnly /></div>
      </div>
      {lineKeys.map((key,index) => {
        const lineProducts = productsFor(key);
        return <div className={styles.receiptLine} key={key}><h3>Producto {index + 1}</h3><div className={styles.formGrid}>
          <div className={styles.field}><label htmlFor={"category-" + key}>Categoría</label><select id={"category-" + key} name={"category-" + key} required value={selectedCategories[key] ?? ""} onChange={event => { const categoryId = Number(event.target.value); setSelectedCategories(current => ({ ...current, [key]: categoryId })); setSelectedProducts(current => { const next = { ...current }; delete next[key]; return next; }); }}><option value="" disabled>Seleccionar categoría</option>{raw.categories?.map(category => <option key={category.id} value={category.id}>{categoryLabel(category.nombre)}</option>)}</select></div>
          {selectedCategories[key] && <div className={styles.field}><label htmlFor={"product-" + key}>Producto</label><div className={styles.inlineControl}><select id={"product-" + key} name={"product-" + key} required value={selectedProducts[key] ?? ""} disabled={!lineProducts.length} onChange={event => setSelectedProducts(current => ({ ...current, [key]: Number(event.target.value) }))}><option value="" disabled>{lineProducts.length ? "Seleccionar producto" : "Sin productos cargados"}</option>{lineProducts.map(item => <option key={item.id} value={item.id}>{[item.marca, item.nombre].filter(Boolean).join(" · ")}</option>)}</select><button type="button" className={styles.iconButton} title="Crear producto" aria-label={`Crear producto para línea ${index + 1}`} disabled={!catalogReady} onClick={() => setNewProductLine(key)}><Plus size={17} /></button></div></div>}
          {fieldsFor(key).map(field => <CharacteristicInput key={field.id + "-" + selectedProducts[key]} field={field} lineKey={key} />)}
          {selectedProducts[key] && <><div className={styles.field}><label htmlFor={"quantity-" + key}>Cantidad</label><input id={"quantity-" + key} name={"quantity-" + key} type="number" min="1" max="1000" step="1" required defaultValue="1" /></div>
          <div className={styles.field}><label htmlFor={"cost-" + key}>Costo unitario USD</label><input id={"cost-" + key} name={"cost-" + key} type="number" min="0" step="0.01" required /></div></>}
        </div>{lineKeys.length > 1 && <button type="button" className={styles.cancel} onClick={() => removeLine(key)}>Quitar producto {index + 1}</button>}</div>;
      })}
      <button type="button" className={styles.addProduct} disabled={lineKeys.length >= 100} onClick={() => { setLineKeys(keys => [...keys, ++lineCounter.current]); setDirty(true); }}><Plus size={16} />Agregar producto</button>
      <div className={styles.field}><label htmlFor="notes">Observaciones</label><textarea id="notes" name="notes" /></div>
      {!catalogReady && <p role="status">Las categorías todavía no están disponibles para guardar.</p>}
      {error && <p className="operation-error" role="alert">{error}</p>}
      </div><footer className={styles.modalActions}><button type="button" className={styles.cancel} onClick={close}>Cancelar</button><button className={`primary-btn ${styles.submitPurchase}`} type="submit" disabled={!catalogReady || lineKeys.some(key => !selectedCategories[key] || !selectedProducts[key])}>{busy ? "Guardando…" : "Cargar en Reparto"}</button></footer></fieldset></form>
    </section></div>}
    {newProductLine !== null && <NewPurchaseProduct defaultCategoryId={selectedCategories[newProductLine]} onClose={() => setNewProductLine(null)} onCreated={(id, categoryId) => { setSelectedCategories(current => ({ ...current, [newProductLine]: categoryId })); setSelectedProducts(current => ({ ...current, [newProductLine]: id })); setNewProductLine(null); setDirty(true); }} />}
  </div>;
}
