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
const compiledDir = path.join(localDbPaths.artifactsDir, "compiled-purchases");
const testDbPath = path.join(localDbPaths.artifactsDir, "sprint4-purchases.local.json");
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
], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const { createLocalDbClient } = require(path.join(compiledDir, "lib", "local-db", "client.js"));
const { createMasterRecord } = require(path.join(compiledDir, "lib", "local-db", "masters.js"));
const {
  cancelPurchaseItem,
  createPurchase,
  listPurchaseData,
} = require(path.join(compiledDir, "lib", "local-db", "purchases.js"));

const options = {
  filePath: testDbPath,
  templatePath: localDbPaths.example,
};
const db = createLocalDbClient(options);
const now = "2026-10-01T12:00:00.000Z";

await db.resetFromTemplate();

const seller = await db.insertRow("usuarios", {
  id: "10000000-0000-4000-8000-000000000001",
  auth_user_id: null,
  nombre: "Vendedor Sprint 4",
  email: "vendedor.sprint4@example.invalid",
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
  id: "10000000-0000-4000-8000-000000000002",
  auth_user_id: null,
  nombre: "Repartidor Sprint 4",
  email: "repartidor.sprint4@example.invalid",
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
  nombre: "Proveedor Sprint 4",
  telefono: "4444-4444",
  direccion: "Direccion proveedor",
  horario: "10:00 - 18:00",
}, options);
const client = await createMasterRecord("clientes", {
  nombre: "Cliente Sprint 4",
  telefono: "5555-4444",
  direccion: "Direccion cliente",
}, options);
const productA = await createMasterRecord("productos", { categoria: "telefono", marca: "Fixture", modelo: "A", nombre: "Producto A Sprint 4" }, options);
const productB = await createMasterRecord("productos", { categoria: "tablet", marca: "Fixture", modelo: "B", nombre: "Producto B Sprint 4" }, options);
const productC = await createMasterRecord("productos", { categoria: "notebook", marca: "Fixture", modelo: "C", nombre: "Producto C Sprint 4" }, options);

const saleNumber = await db.nextSequence("ventas.numero");
const sale = await db.insertRow("ventas", {
  numero: saleNumber,
  cliente_id: client.id,
  vendedor_id: seller.id,
  estado: "CONFIRMADA",
  fecha: now,
  moneda_principal: "USD",
  total: 1300,
  saldo_pendiente: 1300,
  con_envio: true,
  direccion_entrega: "Direccion cliente",
  repartidor_entrega_id: null,
  comprobante_numero: null,
  comprobante_estado: null,
  comprobante_snapshot: {},
  observaciones: "Venta tecnica para compra sin stock",
  creado_en: now,
  actualizado_en: now,
  creado_por: seller.id,
  actualizado_por: seller.id,
});
const saleItem = await db.insertRow("venta_items", {
  venta_id: sale.id,
  producto_id: productC.id,
  unidad_id: null,
  compra_item_id: null,
  estado: "PENDIENTE_ABASTECIMIENTO",
  precio_venta: 1300,
  moneda: "USD",
  saldo_pendiente: 1300,
  pagado_en: null,
  entregado_en: null,
  finalizado_en: null,
  creado_en: now,
  actualizado_en: now,
  creado_por: seller.id,
  actualizado_por: seller.id,
});

await createPurchase({
  proveedor_id: supplier.id,
  moneda: "USD",
  paga_al_retirar: false,
  observaciones: "Compra para stock de oficina",
  items: [
    { producto_id: productA.id, costo_original: 500 },
    { producto_id: productB.id, costo_original: 650 },
  ],
}, options);

let data = await listPurchaseData(options);
const stockPurchase = data.compras.find((purchase) => purchase.numero === 1);
if (!stockPurchase || stockPurchase.estado !== "PEDIDA" || stockPurchase.paga_al_retirar !== false) {
  throw new Error("Compra para stock/proveedor fiado no quedo en estado esperado.");
}
if (data.rutas.length !== 0) throw new Error("La compra sin repartidor no debe crear ruta.");

