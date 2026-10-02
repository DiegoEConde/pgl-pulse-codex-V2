import { createLocalDbClient, type LocalDbClientOptions } from "./client";
import { deliverUnit, receivePurchaseItem, type UnitDestination } from "./stock";
import { registerSalePayment } from "./sales";
import type {
  ClienteRow,
  CompraItemRow,
  CompraRow,
  MedioPago,
  Moneda,
  MovimientoDineroRow,
  ProductoRow,
  ProveedorRow,
  RutaItemRow,
  RutaRow,
  UnidadRow,
  UsuarioRow,
  VentaItemRow,
  VentaRow,
  UUID,
} from "./schema";

export type CreateRouteInput = {
  repartidor_id: UUID;
  fecha_programada?: string | null;
  observaciones?: string | null;
  compra_item_ids?: UUID[];
  venta_item_ids?: UUID[];
  usuario_id?: UUID | null;
};

export type ConfirmPickupInput = {
  destino: UnitDestination;
  imei?: string | null;
  serie?: string | null;
  color?: string | null;
  identificador?: string | null;
  usuario_id?: UUID | null;
};

export type RouteMoneyInput = {
  importe: number;
  moneda: Moneda;
  medio_pago: MedioPago;
  venta_item_id?: UUID | null;
  usuario_id?: UUID | null;
};

type NormalizedPickupInput = {
  destino: UnitDestination;
  imei: string | null;
  serie: string | null;
  color: string | null;
  identificador: string | null;
  usuario_id: UUID | null;
};

type NormalizedRouteMoneyInput = {
  importe: number;
  moneda: Moneda;
  medio_pago: MedioPago;
  venta_item_id: UUID | null;
  usuario_id: UUID | null;
};

export interface DeliveryData {
  rutas: RutaRow[];
  ruta_items: RutaItemRow[];
  repartidores: UsuarioRow[];
  compras: CompraRow[];
  compra_items: CompraItemRow[];
  proveedores: ProveedorRow[];
  ventas: VentaRow[];
  venta_items: VentaItemRow[];
  clientes: ClienteRow[];
  productos: ProductoRow[];
  unidades: UnidadRow[];
  movimientos_dinero: MovimientoDineroRow[];
}

export function emptyDeliveryData(): DeliveryData {
  return {
    rutas: [],
    ruta_items: [],
    repartidores: [],
    compras: [],
    compra_items: [],
    proveedores: [],
    ventas: [],
    venta_items: [],
    clientes: [],
    productos: [],
    unidades: [],
    movimientos_dinero: [],
  };
}

export async function listDeliveryData(options: LocalDbClientOptions = {}): Promise<DeliveryData> {
  const db = createLocalDbClient(options);
  const [rutas, rutaItems, usuarios, compras, compraItems, proveedores, ventas, ventaItems, clientes, productos, unidades, movimientos] = await Promise.all([
    db.listRows("rutas"),
    db.listRows("ruta_items"),
    db.listRows("usuarios"),
    db.listRows("compras"),
    db.listRows("compra_items"),
    db.listRows("proveedores"),
    db.listRows("ventas"),
    db.listRows("venta_items"),
    db.listRows("clientes"),
    db.listRows("productos"),
    db.listRows("unidades"),
    db.listRows("movimientos_dinero"),
  ]);

  return {
    rutas: [...rutas].sort((a, b) => Date.parse(b.fecha_programada) - Date.parse(a.fecha_programada)),
    ruta_items: [...rutaItems].sort((a, b) => a.orden - b.orden),
    repartidores: sortNamedRows(usuarios.filter((usuario) => usuario.rol === "REPARTIDOR")),
    compras: [...compras].sort((a, b) => b.numero - a.numero),
    compra_items: compraItems,
    proveedores: sortNamedRows(proveedores),
    ventas: [...ventas].sort((a, b) => b.numero - a.numero),
    venta_items: ventaItems,
    clientes: sortNamedRows(clientes),
    productos: sortProducts(productos),
    unidades,
    movimientos_dinero: movimientos,
  };
}

