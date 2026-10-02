"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { AlertTriangle, BellRing, CreditCard, PackageSearch, RefreshCw, Route, TrendingUp, Wallet } from "lucide-react";
import type { InsightAlert, InsightsData, Moneda, RolUsuario, UUID } from "@/lib/local-db";
import type { RoleAccess } from "@/lib/permissions";
import styles from "./InsightsV2.module.css";

type HomeV2ScreenProps = {
  initialData: InsightsData;
  access: RoleAccess;
  activeUserId: UUID | null;
};

const emptyData: InsightsData = {
  usuarios: [],
  alertas: [],
  reportes: {
    resumen: {
      ventas_confirmadas: 0,
      ventas_finalizadas: 0,
      compras_activas: 0,
      ingresos: { USD: 0, ARS: 0 },
      costos: { USD: 0, ARS: 0 },
      ganancia_cerrada: { USD: 0, ARS: 0 },
      comisiones: { USD: 0, ARS: 0 },
      costo_reparto_estimado: { USD: 0, ARS: 0 },
      margen_cerrado_pct: 0,
    },
    periodos: [],
    productos: [],
    vendedores: [],
    saldos_clientes: { USD: 0, ARS: 0 },
    saldos_proveedores: { USD: 0, ARS: 0 },
    diferencias_rendicion: { USD: 0, ARS: 0 },
  },
  permisos: {
    ADMINISTRADOR: {} as RoleAccess,
    VENDEDOR: {} as RoleAccess,
    REPARTIDOR: {} as RoleAccess,
  },
};

