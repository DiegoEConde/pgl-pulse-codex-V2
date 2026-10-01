import { createLocalDbClient, type LocalDbClientOptions } from "./client";
import type {
  ClienteRow,
  CompraItemRow,
  CompraRow,
  HistorialEventoRow,
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

export type UnitDestination = "OFICINA" | "REPARTIDOR" | "ENTREGA_DIRECTA";

export type ReceivePurchaseItemInput = {
  compra_item_id: UUID;
  destino: UnitDestination;
  repartidor_id?: UUID | null;
  imei?: string | null;
  serie?: string | null;
  color?: string | null;
  atributos?: Record<string, unknown> | null;
  usuario_id?: UUID | null;
};

export type UpdateUnitIdentityInput = {
  imei?: string | null;
  serie?: string | null;
  color?: string | null;
  atributos?: Record<string, unknown> | null;
  usuario_id?: UUID | null;
};

export type UnitWarrantyInput = {
  motivo?: string | null;
  usuario_id?: UUID | null;
};

export interface StockData {
  unidades: UnidadRow[];
  productos: ProductoRow[];
  compras: CompraRow[];
  compra_items: CompraItemRow[];
  proveedores: ProveedorRow[];
  ventas: VentaRow[];
  venta_items: VentaItemRow[];
  clientes: ClienteRow[];
  repartidores: UsuarioRow[];
  rutas: RutaRow[];
  ruta_items: RutaItemRow[];
  historial_eventos: HistorialEventoRow[];
}

export function emptyStockData(): StockData {
  return {
    unidades: [],
    productos: [],
    compras: [],
    compra_items: [],
    proveedores: [],
    ventas: [],
    venta_items: [],
    clientes: [],
    repartidores: [],
    rutas: [],
    ruta_items: [],
    historial_eventos: [],
  };
}

export async function listStockData(options: LocalDbClientOptions = {}): Promise<StockData> {
  const db = createLocalDbClient(options);
  const [unidades, productos, compras, compraItems, proveedores, ventas, ventaItems, clientes, usuarios, rutas, rutaItems, historial] = await Promise.all([
    db.listRows("unidades"),
    db.listRows("productos"),
    db.listRows("compras"),
    db.listRows("compra_items"),
    db.listRows("proveedores"),
    db.listRows("ventas"),
    db.listRows("venta_items"),
    db.listRows("clientes"),
    db.listRows("usuarios"),
    db.listRows("rutas"),
    db.listRows("ruta_items"),
    db.listRows("historial_eventos"),
  ]);

  return {
    unidades: [...unidades].sort((a, b) => Date.parse(b.creado_en) - Date.parse(a.creado_en)),
    productos: sortProducts(productos),
    compras: [...compras].sort((a, b) => b.numero - a.numero),
    compra_items: compraItems,
    proveedores: sortNamedRows(proveedores),
    ventas: [...ventas].sort((a, b) => b.numero - a.numero),
    venta_items: ventaItems,
    clientes: sortNamedRows(clientes),
    repartidores: sortNamedRows(usuarios.filter((usuario) => usuario.rol === "REPARTIDOR")),
    rutas: [...rutas].sort((a, b) => Date.parse(b.fecha_programada) - Date.parse(a.fecha_programada)),
    ruta_items: rutaItems,
    historial_eventos: [...historial].sort((a, b) => Date.parse(b.creado_en) - Date.parse(a.creado_en)),
  };
}

export async function receivePurchaseItem(input: ReceivePurchaseItemInput, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const normalized = normalizeReceiveInput(input);
  const now = new Date().toISOString();
  const item = await requirePurchaseItem(normalized.compra_item_id, options);
  if (item.estado === "CANCELADO") throw new Error("No se puede recibir un item de compra cancelado.");
  if (item.unidad_id) throw new Error("El item de compra ya tiene una unidad asociada.");

  const purchase = await requirePurchase(item.compra_id, options);
  const saleItem = item.venta_item_id ? await db.getRowById("venta_items", item.venta_item_id) : null;
  const sale = saleItem ? await db.getRowById("ventas", saleItem.venta_id) : null;
  const product = await db.getRowById("productos", item.producto_id);
  if (!product) throw new Error("Producto inexistente.");

  if (normalized.destino === "ENTREGA_DIRECTA" && (!saleItem || !sale)) {
    throw new Error("La entrega directa requiere una venta vinculada.");
  }

  if (normalized.destino === "ENTREGA_DIRECTA" && sale) {
    await assertSingleItemSaleForDirectDelivery(sale.id, options);
  }

  const repartidorId = await resolveCourierId(normalized.destino, normalized.repartidor_id, purchase, options);
  const unitState = normalized.destino === "ENTREGA_DIRECTA"
    ? "ENTREGADA"
    : normalized.destino === "REPARTIDOR"
      ? "EN_PODER_REPARTIDOR"
      : saleItem
        ? "EN_OFICINA_RESERVADA"
        : "EN_OFICINA_DISPONIBLE";

  const unit = await db.insertRow("unidades", {
    producto_id: item.producto_id,
    estado: unitState,
    imei: normalized.imei,
    serie: normalized.serie,
    color: normalized.color,
    atributos: normalized.atributos ?? {},
    ubicacion_tipo: normalized.destino === "ENTREGA_DIRECTA" ? "CLIENTE" : normalized.destino === "REPARTIDOR" ? "REPARTIDOR" : "OFICINA",
    ubicacion_usuario_id: normalized.destino === "REPARTIDOR" ? repartidorId : null,
    ubicacion_cliente_id: normalized.destino === "ENTREGA_DIRECTA" ? sale?.cliente_id ?? null : null,
    ubicacion_proveedor_id: null,
    compra_item_id: item.id,
    venta_item_id: saleItem?.id ?? null,
    finalizada_en: null,
    creado_en: now,
    actualizado_en: now,
    creado_por: normalized.usuario_id,
    actualizado_por: normalized.usuario_id,
  });

  await db.updateRow("compra_items", item.id, {
    unidad_id: unit.id,
    estado: normalized.destino === "ENTREGA_DIRECTA" ? "ENTREGADO_DIRECTO" : normalized.destino === "REPARTIDOR" ? "EN_PODER_REPARTIDOR" : "RECIBIDO_OFICINA",
    actualizado_por: normalized.usuario_id,
  });

  if (saleItem) {
    await db.updateRow("venta_items", saleItem.id, {
      unidad_id: unit.id,
      estado: normalized.destino === "ENTREGA_DIRECTA" ? "ENTREGADO" : normalized.destino === "REPARTIDOR" ? "EN_PODER_REPARTIDOR" : "RESERVADO_OFICINA",
      entregado_en: normalized.destino === "ENTREGA_DIRECTA" ? now : saleItem.entregado_en,
      actualizado_por: normalized.usuario_id,
    });
  }

  await confirmPurchaseRouteItems(item.id, unit.id, normalized.usuario_id, options);
  if (normalized.destino === "ENTREGA_DIRECTA" && saleItem) {
    await confirmDeliveryRouteItems([saleItem.id], normalized.usuario_id, options);
  }

  await updatePurchaseState(item.compra_id, options);
  await insertHistory({
    entidadId: unit.id,
    tipo: "UNIDAD_RECIBIDA",
    antes: {},
    despues: { ...unit },
    detalle: normalized.destino,
    usuarioId: normalized.usuario_id,
    options,
  });

  return listStockData(options);
}

export async function updateUnitIdentity(unitId: UUID, input: UpdateUnitIdentityInput, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const unit = await requireUnit(unitId, options);
  if (unit.estado === "FINALIZADA") throw new Error("La unidad finalizada ya no permite editar IMEI, serie o identificadores.");
  if (unit.estado === "CANCELADA") throw new Error("La unidad cancelada no se puede editar.");

  const normalized = normalizeIdentityInput(input);
  const nextAtributos = normalized.atributos ?? unit.atributos;
  const updated = await db.updateRow("unidades", unit.id, {
    imei: normalized.imei ?? unit.imei,
    serie: normalized.serie ?? unit.serie,
    color: normalized.color ?? unit.color,
    atributos: nextAtributos,
    actualizado_por: normalized.usuario_id,
  });

  await insertHistory({
    entidadId: unit.id,
    tipo: "IMEI_EDITADO",
    antes: pickIdentity(unit),
    despues: pickIdentity(updated),
    detalle: "Edicion de identificadores de unidad",
    usuarioId: normalized.usuario_id,
    options,
  });

  return listStockData(options);
}

export async function deliverUnit(unitId: UUID, usuarioId: UUID | null = null, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const unit = await requireUnit(unitId, options);
  if (!unit.venta_item_id) throw new Error("La unidad no esta asociada a una venta.");
  if (unit.estado === "FINALIZADA") throw new Error("La unidad ya esta finalizada.");
  if (unit.estado === "GARANTIA" || unit.estado === "CANCELADA") throw new Error("La unidad no se puede entregar desde su estado actual.");

  const saleItem = await requireSaleItem(unit.venta_item_id, options);
  const sale = await requireSale(saleItem.venta_id, options);
  const items = (await db.listRows("venta_items")).filter((item) => item.venta_id === sale.id && item.estado !== "CANCELADO");
  const units = await db.listRows("unidades");
  const now = new Date().toISOString();
  const updatedItemIds: UUID[] = [];

  for (const item of items) {
    if (!item.unidad_id) throw new Error("La venta tiene items sin unidad asignada; no se permite entrega parcial.");
    const itemUnit = units.find((current) => current.id === item.unidad_id);
    if (!itemUnit || itemUnit.estado === "GARANTIA" || itemUnit.estado === "CANCELADA") {
      throw new Error("La venta tiene unidades que no estan listas para entrega.");
    }
  }

  for (const item of items) {
    const itemUnit = units.find((current) => current.id === item.unidad_id)!;
    await db.updateRow("unidades", itemUnit.id, {
      estado: "ENTREGADA",
      ubicacion_tipo: "CLIENTE",
      ubicacion_usuario_id: null,
      ubicacion_cliente_id: sale.cliente_id,
      actualizado_por: usuarioId,
    });
    await db.updateRow("venta_items", item.id, {
      estado: "ENTREGADO",
      entregado_en: item.entregado_en ?? now,
      actualizado_por: usuarioId,
    });
    updatedItemIds.push(item.id);
    await insertHistory({
      entidadId: itemUnit.id,
      tipo: "UNIDAD_ENTREGADA",
      antes: { estado: itemUnit.estado, ubicacion_tipo: itemUnit.ubicacion_tipo },
      despues: { estado: "ENTREGADA", ubicacion_tipo: "CLIENTE", cliente_id: sale.cliente_id },
      detalle: `Venta #${sale.numero}`,
      usuarioId,
      options,
    });
  }

  await confirmDeliveryRouteItems(updatedItemIds, usuarioId, options);
  return listStockData(options);
}

export async function finalizeUnit(unitId: UUID, usuarioId: UUID | null = null, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const unit = await requireUnit(unitId, options);
  if (unit.estado === "FINALIZADA") return listStockData(options);
  if (!hasIdentifier(unit)) throw new Error("Para finalizar, la unidad debe tener IMEI, serie o identificador.");
  if (unit.estado !== "ENTREGADA") throw new Error("Para finalizar, la unidad debe estar entregada.");
  if (!unit.venta_item_id) throw new Error("Para finalizar, la unidad debe estar asociada a una venta.");

  const saleItem = await requireSaleItem(unit.venta_item_id, options);
  if (saleItem.saldo_pendiente > 0) throw new Error("Para finalizar, el item debe estar pagado.");

  const now = new Date().toISOString();
  await db.updateRow("unidades", unit.id, {
    estado: "FINALIZADA",
    finalizada_en: now,
    actualizado_por: usuarioId,
  });
  await db.updateRow("venta_items", saleItem.id, {
    estado: "FINALIZADO",
    finalizado_en: now,
    actualizado_por: usuarioId,
  });

  const sale = await requireSale(saleItem.venta_id, options);
  const saleItems = await db.listRows("venta_items");
  const activeItems = saleItems.filter((item) => item.venta_id === sale.id && item.estado !== "CANCELADO" && item.id !== saleItem.id);
  if (sale.saldo_pendiente === 0 && activeItems.every((item) => item.estado === "FINALIZADO")) {
    await db.updateRow("ventas", sale.id, {
      estado: "FINALIZADA",
      actualizado_por: usuarioId,
    });
  }

  await insertHistory({
    entidadId: unit.id,
    tipo: "UNIDAD_FINALIZADA",
    antes: { estado: unit.estado, finalizada_en: unit.finalizada_en },
    despues: { estado: "FINALIZADA", finalizada_en: now },
    detalle: `Venta #${sale.numero}`,
    usuarioId,
    options,
  });

  return listStockData(options);
}

export async function moveUnitToWarranty(unitId: UUID, input: UnitWarrantyInput = {}, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const unit = await requireUnit(unitId, options);
  if (unit.estado === "CANCELADA") throw new Error("La unidad cancelada no puede pasar a garantia.");

  const normalized = {
    motivo: optionalText(input.motivo),
    usuario_id: input.usuario_id || null,
  };

  await db.updateRow("unidades", unit.id, {
    estado: "GARANTIA",
    ubicacion_tipo: "OFICINA",
    ubicacion_usuario_id: null,
    ubicacion_cliente_id: null,
    actualizado_por: normalized.usuario_id,
  });

  if (unit.venta_item_id) {
    await db.updateRow("venta_items", unit.venta_item_id, {
      estado: "GARANTIA",
      actualizado_por: normalized.usuario_id,
    });
  }

  await insertHistory({
    entidadId: unit.id,
    tipo: "GARANTIA_INICIADA",
    antes: { estado: unit.estado, ubicacion_tipo: unit.ubicacion_tipo },
    despues: { estado: "GARANTIA", ubicacion_tipo: "OFICINA" },
    detalle: normalized.motivo,
    usuarioId: normalized.usuario_id,
    options,
  });

  return listStockData(options);
}

async function updatePurchaseState(compraId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const items = (await db.listRows("compra_items")).filter((item) => item.compra_id === compraId);
  const active = items.filter((item) => item.estado !== "CANCELADO");
  if (!active.length) return;

  const resolved = active.filter((item) => item.estado === "RECIBIDO_OFICINA" || item.estado === "ENTREGADO_DIRECTO");
  if (resolved.length === active.length) {
    await db.updateRow("compras", compraId, { estado: "RECIBIDA_TOTAL" });
  } else if (resolved.length > 0) {
    await db.updateRow("compras", compraId, { estado: "RECIBIDA_PARCIAL" });
  }
}

async function confirmPurchaseRouteItems(compraItemId: UUID, unidadId: UUID, usuarioId: UUID | null, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const routeItems = await db.listRows("ruta_items");
  const now = new Date().toISOString();
  for (const routeItem of routeItems.filter((item) => item.compra_item_id === compraItemId && item.tipo === "RETIRAR_PROVEEDOR" && item.estado === "PENDIENTE")) {
    await db.updateRow("ruta_items", routeItem.id, {
      unidad_id: unidadId,
      estado: "CONFIRMADA",
      realizado_en: now,
      actualizado_por: usuarioId,
    });
  }
}

async function confirmDeliveryRouteItems(ventaItemIds: UUID[], usuarioId: UUID | null, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const routeItems = await db.listRows("ruta_items");
  const now = new Date().toISOString();
  for (const routeItem of routeItems.filter((item) => item.venta_item_id && ventaItemIds.includes(item.venta_item_id) && item.tipo === "ENTREGAR_CLIENTE" && item.estado === "PENDIENTE")) {
    await db.updateRow("ruta_items", routeItem.id, {
      estado: "CONFIRMADA",
      realizado_en: now,
      actualizado_por: usuarioId,
    });
  }
}

async function assertSingleItemSaleForDirectDelivery(saleId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const activeItems = (await db.listRows("venta_items")).filter((item) => item.venta_id === saleId && item.estado !== "CANCELADO");
  if (activeItems.length > 1) {
    throw new Error("La entrega directa inicial solo esta habilitada para ventas de un item para no generar entrega parcial.");
  }
}

async function resolveCourierId(destination: UnitDestination, courierId: UUID | null, purchase: CompraRow, options: LocalDbClientOptions) {
  if (destination !== "REPARTIDOR") return null;

  const db = createLocalDbClient(options);
  const resolvedId = courierId || purchase.repartidor_retiro_id;
  const courier = resolvedId ? await db.getRowById("usuarios", resolvedId) : null;
  if (!courier || !courier.activo || courier.rol !== "REPARTIDOR") {
    throw new Error("La unidad en poder de repartidor requiere un repartidor activo.");
  }

  return courier.id;
}

async function requirePurchaseItem(itemId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const item = await db.getRowById("compra_items", requiredId(itemId, "Item de compra"));
  if (!item) throw new Error("Item de compra inexistente.");
  return item;
}

async function requirePurchase(purchaseId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const purchase = await db.getRowById("compras", requiredId(purchaseId, "Compra"));
  if (!purchase) throw new Error("Compra inexistente.");
  return purchase;
}

async function requireSale(saleId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const sale = await db.getRowById("ventas", requiredId(saleId, "Venta"));
  if (!sale) throw new Error("Venta inexistente.");
  return sale;
}

async function requireSaleItem(itemId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const item = await db.getRowById("venta_items", requiredId(itemId, "Item de venta"));
  if (!item) throw new Error("Item de venta inexistente.");
  return item;
}

async function requireUnit(unitId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const unit = await db.getRowById("unidades", requiredId(unitId, "Unidad"));
  if (!unit) throw new Error("Unidad inexistente.");
  return unit;
}

async function insertHistory({
  entidadId,
  tipo,
  antes,
  despues,
  detalle,
  usuarioId,
  options,
}: {
  entidadId: UUID;
  tipo: string;
  antes: Record<string, unknown>;
  despues: Record<string, unknown>;
  detalle: string | null;
  usuarioId: UUID | null;
  options: LocalDbClientOptions;
}) {
  const db = createLocalDbClient(options);
  await db.insertRow("historial_eventos", {
    entidad: "unidades",
    entidad_id: entidadId,
    tipo,
    antes,
    despues,
    detalle,
    usuario_id: usuarioId,
    creado_en: new Date().toISOString(),
  });
}

function normalizeReceiveInput(input: ReceivePurchaseItemInput): Required<ReceivePurchaseItemInput> {
  const destination: UnitDestination = input.destino === "REPARTIDOR" || input.destino === "ENTREGA_DIRECTA" ? input.destino : "OFICINA";
  return {
    compra_item_id: requiredId(input.compra_item_id, "Item de compra"),
    destino: destination,
    repartidor_id: input.repartidor_id || null,
    imei: optionalText(input.imei),
    serie: optionalText(input.serie),
    color: optionalText(input.color),
    atributos: normalizeAttributes(input.atributos),
    usuario_id: input.usuario_id || null,
  };
}

function normalizeIdentityInput(input: UpdateUnitIdentityInput): Required<UpdateUnitIdentityInput> {
  return {
    imei: optionalText(input.imei),
    serie: optionalText(input.serie),
    color: optionalText(input.color),
    atributos: input.atributos === undefined ? null : normalizeAttributes(input.atributos),
    usuario_id: input.usuario_id || null,
  };
}

function normalizeAttributes(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function pickIdentity(unit: UnidadRow) {
  return {
    imei: unit.imei,
    serie: unit.serie,
    color: unit.color,
    atributos: unit.atributos,
  };
}

function hasIdentifier(unit: UnidadRow) {
  return Boolean(unit.imei || unit.serie || Object.values(unit.atributos).some((value) => typeof value === "string" && value.trim().length > 0));
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

function sortNamedRows<Row extends { nombre: string }>(rows: Row[]) {
  return [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

function sortProducts(rows: ProductoRow[]) {
  return [...rows].sort((a, b) => [a.categoria, a.marca, a.modelo, a.nombre].join(" ").localeCompare([b.categoria, b.marca, b.modelo, b.nombre].join(" "), "es"));
}