export async function createRoute(input: CreateRouteInput, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const normalized = await normalizeCreateRouteInput(input, options);
  const now = new Date().toISOString();
  const route = await db.insertRow("rutas", {
    repartidor_id: normalized.repartidor_id,
    estado: "PROGRAMADA",
    fecha_programada: normalized.fecha_programada ?? now,
    iniciada_en: null,
    cerrada_en: null,
    observaciones: normalized.observaciones,
    creado_en: now,
    actualizado_en: now,
    creado_por: normalized.usuario_id,
    actualizado_por: normalized.usuario_id,
  });

  let order = 1;
  for (const itemId of normalized.compra_item_ids) {
    const item = await requirePurchaseItem(itemId, options);
    const purchase = await requirePurchase(item.compra_id, options);
    if (await hasActiveRouteItem("compra_item_id", item.id, "RETIRAR_PROVEEDOR", options)) {
      throw new Error("Un item de compra ya esta asignado a una ruta activa.");
    }

    await db.insertRow("ruta_items", {
      ruta_id: route.id,
      orden: order,
      tipo: "RETIRAR_PROVEEDOR",
      destino_tipo: "PROVEEDOR",
      proveedor_id: purchase.proveedor_id,
      cliente_id: null,
      direccion: null,
      compra_item_id: item.id,
      venta_item_id: null,
      unidad_id: item.unidad_id,
      importe_esperado: 0,
      moneda: null,
      estado: "PENDIENTE",
      realizado_en: null,
      creado_en: now,
      actualizado_en: now,
      creado_por: normalized.usuario_id,
      actualizado_por: normalized.usuario_id,
    });
    order += 1;

    if (purchase.paga_al_retirar && item.costo_original > 0) {
      await db.insertRow("ruta_items", {
        ruta_id: route.id,
        orden: order,
        tipo: "PAGAR_PROVEEDOR",
        destino_tipo: "PROVEEDOR",
        proveedor_id: purchase.proveedor_id,
        cliente_id: null,
        direccion: null,
        compra_item_id: item.id,
        venta_item_id: null,
        unidad_id: item.unidad_id,
        importe_esperado: item.costo_original,
        moneda: item.moneda,
        estado: "PENDIENTE",
        realizado_en: null,
        creado_en: now,
        actualizado_en: now,
        creado_por: normalized.usuario_id,
        actualizado_por: normalized.usuario_id,
      });
      order += 1;
    }

    await db.updateRow("compra_items", item.id, {
      estado: "ASIGNADO_RUTA",
      actualizado_por: normalized.usuario_id,
    });
    await db.updateRow("compras", purchase.id, {
      estado: "EN_RETIRO",
      repartidor_retiro_id: normalized.repartidor_id,
      actualizado_por: normalized.usuario_id,
    });
  }

  const collectionSaleIds = new Set<UUID>();
  for (const itemId of normalized.venta_item_ids) {
    const item = await requireSaleItem(itemId, options);
    const sale = await requireSale(item.venta_id, options);
    if (await hasActiveRouteItem("venta_item_id", item.id, "ENTREGAR_CLIENTE", options)) {
      throw new Error("Un item de venta ya esta asignado a una ruta activa.");
    }

    await db.insertRow("ruta_items", {
      ruta_id: route.id,
      orden: order,
      tipo: "ENTREGAR_CLIENTE",
      destino_tipo: "CLIENTE",
      proveedor_id: null,
      cliente_id: sale.cliente_id,
      direccion: sale.direccion_entrega,
      compra_item_id: null,
      venta_item_id: item.id,
      unidad_id: item.unidad_id,
      importe_esperado: 0,
      moneda: null,
      estado: "PENDIENTE",
      realizado_en: null,
      creado_en: now,
      actualizado_en: now,
      creado_por: normalized.usuario_id,
      actualizado_por: normalized.usuario_id,
    });
    order += 1;

    await db.updateRow("venta_items", item.id, {
      estado: item.compra_item_id && !item.unidad_id ? "PENDIENTE_ABASTECIMIENTO" : "ASIGNADO_RUTA",
      actualizado_por: normalized.usuario_id,
    });

    if (item.unidad_id) {
      await db.updateRow("unidades", item.unidad_id, {
        estado: "EN_PODER_REPARTIDOR",
        ubicacion_tipo: "REPARTIDOR",
        ubicacion_usuario_id: normalized.repartidor_id,
        actualizado_por: normalized.usuario_id,
      });
    }

    if (sale.saldo_pendiente > 0 && !collectionSaleIds.has(sale.id)) {
      await db.insertRow("ruta_items", {
        ruta_id: route.id,
        orden: order,
        tipo: "COBRAR_CLIENTE",
        destino_tipo: "CLIENTE",
        proveedor_id: null,
        cliente_id: sale.cliente_id,
        direccion: sale.direccion_entrega,
        compra_item_id: null,
        venta_item_id: null,
        unidad_id: null,
        importe_esperado: sale.saldo_pendiente,
        moneda: sale.moneda_principal,
        estado: "PENDIENTE",
        realizado_en: null,
        creado_en: now,
        actualizado_en: now,
        creado_por: normalized.usuario_id,
        actualizado_por: normalized.usuario_id,
      });
      collectionSaleIds.add(sale.id);
      order += 1;
    }
  }

  return listDeliveryData(options);
}

