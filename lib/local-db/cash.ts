import { createLocalDbClient, type LocalDbClientOptions } from "./client";
import { registerSalePayment, type SalePaymentInput } from "./sales";
import type {
  ClienteRow,
  CompraItemRow,
  CompraRow,
  MedioPago,
  Moneda,
  MovimientoDineroRow,
  MovimientoDineroSigno,
  MovimientoDineroTipo,
  ProductoRow,
  ProveedorRow,
  RutaItemRow,
  RutaRow,
  UsuarioRow,
  VentaItemRow,
  VentaRow,
  UUID,
} from "./schema";

export type MoneyTotals = Record<Moneda, number>;

export type CustomerDebtSummary = {
  venta_id: UUID;
  numero: number;
  cliente_id: UUID;
  moneda: Moneda;
  saldo_pendiente: number;
  item_debts: {
    venta_item_id: UUID;
    producto_id: UUID;
    saldo_pendiente: number;
    precio_venta: number;
  }[];
};

export type SupplierDebtSummary = {
  compra_id: UUID;
  numero: number;
  proveedor_id: UUID;
  moneda: Moneda;
  saldo_pendiente: number;
  item_debts: {
    compra_item_id: UUID;
    producto_id: UUID;
    saldo_pendiente: number;
    costo_original: number;
  }[];
};

export type RouteCashSummary = {
  ruta_id: UUID;
  repartidor_id: UUID;
  estado: RutaRow["estado"];
  fecha_programada: string;
  esperado: MoneyTotals;
  devuelto: MoneyTotals;
  diferencia: MoneyTotals;
  tareas_pendientes: number;
};

export interface CashData {
  movimientos_dinero: MovimientoDineroRow[];
  ventas: VentaRow[];
  venta_items: VentaItemRow[];
  clientes: ClienteRow[];
  compras: CompraRow[];
  compra_items: CompraItemRow[];
  proveedores: ProveedorRow[];
  rutas: RutaRow[];
  ruta_items: RutaItemRow[];
  usuarios: UsuarioRow[];
  repartidores: UsuarioRow[];
  productos: ProductoRow[];
  saldos: MoneyTotals;
  deudas_clientes: CustomerDebtSummary[];
  deudas_proveedores: SupplierDebtSummary[];
  rendiciones: RouteCashSummary[];
  ultimo_cierre: MovimientoDineroRow | null;
}

export type SupplierPaymentInput = {
  compra_id?: UUID | null;
  compra_item_id?: UUID | null;
  importe: number;
  moneda: Moneda;
  medio_pago: MedioPago;
  usuario_id?: UUID | null;
  observaciones?: string | null;
};

export type CourierAdvanceInput = {
  ruta_id: UUID;
  importe: number;
  moneda: Moneda;
  medio_pago: MedioPago;
  usuario_id?: UUID | null;
  observaciones?: string | null;
};

export type RouteRenditionInput = {
  ruta_id: UUID;
  devoluciones: {
    importe: number;
    moneda: Moneda;
    medio_pago: MedioPago;
  }[];
  usuario_id?: UUID | null;
  observaciones?: string | null;
};

export type CashAdjustmentInput = {
  importe: number;
  moneda: Moneda;
  medio_pago: MedioPago;
  signo: MovimientoDineroSigno;
  usuario_id?: UUID | null;
  observaciones?: string | null;
};

export type CashCloseInput = {
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
  usuario_id?: UUID | null;
  observaciones?: string | null;
};

export function emptyCashData(): CashData {
  return {
    movimientos_dinero: [],
    ventas: [],
    venta_items: [],
    clientes: [],
    compras: [],
    compra_items: [],
    proveedores: [],
    rutas: [],
    ruta_items: [],
    usuarios: [],
    repartidores: [],
    productos: [],
    saldos: emptyTotals(),
    deudas_clientes: [],
    deudas_proveedores: [],
    rendiciones: [],
    ultimo_cierre: null,
  };
}

