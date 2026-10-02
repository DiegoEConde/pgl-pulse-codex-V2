import { getRoleAccess, type AppPageId, type RoleAccess } from "../permissions";
import { createLocalDbClient, type LocalDbClientOptions } from "./client";
import type {
  ClienteRow,
  CompraItemRow,
  CompraRow,
  Moneda,
  MovimientoDineroRow,
  ProductoRow,
  RolUsuario,
  RutaItemRow,
  RutaRow,
  UnidadRow,
  UsuarioRow,
  VentaItemRow,
  VentaRow,
  UUID,
} from "./schema";

export type InsightAlertType =
  | "VENTA_SIN_STOCK"
  | "VENTA_CON_DEUDA"
  | "ENTREGA_PENDIENTE"
  | "RUTA_ABIERTA"
  | "IMEI_PENDIENTE"
  | "DIFERENCIA_CAJA";

export type InsightSeverity = "alta" | "media" | "baja";

export type InsightAlert = {
  id: string;
  tipo: InsightAlertType;
  severidad: InsightSeverity;
  titulo: string;
  detalle: string;
  entidad: "venta" | "venta_item" | "ruta" | "ruta_item" | "unidad" | "movimiento_dinero";
  entidad_id: UUID;
  page: AppPageId;
  usuario_id: UUID | null;
  creado_en: string;
};

export type InsightMoneyTotals = Record<Moneda, number>;

export type PeriodReportRow = {
  periodo: string;
  ventas: number;
  ventas_finalizadas: number;
  compras: number;
  ingresos: InsightMoneyTotals;
  costos: InsightMoneyTotals;
  ganancia_cerrada: InsightMoneyTotals;
};

export type ProductReportRow = {
  producto_id: UUID;
  nombre: string;
  vendidos: number;
  comprados: number;
  ingresos: InsightMoneyTotals;
  costos: InsightMoneyTotals;
  ganancia_cerrada: InsightMoneyTotals;
};

export type SellerReportRow = {
  usuario_id: UUID;
  nombre: string;
  ventas_finalizadas: number;
  ingresos: InsightMoneyTotals;
  comisiones: InsightMoneyTotals;
};

export type InsightsReport = {
  resumen: {
    ventas_confirmadas: number;
    ventas_finalizadas: number;
    compras_activas: number;
    ingresos: InsightMoneyTotals;
    costos: InsightMoneyTotals;
    ganancia_cerrada: InsightMoneyTotals;
    comisiones: InsightMoneyTotals;
    costo_reparto_estimado: InsightMoneyTotals;
    margen_cerrado_pct: number;
  };
  periodos: PeriodReportRow[];
  productos: ProductReportRow[];
  vendedores: SellerReportRow[];
  saldos_clientes: InsightMoneyTotals;
  saldos_proveedores: InsightMoneyTotals;
  diferencias_rendicion: InsightMoneyTotals;
};

export interface InsightsData {
  usuarios: UsuarioRow[];
  alertas: InsightAlert[];
  reportes: InsightsReport;
  permisos: Record<RolUsuario, RoleAccess>;
}

export type RoleScopedInsights = {
  role: RolUsuario;
  userId: UUID | null;
  access: RoleAccess;
  alertas: InsightAlert[];
  reportes: InsightsReport | null;
};

export function emptyInsightsData(): InsightsData {
  return {
    usuarios: [],
    alertas: [],
    reportes: createEmptyReport(),
    permisos: {
      ADMINISTRADOR: getRoleAccess("ADMINISTRADOR"),
      VENDEDOR: getRoleAccess("VENDEDOR"),
      REPARTIDOR: getRoleAccess("REPARTIDOR"),
    },
  };
}

export async function listInsightsData(options: LocalDbClientOptions = {}): Promise<InsightsData> {
  const db = createLocalDbClient(options);
  const [usuarios, clientes, productos, ventas, ventaItems, compras, compraItems, unidades, rutas, rutaItems, movimientos] = await Promise.all([
    db.listRows("usuarios"),
    db.listRows("clientes"),
    db.listRows("productos"),
    db.listRows("ventas"),
    db.listRows("venta_items"),
    db.listRows("compras"),
    db.listRows("compra_items"),
    db.listRows("unidades"),
    db.listRows("rutas"),
    db.listRows("ruta_items"),
    db.listRows("movimientos_dinero"),
  ]);

  return {
    usuarios: sortNamedRows(usuarios),
    alertas: buildAlerts({ ventas, ventaItems, clientes, productos, unidades, rutas, rutaItems, movimientos }),
    reportes: buildReports({ usuarios, productos, ventas, ventaItems, compras, compraItems, unidades, rutas, movimientos }),
    permisos: emptyInsightsData().permisos,
  };
}