export async function startRoute(routeId: UUID, usuarioId: UUID | null = null, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const route = await requireRoute(routeId, options);
  if (route.estado === "CANCELADA" || route.estado === "RENDIDA") throw new Error("La ruta no puede iniciarse desde su estado actual.");
  await db.updateRow("rutas", route.id, {
    estado: "EN_CURSO",
    iniciada_en: route.iniciada_en ?? new Date().toISOString(),
    actualizado_por: usuarioId,
  });
  return listDeliveryData(options);
}

export async function confirmRoutePickup(routeItemId: UUID, input: ConfirmPickupInput, options: LocalDbClientOptions = {}) {
  const routeItem = await requireRouteItem(routeItemId, options);
  if (routeItem.tipo !== "RETIRAR_PROVEEDOR" || !routeItem.compra_item_id) throw new Error("La tarea indicada no es un retiro de proveedor.");
  const route = await requireRoute(routeItem.ruta_id, options);
  const normalized = normalizePickupInput(input);

  await ensureRouteInProgress(route, normalized.usuario_id, options);
  await receivePurchaseItem({
    compra_item_id: routeItem.compra_item_id,
    destino: normalized.destino,
    repartidor_id: route.repartidor_id,
    imei: normalized.imei,
    serie: normalized.serie,
    color: normalized.color,
    atributos: normalized.identificador ? { identificador: normalized.identificador } : {},
    usuario_id: normalized.usuario_id ?? route.repartidor_id,
  }, options);
  await updateRouteOperationalState(route.id, normalized.usuario_id, options);

  return listDeliveryData(options);
}