export async function listCashData(options: LocalDbClientOptions = {}): Promise<CashData> {
  const db = createLocalDbClient(options);
  const [movimientos, ventas, ventaItems, clientes, compras, compraItems, proveedores, rutas, rutaItems, usuarios, productos] = await Promise.all([
    db.listRows("movimientos_dinero"),
    db.listRows("ventas"),
    db.listRows("venta_items"),
    db.listRows("clientes"),
    db.listRows("compras"),
    db.listRows("compra_items"),
    db.listRows("proveedores"),
    db.listRows("rutas"),
    db.listRows("ruta_items"),
    db.listRows("usuarios"),
    db.listRows("productos"),
  ]);
  const activeMovements = movimientos.filter((movement) => movement.estado !== "ANULADO");
  const sortedMovements = [...movimientos].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));

  return {
    movimientos_dinero: sortedMovements,
    ventas: [...ventas].sort((a, b) => b.numero - a.numero),
    venta_items: ventaItems,
    clientes: sortNamedRows(clientes),
    compras: [...compras].sort((a, b) => b.numero - a.numero),
    compra_items: compraItems,
    proveedores: sortNamedRows(proveedores),
    rutas: [...rutas].sort((a, b) => Date.parse(b.fecha_programada) - Date.parse(a.fecha_programada)),
    ruta_items: rutaItems,
    usuarios: sortNamedRows(usuarios),
    repartidores: sortNamedRows(usuarios.filter((usuario) => usuario.rol === "REPARTIDOR")),
    productos: sortProducts(productos),
    saldos: calculateCashBalances(activeMovements),
    deudas_clientes: buildCustomerDebts(ventas, ventaItems),
    deudas_proveedores: buildSupplierDebts(compras, compraItems, activeMovements),
    rendiciones: buildRouteSummaries(rutas, rutaItems, activeMovements),
    ultimo_cierre: sortedMovements.find((movement) => movement.tipo === "CIERRE_CAJA") ?? null,
  };
}

export async function registerCashSalePayment(saleId: UUID, input: SalePaymentInput, options: LocalDbClientOptions = {}) {
  await registerSalePayment(saleId, input, options);
  return listCashData(options);
}

export async function registerSupplierPayment(input: SupplierPaymentInput, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const normalized = normalizeSupplierPaymentInput(input);
  const purchaseItem = normalized.compra_item_id ? await requirePurchaseItem(normalized.compra_item_id, options) : null;
  const purchase = await requirePurchase(purchaseItem?.compra_id ?? normalized.compra_id, options);
  if (purchaseItem && purchaseItem.compra_id !== purchase.id) throw new Error("El item no pertenece a la compra indicada.");
  if (purchase.moneda !== normalized.moneda) throw new Error("La moneda del pago debe coincidir con la compra.");

  const movements = (await db.listRows("movimientos_dinero")).filter((movement) => movement.estado !== "ANULADO");
  const debt = purchaseItem
    ? purchaseItem.costo_original - sumProviderPayments(movements, purchase.id, purchaseItem.id)
    : purchaseDebt(purchase, await db.listRows("compra_items"), movements);
  const roundedDebt = roundMoney(Math.max(0, debt));
  if (normalized.importe > roundedDebt) throw new Error("El pago supera la deuda con proveedor.");

  const remaining = roundMoney(roundedDebt - normalized.importe);
  const now = new Date().toISOString();
  await db.insertRow("movimientos_dinero", {
    tipo: "PAGO_PROVEEDOR",
    signo: "EGRESO",
    moneda: normalized.moneda,
    medio_pago: normalized.medio_pago,
    importe: normalized.importe,
    estado: remaining === 0 ? "APLICADO_TOTAL" : "APLICADO_PARCIAL",
    fecha: now,
    venta_id: null,
    venta_item_id: null,
    compra_id: purchase.id,
    compra_item_id: purchaseItem?.id ?? null,
    ruta_id: null,
    ruta_item_id: null,
    cliente_id: null,
    proveedor_id: purchase.proveedor_id,
    usuario_id: normalized.usuario_id,
    cierre_codigo: null,
    cotizacion_usada: null,
    snapshot: {
      compra_numero: purchase.numero,
      deuda_anterior: roundedDebt,
      deuda_posterior: remaining,
    },
    observaciones: normalized.observaciones ?? (purchaseItem ? "Pago parcial por item de compra" : "Pago a proveedor desde caja"),
    creado_en: now,
    actualizado_en: now,
    creado_por: normalized.usuario_id,
    actualizado_por: normalized.usuario_id,
  });

  return listCashData(options);
}

