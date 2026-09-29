"use client";
import DashboardScreen from "@/components/features/dashboard/DashboardScreen";
import PurchasesScreen from "@/components/features/purchases/PurchasesScreen";
import SalesScreen from "@/components/features/sales/SalesScreen";
import StockScreen from "@/components/features/stock/StockScreen";
import DataScreen from "@/components/features/data/DataScreen";
import ReportsScreen from "@/components/features/reports/ReportsScreen";
import DeliveryScreen from "@/components/features/delivery/DeliveryScreen";
import { useApp } from "@/contexts/AppContext";
import { useProgram } from "@/contexts/ProgramContext";

export default function ScreenRouter() {
  const { currentPage } = useApp();
  const { loading, error, refreshing, refresh } = useProgram();
  if (loading) return <p role="status">Cargando PGL Pulse…</p>;
  if (error) return <section className="panel connection-message" role="alert"><p>{error}</p><button className="primary-btn" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? "Actualizando…" : "Reintentar conexión"}</button></section>;
  if (currentPage === "inicio") return <DashboardScreen />;
  if (currentPage === "compras") return <PurchasesScreen />;
  if (currentPage === "ventas") return <SalesScreen />;
  if (currentPage === "stock") return <StockScreen />;
  if (currentPage === "datos") return <DataScreen />;
  if (currentPage === "reportes") return <ReportsScreen />;
  return <DeliveryScreen />;
}