export async function confirmProviderPayment(routeItemId: UUID, input: RouteMoneyInput, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const routeItem = await requireRouteItem(routeItemId, options);
  if (routeItem.tipo !== "PAGAR_PROVEEDOR" || !routeItem.compra_item_id || !routeItem.proveedor_id) {
    throw new Error("La tarea indicada no es un pago a proveedor.");
  }
  const route = await requireRoute(routeItem.ruta_id, options);
  const item = await requireExistingPurchaseItem(routeItem.compra_item_id, options);
  const payment = normalizeMoneyInput(input);
  if (payment.importe <= 0) throw new Error("El pago debe ser mayor a cero.");
  if (payment.importe > routeItem.importe_esperado) throw new Error("El pago supera el importe esperado de la tarea.");

  await ensureRouteInProgress(route, payment.usuario_id, options);
  const now = new Date().toISOString();
  const remaining = roundMoney(routeItem.importe_esperado - payment.importe);
  await db.insertRow("movimientos_dinero", {
    tipo: "PAGO_PROVEEDOR",
    signo: "EGRESO",
    moneda: payment.moneda,
    medio_pago: payment.medio_pago,
    importe: payment.importe,
    estado: remaining === 0 ? "APLICADO_TOTAL" : "APLICADO_PARCIAL",
    fecha: now,
    venta_id: null,
    venta_item_id: null,
    compra_id: item.compra_id,
    compra_item_id: item.id,
    ruta_id: route.id,
    ruta_item_id: routeItem.id,
    cliente_id: null,
    proveedor_id: routeItem.proveedor_id,
    usuario_id: payment.usuario_id ?? route.repartidor_id,
    cierre_codigo: null,
    cotizacion_usada: null,
    snapshot: {
      esperado: routeItem.importe_esperado,
      pagado: payment.importe,
      pendiente: remaining,
    },
    observaciones: remaining === 0 ? "Pago a proveedor en ruta" : "Pago parcial a proveedor en ruta",
    creado_en: now,
    actualizado_en: now,
    creado_por: payment.usuario_id,
    actualizado_por: payment.usuario_id,
  });

  await db.updateRow("ruta_items", routeItem.id, {
    estado: remaining === 0 ? "CONFIRMADA" : "ABIERTA",
    realizado_en: now,
    actualizado_por: payment.usuario_id,
  });
  await updateRouteOperationalState(route.id, payment.usuario_id, options);

  return listDeliveryData(options);
}

export async function confirmCustomerDelivery(routeItemId: UUID, usuarioId: UUID | null = null, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const routeItem = await requireRouteItem(routeItemId, options);
  if (routeItem.tipo !== "ENTREGAR_CLIENTE" || !routeItem.venta_item_id) throw new Error("La tarea indicada no es una entrega a cliente.");
  const route = await requireRoute(routeItem.ruta_id, options);
  const saleItem = await requireSaleItem(routeItem.venta_item_id, options);

  await ensureRouteInProgress(route, usuarioId, options);
  if (!saleItem.unidad_id) throw new Error("La entrega requiere una unidad asignada.");
  const unit = await db.getRowById("unidades", saleItem.unidad_id);
  if (!unit) throw new Error("Unidad inexistente.");
  if (unit.estado !== "ENTREGADA") {
    await deliverUnit(unit.id, usuarioId ?? route.repartidor_id, options);
  } else {
    await db.updateRow("ruta_items", routeItem.id, {
      estado: "CONFIRMADA",
      realizado_en: routeItem.realizado_en ?? new Date().toISOString(),
      actualizado_por: usuarioId,
    });
  }
  await updateRouteOperationalState(route.id, usuarioId, options);

  return listDeliveryData(options);
}

export async function confirmCustomerCollection(routeItemId: UUID, input: RouteMoneyInput, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const routeItem = await requireRouteItem(routeItemId, options);
  if (routeItem.tipo !== "COBRAR_CLIENTE" || !routeItem.cliente_id) throw new Error("La tarea indicada no es un cobro a cliente.");
  const route = await requireRoute(routeItem.ruta_id, options);
  const payment = normalizeMoneyInput(input);
  if (payment.importe <= 0) throw new Error("El cobro debe ser mayor a cero.");
  if (payment.importe > routeItem.importe_esperado) throw new Error("El cobro supera el importe esperado de la tarea.");
  const sale = await resolveSaleForCollection(routeItem, options);

  await ensureRouteInProgress(route, payment.usuario_id, options);
  await registerSalePayment(sale.id, {
    importe: payment.importe,
    moneda: payment.moneda,
    medio_pago: payment.medio_pago,
    venta_item_id: payment.venta_item_id,
  }, options);

  const updatedSale = await requireSale(sale.id, options);
  const remainingTaskAmount = Math.max(0, roundMoney(routeItem.importe_esperado - payment.importe));
  await db.updateRow("ruta_items", routeItem.id, {
    estado: updatedSale.saldo_pendiente === 0 || remainingTaskAmount === 0 ? "CONFIRMADA" : "ABIERTA",
    realizado_en: new Date().toISOString(),
    actualizado_por: payment.usuario_id,
  });
  await updateRouteOperationalState(route.id, payment.usuario_id, options);

  return listDeliveryData(options);
}