export async function registerCourierAdvance(input: CourierAdvanceInput, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const route = await requireRoute(input.ruta_id, options);
  if (route.estado === "CANCELADA" || route.estado === "RENDIDA") throw new Error("La ruta no admite entrega de dinero.");
  const money = normalizeMoney(input);
  if (money.importe <= 0) throw new Error("La entrega al repartidor debe ser mayor a cero.");

  const now = new Date().toISOString();
  await db.insertRow("movimientos_dinero", {
    tipo: "ENTREGA_REPARTIDOR",
    signo: "EGRESO",
    moneda: money.moneda,
    medio_pago: money.medio_pago,
    importe: money.importe,
    estado: "APLICADO_TOTAL",
    fecha: now,
    venta_id: null,
    venta_item_id: null,
    compra_id: null,
    compra_item_id: null,
    ruta_id: route.id,
    ruta_item_id: null,
    cliente_id: null,
    proveedor_id: null,
    usuario_id: route.repartidor_id,
    cierre_codigo: null,
    cotizacion_usada: null,
    snapshot: {
      ruta_id: route.id,
      repartidor_id: route.repartidor_id,
      entregado: money.importe,
    },
    observaciones: optionalText(input.observaciones) ?? "Entrega de dinero a repartidor",
    creado_en: now,
    actualizado_en: now,
    creado_por: input.usuario_id ?? null,
    actualizado_por: input.usuario_id ?? null,
  });

  return listCashData(options);
}

