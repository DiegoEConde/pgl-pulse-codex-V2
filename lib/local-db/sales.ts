import { createLocalDbClient, type LocalDbClientOptions } from "./client";
import type {
  ClienteRow,
  CompraItemRow,
  ComprobanteEstado,
  MedioPago,
  Moneda,
  MovimientoDineroRow,
  ProductoRow,
  RutaItemRow,
  RutaRow,
  UnidadRow,
  UsuarioRow,
  VentaItemRow,
  VentaRow,
  UUID,
} from "./schema";

export type SaleLineInput = {
  producto_id: UUID;
  precio_venta: number;
  moneda: Moneda;
  unidad_id?: UUID | null;
  compra_item_id?: UUID | null;
};

export type SalePaymentInput = {
  importe: number;
  moneda: Moneda;
  medio_pago: MedioPago;
  venta_item_id?: UUID | null;
  line_index?: number | null;
};

export type CreateSaleInput = {
  cliente_id: UUID;
  vendedor_id: UUID;
  moneda_principal: Moneda;
  con_envio: boolean;
  direccion_entrega?: string | null;
  repartidor_entrega_id?: UUID | null;
  observaciones?: string | null;
  emitir_comprobante?: boolean;
  items: SaleLineInput[];
  pago_inicial?: SalePaymentInput | null;
};

export interface SalesData {
  ventas: VentaRow[];
  venta_items: VentaItemRow[];
  clientes: ClienteRow[];
  productos: ProductoRow[];
  vendedores: UsuarioRow[];
  repartidores: UsuarioRow[];
  unidades: UnidadRow[];
  compra_items: CompraItemRow[];
  movimientos_dinero: MovimientoDineroRow[];
  rutas: RutaRow[];
  ruta_items: RutaItemRow[];
}

export function emptySalesData(): SalesData {
  return {
    ventas: [],
    venta_items: [],
    clientes: [],
    productos: [],
    vendedores: [],
    repartidores: [],
    unidades: [],
    compra_items: [],
    movimientos_dinero: [],
    rutas: [],
    ruta_items: [],
  };
}

export async function listSalesData(options: LocalDbClientOptions = {}): Promise<SalesData> {
  const db = createLocalDbClient(options);
  const [ventas, ventaItems, clientes, productos, usuarios, unidades, compraItems, movimientos, rutas, rutaItems] = await Promise.all([
    db.listRows("ventas"),
    db.listRows("venta_items"),
    db.listRows("clientes"),
    db.listRows("productos"),
    db.listRows("usuarios"),
    db.listRows("unidades"),
    db.listRows("compra_items"),
    db.listRows("movimientos_dinero"),
    db.listRows("rutas"),
    db.listRows("ruta_items"),
  ]);

  return {
    ventas: [...ventas].sort((a, b) => b.numero - a.numero),
    venta_items: ventaItems,
    clientes: sortNamedRows(clientes),
    productos: sortProducts(productos),
    vendedores: sortNamedRows(usuarios.filter((usuario) => usuario.rol === "VENDEDOR" || usuario.rol === "ADMINISTRADOR")),
    repartidores: sortNamedRows(usuarios.filter((usuario) => usuario.rol === "REPARTIDOR")),
    unidades,
    compra_items: compraItems,
    movimientos_dinero: movimientos,
    rutas: [...rutas].sort((a, b) => Date.parse(b.fecha_programada) - Date.parse(a.fecha_programada)),
    ruta_items: rutaItems,
  };
}

