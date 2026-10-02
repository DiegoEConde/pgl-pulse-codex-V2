"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { BarChart3, CreditCard, RefreshCw, Scale, TrendingUp, Truck, UsersRound, Wallet } from "lucide-react";
import type { InsightsData, Moneda } from "@/lib/local-db";
import type { RoleAccess } from "@/lib/permissions";
import styles from "./InsightsV2.module.css";

type ReportsV2ScreenProps = {
  initialData: InsightsData;
  access: RoleAccess;
};

const zeroTotals = { USD: 0, ARS: 0 };
const emptyData: InsightsData = {
  usuarios: [],
  alertas: [],
  reportes: {
    resumen: {
      ventas_confirmadas: 0,
      ventas_finalizadas: 0,
      compras_activas: 0,
      ingresos: zeroTotals,
      costos: zeroTotals,
      ganancia_cerrada: zeroTotals,
      comisiones: zeroTotals,
      costo_reparto_estimado: zeroTotals,
      margen_cerrado_pct: 0,
    },
    periodos: [],
    productos: [],
    vendedores: [],
    saldos_clientes: zeroTotals,
    saldos_proveedores: zeroTotals,
    diferencias_rendicion: zeroTotals,
  },
  permisos: {
    ADMINISTRADOR: {} as RoleAccess,
    VENDEDOR: {} as RoleAccess,
    REPARTIDOR: {} as RoleAccess,
  },
};

export default function ReportsV2Screen({ initialData, access }: ReportsV2ScreenProps) {
  const [data, setData] = useState<InsightsData>(initialData ?? emptyData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  if (!access.canSeeReports) {
    return (
      <section className={`view ${styles.page}`}>
        <div className={styles.restricted}>
          <strong>Reportes reservados</strong>
          <span>Este rol no tiene acceso a metricas administrativas.</span>
        </div>
      </section>
    );
  }

  const report = data.reportes;
  const summary = report.resumen;

  return (
    <section className={`view ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <span className="eyebrow">Analisis</span>
          <h1>Reportes</h1>
          <p>Ventas, compras, costos, ganancia cerrada, comisiones, reparto y saldos por periodo.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} onClick={refresh} disabled={saving} aria-label="Actualizar">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Indicadores de reportes">
        <Metric label="Ingresos" value={formatTotals(summary.ingresos)} detail={`${summary.ventas_confirmadas} ventas`} color="var(--blue)" icon={<TrendingUp size={17} />} />
        <Metric label="Ganancia cerrada" value={formatTotals(summary.ganancia_cerrada)} detail={`${summary.ventas_finalizadas} finalizadas`} color="var(--green)" icon={<Wallet size={17} />} />
        <Metric label="Costos" value={formatTotals(summary.costos)} detail={`${summary.compras_activas} compras activas`} color="var(--red)" icon={<Scale size={17} />} />
        <Metric label="Comisiones" value={formatTotals(summary.comisiones)} detail={`${summary.margen_cerrado_pct}% margen USD`} color="var(--violet)" icon={<UsersRound size={17} />} />
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.reportGrid}>
        <section className={`${styles.panel} ${styles.periods}`}>
          <PanelHeader title="Comparativa por periodo" meta="Mensual" />
          <div className="table-wrap">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Ventas</th>
                  <th>Finalizadas</th>
                  <th>Ingresos</th>
                  <th>Costos</th>
                  <th>Ganancia cerrada</th>
                </tr>
              </thead>
              <tbody>
                {report.periodos.map((row) => (
                  <tr key={row.periodo}>
                    <td><span className="mono">{row.periodo}</span></td>
                    <td>{row.ventas}</td>
                    <td>{row.ventas_finalizadas}</td>
                    <td>{formatTotals(row.ingresos)}</td>
                    <td>{formatTotals(row.costos)}</td>
                    <td>{formatTotals(row.ganancia_cerrada)}</td>
                  </tr>
                ))}
                {!report.periodos.length && <EmptyRow cols={6} />}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.products}`}>
          <PanelHeader title="Productos" meta="Comprados y vendidos" />
          <div className={styles.stack}>
            {report.productos.slice(0, 8).map((row) => (
              <article className={styles.summaryCard} key={row.producto_id}>
                <span className="badge blue">{row.vendidos} vendidos / {row.comprados} comprados</span>
                <strong>{row.nombre}</strong>
                <small>Ganancia cerrada {formatTotals(row.ganancia_cerrada)}</small>
              </article>
            ))}
            {!report.productos.length && <p className={styles.empty}>Sin productos para reportar</p>}
          </div>
        </section>

        <section className={`${styles.panel} ${styles.sellers}`}>
          <PanelHeader title="Vendedores" meta="Comisiones cerradas" />
          <div className="table-wrap">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Ventas</th>
                  <th>Ingresos</th>
                  <th>Comision</th>
                </tr>
              </thead>
              <tbody>
                {report.vendedores.map((row) => (
                  <tr key={row.usuario_id}>
                    <td>{row.nombre}</td>
                    <td>{row.ventas_finalizadas}</td>
                    <td>{formatTotals(row.ingresos)}</td>
                    <td>{formatTotals(row.comisiones)}</td>
                  </tr>
                ))}
                {!report.vendedores.length && <EmptyRow cols={4} />}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.balances}`}>
          <PanelHeader title="Saldos y reparto" meta="Administracion" />
          <div className={styles.stack}>
            <Summary label="Saldos clientes" value={formatTotals(report.saldos_clientes)} icon={<CreditCard size={17} />} />
            <Summary label="Saldos proveedores" value={formatTotals(report.saldos_proveedores)} icon={<Scale size={17} />} />
            <Summary label="Diferencias rendicion" value={formatTotals(report.diferencias_rendicion)} icon={<BarChart3 size={17} />} />
            <Summary label="Costo reparto estimado" value={formatTotals(summary.costo_reparto_estimado)} icon={<Truck size={17} />} />
          </div>
        </section>
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

function PanelHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <header className={styles.panelHeader}>
      <div>
        <span className="eyebrow">{meta}</span>
        <h2>{title}</h2>
      </div>
    </header>
  );
}

function Summary({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <article className={styles.summaryCard}>
      <span className="badge violet">{icon}{label}</span>
      <strong>{value}</strong>
      <small>Calculado desde movimientos y estados reales</small>
    </article>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className={styles.empty}>Sin datos para reportar</td>
    </tr>
  );
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
