"use client";

import { ArrowDownToLine, ArrowRight, BellRing, ChartNoAxesCombined, CircleDollarSign, ClipboardCheck, ClipboardList, PackageSearch, Users, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDate, OPERATIONAL_TIME_ZONE } from "@/lib/dates";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import MetricCard from "@/components/ui/MetricCard/MetricCard";
import { useApp } from "@/contexts/AppContext";
import { formatUsd } from "@/lib/formatters";
import { useProgram } from "@/contexts/ProgramContext";
import { buildPendingOrders } from "@/lib/delivery";
import styles from "./DashboardScreen.module.css";

function currentGreeting() {
  const hour = Number(new Intl.DateTimeFormat("es-AR", {
    timeZone: OPERATIONAL_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date()));
  if (hour >= 6 && hour <= 12) return "¡Buenos días!";
  if (hour >= 13 && hour <= 19) return "¡Buenas tardes!";
  return "¡Buenas noches!";
}

export default function DashboardScreen() {
  const [greeting, setGreeting] = useState(currentGreeting);
  const [alertsOpen, setAlertsOpen] = useState(false);
  useEffect(() => {
    const update = () => setGreeting(currentGreeting());
    const interval = window.setInterval(update, 1000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", update);
    };
  }, []);
  useEffect(() => {
    if (!alertsOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setAlertsOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [alertsOpen]);
  const { navigate } = useApp();
  const { sales, orders, stock, today, raw } = useProgram();
  const formattedToday = formatDate(today);
  const dailySales = sales.filter(sale => sale.date === today);
  const dailyOrders = orders.filter(order => order.date === today);
  const drafts = dailyOrders.filter(order => order.status === "BORRADOR").length;
  const confirmed = dailyOrders.length - drafts;
  const closed = dailyOrders.filter(order => order.closed).length;
  const total = dailyOrders.reduce((sum, order) => sum + order.merchandiseUsd + order.shippingUsd, 0);
  const pendingOrders = buildPendingOrders(raw);
  const debts = raw.suppliers.map(supplier => {
    const supplierOrders = raw.orders.filter(order => order.proveedor_id === supplier.id && order.estado === "RECIBIDO");
    const billed = supplierOrders.reduce((sum, order) => sum + raw.lines.filter(line => line.pedido_id === order.id).reduce((lineSum, line) => lineSum + line.cantidad * line.precio_costo_usd, 0) + order.costo_envio_usd, 0);
    const paid = (raw.supplierPayments ?? []).filter(payment => payment.proveedor_id === supplier.id).reduce((sum, payment) => sum + payment.importe_usd, 0);
    return { name: supplier.nombre, total: Math.max(0, billed - paid) };
  }).filter(item => item.total > 0);
  const debtTotal = debts.reduce((sum, item) => sum + item.total, 0);
  const clientDebts = raw.clients.map(client => ({
    name: client.nombre,
    total: sales.filter(sale => sale.clientId === client.id).reduce((sum, sale) => sum + sale.pendingUsd, 0),
  })).filter(item => item.total > 0);
  const clientDebtTotal = clientDebts.reduce((sum, item) => sum + item.total, 0);
  const incompleteStockCount = stock.filter(unit => {
    if (unit.state !== "STOCK") return false;
    const rawUnit = raw.units.find(item => item.id === unit.databaseId);
    const product = raw.products.find(item => item.id === rawUnit?.producto_id);
    const categoryId = product?.categoria_id ?? raw.categories?.find(item => item.nombre === product?.categoria.toLowerCase())?.id;
    const characteristicKeys = new Set((raw.categoryCharacteristics ?? []).filter(item => item.categoria_id === categoryId).map(item => item.clave));
    const needsRam = characteristicKeys.has("ram") && !unit.ram;
    const needsVariant = [...characteristicKeys].some(key => key !== "color" && key !== "ram") && !unit.variant;
    return needsRam || needsVariant;
  }).length;
  const alerts = [
    { icon: PackageSearch, title: "Unidades con datos incompletos", description: "Completá los atributos visibles del stock", color: "var(--red)", count: incompleteStockCount, page: "stock" as const },
    { icon: ClipboardList, title: "Pedidos sin recepcionar", description: "Validá la recepción por proveedor", color: "var(--violet)", count: pendingOrders.length, page: "reparto" as const },
    { icon: Wallet, title: "Deudas con proveedores", description: "Pedidos recibidos con saldo", color: "var(--amber)", count: debts.length, page: "reparto" as const },
    { icon: Users, title: "Deudas de clientes", description: "Ventas con saldo pendiente", color: "var(--cyan)", count: clientDebts.length, page: "ventas" as const },
  ].filter(alert => alert.count > 0);
  const alertCenter = (className: string, compact = false) => (
    <aside className={`${styles.card} ${styles.alerts} ${className}`} aria-labelledby={compact ? "alerts-menu-title" : "alerts-title"}>
      <header className={styles.alertHeader}>
        <span className={styles.bell}><BellRing size={21} /></span>
        <h2 id={compact ? "alerts-menu-title" : "alerts-title"}>Centro de alertas</h2>
        {compact && <button type="button" className={styles.alertClose} aria-label="Cerrar alertas" onClick={() => setAlertsOpen(false)}><X size={18} /></button>}
      </header>
      <p className={styles.alertIntro}>{alerts.length ? "Los pendientes de tu operación, en un solo lugar." : "No hay alertas pendientes."}</p>
      {alerts.length > 0 && <div className={styles.alertList}>{alerts.map(({ icon: Icon, title, description, color, count, page }) => <button className={styles.alertItem} key={title} style={{ "--alert-color": color } as React.CSSProperties} onClick={() => { setAlertsOpen(false); navigate(page); }}><div className={styles.alertItemHead}><Icon size={19} /><strong>{count}</strong></div><h3>{title}</h3><p>{description}</p></button>)}</div>}
      <footer className={styles.alertFooter}><span className={styles.statusDot} />Datos actualizados desde la operación</footer>
    </aside>
  );

  return <div className={`view ${styles.page}`}>
    <PageHeader
      title={greeting}
      description={formattedToday}
      action={
        <div className={styles.headerActions}>
          <div className={`date-block ${styles.desktopDate}`}><b>Operación del día</b>{formattedToday}</div>
          <div className={styles.alertMenu}>
            <button type="button" className={styles.alertTrigger} aria-label="Abrir centro de alertas" aria-expanded={alertsOpen} aria-controls="dashboard-alerts-menu" onClick={() => setAlertsOpen(open => !open)}>
              <BellRing size={21} />
              {alerts.length > 0 && <span>{alerts.length}</span>}
            </button>
            {alertsOpen && <button type="button" className={styles.alertBackdrop} aria-label="Cerrar alertas" onClick={() => setAlertsOpen(false)} />}
            {alertsOpen && <div id="dashboard-alerts-menu" className={styles.alertDropdown}>{alertCenter(styles.dropdownAlerts, true)}</div>}
          </div>
        </div>
      }
    />
    <div className={styles.layout}>
      <section className={styles.metrics} aria-label="Resumen del día">
        <MetricCard label="Ventas de hoy" value={formatUsd(dailySales.reduce((sum, sale) => sum + sale.priceUsd, 0))} icon={<CircleDollarSign size={17} />} />
        <MetricCard label="Ganancia" value={formatUsd(dailySales.reduce((sum, sale) => sum + sale.priceUsd - sale.costUsd - sale.commissionUsd, 0))} icon={<ChartNoAxesCombined size={17} />} color="var(--green)" />
        <MetricCard label="Compras" value={formatUsd(total)} icon={<ArrowDownToLine size={17} />} color="var(--violet)" />
      </section>

      <article className={styles.card + " " + styles.purchases}>
        <header className={styles.cardHead}><div><span className={styles.kicker}>Operación del día</span><h2>Compras y pedidos</h2></div><button className={styles.link} onClick={() => navigate("compras")}>Ver compras <ArrowRight size={14} /></button></header>
        <div className={styles.purchaseSummary}>
          <div className={styles.purchaseCount}><strong>{dailyOrders.length}</strong><span>{dailyOrders.length === 1 ? "compra registrada" : "compras registradas"}</span></div>
          <div className={styles.progressSteps}>
            <div><span className={styles.stepIcon}><ClipboardList size={17} /></span><strong>{drafts}</strong><span>Sin confirmar</span></div>
            <div><span className={styles.stepIcon}><ClipboardCheck size={17} /></span><strong>{confirmed}</strong><span>Confirmados</span></div>
            <div><span className={styles.stepIcon}><ArrowDownToLine size={17} /></span><strong>{closed}</strong><span>En historial</span></div>
          </div>
        </div>
        <footer className={styles.purchaseFooter}><span className={styles.statusDot} /><p>{!dailyOrders.length ? "Todavía no hay compras registradas hoy." : drafts ? `${drafts} pedidos creados esperan confirmación.` : "Todos los pedidos del día están confirmados."}</p><button className={styles.link} onClick={() => navigate("reparto")}>Ir a Reparto <ArrowRight size={14} /></button></footer>
      </article>

      <section className={styles.financeGrid} aria-label="Saldos pendientes">
        <article className={styles.card + " " + styles.debt}>
          <header className={styles.cardHead}><span className={styles.kicker}>Deuda pendiente con proveedores</span><Wallet size={20} className={styles.debtIcon} /></header>
          <div className={styles.debtTotal}><strong>{formatUsd(debtTotal)}</strong><span>Total por pagar</span></div>
          <div className={styles.debtTable}><table><thead><tr><th>Proveedor</th><th>Total</th></tr></thead><tbody>{debts.length ? debts.map(item => <tr key={item.name}><td>{item.name}</td><td>{formatUsd(item.total)}</td></tr>) : <tr><td colSpan={2}>No hay saldos pendientes.</td></tr>}</tbody></table></div>
        </article>
        <article className={styles.card + " " + styles.clientDebt}>
          <header className={styles.cardHead}><span className={styles.kicker}>Deuda pendiente de clientes</span><Users size={20} className={styles.clientDebtIcon} /></header>
          <div className={styles.clientDebtTotal}><strong>{formatUsd(clientDebtTotal)}</strong><span>Total por cobrar</span></div>
          <div className={styles.debtTable}><table><thead><tr><th>Cliente</th><th>Total</th></tr></thead><tbody>{clientDebts.length ? clientDebts.map(item => <tr key={item.name}><td>{item.name}</td><td>{formatUsd(item.total)}</td></tr>) : <tr><td colSpan={2}>No hay saldos pendientes.</td></tr>}</tbody></table></div>
        </article>
      </section>

      {alertCenter(styles.fixedAlerts)}
    </div>
  </div>;
}