export async function registerRouteRendition(input: RouteRenditionInput, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const route = await requireRoute(input.ruta_id, options);
  if (route.estado === "CANCELADA" || route.estado === "RENDIDA") throw new Error("La ruta no puede rendirse desde su estado actual.");
  const routeItems = (await db.listRows("ruta_items")).filter((item) => item.ruta_id === route.id && item.estado !== "CANCELADA" && item.estado !== "OMITIDA");
  if (routeItems.some((item) => item.estado === "PENDIENTE")) {
    throw new Error("La ruta tiene tareas pendientes. Debe quedar abierta o rendirse parcialmente.");
  }

  const movements = (await db.listRows("movimientos_dinero")).filter((movement) => movement.estado !== "ANULADO");
  const summary = buildRouteSummary(route, routeItems, movements);
  const normalized = normalizeRenditionInput(input);
  const now = new Date().toISOString();
  let created = false;

  for (const currency of moneyCurrencies()) {
    const returned = normalized.devoluciones[currency];
    const expected = summary.esperado[currency];
    if (returned === 0 && expected === 0) continue;
    const difference = roundMoney(returned - expected);
    created = true;

    await db.insertRow("movimientos_dinero", {
      tipo: "RENDICION_REPARTIDOR",
      signo: returned > 0 ? "INGRESO" : "NEUTRO",
      moneda: currency,
      medio_pago: normalized.medios[currency],
      importe: returned,
      estado: "APLICADO_TOTAL",
      fecha: now,
      venta_id: null,
      venta_item_id: null,
      compra_id: null,
      compra_item_id: null,
      ruta_id: route.id,
      ruta_item_id: null,
      cliente_id: null,
      proveedor_id: null,
      usuario_id: route.repartidor_id,
      cierre_codigo: null,
      cotizacion_usada: null,
      snapshot: {
        esperado: expected,
        devuelto: returned,
        diferencia: difference,
      },
      observaciones: normalized.observaciones ?? "Rendicion de repartidor",
      creado_en: now,
      actualizado_en: now,
      creado_por: normalized.usuario_id,
      actualizado_por: normalized.usuario_id,
    });

    if (difference !== 0) {
      await db.insertRow("movimientos_dinero", {
        tipo: "DIFERENCIA_RENDICION",
        signo: "NEUTRO",
        moneda: currency,
        medio_pago: normalized.medios[currency],
        importe: Math.abs(difference),
        estado: "REGISTRADO",
        fecha: now,
        venta_id: null,
        venta_item_id: null,
        compra_id: null,
        compra_item_id: null,
        ruta_id: route.id,
        ruta_item_id: null,
        cliente_id: null,
        proveedor_id: null,
        usuario_id: route.repartidor_id,
        cierre_codigo: null,
        cotizacion_usada: null,
        snapshot: {
          esperado: expected,
          devuelto: returned,
          diferencia: difference,
        },
        observaciones: difference < 0 ? "Faltante en rendicion" : "Sobrante en rendicion",
        creado_en: now,
        actualizado_en: now,
        creado_por: normalized.usuario_id,
        actualizado_por: normalized.usuario_id,
      });
    }
  }

  if (!created) {
    await db.insertRow("movimientos_dinero", {
      tipo: "RENDICION_REPARTIDOR",
      signo: "NEUTRO",
      moneda: "USD",
      medio_pago: "EFECTIVO_USD",
      importe: 0,
      estado: "APLICADO_TOTAL",
      fecha: now,
      venta_id: null,
      venta_item_id: null,
      compra_id: null,
      compra_item_id: null,
      ruta_id: route.id,
      ruta_item_id: null,
      cliente_id: null,
      proveedor_id: null,
      usuario_id: route.repartidor_id,
      cierre_codigo: null,
      cotizacion_usada: null,
      snapshot: { esperado: 0, devuelto: 0, diferencia: 0 },
      observaciones: normalized.observaciones ?? "Rendicion sin movimientos de dinero",
      creado_en: now,
      actualizado_en: now,
      creado_por: normalized.usuario_id,
      actualizado_por: normalized.usuario_id,
    });
  }

  for (const item of routeItems) {
    await db.updateRow("ruta_items", item.id, {
      estado: "RENDIDA",
      actualizado_por: normalized.usuario_id,
    });
  }
  await db.updateRow("rutas", route.id, {
    estado: "RENDIDA",
    cerrada_en: now,
    actualizado_por: normalized.usuario_id,
  });

  return listCashData(options);
}

export async function registerCashAdjustment(input: CashAdjustmentInput, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const money = normalizeMoney(input);
  const sign: MovimientoDineroSigno = input.signo === "EGRESO" || input.signo === "NEUTRO" ? input.signo : "INGRESO";
  if (money.importe <= 0 && sign !== "NEUTRO") throw new Error("El ajuste debe ser mayor a cero.");
  const now = new Date().toISOString();

  await db.insertRow("movimientos_dinero", {
    tipo: "AJUSTE",
    signo: sign,
    moneda: money.moneda,
    medio_pago: money.medio_pago,
    importe: money.importe,
    estado: "APLICADO_TOTAL",
    fecha: now,
    venta_id: null,
    venta_item_id: null,
    compra_id: null,
    compra_item_id: null,
    ruta_id: null,
    ruta_item_id: null,
    cliente_id: null,
    proveedor_id: null,
    usuario_id: input.usuario_id ?? null,
    cierre_codigo: null,
    cotizacion_usada: null,
    snapshot: { signo: sign },
    observaciones: optionalText(input.observaciones) ?? "Ajuste manual de caja",
    creado_en: now,
    actualizado_en: now,
    creado_por: input.usuario_id ?? null,
    actualizado_por: input.usuario_id ?? null,
  });

  return listCashData(options);
}

