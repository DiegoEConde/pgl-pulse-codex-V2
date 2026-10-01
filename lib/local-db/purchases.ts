import { createLocalDbClient, type LocalDbClientOptions } from "./client";
import type {
  ClienteRow,
  CompraItemRow,
  CompraRow,
  Moneda,
  ProductoRow,
  ProveedorRow,
  RutaItemRow,
  RutaRow,
  UsuarioRow,
  VentaItemRow,
  VentaRow,
  UUID,
} from "./schema";

export type PurchaseLineInput = {
  producto_id: UUID;
  costo_original: number;
  venta_item_id?: UUID | null;
};

export type CreatePurchaseInput = {
  proveedor_id: UUID;
  repartidor_retiro_id?: UUID | null;
  fecha_retiro_programada?: string | null;
  moneda: Moneda;
  paga_al_retirar: boolean;
  observaciones?: string | null;
  items: PurchaseLineInput[];
};

export interface PurchaseData {
  compras: CompraRow[];
  compra_items: CompraItemRow[];
  proveedores: ProveedorRow[];
  productos: ProductoRow[];
  repartidores: UsuarioRow[];
  ventas: VentaRow[];
  venta_items: VentaItemRow[];
  clientes: ClienteRow[];
  rutas: RutaRow[];
  ruta_items: RutaItemRow[];
}

export function emptyPurchaseData(): PurchaseData {
  return {
    compras: [],
    compra_items: [],
    proveedores: [],
    productos: [],
    repartidores: [],
    ventas: [],
    venta_items: [],
    clientes: [],
    rutas: [],
    ruta_items: [],
  };
}

export async function listPurchaseData(options: LocalDbClientOptions = {}): Promise<PurchaseData> {
  const db = createLocalDbClient(options);
  const [compras, compraItems, proveedores, productos, usuarios, ventas, ventaItems, clientes, rutas, rutaItems] = await Promise.all([
    db.listRows("compras"),
    db.listRows("compra_items"),
    db.listRows("proveedores"),
    db.listRows("productos"),
    db.listRows("usuarios"),
    db.listRows("ventas"),
    db.listRows("venta_items"),
    db.listRows("clientes"),
    db.listRows("rutas"),
    db.listRows("ruta_items"),
  ]);

  return {
    compras: [...compras].sort((a, b) => b.numero - a.numero),
    compra_items: compraItems,
    proveedores: sortNamedRows(proveedores),
    productos: sortProducts(productos),
    repartidores: sortNamedRows(usuarios.filter((usuario) => usuario.rol === "REPARTIDOR")),
    ventas: [...ventas].sort((a, b) => b.numero - a.numero),
    venta_items: ventaItems,
    clientes: sortNamedRows(clientes),
    rutas: [...rutas].sort((a, b) => Date.parse(b.fecha_programada) - Date.parse(a.fecha_programada)),
    ruta_items: rutaItems,
  };
}