await createPurchase({
  proveedor_id: supplier.id,
  repartidor_retiro_id: courier.id,
  fecha_retiro_programada: "2026-10-02T14:00:00.000Z",
  moneda: "USD",
  paga_al_retirar: true,
  observaciones: "Compra vinculada a venta sin stock",
  items: [
    { producto_id: productC.id, costo_original: 900, venta_item_id: saleItem.id },
  ],
}, options);

data = await listPurchaseData(options);
const linkedPurchase = data.compras.find((purchase) => purchase.numero === 2);
if (!linkedPurchase || linkedPurchase.estado !== "EN_RETIRO" || linkedPurchase.repartidor_retiro_id !== courier.id) {
  throw new Error("Compra con repartidor no quedo asignada a retiro.");
}
const linkedItem = data.compra_items.find((item) => item.compra_id === linkedPurchase.id);
if (!linkedItem || linkedItem.estado !== "ASIGNADO_RUTA" || linkedItem.venta_item_id !== saleItem.id) {
  throw new Error("Item vinculado a venta no quedo en estado esperado.");
}
const updatedSaleItem = data.venta_items.find((item) => item.id === saleItem.id);
if (updatedSaleItem?.compra_item_id !== linkedItem.id) {
  throw new Error("La venta sin stock no quedo vinculada al item de compra.");
}
const linkedRouteItems = data.ruta_items.filter((item) => item.compra_item_id === linkedItem.id);
if (!linkedRouteItems.some((item) => item.tipo === "RETIRAR_PROVEEDOR")) throw new Error("Falta ruta_item de retiro.");
if (!linkedRouteItems.some((item) => item.tipo === "PAGAR_PROVEEDOR" && item.importe_esperado === 900)) throw new Error("Falta ruta_item de pago al proveedor.");

await createPurchase({
  proveedor_id: supplier.id,
  repartidor_retiro_id: courier.id,
  moneda: "USD",
  paga_al_retirar: false,
  observaciones: "Retiro con proveedor fiado",
  items: [
    { producto_id: productA.id, costo_original: 400 },
  ],
}, options);

data = await listPurchaseData(options);
const financedPurchase = data.compras.find((purchase) => purchase.numero === 3);
const financedItem = data.compra_items.find((item) => item.compra_id === financedPurchase?.id);
const financedRouteItems = data.ruta_items.filter((item) => item.compra_item_id === financedItem?.id);
if (financedRouteItems.some((item) => item.tipo === "PAGAR_PROVEEDOR")) {
  throw new Error("Proveedor fiado no debe generar tarea de pago al retirar.");
}

const itemToCancel = data.compra_items.find((item) => item.compra_id === stockPurchase.id && item.producto_id === productA.id);
if (!itemToCancel) throw new Error("No se encontro item para cancelar.");
await cancelPurchaseItem(itemToCancel.id, options);

data = await listPurchaseData(options);
const canceledItem = data.compra_items.find((item) => item.id === itemToCancel.id);
const remainingStockItems = data.compra_items.filter((item) => item.compra_id === stockPurchase.id && item.estado !== "CANCELADO");
const updatedStockPurchase = data.compras.find((purchase) => purchase.id === stockPurchase.id);
if (canceledItem?.estado !== "CANCELADO") throw new Error("El item no quedo cancelado.");
if (remainingStockItems.length !== 1 || updatedStockPurchase?.estado === "CANCELADA") {
  throw new Error("La cancelacion individual cancelo indebidamente la compra completa.");
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
  throw new Error("El modulo Compras creo tablas fuera del contrato oficial.");
}

writeJson(path.join(localDbPaths.artifactsDir, "sprint4-purchases-summary.json"), {
  compras: data.compras.length,
  compra_items: data.compra_items.length,
  rutas: data.rutas.length,
  ruta_items: data.ruta_items.length,
});

console.log("OK: Sprint 4 compras validadas.");
console.log("- Compra para stock, compra vinculada a venta, proveedor fiado y ruta automatica.");
console.log("- Cancelacion individual de compra_item sin cancelar toda la compra.");
