import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import {
  formatValidationResult,
  loadContract,
  localDbPaths,
  projectRoot,
  readJson,
  validateLocalDb,
  writeJson,
} from "./local-db-utils.mjs";

const require = createRequire(import.meta.url);
const compiledDir = path.join(localDbPaths.artifactsDir, "compiled-sales");
const testDbPath = path.join(localDbPaths.artifactsDir, "sprint5-sales.local.json");
const tscPath = path.join(projectRoot, "node_modules", "typescript", "bin", "tsc");

fs.rmSync(compiledDir, { recursive: true, force: true });
fs.mkdirSync(compiledDir, { recursive: true });

const compile = spawnSync(process.execPath, [
  tscPath,
  "--outDir",
  compiledDir,
  "--rootDir",
  projectRoot,
  "--module",
  "CommonJS",
  "--moduleResolution",
  "Node",
  "--target",
  "ES2022",
  "--lib",
  "ES2022,DOM",
  "--types",
  "node",
  "--strict",
  "--skipLibCheck",
  "--esModuleInterop",
  "lib/local-db/schema.ts",
  "lib/local-db/client.ts",
  "lib/local-db/masters.ts",
  "lib/local-db/purchases.ts",
  "lib/local-db/sales.ts",
], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const { createLocalDbClient } = require(path.join(compiledDir, "lib", "local-db", "client.js"));
const { createMasterRecord } = require(path.join(compiledDir, "lib", "local-db", "masters.js"));
const { createPurchase, listPurchaseData } = require(path.join(compiledDir, "lib", "local-db", "purchases.js"));
const {
  createSale,
  listSalesData,
  registerSalePayment,
} = require(path.join(compiledDir, "lib", "local-db", "sales.js"));

const options = {
  filePath: testDbPath,
  templatePath: localDbPaths.example,
};
const db = createLocalDbClient(options);
const now = "2026-10-01T12:00:00.000Z";

await db.resetFromTemplate();

const seller = await db.insertRow("usuarios", {
  id: "20000000-0000-4000-8000-000000000001",
  auth_user_id: null,
  nombre: "Vendedor Sprint 5",
  email: "vendedor.sprint5@example.invalid",
  telefono: null,
  rol: "VENDEDOR",
  activo: true,
  porcentaje_comision: 5,
  costo_envio_usd: 0,
  costo_envio_ars: 0,
  creado_en: now,
  actualizado_en: now,
});

const courier = await db.insertRow("usuarios", {
  id: "20000000-0000-4000-8000-000000000002",
  auth_user_id: null,
  nombre: "Repartidor Sprint 5",
  email: "repartidor.sprint5@example.invalid",
  telefono: null,
  rol: "REPARTIDOR",
  activo: true,
  porcentaje_comision: 0,
  costo_envio_usd: 3,
  costo_envio_ars: 0,
  creado_en: now,
  actualizado_en: now,
});

const supplier = await createMasterRecord("proveedores", {
  nombre: "Proveedor Sprint 5",
  telefono: "4444-5555",
  direccion: "Direccion proveedor",
}, options);
const client = await createMasterRecord("clientes", {
  nombre: "Cliente Sprint 5",
  telefono: "5555-5555",
  direccion: "Direccion cliente",
}, options);
const productA = await createMasterRecord("productos", { categoria: "telefono", marca: "Fixture", modelo: "A", nombre: "Producto A Sprint 5" }, options);
const productB = await createMasterRecord("productos", { categoria: "tablet", marca: "Fixture", modelo: "B", nombre: "Producto B Sprint 5" }, options);
const productC = await createMasterRecord("productos", { categoria: "notebook", marca: "Fixture", modelo: "C", nombre: "Producto C Sprint 5" }, options);

const stockA1 = await insertUnit(productA.id, "A1");
const stockA2 = await insertUnit(productA.id, "A2");
const stockB1 = await insertUnit(productB.id, "B1");

let rejectedNoStockWithoutPurchase = false;
try {
  await createSale({
    cliente_id: client.id,
    vendedor_id: seller.id,
    moneda_principal: "USD",
    con_envio: false,
    items: [
      { producto_id: productC.id, precio_venta: 1200, moneda: "USD" },
    ],
  }, options);
} catch {
  rejectedNoStockWithoutPurchase = true;
}
if (!rejectedNoStockWithoutPurchase) {
  throw new Error("La venta sin stock no debe crearse sin compra_item vinculado.");
}

await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: false,
  emitir_comprobante: true,
  items: [
    { producto_id: productA.id, unidad_id: stockA1.id, precio_venta: 1000, moneda: "USD" },
  ],
  pago_inicial: {
    importe: 1000,
    moneda: "USD",
    medio_pago: "EFECTIVO_USD",
    line_index: 0,
  },
}, options);