export async function markRouteOpenNextDay(routeId: UUID, usuarioId: UUID | null = null, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const route = await requireRoute(routeId, options);
  if (route.estado === "CANCELADA" || route.estado === "RENDIDA") throw new Error("La ruta no puede quedar abierta desde su estado actual.");
  await db.updateRow("rutas", route.id, {
    estado: "ABIERTA_CON_PENDIENTES",
    actualizado_por: usuarioId,
  });
  return listDeliveryData(options);
}

export async function markRoutePartialRendition(routeId: UUID, usuarioId: UUID | null = null, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const route = await requireRoute(routeId, options);
  if (route.estado === "CANCELADA" || route.estado === "RENDIDA") throw new Error("La ruta no puede rendirse parcialmente desde su estado actual.");
  await db.updateRow("rutas", route.id, {
    estado: "PARCIALMENTE_RENDIDA",
    actualizado_por: usuarioId,
  });
  return listDeliveryData(options);
}

async function updateRouteOperationalState(routeId: UUID, usuarioId: UUID | null, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const route = await requireRoute(routeId, options);
  if (["CANCELADA", "PARCIALMENTE_RENDIDA", "RENDIDA"].includes(route.estado)) return;

  const items = (await db.listRows("ruta_items")).filter((item) => item.ruta_id === route.id && item.estado !== "CANCELADA");
  if (!items.length) return;

  const hasTouchedTask = items.some((item) => item.estado === "CONFIRMADA" || item.estado === "ABIERTA");
  if (!hasTouchedTask) return;

  await db.updateRow("rutas", route.id, {
    estado: "ABIERTA_CON_PENDIENTES",
    actualizado_por: usuarioId,
  });
}

async function resolveSaleForCollection(routeItem: RutaItemRow, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const routeItems = (await db.listRows("ruta_items")).filter((item) => item.ruta_id === routeItem.ruta_id && item.cliente_id === routeItem.cliente_id);
  const saleItems = await db.listRows("venta_items");
  const saleIds = new Set<UUID>();

  for (const item of routeItems) {
    if (!item.venta_item_id) continue;
    const saleItem = saleItems.find((current) => current.id === item.venta_item_id);
    if (saleItem) saleIds.add(saleItem.venta_id);
  }

  if (saleIds.size !== 1) throw new Error("No se pudo determinar una venta unica para el cobro.");
  return requireSale([...saleIds][0], options);
}

async function normalizeCreateRouteInput(input: CreateRouteInput, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const courier = await db.getRowById("usuarios", requiredId(input.repartidor_id, "Repartidor"));
  if (!courier || !courier.activo || courier.rol !== "REPARTIDOR") throw new Error("La ruta requiere un repartidor activo.");

  const purchaseItemIds = uniqueIds(input.compra_item_ids ?? []);
  const saleItemIds = uniqueIds(input.venta_item_ids ?? []);
  if (!purchaseItemIds.length && !saleItemIds.length) throw new Error("La ruta debe tener al menos una tarea.");

  const date = normalizeDate(input.fecha_programada);
  return {
    repartidor_id: courier.id,
    fecha_programada: date,
    observaciones: optionalText(input.observaciones),
    compra_item_ids: purchaseItemIds,
    venta_item_ids: saleItemIds,
    usuario_id: input.usuario_id || null,
  };
}

function normalizePickupInput(input: ConfirmPickupInput): NormalizedPickupInput {
  const destination: UnitDestination = input.destino === "OFICINA" || input.destino === "ENTREGA_DIRECTA" ? input.destino : "REPARTIDOR";
  return {
    destino: destination,
    imei: optionalText(input.imei),
    serie: optionalText(input.serie),
    color: optionalText(input.color),
    identificador: optionalText(input.identificador),
    usuario_id: input.usuario_id || null,
  };
}