export function scopeInsightsForRole(data: InsightsData, role: RolUsuario, userId: UUID | null = null): RoleScopedInsights {
  const access = getRoleAccess(role);
  const alertas = data.alertas.filter((alert) => {
    if (role === "ADMINISTRADOR") return true;
    if (role === "VENDEDOR") return alert.tipo !== "DIFERENCIA_CAJA";
    if (role === "REPARTIDOR") return (alert.tipo === "ENTREGA_PENDIENTE" || alert.tipo === "RUTA_ABIERTA") && (!userId || alert.usuario_id === userId);
    return false;
  });

  return {
    role,
    userId,
    access,
    alertas,
    reportes: access.canSeeReports ? data.reportes : null,
  };
}

function buildAlerts({
  ventas,
  ventaItems,
  clientes,
  productos,
  unidades,
  rutas,
  rutaItems,
  movimientos,
}: {
  ventas: VentaRow[];
  ventaItems: VentaItemRow[];
  clientes: ClienteRow[];
  productos: ProductoRow[];
  unidades: UnidadRow[];
  rutas: RutaRow[];
  rutaItems: RutaItemRow[];
  movimientos: MovimientoDineroRow[];
}): InsightAlert[] {
  const alerts: InsightAlert[] = [];
  const saleMap = new Map(ventas.map((sale) => [sale.id, sale]));
  const clientMap = new Map(clientes.map((client) => [client.id, client]));
  const productMap = new Map(productos.map((product) => [product.id, product]));
  const routeMap = new Map(rutas.map((route) => [route.id, route]));

  for (const item of ventaItems) {
    const sale = saleMap.get(item.venta_id);
    if (!sale || sale.estado === "CANCELADA" || item.estado === "CANCELADO") continue;
    if (item.compra_item_id && !item.unidad_id && item.estado === "PENDIENTE_ABASTECIMIENTO") {
      alerts.push({
        id: `VENTA_SIN_STOCK:${item.id}`,
        tipo: "VENTA_SIN_STOCK",
        severidad: "alta",
        titulo: `Venta #${sale.numero} sin stock`,
        detalle: `${clientMap.get(sale.cliente_id)?.nombre ?? "Cliente"} - ${productMap.get(item.producto_id)?.nombre ?? "Producto"}`,
        entidad: "venta_item",
        entidad_id: item.id,
        page: "ventas",
        usuario_id: sale.vendedor_id,
        creado_en: item.creado_en,
      });
    }
  }

  for (const sale of ventas) {
    if (sale.estado !== "CANCELADA" && sale.saldo_pendiente > 0) {
      alerts.push({
        id: `VENTA_CON_DEUDA:${sale.id}`,
        tipo: "VENTA_CON_DEUDA",
        severidad: "media",
        titulo: `Venta #${sale.numero} con deuda`,
        detalle: `${clientMap.get(sale.cliente_id)?.nombre ?? "Cliente"} debe ${formatMoney(sale.saldo_pendiente, sale.moneda_principal)}`,
        entidad: "venta",
        entidad_id: sale.id,
        page: "caja",
        usuario_id: sale.vendedor_id,
        creado_en: sale.fecha,
      });
    }
  }

  for (const routeItem of rutaItems) {
    if (routeItem.tipo !== "ENTREGAR_CLIENTE" || !["PENDIENTE", "ABIERTA"].includes(routeItem.estado)) continue;
    const route = routeMap.get(routeItem.ruta_id);
    if (!route || route.estado === "CANCELADA" || route.estado === "RENDIDA") continue;
    alerts.push({
      id: `ENTREGA_PENDIENTE:${routeItem.id}`,
      tipo: "ENTREGA_PENDIENTE",
      severidad: "media",
      titulo: `Entrega pendiente`,
      detalle: `${clientMap.get(routeItem.cliente_id ?? "")?.nombre ?? "Cliente"} - ruta ${route.id.slice(0, 8)}`,
      entidad: "ruta_item",
      entidad_id: routeItem.id,
      page: "reparto",
      usuario_id: route.repartidor_id,
      creado_en: routeItem.creado_en,
    });
  }

  for (const route of rutas) {
    if (!["EN_CURSO", "ABIERTA_CON_PENDIENTES", "PARCIALMENTE_RENDIDA"].includes(route.estado)) continue;
    alerts.push({
      id: `RUTA_ABIERTA:${route.id}`,
      tipo: "RUTA_ABIERTA",
      severidad: route.estado === "ABIERTA_CON_PENDIENTES" ? "alta" : "media",
      titulo: `Ruta abierta`,
      detalle: `${route.estado} - ${formatDate(route.fecha_programada)}`,
      entidad: "ruta",
      entidad_id: route.id,
      page: "reparto",
      usuario_id: route.repartidor_id,
      creado_en: route.actualizado_en,
    });
  }

  for (const unit of unidades) {
    if (unit.estado === "FINALIZADA" || unit.estado === "CANCELADA") continue;
    if (!hasIdentifier(unit)) {
      alerts.push({
        id: `IMEI_PENDIENTE:${unit.id}`,
        tipo: "IMEI_PENDIENTE",
        severidad: "baja",
        titulo: "IMEI pendiente",
        detalle: `${productMap.get(unit.producto_id)?.nombre ?? "Producto"} - ${unit.estado}`,
        entidad: "unidad",
        entidad_id: unit.id,
        page: "stock",
        usuario_id: unit.ubicacion_usuario_id,
        creado_en: unit.creado_en,
      });
    }
  }

  for (const movement of movimientos) {
    if (movement.tipo !== "DIFERENCIA_RENDICION" || movement.estado === "ANULADO" || movement.importe <= 0) continue;
    const difference = signedDifference(movement);
    alerts.push({
      id: `DIFERENCIA_CAJA:${movement.id}`,
      tipo: "DIFERENCIA_CAJA",
      severidad: "alta",
      titulo: "Diferencia de rendicion",
      detalle: `${formatMoney(difference, movement.moneda)} en ruta ${movement.ruta_id?.slice(0, 8) ?? "-"}`,
      entidad: "movimiento_dinero",
      entidad_id: movement.id,
      page: "caja",
      usuario_id: movement.usuario_id,
      creado_en: movement.fecha,
    });
  }

  return alerts.sort((a, b) => severityWeight(b.severidad) - severityWeight(a.severidad) || Date.parse(b.creado_en) - Date.parse(a.creado_en));
}