export async function createSale(input: CreateSaleInput, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const normalized = await normalizeSaleInput(input, options);
  const now = new Date().toISOString();
  const numero = await db.nextSequence("ventas.numero");
  const total = normalized.items.reduce((sum, item) => sum + item.precio_venta, 0);
  const initialPayment = normalized.pago_inicial;

  const sale = await db.insertRow("ventas", {
    numero,
    cliente_id: normalized.cliente_id,
    vendedor_id: normalized.vendedor_id,
    estado: "CONFIRMADA",
    fecha: now,
    moneda_principal: normalized.moneda_principal,
    total,
    saldo_pendiente: total,
    con_envio: normalized.con_envio,
    direccion_entrega: normalized.direccion_entrega,
    repartidor_entrega_id: normalized.repartidor_entrega_id,
    comprobante_numero: null,
    comprobante_estado: null,
    comprobante_snapshot: {},
    observaciones: normalized.observaciones,
    creado_en: now,
    actualizado_en: now,
    creado_por: normalized.vendedor_id,
    actualizado_por: normalized.vendedor_id,
  });

  const createdItems: VentaItemRow[] = [];
  for (const line of normalized.items) {
    const state = line.compra_item_id ? "PENDIENTE_ABASTECIMIENTO" : normalized.con_envio ? "ASIGNADO_RUTA" : "RESERVADO_OFICINA";
    const saleItem = await db.insertRow("venta_items", {
      venta_id: sale.id,
      producto_id: line.producto_id,
      unidad_id: line.unidad_id,
      compra_item_id: line.compra_item_id,
      estado: state,
      precio_venta: line.precio_venta,
      moneda: line.moneda,
      saldo_pendiente: line.precio_venta,
      pagado_en: null,
      entregado_en: null,
      finalizado_en: null,
      creado_en: now,
      actualizado_en: now,
      creado_por: normalized.vendedor_id,
      actualizado_por: normalized.vendedor_id,
    });
    createdItems.push(saleItem);

    if (line.unidad_id) {
      await db.updateRow("unidades", line.unidad_id, {
        estado: normalized.con_envio ? "EN_PODER_REPARTIDOR" : "EN_OFICINA_RESERVADA",
        venta_item_id: saleItem.id,
        ubicacion_tipo: normalized.con_envio ? "REPARTIDOR" : "OFICINA",
        ubicacion_usuario_id: normalized.con_envio ? normalized.repartidor_entrega_id : null,
      });
    }

    if (line.compra_item_id) {
      await db.updateRow("compra_items", line.compra_item_id, {
        venta_item_id: saleItem.id,
      });
    }
  }

  if (initialPayment && initialPayment.importe > 0) {
    const targetItem = initialPayment.line_index === null || initialPayment.line_index === undefined ? null : createdItems[initialPayment.line_index] ?? null;
    await createSalePaymentMovement({
      sale,
      saleItem: targetItem,
      payment: initialPayment,
      usuarioId: normalized.vendedor_id,
      options,
    });
    await applyPaymentToBalances(sale, createdItems, initialPayment.importe, targetItem?.id ?? null, options);
  }

  let updatedSale = await db.getRowById("ventas", sale.id);
  if (!updatedSale) throw new Error("No se pudo leer la venta creada.");

  if (normalized.con_envio && normalized.repartidor_entrega_id) {
    await createDeliveryRouteForSale({
      sale: updatedSale,
      items: createdItems,
      repartidorId: normalized.repartidor_entrega_id,
      direccion: normalized.direccion_entrega,
      options,
    });
  }

  updatedSale = await db.getRowById("ventas", sale.id);
  if (!updatedSale) throw new Error("No se pudo leer la venta creada.");

  if (normalized.emitir_comprobante) {
    updatedSale = await upsertReceipt(updatedSale.id, { paidIfSettled: true }, options);
  }

  return listSalesData(options);
}