export async function createPurchase(input: CreatePurchaseInput, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const now = new Date().toISOString();
  const normalized = await normalizePurchaseInput(input, options);
  const numero = await db.nextSequence("compras.numero");
  const total = normalized.items.reduce((sum, item) => sum + item.costo_original, 0);
  const hasCourier = Boolean(normalized.repartidor_retiro_id);

  const purchase = await db.insertRow("compras", {
    numero,
    proveedor_id: normalized.proveedor_id,
    repartidor_retiro_id: normalized.repartidor_retiro_id,
    estado: hasCourier ? "EN_RETIRO" : "PEDIDA",
    fecha_pedido: now,
    fecha_retiro_programada: normalized.fecha_retiro_programada,
    moneda: normalized.moneda,
    total_estimado: total,
    paga_al_retirar: normalized.paga_al_retirar,
    observaciones: normalized.observaciones,
    creado_en: now,
    actualizado_en: now,
    creado_por: null,
    actualizado_por: null,
  });

  const createdItems: CompraItemRow[] = [];
  for (const line of normalized.items) {
    const item = await db.insertRow("compra_items", {
      compra_id: purchase.id,
      producto_id: line.producto_id,
      venta_item_id: line.venta_item_id,
      unidad_id: null,
      estado: hasCourier ? "ASIGNADO_RUTA" : "PEDIDO",
      costo_original: line.costo_original,
      moneda: normalized.moneda,
      cancelado_en: null,
      creado_en: now,
      actualizado_en: now,
      creado_por: null,
      actualizado_por: null,
    });
    createdItems.push(item);

    if (line.venta_item_id) {
      await db.updateRow("venta_items", line.venta_item_id, {
        compra_item_id: item.id,
        estado: "PENDIENTE_ABASTECIMIENTO",
      });
    }
  }

  if (normalized.repartidor_retiro_id) {
    await createRouteForPurchase({
      purchase,
      items: createdItems,
      repartidorId: normalized.repartidor_retiro_id,
      proveedorId: normalized.proveedor_id,
      fechaProgramada: normalized.fecha_retiro_programada ?? now,
      pagaAlRetirar: normalized.paga_al_retirar,
      moneda: normalized.moneda,
      options,
    });
  }

  return listPurchaseData(options);
}

export async function cancelPurchaseItem(itemId: UUID, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const item = await db.getRowById("compra_items", itemId);
  if (!item) throw new Error("Item de compra inexistente.");
  if (item.estado === "CANCELADO") return listPurchaseData(options);

  const now = new Date().toISOString();
  await db.updateRow("compra_items", item.id, {
    estado: "CANCELADO",
    cancelado_en: now,
  });

  const routeItems = await db.listRows("ruta_items");
  for (const routeItem of routeItems.filter((row) => row.compra_item_id === item.id && row.estado !== "CANCELADA")) {
    await db.updateRow("ruta_items", routeItem.id, { estado: "CANCELADA" });
  }

  if (item.venta_item_id) {
    await db.updateRow("venta_items", item.venta_item_id, {
      compra_item_id: null,
      estado: "PENDIENTE_ABASTECIMIENTO",
    });
  }

  const siblings = await db.listRows("compra_items");
  const purchaseItems = siblings.filter((row) => row.compra_id === item.compra_id);
  const activeItems = purchaseItems.filter((row) => row.id !== item.id && row.estado !== "CANCELADO");
  const total = activeItems.reduce((sum, row) => sum + row.costo_original, 0);

  await db.updateRow("compras", item.compra_id, activeItems.length ? { total_estimado: total } : { estado: "CANCELADA", total_estimado: total });

  return listPurchaseData(options);
}

async function createRouteForPurchase({
  purchase,
  items,
  repartidorId,
  proveedorId,
  fechaProgramada,
  pagaAlRetirar,
  moneda,
  options,
}: {
  purchase: CompraRow;
  items: CompraItemRow[];
  repartidorId: UUID;
  proveedorId: UUID;
  fechaProgramada: string;
  pagaAlRetirar: boolean;
  moneda: Moneda;
  options: LocalDbClientOptions;
}) {
  const db = createLocalDbClient(options);
  const now = new Date().toISOString();
  const route = await db.insertRow("rutas", {
    repartidor_id: repartidorId,
    estado: "PROGRAMADA",
    fecha_programada: fechaProgramada,
    iniciada_en: null,
    cerrada_en: null,
    observaciones: `Retiro compra C-${purchase.numero}`,
    creado_en: now,
    actualizado_en: now,
    creado_por: null,
    actualizado_por: null,
  });

  let order = 1;
  for (const item of items) {
    await db.insertRow("ruta_items", {
      ruta_id: route.id,
      orden: order,
      tipo: "RETIRAR_PROVEEDOR",
      destino_tipo: "PROVEEDOR",
      proveedor_id: proveedorId,
      cliente_id: null,
      direccion: null,
      compra_item_id: item.id,
      venta_item_id: null,
      unidad_id: null,
      importe_esperado: 0,
      moneda: null,
      estado: "PENDIENTE",
      realizado_en: null,
      creado_en: now,
      actualizado_en: now,
      creado_por: null,
      actualizado_por: null,
    });
    order += 1;

    if (pagaAlRetirar && item.costo_original > 0) {
      await db.insertRow("ruta_items", {
        ruta_id: route.id,
        orden: order,
        tipo: "PAGAR_PROVEEDOR",
        destino_tipo: "PROVEEDOR",
        proveedor_id: proveedorId,
        cliente_id: null,
        direccion: null,
        compra_item_id: item.id,
        venta_item_id: null,
        unidad_id: null,
        importe_esperado: item.costo_original,
        moneda,
        estado: "PENDIENTE",
        realizado_en: null,
        creado_en: now,
        actualizado_en: now,
        creado_por: null,
        actualizado_por: null,
      });
      order += 1;
    }
  }
}