function buildReports({
  usuarios,
  productos,
  ventas,
  ventaItems,
  compras,
  compraItems,
  unidades,
  rutas,
  movimientos,
}: {
  usuarios: UsuarioRow[];
  productos: ProductoRow[];
  ventas: VentaRow[];
  ventaItems: VentaItemRow[];
  compras: CompraRow[];
  compraItems: CompraItemRow[];
  unidades: UnidadRow[];
  rutas: RutaRow[];
  movimientos: MovimientoDineroRow[];
}): InsightsReport {
  const activeSales = ventas.filter((sale) => sale.estado !== "CANCELADA");
  const finalizedSales = activeSales.filter((sale) => sale.estado === "FINALIZADA");
  const activePurchases = compras.filter((purchase) => purchase.estado !== "CANCELADA");
  const saleItemsBySale = groupBy(ventaItems.filter((item) => item.estado !== "CANCELADO"), (item) => item.venta_id);
  const productMap = new Map(productos.map((product) => [product.id, product]));
  const sellerMap = new Map(usuarios.map((user) => [user.id, user]));
  const costBySaleItem = new Map<UUID, number>();
  const periodMap = new Map<string, PeriodReportRow>();
  const productReport = new Map<UUID, ProductReportRow>();
  const sellerReport = new Map<UUID, SellerReportRow>();
  const ingresos = emptyTotals();
  const costos = emptyTotals();
  const gananciaCerrada = emptyTotals();
  const comisiones = emptyTotals();
  const costoReparto = emptyTotals();

  for (const item of ventaItems) {
    costBySaleItem.set(item.id, costForSaleItem(item, compraItems, unidades));
  }

  for (const sale of activeSales) {
    ingresos[sale.moneda_principal] = roundMoney(ingresos[sale.moneda_principal] + sale.total);
    const period = ensurePeriod(periodMap, periodKey(sale.fecha));
    period.ventas += 1;
    period.ingresos[sale.moneda_principal] = roundMoney(period.ingresos[sale.moneda_principal] + sale.total);

    for (const item of saleItemsBySale.get(sale.id) ?? []) {
      const row = ensureProduct(productReport, item.producto_id, productMap.get(item.producto_id)?.nombre ?? "Producto");
      row.vendidos += 1;
      row.ingresos[item.moneda] = roundMoney(row.ingresos[item.moneda] + item.precio_venta);
    }
  }

  for (const purchase of activePurchases) {
    const period = ensurePeriod(periodMap, periodKey(purchase.fecha_pedido));
    period.compras += 1;
  }

  for (const item of compraItems.filter((row) => row.estado !== "CANCELADO")) {
    costos[item.moneda] = roundMoney(costos[item.moneda] + item.costo_original);
    const purchase = compras.find((current) => current.id === item.compra_id);
    if (purchase) {
      const period = ensurePeriod(periodMap, periodKey(purchase.fecha_pedido));
      period.costos[item.moneda] = roundMoney(period.costos[item.moneda] + item.costo_original);
    }
    const row = ensureProduct(productReport, item.producto_id, productMap.get(item.producto_id)?.nombre ?? "Producto");
    row.comprados += 1;
    row.costos[item.moneda] = roundMoney(row.costos[item.moneda] + item.costo_original);
  }

  for (const sale of finalizedSales) {
    const items = saleItemsBySale.get(sale.id) ?? [];
    const saleCost = roundMoney(items.reduce((sum, item) => sum + (costBySaleItem.get(item.id) ?? 0), 0));
    gananciaCerrada[sale.moneda_principal] = roundMoney(gananciaCerrada[sale.moneda_principal] + sale.total - saleCost);
    const period = ensurePeriod(periodMap, periodKey(sale.fecha));
    period.ventas_finalizadas += 1;
    period.ganancia_cerrada[sale.moneda_principal] = roundMoney(period.ganancia_cerrada[sale.moneda_principal] + sale.total - saleCost);

    for (const item of items) {
      const row = ensureProduct(productReport, item.producto_id, productMap.get(item.producto_id)?.nombre ?? "Producto");
      row.ganancia_cerrada[item.moneda] = roundMoney(row.ganancia_cerrada[item.moneda] + item.precio_venta - (costBySaleItem.get(item.id) ?? 0));
    }

    const seller = sellerMap.get(sale.vendedor_id);
    const commission = roundMoney(sale.total * ((seller?.porcentaje_comision ?? 0) / 100));
    comisiones[sale.moneda_principal] = roundMoney(comisiones[sale.moneda_principal] + commission);
    const sellerRow = ensureSeller(sellerReport, sale.vendedor_id, seller?.nombre ?? "Vendedor");
    sellerRow.ventas_finalizadas += 1;
    sellerRow.ingresos[sale.moneda_principal] = roundMoney(sellerRow.ingresos[sale.moneda_principal] + sale.total);
    sellerRow.comisiones[sale.moneda_principal] = roundMoney(sellerRow.comisiones[sale.moneda_principal] + commission);
  }

  for (const route of rutas.filter((row) => row.estado !== "CANCELADA")) {
    const courier = sellerMap.get(route.repartidor_id);
    costoReparto.USD = roundMoney(costoReparto.USD + (courier?.costo_envio_usd ?? 0));
    costoReparto.ARS = roundMoney(costoReparto.ARS + (courier?.costo_envio_ars ?? 0));
  }

  return {
    resumen: {
      ventas_confirmadas: activeSales.length,
      ventas_finalizadas: finalizedSales.length,
      compras_activas: activePurchases.length,
      ingresos,
      costos,
      ganancia_cerrada: gananciaCerrada,
      comisiones,
      costo_reparto_estimado: costoReparto,
      margen_cerrado_pct: gananciaCerrada.USD && ingresos.USD ? roundMoney((gananciaCerrada.USD / ingresos.USD) * 100) : 0,
    },
    periodos: [...periodMap.values()].sort((a, b) => b.periodo.localeCompare(a.periodo)).slice(0, 12),
    productos: [...productReport.values()].sort((a, b) => b.vendidos - a.vendidos || b.comprados - a.comprados).slice(0, 20),
    vendedores: [...sellerReport.values()].sort((a, b) => b.ingresos.USD - a.ingresos.USD).slice(0, 12),
    saldos_clientes: totalsByCurrency(activeSales.filter((sale) => sale.saldo_pendiente > 0), (sale) => sale.saldo_pendiente, (sale) => sale.moneda_principal),
    saldos_proveedores: supplierDebtTotals(activePurchases, compraItems, movimientos),
    diferencias_rendicion: totalsByCurrency(
      movimientos.filter((movement) => movement.tipo === "DIFERENCIA_RENDICION" && movement.estado !== "ANULADO"),
      (movement) => movement.importe,
      (movement) => movement.moneda,
    ),
  };
}