export async function closeCash(input: CashCloseInput = {}, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const now = new Date().toISOString();
  const range = normalizeCloseRange(input, now);
  const movements = await db.listRows("movimientos_dinero");
  const eligible = movements.filter((movement) => (
    movement.estado !== "ANULADO"
    && !movement.cierre_codigo
    && movement.tipo !== "CIERRE_CAJA"
    && Date.parse(movement.fecha) >= range.from
    && Date.parse(movement.fecha) <= range.to
  ));
  const code = buildCloseCode(now);
  const balances = calculateCashBalances(eligible);
  const totalsByType = summarizeByType(eligible);

  for (const movement of eligible) {
    await db.updateRow("movimientos_dinero", movement.id, {
      cierre_codigo: code,
      actualizado_por: input.usuario_id ?? null,
    });
  }

  await db.insertRow("movimientos_dinero", {
    tipo: "CIERRE_CAJA",
    signo: "NEUTRO",
    moneda: "USD",
    medio_pago: "EFECTIVO_USD",
    importe: 0,
    estado: "APLICADO_TOTAL",
    fecha: now,
    venta_id: null,
    venta_item_id: null,
    compra_id: null,
    compra_item_id: null,
    ruta_id: null,
    ruta_item_id: null,
    cliente_id: null,
    proveedor_id: null,
    usuario_id: input.usuario_id ?? null,
    cierre_codigo: code,
    cotizacion_usada: null,
    snapshot: {
      codigo: code,
      fecha_desde: new Date(range.from).toISOString(),
      fecha_hasta: new Date(range.to).toISOString(),
      movimientos_incluidos: eligible.length,
      saldos: balances,
      totales_por_tipo: totalsByType,
    },
    observaciones: optionalText(input.observaciones) ?? "Cierre de caja",
    creado_en: now,
    actualizado_en: now,
    creado_por: input.usuario_id ?? null,
    actualizado_por: input.usuario_id ?? null,
  });

  return listCashData(options);
}

function buildCustomerDebts(ventas: VentaRow[], ventaItems: VentaItemRow[]): CustomerDebtSummary[] {
  return ventas
    .filter((sale) => sale.estado !== "CANCELADA" && sale.saldo_pendiente > 0)
    .map((sale) => ({
      venta_id: sale.id,
      numero: sale.numero,
      cliente_id: sale.cliente_id,
      moneda: sale.moneda_principal,
      saldo_pendiente: sale.saldo_pendiente,
      item_debts: ventaItems
        .filter((item) => item.venta_id === sale.id && item.estado !== "CANCELADO" && item.saldo_pendiente > 0)
        .map((item) => ({
          venta_item_id: item.id,
          producto_id: item.producto_id,
          saldo_pendiente: item.saldo_pendiente,
          precio_venta: item.precio_venta,
        })),
    }));
}

function buildSupplierDebts(compras: CompraRow[], compraItems: CompraItemRow[], movements: MovimientoDineroRow[]): SupplierDebtSummary[] {
  return compras
    .filter((purchase) => purchase.estado !== "CANCELADA")
    .map((purchase) => {
      const itemDebts = compraItems
        .filter((item) => item.compra_id === purchase.id && item.estado !== "CANCELADO")
        .map((item) => ({
          compra_item_id: item.id,
          producto_id: item.producto_id,
          saldo_pendiente: roundMoney(Math.max(0, item.costo_original - sumProviderPayments(movements, purchase.id, item.id))),
          costo_original: item.costo_original,
        }))
        .filter((item) => item.saldo_pendiente > 0);

      return {
        compra_id: purchase.id,
        numero: purchase.numero,
        proveedor_id: purchase.proveedor_id,
        moneda: purchase.moneda,
        saldo_pendiente: roundMoney(Math.max(0, purchaseDebt(purchase, compraItems, movements))),
        item_debts: itemDebts,
      };
    })
    .filter((summary) => summary.saldo_pendiente > 0);
}