async function normalizePurchaseInput(input: CreatePurchaseInput, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const proveedor = await db.getRowById("proveedores", requiredId(input.proveedor_id, "Proveedor"));
  if (!proveedor) throw new Error("Proveedor inexistente.");
  if (!proveedor.activo) throw new Error("Proveedor inactivo.");

  const repartidorId = input.repartidor_retiro_id || null;
  if (repartidorId) {
    const repartidor = await db.getRowById("usuarios", repartidorId);
    if (!repartidor || repartidor.rol !== "REPARTIDOR") throw new Error("El retiro debe asignarse a un usuario repartidor.");
    if (!repartidor.activo) throw new Error("El repartidor esta inactivo.");
  }

  const moneda: Moneda = input.moneda === "ARS" ? "ARS" : "USD";
  const items = input.items.map((item, index) => normalizeLine(item, index));
  if (!items.length) throw new Error("La compra debe tener al menos un producto.");

  const linkedSaleItems = items.map((item) => item.venta_item_id).filter(Boolean);
  if (new Set(linkedSaleItems).size !== linkedSaleItems.length) {
    throw new Error("No se puede vincular dos items de compra al mismo item de venta.");
  }

  for (const item of items) {
    const product = await db.getRowById("productos", item.producto_id);
    if (!product) throw new Error("Producto inexistente.");
    if (!product.activo) throw new Error(`Producto inactivo: ${product.nombre}.`);

    if (item.venta_item_id) {
      const saleItem = await db.getRowById("venta_items", item.venta_item_id);
      if (!saleItem) throw new Error("Item de venta inexistente.");
      if (saleItem.compra_item_id) throw new Error("El item de venta ya tiene una compra vinculada.");
    }
  }

  return {
    proveedor_id: proveedor.id,
    repartidor_retiro_id: repartidorId,
    fecha_retiro_programada: normalizeDate(input.fecha_retiro_programada),
    moneda,
    paga_al_retirar: Boolean(input.paga_al_retirar),
    observaciones: optionalText(input.observaciones),
    items,
  };
}

function normalizeLine(input: PurchaseLineInput, index: number): Required<PurchaseLineInput> {
  const productId = requiredId(input.producto_id, `Producto ${index + 1}`);
  const cost = Number(input.costo_original);
  if (!Number.isFinite(cost) || cost < 0) throw new Error(`Costo invalido en item ${index + 1}.`);

  return {
    producto_id: productId,
    costo_original: Math.round(cost * 100) / 100,
    venta_item_id: input.venta_item_id || null,
  };
}

function requiredId(value: unknown, label: string) {
  const text = optionalText(value);
  if (!text) throw new Error(`${label} es obligatorio.`);
  return text;
}

function normalizeDate(value: unknown) {
  const text = optionalText(value);
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) throw new Error("Fecha de retiro invalida.");
  return parsed.toISOString();
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
