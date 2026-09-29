"use client";
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ClipboardCopy, X } from "lucide-react";
import SupplierDeliveries from "./SupplierDeliveries";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useProgram } from "@/contexts/ProgramContext";
import { buildDeliveryGroups, buildPendingOrders, formatDeliveryMessage } from "@/lib/delivery";
import { runOperation, operationError } from "@/lib/supabase/operations";
import { formatUsd } from "@/lib/formatters";
import { memoryLabel } from "@/lib/purchase-details";
import { formatDate } from "@/lib/dates";
import layout from "@/components/ui/OperationalLayout.module.css";
import styles from "./DeliveryScreen.module.css";

export default function DeliveryScreen() {
  const { raw, loading, refresh } = useProgram();
  const source = useMemo(() => buildDeliveryGroups(raw), [raw]);
  const pending = useMemo(() => buildPendingOrders(raw), [raw]);
  const [order, setOrder] = useState<number[]>([]); const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({}); const [step, setStep] = useState<"receive" | "pay">("receive");
  const [amount, setAmount] = useState(""); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState("");
  const [pendingOpen, setPendingOpen] = useState(false); const [modalError, setModalError] = useState("");
  const orderedIds = [...order.filter(id => source.some(group => group.supplierId === id)), ...source.map(group => group.supplierId).filter(id => !order.includes(id))];
  const groups = orderedIds.map(id => source.find(group => group.supplierId === id)).filter((group): group is NonNullable<typeof group> => Boolean(group));
  const selected = pending.find(item => item.id === selectedId);
  const units = selected?.lines.flatMap(line => Array.from({ length: line.cantidad }, (_, index) => ({ key: `${line.id}-${index}`, line, index }))) ?? [];
  const receiveTotal = units.reduce((sum, unit) => sum + (checked[unit.key] ? unit.line.precio_costo_usd : 0), 0) + (selected ? raw.orders.find(item => item.id === selected.id)?.costo_envio_usd ?? 0 : 0);
  async function generate() { setBusy(true); setNotice(""); try { await navigator.clipboard.writeText(formatDeliveryMessage(groups)); await runOperation("pgl_generate_orders", { p_ids: groups.flatMap(group => group.lines.map(line => line.orderId)) }); await refresh(); setNotice("Pedidos generados y copiados. Ya están pendientes de recepción."); } catch (error) { setNotice(operationError(error)); } finally { setBusy(false); } }
  async function pay() { if (!selected) return; setBusy(true); setModalError(""); try { const payment = amount === "" ? receiveTotal : Number(amount); await runOperation("pgl_receive_and_pay_order", { p_id: selected.id, p_units: units.filter(unit => checked[unit.key]).map(unit => ({ detalle_id: unit.line.id })), p_amount: payment }); setSelectedId(null); setStep("receive"); setNotice(payment < receiveTotal ? `Pedido #${selected.id} recibido. Deuda: ${formatUsd(receiveTotal - payment)}.` : `Pedido #${selected.id} recibido y abonado.`); await refresh(); } catch (error) { setModalError(operationError(error)); } finally { setBusy(false); } }
  return <div className={`view ${layout.page}`}>
    <PageHeader title="Pedidos" action={<div className={styles.generate}>
      <button className={`primary-btn ${layout.headAction}`} disabled={loading || busy || !groups.length} onClick={() => void generate()}><ClipboardCopy size={16} />{busy ? "Generando…" : "Generar pedidos"}</button>
    </div>} />
    {notice && <p role="status">{notice}</p>}<p className={styles.hint}>Arrastrá las tarjetas para elegir el orden antes de generar.</p>
    <SupplierDeliveries groups={groups} loading={loading} onMove={(from,to)=>setOrder(()=>{const next=[...orderedIds];const [item]=next.splice(from,1);next.splice(to,0,item);return next;})} />
    <section className={styles.pending}><button className={styles.pendingToggle} aria-expanded={pendingOpen} onClick={()=>setPendingOpen(open=>!open)}><span>Pedidos sin recepcionar <span className="badge amber">{pending.length}</span></span><ChevronDown className={pendingOpen ? styles.chevronOpen : ""}/></button>{pendingOpen && <div className={styles.pendingCards}>{pending.length ? pending.map(item=><article key={item.id}><div><strong>#{item.id} · {item.supplier} <span className={styles.orderDate}>- {formatDate(item.date)}</span></strong><small>{item.lines.reduce((sum,line)=>sum+line.cantidad,0)} unidades · {formatUsd(item.total)}</small></div><button className={styles.validateButton} onClick={()=>{setModalError("");setChecked(Object.fromEntries(item.lines.flatMap(line=>Array.from({length:line.cantidad},(_,index)=>[`${line.id}-${index}`,true]))));setSelectedId(item.id);setStep("receive");}}>Validar recepción</button></article>) : <p>No hay recepciones pendientes.</p>}</div>}</section>
    {selected && <div className={styles.modalOverlay}><section className={styles.modal} role="dialog" aria-modal="true" aria-label={`Validar pedido ${selected.id}`}><header><div><small>PEDIDO #{selected.id} - {formatDate(selected.date)}</small><h2>{step === "receive" ? "Validar recepción" : "Registrar pago"}</h2></div><button aria-label="Cerrar" onClick={()=>setSelectedId(null)}><X/></button></header>{step === "receive" ? <><p>Desmarcá únicamente las unidades que no llegaron.</p><div className={styles.checkList}>{units.map(unit=><label key={unit.key}><input type="checkbox" checked={checked[unit.key] ?? true} onChange={e=>setChecked(current=>({...current,[unit.key]:e.target.checked}))}/><span><strong>{unit.line.product}</strong><small>{[memoryLabel(unit.line.ram,unit.line.rom),unit.line.variant,unit.line.color,`Unidad ${unit.index+1}`].filter(Boolean).join(" · ")}</small></span><b>{formatUsd(unit.line.precio_costo_usd)}</b></label>)}</div><footer><strong>Total a abonar: {formatUsd(receiveTotal)}</strong><button className="primary-btn" disabled={!units.some(unit=>checked[unit.key])} onClick={()=>{setAmount("");setStep("pay");}}>Validar pedido</button></footer></> : <><div className={styles.payBox}><CheckCircle2/><div><span>Total del pedido recibido</span><strong>{formatUsd(receiveTotal)}</strong></div></div><label className={styles.amount}>Importe abonado (USD)<input autoFocus type="number" min="0" max={Math.ceil(receiveTotal)} step="1" value={amount} placeholder={String(Math.round(receiveTotal))} onChange={e=>setAmount(e.target.value.replace(/\D/g,""))}/></label><p>Si dejás el importe vacío, se registrará el pago total.</p>{modalError && <p className="operation-error" role="alert">{modalError}</p>}<footer><button className={styles.backButton} onClick={()=>setStep("receive")}>Volver</button><button className="primary-btn" disabled={busy || Number(amount || receiveTotal)>receiveTotal} onClick={()=>void pay()}>{busy ? "Guardando…" : "Abonar"}</button></footer></>}</section></div>}
  </div>;
}