function buildRouteSummaries(rutas: RutaRow[], rutaItems: RutaItemRow[], movements: MovimientoDineroRow[]): RouteCashSummary[] {
  return rutas
    .filter((route) => route.estado !== "CANCELADA")
    .map((route) => buildRouteSummary(route, rutaItems.filter((item) => item.ruta_id === route.id), movements))
    .filter((summary) => summary.estado !== "RENDIDA" || summary.diferencia.USD !== 0 || summary.diferencia.ARS !== 0);
}

function buildRouteSummary(route: RutaRow, routeItems: RutaItemRow[], movements: MovimientoDineroRow[]): RouteCashSummary {
  const routeMovements = movements.filter((movement) => movement.ruta_id === route.id && movement.estado !== "ANULADO");
  const advance = totalsFor(routeMovements, "ENTREGA_REPARTIDOR");
  const providerPayments = totalsFor(routeMovements, "PAGO_PROVEEDOR");
  const customerCollections = totalsFor(routeMovements, "COBRO_CLIENTE");
  const returns = totalsFor(routeMovements, "RENDICION_REPARTIDOR");
  const expected = emptyTotals();
  const difference = emptyTotals();

  for (const currency of moneyCurrencies()) {
    expected[currency] = roundMoney(advance[currency] - providerPayments[currency] + customerCollections[currency]);
    difference[currency] = roundMoney(returns[currency] - expected[currency]);
  }

  return {
    ruta_id: route.id,
    repartidor_id: route.repartidor_id,
    estado: route.estado,
    fecha_programada: route.fecha_programada,
    esperado: expected,
    devuelto: returns,
    diferencia: difference,
    tareas_pendientes: routeItems.filter((item) => item.estado === "PENDIENTE" || item.estado === "ABIERTA").length,
  };
}

function calculateCashBalances(movements: MovimientoDineroRow[]): MoneyTotals {
  const balances = emptyTotals();
  for (const movement of movements) {
    if (movement.signo === "NEUTRO") continue;
    const multiplier = movement.signo === "INGRESO" ? 1 : -1;
    balances[movement.moneda] = roundMoney(balances[movement.moneda] + movement.importe * multiplier);
  }
  return balances;
}

function totalsFor(movements: MovimientoDineroRow[], type: MovimientoDineroTipo): MoneyTotals {
  const totals = emptyTotals();
  for (const movement of movements) {
    if (movement.tipo !== type) continue;
    totals[movement.moneda] = roundMoney(totals[movement.moneda] + movement.importe);
  }
  return totals;
}

function summarizeByType(movements: MovimientoDineroRow[]) {
  return movements.reduce((summary, movement) => {
    const current = summary[movement.tipo] ?? emptyTotals();
    current[movement.moneda] = roundMoney(current[movement.moneda] + movement.importe);
    summary[movement.tipo] = current;
    return summary;
  }, {} as Partial<Record<MovimientoDineroTipo, MoneyTotals>>);
}

function purchaseDebt(purchase: CompraRow, compraItems: CompraItemRow[], movements: MovimientoDineroRow[]) {
  const activeItems = compraItems.filter((item) => item.compra_id === purchase.id && item.estado !== "CANCELADO");
  const total = activeItems.reduce((sum, item) => sum + item.costo_original, 0);
  const paid = movements
    .filter((movement) => movement.tipo === "PAGO_PROVEEDOR" && movement.compra_id === purchase.id)
    .reduce((sum, movement) => sum + movement.importe, 0);
  return roundMoney(total - paid);
}

function sumProviderPayments(movements: MovimientoDineroRow[], purchaseId: UUID, purchaseItemId: UUID) {
  return movements
    .filter((movement) => movement.tipo === "PAGO_PROVEEDOR" && movement.compra_id === purchaseId && movement.compra_item_id === purchaseItemId)
    .reduce((sum, movement) => sum + movement.importe, 0);
}