export async function registerSalePayment(saleId: UUID, payment: SalePaymentInput, options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const sale = await requireSale(saleId, options);
  const normalized = normalizePayment(payment);
  const saleItems = await db.listRows("venta_items");
  const items = saleItems.filter((item) => item.venta_id === sale.id && item.estado !== "CANCELADO");
  const targetItem = normalized.venta_item_id ? items.find((item) => item.id === normalized.venta_item_id) ?? null : null;

  if (normalized.venta_item_id && !targetItem) throw new Error("El item de venta indicado no existe.");
  if (normalized.importe > sale.saldo_pendiente) throw new Error("El pago supera el saldo de la venta.");
  if (targetItem && normalized.importe > targetItem.saldo_pendiente) throw new Error("El pago supera el saldo del item.");

  await createSalePaymentMovement({
    sale,
    saleItem: targetItem,
    payment: normalized,
    usuarioId: sale.vendedor_id,
    options,
  });

  await applyPaymentToBalances(sale, items, normalized.importe, targetItem?.id ?? null, options);
  const updatedSale = await requireSale(saleId, options);
  if (updatedSale.saldo_pendiente === 0 && updatedSale.comprobante_numero) {
    await upsertReceipt(updatedSale.id, { paidIfSettled: true }, options);
  }

  return listSalesData(options);
}

export async function upsertReceipt(
  saleId: UUID,
  { paidIfSettled = false }: { paidIfSettled?: boolean } = {},
  options: LocalDbClientOptions = {},
) {
  const db = createLocalDbClient(options);
  const sale = await requireSale(saleId, options);
  const items = (await db.listRows("venta_items")).filter((item) => item.venta_id === sale.id);
  const products = await db.listRows("productos");
  const client = await db.getRowById("clientes", sale.cliente_id);
  const number = sale.comprobante_numero ?? await db.nextSequence("ventas.comprobante_numero");
  const status: ComprobanteEstado = paidIfSettled && sale.saldo_pendiente === 0 ? "PAGADO" : sale.comprobante_estado ?? "EMITIDO";
  const snapshot = {
    numero: number,
    estado: status,
    emitido_en: new Date().toISOString(),
    venta_numero: sale.numero,
    cliente: client?.nombre ?? "Cliente no disponible",
    total: sale.total,
    saldo_pendiente: sale.saldo_pendiente,
    moneda: sale.moneda_principal,
    items: items.map((item) => ({
      producto: products.find((product) => product.id === item.producto_id)?.nombre ?? "Producto no disponible",
      precio: item.precio_venta,
      moneda: item.moneda,
      saldo_pendiente: item.saldo_pendiente,
    })),
  };

  await db.updateRow("ventas", sale.id, {
    comprobante_numero: number,
    comprobante_estado: status,
    comprobante_snapshot: snapshot,
  });

  return (await db.getRowById("ventas", sale.id))!;
}

async function applyPaymentToBalances(
  sale: VentaRow,
  items: VentaItemRow[],
  amount: number,
  targetItemId: UUID | null,
  options: LocalDbClientOptions,
) {
  const db = createLocalDbClient(options);
  const now = new Date().toISOString();
  let remaining = amount;

  for (const item of items) {
    if (targetItemId && item.id !== targetItemId) continue;
    if (remaining <= 0) break;

    const applied = Math.min(remaining, item.saldo_pendiente);
    if (applied <= 0) continue;
    const nextSaldo = roundMoney(item.saldo_pendiente - applied);
    await db.updateRow("venta_items", item.id, {
      saldo_pendiente: nextSaldo,
      pagado_en: nextSaldo === 0 ? now : item.pagado_en,
    });
    remaining = roundMoney(remaining - applied);
  }

  await db.updateRow("ventas", sale.id, {
    saldo_pendiente: roundMoney(sale.saldo_pendiente - amount),
  });
}