export default function HomeV2Screen({ initialData, access, activeUserId }: HomeV2ScreenProps) {
  const [data, setData] = useState<InsightsData>(initialData ?? emptyData);
  const [typeFilter, setTypeFilter] = useState("TODAS");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const alerts = useMemo(() => filterAlerts(data.alertas, access.rol, activeUserId, typeFilter), [access.rol, activeUserId, data.alertas, typeFilter]);
  const summary = data.reportes.resumen;
  const alertGroups = useMemo(() => groupAlerts(alerts), [alerts]);

  async function refresh() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/local-db/insights", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo actualizar.");
      setData(body.data);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`view ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <span className="eyebrow">Panel general</span>
          <h1>Inicio</h1>
          <p>Alertas operativas, lectura diaria y pendientes reales del modelo v2.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} onClick={refresh} disabled={saving} aria-label="Actualizar">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {access.canSeeMetrics ? (
        <section className={styles.metrics} aria-label="Indicadores generales">
          <Metric label="Ventas" value={String(summary.ventas_confirmadas)} detail={`${summary.ventas_finalizadas} finalizadas`} color="var(--blue)" icon={<TrendingUp size={17} />} />
          <Metric label="Ganancia cerrada" value={formatTotals(summary.ganancia_cerrada)} detail={`${summary.margen_cerrado_pct}% margen USD`} color="var(--green)" icon={<Wallet size={17} />} />
          <Metric label="Clientes deben" value={formatTotals(data.reportes.saldos_clientes)} detail="Saldos abiertos" color="var(--amber)" icon={<CreditCard size={17} />} />
          <Metric label="Alertas" value={String(alerts.length)} detail="Pendientes visibles" color="var(--red)" icon={<BellRing size={17} />} />
        </section>
      ) : (
        <section className={styles.restricted}>
          <strong>Metricas reservadas</strong>
          <span>Este rol trabaja con alertas y operaciones, sin reportes administrativos.</span>
        </section>
      )}

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <div>
              <span className="eyebrow">Centro de alertas</span>
              <h2>Pendientes reales</h2>
            </div>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Tipo de alerta">
              <option value="TODAS">Todas</option>
              <option value="VENTA_SIN_STOCK">Sin stock</option>
              <option value="VENTA_CON_DEUDA">Deudas</option>
              <option value="ENTREGA_PENDIENTE">Entregas</option>
              <option value="RUTA_ABIERTA">Rutas</option>
              <option value="IMEI_PENDIENTE">IMEI</option>
              <option value="DIFERENCIA_CAJA">Caja</option>
            </select>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.alertList}>
            {alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
            {!alerts.length && <p className={styles.empty}>Sin alertas pendientes</p>}
          </div>
        </section>

        <aside className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <span className="eyebrow">Resumen</span>
              <h2>Por tipo</h2>
            </div>
          </header>
          <div className={styles.stack}>
            {alertGroups.map((group) => (
              <article className={styles.summaryCard} key={group.type}>
                <span className={`badge ${badgeForAlertType(group.type)}`}>{group.type}</span>
                <strong>{group.count}</strong>
                <small>{group.detail}</small>
              </article>
            ))}
            {!alertGroups.length && <p className={styles.empty}>Todo al dia</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}

function Metric({ label, value, detail, color, icon }: { label: string; value: string; detail: string; color: string; icon: ReactNode }) {
  return (
    <article className="metric" style={{ "--accent": color } as CSSProperties}>
      <div className="metric-top">
        <span>{label}</span>
        <i className="metric-icon">{icon}</i>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function AlertCard({ alert }: { alert: InsightAlert }) {
  return (
    <article className={styles.alertCard}>
      <span className={styles.alertIcon}>{iconForAlert(alert.tipo)}</span>
      <div>
        <span className={`badge ${badgeForSeverity(alert.severidad)}`}>{alert.severidad}</span>
        <strong>{alert.titulo}</strong>
        <small>{alert.detalle}</small>
      </div>
      <span className={`badge ${badgeForAlertType(alert.tipo)}`}>{alert.page}</span>
    </article>
  );
}

function filterAlerts(alerts: InsightAlert[], role: RolUsuario, userId: UUID | null, typeFilter: string) {
  return alerts.filter((alert) => {
    if (typeFilter !== "TODAS" && alert.tipo !== typeFilter) return false;
    if (role === "ADMINISTRADOR") return true;
    if (role === "VENDEDOR") return alert.tipo !== "DIFERENCIA_CAJA";
    if (role === "REPARTIDOR") return (alert.tipo === "ENTREGA_PENDIENTE" || alert.tipo === "RUTA_ABIERTA") && (!userId || alert.usuario_id === userId);
    return false;
  });
}

function groupAlerts(alerts: InsightAlert[]) {
  const groups = new Map<string, { type: string; count: number; detail: string }>();
  for (const alert of alerts) {
    const group = groups.get(alert.tipo) ?? { type: alert.tipo, count: 0, detail: labelForAlert(alert.tipo) };
    group.count += 1;
    groups.set(alert.tipo, group);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

function iconForAlert(type: InsightAlert["tipo"]) {
  if (type === "VENTA_SIN_STOCK" || type === "IMEI_PENDIENTE") return <PackageSearch size={17} />;
  if (type === "ENTREGA_PENDIENTE" || type === "RUTA_ABIERTA") return <Route size={17} />;
  if (type === "DIFERENCIA_CAJA") return <AlertTriangle size={17} />;
  return <BellRing size={17} />;
}

function labelForAlert(type: string) {
  if (type === "VENTA_SIN_STOCK") return "Ventas que necesitan abastecimiento";
  if (type === "VENTA_CON_DEUDA") return "Saldos de clientes pendientes";
  if (type === "ENTREGA_PENDIENTE") return "Entregas sin confirmar";
  if (type === "RUTA_ABIERTA") return "Rutas no rendidas o abiertas";
  if (type === "IMEI_PENDIENTE") return "Unidades sin identificador";
  if (type === "DIFERENCIA_CAJA") return "Diferencias de caja/rendicion";
  return "Pendientes";
}

function badgeForSeverity(severity: InsightAlert["severidad"]) {
  if (severity === "alta") return "red";
  if (severity === "media") return "amber";
  return "blue";
}

function badgeForAlertType(type: string) {
  if (type === "DIFERENCIA_CAJA" || type === "VENTA_CON_DEUDA") return "amber";
  if (type === "VENTA_SIN_STOCK" || type === "RUTA_ABIERTA") return "violet";
  if (type === "ENTREGA_PENDIENTE") return "blue";
  return "green";
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
