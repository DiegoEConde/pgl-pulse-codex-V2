"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowDownToLine,
  BellRing,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Menu,
  PackageSearch,
  Search,
  Truck,
  Users,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import Logo from "@/components/core/Logo/Logo";
import Navigation from "@/components/core/Navigation/Navigation";
import MastersScreen from "@/components/features/masters/MastersScreen";
import PurchasesV2Screen from "@/components/features/purchases/PurchasesV2Screen";
import SalesV2Screen from "@/components/features/sales/SalesV2Screen";
import { useApp } from "@/contexts/AppContext";
import type { LocalDbStatus, MasterData, PurchaseData, SalesData } from "@/lib/local-db";
import type { PageId } from "@/types/navigation";
import styles from "./PulseMockup.module.css";

type MockupPageId = PageId;

type Metric = {
  label: string;
  value: string;
  detail: string;
  color: string;
  icon: ReactNode;
};

type Lane = {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "amber" | "violet" | "red" | "muted";
};

type Card = {
  title: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "amber" | "violet" | "red" | "muted";
};

type SideItem = {
  label: string;
  value: string;
  meta: string;
  tone: "blue" | "green" | "amber" | "violet" | "red" | "muted";
};

type MockupPage = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  metrics: Metric[];
  lanesTitle: string;
  lanesMeta: string;
  lanes: Lane[];
  cardsTitle: string;
  cards: Card[];
  tableTitle: string;
  tableBadge: string;
  columns: string[];
  rows: string[][];
  sideTitle: string;
  sideMeta: string;
  sideItems: SideItem[];
};

type PulseMockupProps = {
  localDbStatus?: LocalDbStatus;
  masterData?: MasterData;
  purchaseData?: PurchaseData;
  salesData?: SalesData;
};

const toneClass = {
  blue: "blue",
  green: "green",
  amber: "amber",
  violet: "violet",
  red: "red",
  muted: "muted-badge",
};