async function requirePurchase(purchaseId: UUID | null | undefined, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const purchase = await db.getRowById("compras", requiredId(purchaseId, "Compra"));
  if (!purchase || purchase.estado === "CANCELADA") throw new Error("Compra inexistente o cancelada.");
  return purchase;
}

async function requirePurchaseItem(itemId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const item = await db.getRowById("compra_items", requiredId(itemId, "Item de compra"));
  if (!item || item.estado === "CANCELADO") throw new Error("Item de compra inexistente o cancelado.");
  return item;
}

async function requireRoute(routeId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const route = await db.getRowById("rutas", requiredId(routeId, "Ruta"));
  if (!route) throw new Error("Ruta inexistente.");
  return route;
}

function normalizeSupplierPaymentInput(input: SupplierPaymentInput): Required<SupplierPaymentInput> {
  const money = normalizeMoney(input);
  return {
    compra_id: input.compra_id || null,
    compra_item_id: input.compra_item_id || null,
    importe: money.importe,
    moneda: money.moneda,
    medio_pago: money.medio_pago,
    usuario_id: input.usuario_id || null,
    observaciones: optionalText(input.observaciones),
  };
}

function normalizeRenditionInput(input: RouteRenditionInput) {
  const returned = emptyTotals();
  const methods: Record<Moneda, MedioPago> = {
    USD: "EFECTIVO_USD",
    ARS: "EFECTIVO_ARS",
  };

  for (const item of input.devoluciones ?? []) {
    const money = normalizeMoney(item);
    returned[money.moneda] = roundMoney(returned[money.moneda] + money.importe);
    methods[money.moneda] = money.medio_pago;
  }

  return {
    ruta_id: requiredId(input.ruta_id, "Ruta"),
    devoluciones: returned,
    medios: methods,
    usuario_id: input.usuario_id || null,
    observaciones: optionalText(input.observaciones),
  };
}

function normalizeMoney(input: { importe: number; moneda: Moneda; medio_pago: MedioPago }) {
  const amount = Number(input.importe);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Importe invalido.");
  const currency: Moneda = input.moneda === "ARS" ? "ARS" : "USD";
  return {
    importe: roundMoney(amount),
    moneda: currency,
    medio_pago: normalizePaymentMethod(input.medio_pago, currency),
  };
}

function normalizePaymentMethod(method: MedioPago, currency: Moneda): MedioPago {
  if (currency === "USD") return "EFECTIVO_USD";
  if (method === "TRANSFERENCIA_ARS" || method === "CREDITO" || method === "DEBITO") return method;
  return "EFECTIVO_ARS";
}

function normalizeCloseRange(input: CashCloseInput, now: string) {
  const from = optionalText(input.fecha_desde) ? Date.parse(String(input.fecha_desde)) : 0;
  const to = optionalText(input.fecha_hasta) ? Date.parse(String(input.fecha_hasta)) : Date.parse(now);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) throw new Error("Rango de cierre invalido.");
  return { from, to };
}

function buildCloseCode(value: string) {
  return `CAJA-${value.replace(/\D/g, "").slice(0, 14)}`;
}

function emptyTotals(): MoneyTotals {
  return { USD: 0, ARS: 0 };
}

function moneyCurrencies(): Moneda[] {
  return ["USD", "ARS"];
}

function requiredId(value: unknown, label: string) {
  const text = optionalText(value);
  if (!text) throw new Error(`${label} es obligatorio.`);
  return text;
}

function optionalText(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function sortNamedRows<Row extends { nombre: string }>(rows: Row[]) {
  return [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

function sortProducts(rows: ProductoRow[]) {
  return [...rows].sort((a, b) => [a.categoria, a.marca, a.modelo, a.nombre].join(" ").localeCompare([b.categoria, b.marca, b.modelo, b.nombre].join(" "), "es"));
}