let data = await listSalesData(options);
const simpleSale = data.ventas.find((sale) => sale.numero === 1);
if (!simpleSale || simpleSale.saldo_pendiente !== 0 || simpleSale.comprobante_estado !== "PAGADO") {
  throw new Error("La venta simple desde stock no quedo pagada con comprobante PAGADO.");
}
const reservedUnit = data.unidades.find((unit) => unit.id === stockA1.id);
if (reservedUnit?.estado !== "EN_OFICINA_RESERVADA" || !reservedUnit.venta_item_id) {
  throw new Error("La unidad de stock no quedo reservada para la venta.");
}

await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: false,
  emitir_comprobante: true,
  items: [
    { producto_id: productA.id, unidad_id: stockA2.id, precio_venta: 500, moneda: "USD" },
    { producto_id: productB.id, unidad_id: stockB1.id, precio_venta: 700, moneda: "USD" },
  ],
  pago_inicial: {
    importe: 500,
    moneda: "USD",
    medio_pago: "EFECTIVO_USD",
    line_index: 0,
  },
}, options);

data = await listSalesData(options);
const multipleSale = data.ventas.find((sale) => sale.numero === 2);
if (!multipleSale || multipleSale.total !== 1200 || multipleSale.saldo_pendiente !== 700 || multipleSale.comprobante_estado !== "EMITIDO") {
  throw new Error("La venta multiple no quedo con saldo parcial y comprobante emitido.");
}
const multipleItems = data.venta_items.filter((item) => item.venta_id === multipleSale.id);
const paidItem = multipleItems.find((item) => item.producto_id === productA.id);
const pendingItem = multipleItems.find((item) => item.producto_id === productB.id);
if (paidItem?.saldo_pendiente !== 0 || pendingItem?.saldo_pendiente !== 700) {
  throw new Error("El pago parcial no se aplico al item indicado.");
}
const receiptNumberBeforeFullPayment = multipleSale.comprobante_numero;
if (!receiptNumberBeforeFullPayment) throw new Error("La venta multiple debe tener comprobante emitido.");

await createPurchase({
  proveedor_id: supplier.id,
  moneda: "USD",
  paga_al_retirar: false,
  items: [
    { producto_id: productC.id, costo_original: 900 },
  ],
}, options);
const purchaseData = await listPurchaseData(options);
const noStockPurchaseItem = purchaseData.compra_items.find((item) => item.producto_id === productC.id);
if (!noStockPurchaseItem) throw new Error("No se creo compra_item para venta sin stock.");

await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: true,
  direccion_entrega: "Direccion cliente",
  repartidor_entrega_id: courier.id,
  emitir_comprobante: true,
  items: [
    { producto_id: productC.id, compra_item_id: noStockPurchaseItem.id, precio_venta: 1300, moneda: "USD" },
  ],
}, options);