function createEmptyReport(): InsightsReport {
  return {
    resumen: {
      ventas_confirmadas: 0,
      ventas_finalizadas: 0,
      compras_activas: 0,
      ingresos: emptyTotals(),
      costos: emptyTotals(),
      ganancia_cerrada: emptyTotals(),
      comisiones: emptyTotals(),
      costo_reparto_estimado: emptyTotals(),
      margen_cerrado_pct: 0,
    },
    periodos: [],
    productos: [],
    vendedores: [],
    saldos_clientes: emptyTotals(),
    saldos_proveedores: emptyTotals(),
    diferencias_rendicion: emptyTotals(),
  };
}

function costForSaleItem(item: VentaItemRow, compraItems: CompraItemRow[], unidades: UnidadRow[]) {
  const directPurchaseItem = item.compra_item_id ? compraItems.find((current) => current.id === item.compra_item_id) : null;
  if (directPurchaseItem) return directPurchaseItem.costo_original;

  const unit = item.unidad_id ? unidades.find((current) => current.id === item.unidad_id) : null;
  const unitPurchaseItem = unit?.compra_item_id ? compraItems.find((current) => current.id === unit.compra_item_id) : null;
  return unitPurchaseItem?.costo_original ?? 0;
}

function supplierDebtTotals(purchases: CompraRow[], compraItems: CompraItemRow[], movements: MovimientoDineroRow[]) {
  const totals = emptyTotals();
  for (const purchase of purchases) {
    const total = compraItems
      .filter((item) => item.compra_id === purchase.id && item.estado !== "CANCELADO")
      .reduce((sum, item) => sum + item.costo_original, 0);
    const paid = movements
      .filter((movement) => movement.tipo === "PAGO_PROVEEDOR" && movement.compra_id === purchase.id && movement.estado !== "ANULADO")
      .reduce((sum, movement) => sum + movement.importe, 0);
    totals[purchase.moneda] = roundMoney(totals[purchase.moneda] + Math.max(0, total - paid));
  }
  return totals;
}