async function createDeliveryRouteForSale({
  sale,
  items,
  repartidorId,
  direccion,
  options,
}: {
  sale: VentaRow;
  items: VentaItemRow[];
  repartidorId: UUID;
  direccion: string | null;
  options: LocalDbClientOptions;
}) {
  const db = createLocalDbClient(options);
  const now = new Date().toISOString();
  const route = await db.insertRow("rutas", {
    repartidor_id: repartidorId,
    estado: "PROGRAMADA",
    fecha_programada: now,
    iniciada_en: null,
    cerrada_en: null,
    observaciones: `Entrega venta #${sale.numero}`,
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
      tipo: "ENTREGAR_CLIENTE",
      destino_tipo: "CLIENTE",
      proveedor_id: null,
      cliente_id: sale.cliente_id,
      direccion,
      compra_item_id: null,
      venta_item_id: item.id,
      unidad_id: item.unidad_id,
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
  }

  if (sale.saldo_pendiente > 0) {
    await db.insertRow("ruta_items", {
      ruta_id: route.id,
      orden: order,
      tipo: "COBRAR_CLIENTE",
      destino_tipo: "CLIENTE",
      proveedor_id: null,
      cliente_id: sale.cliente_id,
      direccion,
      compra_item_id: null,
      venta_item_id: null,
      unidad_id: null,
      importe_esperado: sale.saldo_pendiente,
      moneda: sale.moneda_principal,
      estado: "PENDIENTE",
      realizado_en: null,
      creado_en: now,
      actualizado_en: now,
      creado_por: null,
      actualizado_por: null,
    });
  }
}

async function createSalePaymentMovement({
  sale,
  saleItem,
  payment,
  usuarioId,
  options,
}: {
  sale: VentaRow;
  saleItem: VentaItemRow | null;
  payment: SalePaymentInput;
  usuarioId: UUID;
  options: LocalDbClientOptions;
}) {
  const db = createLocalDbClient(options);
  const now = new Date().toISOString();
  await db.insertRow("movimientos_dinero", {
    tipo: "COBRO_CLIENTE",
    signo: "INGRESO",
    moneda: payment.moneda,
    medio_pago: payment.medio_pago,
    importe: payment.importe,
    estado: sale.saldo_pendiente - payment.importe <= 0 ? "APLICADO_TOTAL" : "APLICADO_PARCIAL",
    fecha: now,
    venta_id: sale.id,
    venta_item_id: saleItem?.id ?? null,
    compra_id: null,
    compra_item_id: null,
    ruta_id: null,
    ruta_item_id: null,
    cliente_id: sale.cliente_id,
    proveedor_id: null,
    usuario_id: usuarioId,
    cierre_codigo: null,
    cotizacion_usada: null,
    snapshot: {
      venta_numero: sale.numero,
      saldo_anterior: sale.saldo_pendiente,
      saldo_posterior: Math.max(0, roundMoney(sale.saldo_pendiente - payment.importe)),
    },
    observaciones: saleItem ? "Pago aplicado a item de venta" : "Pago aplicado a venta",
    creado_en: now,
    actualizado_en: now,
    creado_por: usuarioId,
    actualizado_por: usuarioId,
  });
}

async function normalizeSaleInput(input: CreateSaleInput, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const cliente = await db.getRowById("clientes", requiredId(input.cliente_id, "Cliente"));
  if (!cliente || !cliente.activo) throw new Error("Cliente inexistente o inactivo.");

  const vendedor = await db.getRowById("usuarios", requiredId(input.vendedor_id, "Vendedor"));
  if (!vendedor || !vendedor.activo || !["VENDEDOR", "ADMINISTRADOR"].includes(vendedor.rol)) {
    throw new Error("El vendedor debe ser un usuario vendedor o administrador activo.");
  }

  const conEnvio = Boolean(input.con_envio);
  const repartidorId = input.repartidor_entrega_id || null;
  if (conEnvio) {
    const repartidor = await db.getRowById("usuarios", requiredId(repartidorId, "Repartidor"));
    if (!repartidor || !repartidor.activo || repartidor.rol !== "REPARTIDOR") {
      throw new Error("El envio requiere un repartidor activo.");
    }
  }

  const monedaPrincipal: Moneda = input.moneda_principal === "ARS" ? "ARS" : "USD";
  const items = input.items.map((item, index) => normalizeLine(item, index));
  if (!items.length) throw new Error("La venta debe tener al menos un producto.");

  const unidadIds = items.map((item) => item.unidad_id).filter(Boolean);
  if (new Set(unidadIds).size !== unidadIds.length) throw new Error("No se puede vender dos veces la misma unidad.");
  const compraItemIds = items.map((item) => item.compra_item_id).filter(Boolean);
  if (new Set(compraItemIds).size !== compraItemIds.length) throw new Error("No se puede vincular dos veces el mismo item de compra.");

  for (const item of items) {
    const product = await db.getRowById("productos", item.producto_id);
    if (!product || !product.activo) throw new Error("Producto inexistente o inactivo.");

    if (item.unidad_id) {
      const unit = await db.getRowById("unidades", item.unidad_id);
      if (!unit || unit.producto_id !== item.producto_id || unit.estado !== "EN_OFICINA_DISPONIBLE" || unit.venta_item_id) {
        throw new Error("La unidad seleccionada no esta disponible para venta.");
      }
    }

    if (item.compra_item_id) {
      const purchaseItem = await db.getRowById("compra_items", item.compra_item_id);
      if (!purchaseItem || purchaseItem.producto_id !== item.producto_id || purchaseItem.estado === "CANCELADO" || purchaseItem.venta_item_id) {
        throw new Error("La venta sin stock requiere un item de compra disponible.");
      }
    }

    if (!item.unidad_id && !item.compra_item_id) {
      throw new Error("Cada item de venta debe salir de stock o de un item de compra existente.");
    }
  }

  const payment = input.pago_inicial ? normalizePayment(input.pago_inicial) : null;
  const total = items.reduce((sum, item) => sum + item.precio_venta, 0);
  if (payment && payment.importe > total) throw new Error("El pago inicial supera el total de la venta.");
  if (payment?.line_index !== null && payment?.line_index !== undefined) {
    const target = items[payment.line_index];
    if (!target) throw new Error("El pago parcial apunta a un item inexistente.");
    if (payment.importe > target.precio_venta) throw new Error("El pago parcial supera el saldo del item.");
  }

  return {
    cliente_id: cliente.id,
    vendedor_id: vendedor.id,
    moneda_principal: monedaPrincipal,
    con_envio: conEnvio,
    direccion_entrega: optionalText(input.direccion_entrega),
    repartidor_entrega_id: repartidorId,
    observaciones: optionalText(input.observaciones),
    emitir_comprobante: input.emitir_comprobante ?? true,
    items,
    pago_inicial: payment,
  };
}

function normalizeLine(input: SaleLineInput, index: number): Required<SaleLineInput> {
  const productId = requiredId(input.producto_id, `Producto ${index + 1}`);
  const price = Number(input.precio_venta);
  if (!Number.isFinite(price) || price < 0) throw new Error(`Precio invalido en item ${index + 1}.`);

  return {
    producto_id: productId,
    precio_venta: roundMoney(price),
    moneda: input.moneda === "ARS" ? "ARS" : "USD",
    unidad_id: input.unidad_id || null,
    compra_item_id: input.compra_item_id || null,
  };
}

function normalizePayment(input: SalePaymentInput): SalePaymentInput {
  const amount = Number(input.importe);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Importe de pago invalido.");

  return {
    importe: roundMoney(amount),
    moneda: input.moneda === "ARS" ? "ARS" : "USD",
    medio_pago: normalizePaymentMethod(input.medio_pago, input.moneda),
    venta_item_id: input.venta_item_id || null,
    line_index: input.line_index ?? null,
  };
}

function normalizePaymentMethod(method: MedioPago, currency: Moneda): MedioPago {
  if (currency === "USD") return "EFECTIVO_USD";
  if (method === "TRANSFERENCIA_ARS" || method === "CREDITO" || method === "DEBITO") return method;
  return "EFECTIVO_ARS";
}

async function requireSale(saleId: UUID, options: LocalDbClientOptions) {
  const db = createLocalDbClient(options);
  const sale = await db.getRowById("ventas", requiredId(saleId, "Venta"));
  if (!sale) throw new Error("Venta inexistente.");
  return sale;
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