function normalizeMoneyInput(input: RouteMoneyInput): NormalizedRouteMoneyInput {
  const amount = Number(input.importe);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Importe invalido.");
  const currency: Moneda = input.moneda === "ARS" ? "ARS" : "USD";

  return {
    importe: roundMoney(amount),
    moneda: currency,
    medio_pago: normalizePaymentMethod(input.medio_pago, currency),
    venta_item_id: input.venta_item_id || null,
    usuario_id: input.usuario_id || null,
  };
}

function normalizePaymentMethod(method: MedioPago, currency: Moneda): MedioPago {
  if (currency === "USD") return "EFECTIVO_USD";
  if (method === "TRANSFERENCIA_ARS" || method === "CREDITO" || method === "DEBITO") return method;
  return "EFECTIVO_ARS";
}

async function ensureRouteInProgress(route: RutaRow, usuarioId: UUID | null, options: LocalDbClientOptions) {
  if (route.estado === "CANCELADA" || route.estado === "RENDIDA") throw new Error("La ruta no admite acciones desde su estado actual.");
  if (route.estado !== "EN_CURSO") {
    const db = createLocalDbClient(options);
    await db.updateRow("rutas", route.id, {
      estado: "EN_CURSO",
      iniciada_en: route.iniciada_en ?? new Date().toISOString(),
      actualizado_por: usuarioId,
    });
  }
}

async function hasActiveRouteItem(field: "compra_item_id" | "venta_item_id", id: UUID, type: RutaItemRow["tipo"], options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const routeItems = await db.listRows("ruta_items");
  return routeItems.some((item) => item.tipo === type && item[field] === id && item.estado !== "CANCELADA" && item.estado !== "OMITIDA" && item.estado !== "RENDIDA");
}

async function requireRoute(routeId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const route = await db.getRowById("rutas", requiredId(routeId, "Ruta"));
  if (!route) throw new Error("Ruta inexistente.");
  return route;
}

async function requireRouteItem(routeItemId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const routeItem = await db.getRowById("ruta_items", requiredId(routeItemId, "Tarea de ruta"));
  if (!routeItem) throw new Error("Tarea de ruta inexistente.");
  return routeItem;
}

async function requirePurchaseItem(itemId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const item = await db.getRowById("compra_items", requiredId(itemId, "Item de compra"));
  if (!item || item.estado === "CANCELADO") throw new Error("Item de compra inexistente o cancelado.");
  if (item.unidad_id) throw new Error("El item de compra ya fue recibido.");
  return item;
}

async function requireExistingPurchaseItem(itemId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const item = await db.getRowById("compra_items", requiredId(itemId, "Item de compra"));
  if (!item || item.estado === "CANCELADO") throw new Error("Item de compra inexistente o cancelado.");
  return item;
}

async function requirePurchase(purchaseId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const purchase = await db.getRowById("compras", requiredId(purchaseId, "Compra"));
  if (!purchase || purchase.estado === "CANCELADA") throw new Error("Compra inexistente o cancelada.");
  return purchase;
}

async function requireSaleItem(itemId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const item = await db.getRowById("venta_items", requiredId(itemId, "Item de venta"));
  if (!item || item.estado === "CANCELADO" || item.estado === "FINALIZADO" || item.estado === "GARANTIA") {
    throw new Error("Item de venta inexistente o no asignable a ruta.");
  }
  return item;
}

async function requireSale(saleId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const sale = await db.getRowById("ventas", requiredId(saleId, "Venta"));
  if (!sale || sale.estado === "CANCELADA") throw new Error("Venta inexistente o cancelada.");
  return sale;
}

function normalizeDate(value: unknown) {
  const text = optionalText(value);
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) throw new Error("Fecha de ruta invalida.");
  return parsed.toISOString();
}

function uniqueIds(values: unknown[]) {
  return [...new Set(values.map((value) => optionalText(value)).filter(Boolean))] as UUID[];
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