const pages: Record<MockupPageId, MockupPage> = {
  inicio: {
    eyebrow: "Panel general",
    title: "Operacion PGL Pulse v2",
    description: "Resumen visual de compras, ventas, reparto, stock y caja real.",
    action: "Vista diaria",
    metrics: [
      { label: "Caja USD", value: "US$ 8.420", detail: "Efectivo disponible", color: "var(--green)", icon: <Wallet size={17} /> },
      { label: "Caja ARS", value: "$ 1.280.000", detail: "Efectivo y transferencias", color: "var(--cyan)", icon: <CreditCard size={17} /> },
      { label: "Ventas abiertas", value: "18", detail: "6 con saldo pendiente", color: "var(--amber)", icon: <CircleDollarSign size={17} /> },
      { label: "Rutas activas", value: "4", detail: "2 pendientes de rendicion", color: "var(--violet)", icon: <Truck size={17} /> },
    ],
    lanesTitle: "Flujo operativo de hoy",
    lanesMeta: "Boceto con datos ficticios",
    lanes: [
      { label: "Ventas confirmadas", value: "12", detail: "Incluye 3 ventas sin stock", tone: "blue" },
      { label: "Compras pedidas", value: "9", detail: "5 retiros asignados a ruta", tone: "violet" },
      { label: "En poder repartidor", value: "7", detail: "Productos fuera de oficina", tone: "amber" },
      { label: "Listo para cerrar", value: "5", detail: "Pagado, entregado e IMEI cargado", tone: "green" },
    ],
    cardsTitle: "Alertas principales",
    cards: [
      { title: "Clientes con deuda", value: "US$ 1.140", detail: "Saldo asociado a ventas concretas", tone: "amber" },
      { title: "Proveedor fiado", value: "US$ 2.080", detail: "Compras recibidas sin pago total", tone: "violet" },
      { title: "IMEI pendiente", value: "8", detail: "Editable hasta finalizacion", tone: "blue" },
    ],
    tableTitle: "Agenda operativa",
    tableBadge: "Dia actual",
    columns: ["Hora", "Modulo", "Operacion", "Estado"],
    rows: [
      ["10:30", "Compras", "Retiro proveedor Norte Tech", "Asignado"],
      ["12:10", "Ventas", "Venta #1042 - entrega directa", "Pendiente"],
      ["15:00", "Caja", "Cierre parcial ARS", "Preparado"],
      ["18:20", "Caja", "Rendicion Ruta R-238 - Martin", "Con diferencia"],
    ],
    sideTitle: "Pulso financiero",
    sideMeta: "Caja general",
    sideItems: [
      { label: "Ingresos clientes", value: "US$ 5.760", meta: "Cobros registrados", tone: "green" },
      { label: "Pagos proveedores", value: "US$ 3.420", meta: "Egresos reales", tone: "red" },
      { label: "Diferencias", value: "US$ -40", meta: "Rendiciones abiertas", tone: "amber" },
    ],
  },
  ventas: {
    eyebrow: "Comercial",
    title: "Ventas",
    description: "Ventas con multiples items, saldo propio, comprobante y entrega separada.",
    action: "Nueva venta",
    metrics: [
      { label: "Total vendido", value: "US$ 12.950", detail: "Operacion del dia", color: "var(--blue)", icon: <CircleDollarSign size={17} /> },
      { label: "Saldo pendiente", value: "US$ 1.140", detail: "Pagos parciales o cero", color: "var(--amber)", icon: <Wallet size={17} /> },
      { label: "Sin stock", value: "3", detail: "Requieren compra vinculada", color: "var(--violet)", icon: <PackageSearch size={17} /> },
      { label: "Finalizables", value: "5", detail: "Entregado, pago e IMEI", color: "var(--green)", icon: <CheckCircle2 size={17} /> },
    ],
    lanesTitle: "Estados de venta",
    lanesMeta: "Venta como entidad principal",
    lanes: [
      { label: "Borrador", value: "2", detail: "No emite comprobante", tone: "muted" },
      { label: "Confirmada", value: "18", detail: "Con items y saldo", tone: "blue" },
      { label: "Entregada con deuda", value: "4", detail: "Entrega y pago separados", tone: "amber" },
      { label: "Finalizada", value: "7", detail: "Bloqueo confirmado", tone: "green" },
    ],
    cardsTitle: "Detalle esperado",
    cards: [
      { title: "Items por venta", value: "1-4", detail: "Cada producto tiene su estado", tone: "blue" },
      { title: "Comprobante", value: "#000418", detail: "Se emite desde el detalle", tone: "violet" },
      { title: "Comision", value: "8%", detail: "Congelada al registrar", tone: "green" },
    ],
    tableTitle: "Ventas recientes",
    tableBadge: "18 abiertas",
    columns: ["Venta", "Cliente", "Items", "Pago", "Entrega"],
    rows: [
      ["#1045", "Lucia Benitez", "iPhone 15 Pro + funda", "Parcial US$ 900", "Domicilio"],
      ["#1044", "Tomas Arias", "Samsung S24 Ultra", "Pendiente", "Retira local"],
      ["#1043", "Camila Rocha", "MacBook Air M3", "Pagado", "Sin stock"],
      ["#1042", "Diego Ruiz", "iPad 11", "Parcial US$ 300", "Ruta R-238"],
    ],
    sideTitle: "Venta #1045",
    sideMeta: "Preview lateral",
    sideItems: [
      { label: "Total", value: "US$ 1.420", meta: "Moneda principal USD", tone: "blue" },
      { label: "Cobrado", value: "US$ 900", meta: "Transferencia ARS con cotizacion", tone: "green" },
      { label: "Pendiente", value: "US$ 520", meta: "Saldo asociado a la venta", tone: "amber" },
    ],
  },
  compras: {
    eyebrow: "Proveedores",
    title: "Compras",
    description: "Pedidos por proveedor para stock de oficina o ventas especificas.",
    action: "Nueva compra",
    metrics: [
      { label: "Pedidas", value: "14", detail: "Items individuales", color: "var(--violet)", icon: <ArrowDownToLine size={17} /> },
      { label: "A retirar", value: "7", detail: "Asignables a ruta", color: "var(--blue)", icon: <Truck size={17} /> },
      { label: "Fiado proveedor", value: "US$ 2.080", detail: "Deuda con origen", color: "var(--amber)", icon: <Wallet size={17} /> },
      { label: "Recibidas", value: "11", detail: "Oficina o entrega directa", color: "var(--green)", icon: <ClipboardCheck size={17} /> },
    ],
    lanesTitle: "Ciclo de compra",
    lanesMeta: "Compra y compra_item",
    lanes: [
      { label: "Borrador", value: "3", detail: "Carga inicial", tone: "muted" },
      { label: "Pedida", value: "9", detail: "Confirmada al proveedor", tone: "blue" },
      { label: "En retiro", value: "5", detail: "Dentro de ruta", tone: "violet" },
      { label: "Recibida parcial", value: "2", detail: "Items resueltos", tone: "amber" },
    ],
    cardsTitle: "Origen de stock",
    cards: [
      { title: "Oficina", value: "8", detail: "Unidades ingresan a stock", tone: "green" },
      { title: "Venta especifica", value: "5", detail: "Compra vinculada a item vendido", tone: "blue" },
      { title: "Entrega directa", value: "3", detail: "Proveedor a cliente", tone: "violet" },
    ],
    tableTitle: "Pedidos a proveedor",
    tableBadge: "9 pedidos",
    columns: ["Compra", "Proveedor", "Destino", "Pago", "Estado"],
    rows: [
      ["C-220", "Norte Tech", "Stock oficina", "Paga al retirar", "En retiro"],
      ["C-219", "Import Mobile", "Venta #1043", "Fiado parcial", "Pedida"],
      ["C-218", "Distrito Apple", "Entrega directa", "Pagado", "Recibida parcial"],
      ["C-217", "Cell House", "Stock oficina", "Pendiente", "Borrador"],
    ],
    sideTitle: "Compra C-219",
    sideMeta: "Items individuales",
    sideItems: [
      { label: "MacBook Air M3", value: "US$ 1.050", meta: "Venta #1043", tone: "blue" },
      { label: "iPhone 15", value: "US$ 780", meta: "Stock oficina", tone: "green" },
      { label: "Pago proveedor", value: "US$ 900", meta: "Saldo US$ 930", tone: "amber" },
    ],
  },
  stock: {
    eyebrow: "Inventario",
    title: "Stock y unidades",
    description: "Disponibilidad vendible por unidad, con IMEI editable hasta cierre.",
    action: "Ajustar stock",
    metrics: [
      { label: "Disponibles", value: "36", detail: "En oficina sin venta", color: "var(--green)", icon: <Boxes size={17} /> },
      { label: "Reservadas", value: "11", detail: "Venta asociada", color: "var(--blue)", icon: <ClipboardCheck size={17} /> },
      { label: "Con repartidor", value: "7", detail: "Ubicacion temporal", color: "var(--violet)", icon: <Truck size={17} /> },
      { label: "Garantia", value: "2", detail: "Circuito separado", color: "var(--red)", icon: <PackageSearch size={17} /> },
    ],
    lanesTitle: "Ubicacion fisica",
    lanesMeta: "Unidades trazables",
    lanes: [
      { label: "Proveedor", value: "6", detail: "Esperadas por compra", tone: "muted" },
      { label: "Repartidor", value: "7", detail: "En poder de ruta", tone: "violet" },
      { label: "Oficina", value: "47", detail: "Disponible o reservada", tone: "green" },
      { label: "Cliente", value: "22", detail: "Entregadas", tone: "blue" },
    ],
    cardsTitle: "Calidad del dato",
    cards: [
      { title: "IMEI cargado", value: "74%", detail: "Unidades con identificador", tone: "green" },
      { title: "Pendiente IMEI", value: "8", detail: "Aun editable", tone: "amber" },
      { title: "Listas para bloquear", value: "5", detail: "Requieren confirmacion", tone: "blue" },
    ],
    tableTitle: "Unidades visibles",
    tableBadge: "36 disponibles",
    columns: ["Unidad", "Producto", "Ubicacion", "IMEI", "Estado"],
    rows: [
      ["U-5801", "iPhone 15 Pro 256", "Oficina", "3567...8801", "Disponible"],
      ["U-5802", "Samsung S24 Ultra", "Ruta R-238", "Pendiente", "En poder repartidor"],
      ["U-5803", "MacBook Air M3", "Proveedor", "Pendiente", "Esperada"],
      ["U-5804", "iPad 11", "Cliente", "3591...2044", "Entregada"],
    ],
    sideTitle: "Trazabilidad",
    sideMeta: "Unidad U-5802",
    sideItems: [
      { label: "Compra", value: "C-220", meta: "Norte Tech", tone: "violet" },
      { label: "Venta", value: "#1042", meta: "Diego Ruiz", tone: "blue" },
      { label: "Ruta", value: "R-238", meta: "Martin", tone: "amber" },
    ],
  },
  reparto: {
    eyebrow: "Logistica",
    title: "Reparto",
    description: "Rutas, paradas y asignacion de repartidores en una sola seccion operativa.",
    action: "Nueva ruta",
    metrics: [
      { label: "Programadas", value: "6", detail: "Para hoy", color: "var(--blue)", icon: <ClipboardList size={17} /> },
      { label: "En curso", value: "4", detail: "Repartidores activos", color: "var(--violet)", icon: <Truck size={17} /> },
      { label: "Cobro esperado", value: "US$ 2.180", detail: "Clientes en ruta", color: "var(--green)", icon: <CircleDollarSign size={17} /> },
      { label: "Pago esperado", value: "US$ 1.620", detail: "Proveedores", color: "var(--red)", icon: <Wallet size={17} /> },
    ],
    lanesTitle: "Ruta R-238",
    lanesMeta: "Orden de paradas",
    lanes: [
      { label: "1. Proveedor", value: "Norte Tech", detail: "Retirar 2 unidades", tone: "violet" },
      { label: "2. Cliente", value: "Diego Ruiz", detail: "Entregar iPad y cobrar", tone: "blue" },
      { label: "3. Proveedor", value: "Distrito Apple", detail: "Pagar US$ 620", tone: "red" },
      { label: "4. Oficina", value: "Rendir", detail: "Devolver dinero y comprobantes", tone: "green" },
    ],
    cardsTitle: "Control operativo",
    cards: [
      { title: "Dinero entregado", value: "US$ 900", detail: "Para pagos a proveedores", tone: "amber" },
      { title: "Productos a retirar", value: "5", detail: "Items de compra", tone: "violet" },
      { title: "Repartidor", value: "Martin", detail: "Perfil completo en Datos", tone: "blue" },
    ],
    tableTitle: "Rutas del dia",
    tableBadge: "4 en curso",
    columns: ["Ruta", "Repartidor", "Paradas", "Dinero", "Estado"],
    rows: [
      ["R-238", "Martin", "4", "US$ 900 entregado", "En curso"],
      ["R-239", "Sofia", "6", "ARS 320.000 entregado", "Programada"],
      ["R-240", "Nicolas", "3", "Sin anticipo", "Abierta con pendientes"],
      ["R-241", "Lara", "5", "US$ 400 entregado", "Parcialmente rendida"],
    ],
    sideTitle: "Parada actual",
    sideMeta: "Cliente",
    sideItems: [
      { label: "Direccion", value: "Av. Mitre 1420", meta: "Entrega a domicilio", tone: "blue" },
      { label: "Producto", value: "iPad 11", meta: "IMEI pendiente", tone: "violet" },
      { label: "A cobrar", value: "US$ 520", meta: "Saldo venta #1042", tone: "green" },
    ],
  },
  caja: {
    eyebrow: "Finanzas",
    title: "Caja",
    description: "Seccion unificada para cobros, pagos, rendiciones, diferencias y cierres.",
    action: "Nuevo movimiento",
    metrics: [
      { label: "Caja USD", value: "US$ 8.420", detail: "Efectivo disponible", color: "var(--green)", icon: <Wallet size={17} /> },
      { label: "Caja ARS", value: "$ 1.280.000", detail: "Efectivo y transferencias", color: "var(--cyan)", icon: <CreditCard size={17} /> },
      { label: "A rendir", value: "US$ 1.480", detail: "Rutas abiertas", color: "var(--amber)", icon: <Truck size={17} /> },
      { label: "Diferencias", value: "US$ -40", detail: "Ajustes pendientes", color: "var(--red)", icon: <BellRing size={17} /> },
    ],
    lanesTitle: "Subsecciones financieras",
    lanesMeta: "Todo nace en movimientos_dinero",
    lanes: [
      { label: "Cobros", value: "US$ 5.760", detail: "Clientes, ventas e items", tone: "green" },
      { label: "Pagos", value: "US$ 3.420", detail: "Proveedores y compras", tone: "red" },
      { label: "Rendiciones", value: "3", detail: "Rutas por cerrar", tone: "amber" },
      { label: "Cierres", value: "1", detail: "Snapshot de caja", tone: "violet" },
    ],
    cardsTitle: "Accesos de caja",
    cards: [
      { title: "Entrega repartidor", value: "US$ 900", detail: "Dinero para ruta R-238", tone: "blue" },
      { title: "Rendicion", value: "US$ -40", detail: "Diferencia detectada", tone: "red" },
      { title: "Cierre diario", value: "Pendiente", detail: "Incluye rutas abiertas", tone: "amber" },
    ],
    tableTitle: "Movimientos de caja",
    tableBadge: "Cobros, pagos y rendiciones",
    columns: ["Hora", "Tipo", "Importe", "Medio", "Referencia"],
    rows: [
      ["09:20", "Apertura", "US$ 6.080", "Efectivo USD", "Cierre anterior"],
      ["11:40", "Cobro cliente", "US$ 900", "Transferencia ARS", "Venta #1045"],
      ["13:05", "Entrega repartidor", "US$ -900", "Efectivo USD", "Ruta R-238"],
      ["18:20", "Diferencia rendicion", "US$ -40", "Ajuste", "Ruta R-238"],
    ],
    sideTitle: "Rendicion R-238",
    sideMeta: "Caja general",
    sideItems: [
      { label: "Esperado", value: "US$ 800", meta: "Entregado - pagado + cobrado", tone: "blue" },
      { label: "Devuelto", value: "US$ 760", meta: "Informado por repartidor", tone: "green" },
      { label: "Diferencia", value: "US$ -40", meta: "Saldo del repartidor", tone: "red" },
    ],
  },
  datos: {
    eyebrow: "Maestros",
    title: "Datos",
    description: "Clientes, proveedores, productos y usuarios con roles operativos.",
    action: "Nuevo registro",
    metrics: [
      { label: "Clientes", value: "184", detail: "Con deuda e historial", color: "var(--blue)", icon: <Users size={17} /> },
      { label: "Proveedores", value: "26", detail: "Direcciones y horarios", color: "var(--violet)", icon: <Building2 size={17} /> },
      { label: "Productos", value: "312", detail: "Catalogo comercial", color: "var(--green)", icon: <Boxes size={17} /> },
      { label: "Usuarios", value: "11", detail: "Admin, vendedor, repartidor", color: "var(--amber)", icon: <UsersRound size={17} /> },
    ],
    lanesTitle: "Roles",
    lanesMeta: "Acceso inicial",
    lanes: [
      { label: "Administrador", value: "2", detail: "Acceso completo", tone: "green" },
      { label: "Vendedor", value: "4", detail: "Opera sin metricas reservadas", tone: "blue" },
      { label: "Repartidor", value: "5", detail: "Pantalla limitada", tone: "violet" },
      { label: "Inactivos", value: "1", detail: "Sin acceso", tone: "muted" },
    ],
    cardsTitle: "Catalogos",
    cards: [
      { title: "Productos activos", value: "286", detail: "Categoria y atributos", tone: "green" },
      { title: "Clientes con direccion", value: "142", detail: "Entrega a domicilio", tone: "blue" },
      { title: "Proveedores con horario", value: "18", detail: "Orden de ruta", tone: "violet" },
    ],
    tableTitle: "Datos recientes",
    tableBadge: "Ultimos cambios",
    columns: ["Tipo", "Nombre", "Dato clave", "Estado"],
    rows: [
      ["Cliente", "Lucia Benitez", "Villa Urquiza", "Activo"],
      ["Proveedor", "Norte Tech", "10:00 - 17:00", "Activo"],
      ["Producto", "iPhone 15 Pro", "256 GB", "Activo"],
      ["Usuario", "Martin", "Repartidor", "Activo"],
    ],
    sideTitle: "Auditoria sensible",
    sideMeta: "Historial eventos",
    sideItems: [
      { label: "Cambios IMEI", value: "12", meta: "Antes y despues", tone: "blue" },
      { label: "Ediciones venta", value: "4", meta: "Ajustan comprobante", tone: "amber" },
      { label: "Ajustes caja", value: "3", meta: "Requieren responsable", tone: "red" },
    ],
  },
  reportes: {
    eyebrow: "Analisis",
    title: "Reportes",
    description: "Lecturas administrativas sobre ventas, costos, caja y repartos.",
    action: "Exportar",
    metrics: [
      { label: "Ganancia bruta", value: "US$ 4.820", detail: "Ventas finalizadas", color: "var(--green)", icon: <ChartNoAxesCombined size={17} /> },
      { label: "Costo reparto", value: "6.4%", detail: "Sobre ventas del periodo", color: "var(--amber)", icon: <Truck size={17} /> },
      { label: "Comisiones", value: "US$ 620", detail: "Ganadas al finalizar", color: "var(--violet)", icon: <UsersRound size={17} /> },
      { label: "Diferencias", value: "US$ -40", detail: "Caja y rendiciones", color: "var(--red)", icon: <BellRing size={17} /> },
    ],
    lanesTitle: "Vista mensual",
    lanesMeta: "Comparativas",
    lanes: [
      { label: "Semana 1", value: "US$ 9.8k", detail: "Ventas", tone: "blue" },
      { label: "Semana 2", value: "US$ 12.4k", detail: "Ventas", tone: "green" },
      { label: "Semana 3", value: "US$ 10.1k", detail: "Ventas", tone: "violet" },
      { label: "Semana 4", value: "US$ 13.7k", detail: "Ventas", tone: "amber" },
    ],
    cardsTitle: "Reportes imprescindibles",
    cards: [
      { title: "Productos vendidos", value: "84", detail: "Por categoria y marca", tone: "blue" },
      { title: "Saldos clientes", value: "US$ 1.140", detail: "Deuda asociada", tone: "amber" },
      { title: "Saldos proveedores", value: "US$ 2.080", detail: "Por compra concreta", tone: "violet" },
    ],
    tableTitle: "Ranking del periodo",
    tableBadge: "Octubre",
    columns: ["Producto", "Vendidos", "Costo", "Ganancia", "Margen"],
    rows: [
      ["iPhone 15 Pro", "18", "US$ 14.040", "US$ 4.320", "23%"],
      ["Samsung S24 Ultra", "11", "US$ 8.250", "US$ 2.120", "20%"],
      ["MacBook Air M3", "7", "US$ 7.350", "US$ 1.610", "18%"],
      ["iPad 11", "9", "US$ 4.950", "US$ 1.260", "20%"],
    ],
    sideTitle: "Margen visual",
    sideMeta: "Periodo actual",
    sideItems: [
      { label: "Ventas", value: "US$ 46.0k", meta: "Total bruto", tone: "blue" },
      { label: "Costos", value: "US$ 34.8k", meta: "Compras + reparto", tone: "red" },
      { label: "Resultado", value: "US$ 11.2k", meta: "Antes de ajustes", tone: "green" },
    ],
  },
};