function ensurePeriod(periods: Map<string, PeriodReportRow>, key: string) {
  let row = periods.get(key);
  if (!row) {
    row = {
      periodo: key,
      ventas: 0,
      ventas_finalizadas: 0,
      compras: 0,
      ingresos: emptyTotals(),
      costos: emptyTotals(),
      ganancia_cerrada: emptyTotals(),
    };
    periods.set(key, row);
  }
  return row;
}

function ensureProduct(products: Map<UUID, ProductReportRow>, productId: UUID, name: string) {
  let row = products.get(productId);
  if (!row) {
    row = {
      producto_id: productId,
      nombre: name,
      vendidos: 0,
      comprados: 0,
      ingresos: emptyTotals(),
      costos: emptyTotals(),
      ganancia_cerrada: emptyTotals(),
    };
    products.set(productId, row);
  }
  return row;
}

function ensureSeller(sellers: Map<UUID, SellerReportRow>, userId: UUID, name: string) {
  let row = sellers.get(userId);
  if (!row) {
    row = {
      usuario_id: userId,
      nombre: name,
      ventas_finalizadas: 0,
      ingresos: emptyTotals(),
      comisiones: emptyTotals(),
    };
    sellers.set(userId, row);
  }
  return row;
}

function totalsByCurrency<Row>(rows: Row[], valueOf: (row: Row) => number, currencyOf: (row: Row) => Moneda) {
  return rows.reduce((totals, row) => {
    totals[currencyOf(row)] = roundMoney(totals[currencyOf(row)] + valueOf(row));
    return totals;
  }, emptyTotals());
}

function groupBy<Row, Key>(rows: Row[], keyOf: (row: Row) => Key) {
  const groups = new Map<Key, Row[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}

function hasIdentifier(unit: UnidadRow) {
  return Boolean(unit.imei || unit.serie || Object.values(unit.atributos).some((value) => typeof value === "string" && value.trim().length > 0));
}

function signedDifference(movement: MovimientoDineroRow) {
  const value = movement.snapshot.diferencia;
  return typeof value === "number" ? value : movement.importe;
}

function severityWeight(severity: InsightSeverity) {
  if (severity === "alta") return 3;
  if (severity === "media") return 2;
  return 1;
}

function periodKey(value: string) {
  return value.slice(0, 7);
}

function emptyTotals(): InsightMoneyTotals {
  return { USD: 0, ARS: 0 };
}

function formatMoney(value: number, currency: Moneda) {
  if (currency === "ARS") return `$ ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
  return `US$ ${value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(value));
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function sortNamedRows<Row extends { nombre: string }>(rows: Row[]) {
  return [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