data = await listSalesData(options);
const noStockSale = data.ventas.find((sale) => sale.numero === 3);
if (!noStockSale || noStockSale.saldo_pendiente !== 1300 || !noStockSale.con_envio) {
  throw new Error("La venta sin stock no quedo confirmada con envio y saldo.");
}
const noStockSaleItem = data.venta_items.find((item) => item.venta_id === noStockSale.id);
if (!noStockSaleItem || noStockSaleItem.compra_item_id !== noStockPurchaseItem.id || noStockSaleItem.estado !== "PENDIENTE_ABASTECIMIENTO") {
  throw new Error("La venta sin stock no quedo vinculada al item de compra.");
}
const updatedPurchaseItem = data.compra_items.find((item) => item.id === noStockPurchaseItem.id);
if (updatedPurchaseItem?.venta_item_id !== noStockSaleItem.id) {
  throw new Error("El compra_item no quedo apuntando al venta_item.");
}
const deliveryRouteItems = data.ruta_items.filter((item) => item.venta_item_id === noStockSaleItem.id || item.cliente_id === client.id);
if (!deliveryRouteItems.some((item) => item.tipo === "ENTREGAR_CLIENTE")) throw new Error("Falta ruta_item de entrega al cliente.");
if (!deliveryRouteItems.some((item) => item.tipo === "COBRAR_CLIENTE" && item.importe_esperado === 1300)) throw new Error("Falta ruta_item de cobro al cliente.");

await registerSalePayment(multipleSale.id, {
  importe: 700,
  moneda: "USD",
  medio_pago: "EFECTIVO_USD",
  venta_item_id: pendingItem.id,
}, options);

data = await listSalesData(options);
const paidMultipleSale = data.ventas.find((sale) => sale.id === multipleSale.id);
if (!paidMultipleSale || paidMultipleSale.saldo_pendiente !== 0 || paidMultipleSale.comprobante_estado !== "PAGADO") {
  throw new Error("La reimpresion de comprobante pagado no se ejecuto al completar saldo.");
}
if (paidMultipleSale.comprobante_numero !== receiptNumberBeforeFullPayment) {
  throw new Error("La venta debe conservar el mismo numero de comprobante al reimprimir pagado.");
}

const finalDb = readJson(testDbPath);
const contract = loadContract();
const validation = validateLocalDb(finalDb, contract);
if (!validation.ok) {
  console.error(formatValidationResult(validation));
  process.exit(1);
}

const officialTables = Object.keys(contract.tables).sort();
const finalTables = Object.keys(finalDb.tables).sort();
if (JSON.stringify(officialTables) !== JSON.stringify(finalTables)) {
  throw new Error("El modulo Ventas creo tablas fuera del contrato oficial.");
}

writeJson(path.join(localDbPaths.artifactsDir, "sprint5-sales-summary.json"), {
  ventas: data.ventas.length,
  venta_items: data.venta_items.length,
  movimientos_dinero: data.movimientos_dinero.length,
  comprobantes: data.ventas.filter((sale) => sale.comprobante_numero).length,
  rutas: data.rutas.length,
});

console.log("OK: Sprint 5 ventas validadas.");
console.log("- Venta simple desde stock, venta multiple y venta sin stock vinculada a compra.");
console.log("- Pago parcial por item, movimiento de dinero y mismo comprobante reimpreso como PAGADO.");

async function insertUnit(productId, suffix) {
  return db.insertRow("unidades", {
    producto_id: productId,
    estado: "EN_OFICINA_DISPONIBLE",
    imei: `IMEI-SPRINT5-${suffix}`,
    serie: null,
    color: "negro",
    atributos: {},
    ubicacion_tipo: "OFICINA",
    ubicacion_usuario_id: null,
    ubicacion_cliente_id: null,
    ubicacion_proveedor_id: null,
    compra_item_id: null,
    venta_item_id: null,
    finalizada_en: null,
    creado_en: now,
    actualizado_en: now,
    creado_por: seller.id,
    actualizado_por: seller.id,
  });
}