export default function PulseMockup({ localDbStatus, masterData, purchaseData, salesData }: PulseMockupProps) {
  const { currentPage } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const page = pages[currentPage] ?? pages.inicio;
  const dbLabel = localDbStatus?.connected ? "Base local" : "Boceto v2";
  const dbDetail = localDbStatus?.connected
    ? `${localDbStatus.rowCount} registros / ${localDbStatus.tableCount} tablas`
    : "Visual estatico";

  return (
    <div className="app-shell">
      <header className={`topbar ${styles.topbar}`}>
        <Logo />
        <Navigation open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        <div className="system-state" aria-label="Estado del mockup">
          <span className={localDbStatus?.connected ? styles.statusOk : styles.statusWarn} />
          <div>
            <b>{dbLabel}</b>
            <small>{dbDetail}</small>
          </div>
        </div>
        <button className="mobile-menu" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "Cerrar menu" : "Abrir menu"}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      <main className={`workspace program-workspace ${styles.workspace}`}>
        {currentPage === "ventas" ? (
          <SalesV2Screen initialData={salesData ?? { ventas: [], venta_items: [], clientes: [], productos: [], vendedores: [], repartidores: [], unidades: [], compra_items: [], movimientos_dinero: [], rutas: [], ruta_items: [] }} />
        ) : currentPage === "compras" ? (
          <PurchasesV2Screen initialData={purchaseData ?? { compras: [], compra_items: [], proveedores: [], productos: [], repartidores: [], ventas: [], venta_items: [], clientes: [], rutas: [], ruta_items: [] }} />
        ) : currentPage === "datos" ? (
          <MastersScreen initialData={masterData ?? { productos: [], clientes: [], proveedores: [] }} />
        ) : <section className={`view ${styles.page}`}>
          <header className={styles.hero}>
            <div>
              <span className="eyebrow">{page.eyebrow}</span>
              <h1>{page.title}</h1>
              <p>{page.description}</p>
            </div>
            <span className={styles.visualAction}><Search size={15} />{page.action}</span>
          </header>

          <section className={styles.metrics} aria-label="Indicadores">
            {page.metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
          </section>

          <div className={styles.grid}>
            <section className={`${styles.panel} ${styles.flowPanel}`}>
              <PanelHead title={page.lanesTitle} badge={page.lanesMeta} />
              <div className={styles.lanes}>
                {page.lanes.map((lane) => <article className={styles.lane} key={lane.label}>
                  <span className={`badge ${toneClass[lane.tone]}`}>{lane.label}</span>
                  <strong>{lane.value}</strong>
                  <p>{lane.detail}</p>
                </article>)}
              </div>
            </section>

            <section className={`${styles.panel} ${styles.cardsPanel}`}>
              <PanelHead title={page.cardsTitle} badge="Resumen" />
              <div className={styles.cards}>
                {page.cards.map((card) => <article className={styles.summaryCard} key={card.title}>
                  <span className={`badge ${toneClass[card.tone]}`}>{card.title}</span>
                  <strong>{card.value}</strong>
                  <p>{card.detail}</p>
                </article>)}
              </div>
            </section>

            <section className={`${styles.panel} ${styles.tablePanel}`}>
              <PanelHead title={page.tableTitle} badge={page.tableBadge} />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>{page.columns.map((column) => <th key={column}>{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {page.rows.map((row) => <tr key={row.join("|")}>{row.map((cell, index) => <td key={cell + index}>{index === 0 ? <span className="mono">{cell}</span> : cell}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className={`${styles.panel} ${styles.sidePanel}`}>
              <PanelHead title={page.sideTitle} badge={page.sideMeta} />
              <div className={styles.sideItems}>
                {page.sideItems.map((item) => <article className={styles.sideItem} key={item.label}>
                  <span className={`badge ${toneClass[item.tone]}`}>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.meta}</p>
                </article>)}
              </div>
            </aside>
          </div>
        </section>}
      </main>
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <article className="metric" style={{ "--accent": metric.color } as CSSProperties}>
      <div className="metric-top">
        <span>{metric.label}</span>
        <i className="metric-icon">{metric.icon}</i>
      </div>
      <strong>{metric.value}</strong>
      <small>{metric.detail}</small>
    </article>
  );
}

function PanelHead({ title, badge }: { title: string; badge: string }) {
  return (
    <header className="panel-head">
      <div>
        <span className="eyebrow">{badge}</span>
        <h2>{title}</h2>
      </div>
    </header>
  );
}
