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
const compiledDir = path.join(localDbPaths.artifactsDir, "compiled-delivery");
const testDbPath = path.join(localDbPaths.artifactsDir, "sprint7-delivery.local.json");
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
  "lib/local-db/stock.ts",
  "lib/local-db/delivery.ts",
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
const { createSale, listSalesData } = require(path.join(compiledDir, "lib", "local-db", "sales.js"));
const {
  confirmCustomerCollection,
  confirmProviderPayment,
  confirmRoutePickup,
  createRoute,
  listDeliveryData,
  markRouteOpenNextDay,
  markRoutePartialRendition,
  startRoute,
} = require(path.join(compiledDir, "lib", "local-db", "delivery.js"));

const options = {
  filePath: testDbPath,
  templatePath: localDbPaths.example,
};
const db = createLocalDbClient(options);
const now = "2026-10-01T12:00:00.000Z";

await db.resetFromTemplate();

const seller = await db.insertRow("usuarios", {
  id: "40000000-0000-4000-8000-000000000001",
  auth_user_id: null,
  nombre: "Vendedor Sprint 7",
  email: "vendedor.sprint7@example.invalid",
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
  id: "40000000-0000-4000-8000-000000000002",
  auth_user_id: null,
  nombre: "Repartidor Sprint 7",
  email: "repartidor.sprint7@example.invalid",
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
  nombre: "Proveedor Sprint 7",
  telefono: "4444-7777",
  direccion: "Direccion proveedor",
}, options);
const client = await createMasterRecord("clientes", {
  nombre: "Cliente Sprint 7",
  telefono: "5555-7777",
  direccion: "Direccion cliente",
}, options);
const productOffice = await createMasterRecord("productos", { categoria: "telefono", marca: "Fixture", modelo: "Office", nombre: "Producto Oficina Sprint 7" }, options);
const productDirect = await createMasterRecord("productos", { categoria: "tablet", marca: "Fixture", modelo: "Direct", nombre: "Producto Directo Sprint 7" }, options);
const productTomorrow = await createMasterRecord("productos", { categoria: "notebook", marca: "Fixture", modelo: "Tomorrow", nombre: "Producto Manana Sprint 7" }, options);
const productFinanced = await createMasterRecord("productos", { categoria: "accesorio", marca: "Fixture", modelo: "Fiado", nombre: "Producto Fiado Sprint 7" }, options);

await createPurchase({
  proveedor_id: supplier.id,
  moneda: "USD",
  paga_al_retirar: false,
  items: [{ producto_id: productOffice.id, costo_original: 500 }],
}, options);
let purchaseData = await listPurchaseData(options);
const officePurchaseItem = purchaseData.compra_items.find((item) => item.producto_id === productOffice.id);
if (!officePurchaseItem) throw new Error("No se encontro compra para retiro a oficina.");

await createRoute({
  repartidor_id: courier.id,
  fecha_programada: "2026-10-02T10:00:00.000Z",
  observaciones: "Retiro simple a oficina",
  compra_item_ids: [officePurchaseItem.id],
  venta_item_ids: [],
  usuario_id: seller.id,
}, options);

let deliveryData = await listDeliveryData(options);
const officeRoute = deliveryData.rutas.find((route) => route.observaciones === "Retiro simple a oficina");
const officePickup = deliveryData.ruta_items.find((item) => item.ruta_id === officeRoute?.id && item.tipo === "RETIRAR_PROVEEDOR");
if (!officeRoute || !officePickup) throw new Error("No se creo ruta simple de retiro.");

await startRoute(officeRoute.id, seller.id, options);
await confirmRoutePickup(officePickup.id, {
  destino: "OFICINA",
  imei: "IMEI-S7-OFFICE",
  usuario_id: courier.id,
}, options);

deliveryData = await listDeliveryData(options);
const officeUnit = deliveryData.unidades.find((unit) => unit.compra_item_id === officePurchaseItem.id);
const confirmedOfficePickup = deliveryData.ruta_items.find((item) => item.id === officePickup.id);
if (!officeUnit || officeUnit.estado !== "EN_OFICINA_DISPONIBLE" || confirmedOfficePickup?.estado !== "CONFIRMADA") {
  throw new Error("El retiro a oficina no dejo unidad disponible y tarea confirmada.");
}

await createPurchase({
  proveedor_id: supplier.id,
  moneda: "USD",
  paga_al_retirar: true,
  items: [{ producto_id: productDirect.id, costo_original: 700 }],
}, options);
purchaseData = await listPurchaseData(options);
const directPurchaseItem = purchaseData.compra_items.find((item) => item.producto_id === productDirect.id);
if (!directPurchaseItem) throw new Error("No se encontro compra para ruta mixta.");

await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: false,
  items: [{ producto_id: productDirect.id, compra_item_id: directPurchaseItem.id, precio_venta: 1000, moneda: "USD" }],
}, options);
let salesData = await listSalesData(options);
const directSaleItem = salesData.venta_items.find((item) => item.compra_item_id === directPurchaseItem.id);
if (!directSaleItem) throw new Error("No se encontro item de venta directa.");

await createRoute({
  repartidor_id: courier.id,
  fecha_programada: "2026-10-02T12:00:00.000Z",
  observaciones: "Ruta mixta completa",
  compra_item_ids: [directPurchaseItem.id],
  venta_item_ids: [directSaleItem.id],
  usuario_id: seller.id,
}, options);

deliveryData = await listDeliveryData(options);
const mixedRoute = deliveryData.rutas.find((route) => route.observaciones === "Ruta mixta completa");
const mixedItems = deliveryData.ruta_items.filter((item) => item.ruta_id === mixedRoute?.id);
const mixedPickup = mixedItems.find((item) => item.tipo === "RETIRAR_PROVEEDOR");
const mixedPayment = mixedItems.find((item) => item.tipo === "PAGAR_PROVEEDOR");
const mixedDelivery = mixedItems.find((item) => item.tipo === "ENTREGAR_CLIENTE");
const mixedCollection = mixedItems.find((item) => item.tipo === "COBRAR_CLIENTE");
if (!mixedRoute || !mixedPickup || !mixedPayment || !mixedDelivery || !mixedCollection) {
  throw new Error("La ruta mixta debe tener retiro, pago, entrega y cobro.");
}

await confirmRoutePickup(mixedPickup.id, {
  destino: "ENTREGA_DIRECTA",
  imei: "IMEI-S7-DIRECT",
  usuario_id: courier.id,
}, options);
await confirmProviderPayment(mixedPayment.id, {
  importe: 700,
  moneda: "USD",
  medio_pago: "EFECTIVO_USD",
  usuario_id: courier.id,
}, options);
await confirmCustomerCollection(mixedCollection.id, {
  importe: 1000,
  moneda: "USD",
  medio_pago: "EFECTIVO_USD",
  venta_item_id: directSaleItem.id,
  usuario_id: courier.id,
}, options);
await markRoutePartialRendition(mixedRoute.id, seller.id, options);

deliveryData = await listDeliveryData(options);
const directUnit = deliveryData.unidades.find((unit) => unit.compra_item_id === directPurchaseItem.id);
const paidDirectSale = deliveryData.ventas.find((sale) => sale.id === directSaleItem.venta_id);
const paidProviderMovement = deliveryData.movimientos_dinero.find((movement) => movement.tipo === "PAGO_PROVEEDOR" && movement.compra_item_id === directPurchaseItem.id);
const collectedMovement = deliveryData.movimientos_dinero.find((movement) => movement.tipo === "COBRO_CLIENTE" && movement.venta_item_id === directSaleItem.id);
const partialRoute = deliveryData.rutas.find((route) => route.id === mixedRoute.id);
if (!directUnit || directUnit.estado !== "ENTREGADA" || paidDirectSale?.saldo_pendiente !== 0 || !paidProviderMovement || !collectedMovement || partialRoute?.estado !== "PARCIALMENTE_RENDIDA") {
  throw new Error("La ruta mixta no resolvio retiro, pago, entrega, cobro y rendicion parcial.");
}

await createPurchase({
  proveedor_id: supplier.id,
  moneda: "USD",
  paga_al_retirar: false,
  items: [{ producto_id: productTomorrow.id, costo_original: 900 }],
}, options);
purchaseData = await listPurchaseData(options);
const tomorrowPurchaseItem = purchaseData.compra_items.find((item) => item.producto_id === productTomorrow.id);
if (!tomorrowPurchaseItem) throw new Error("No se encontro compra para ruta abierta.");

await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: false,
  items: [{ producto_id: productTomorrow.id, compra_item_id: tomorrowPurchaseItem.id, precio_venta: 1300, moneda: "USD" }],
}, options);
salesData = await listSalesData(options);
const tomorrowSaleItem = salesData.venta_items.find((item) => item.compra_item_id === tomorrowPurchaseItem.id);
if (!tomorrowSaleItem) throw new Error("No se encontro venta para ruta abierta.");

await createRoute({
  repartidor_id: courier.id,
  fecha_programada: "2026-10-02T18:00:00.000Z",
  observaciones: "Ruta abierta mañana",
  compra_item_ids: [tomorrowPurchaseItem.id],
  venta_item_ids: [tomorrowSaleItem.id],
  usuario_id: seller.id,
}, options);
deliveryData = await listDeliveryData(options);
const tomorrowRoute = deliveryData.rutas.find((route) => route.observaciones === "Ruta abierta mañana");
const tomorrowPickup = deliveryData.ruta_items.find((item) => item.ruta_id === tomorrowRoute?.id && item.tipo === "RETIRAR_PROVEEDOR");
if (!tomorrowRoute || !tomorrowPickup) throw new Error("No se creo ruta abierta.");

await confirmRoutePickup(tomorrowPickup.id, {
  destino: "REPARTIDOR",
  imei: "IMEI-S7-TOMORROW",
  usuario_id: courier.id,
}, options);
await markRouteOpenNextDay(tomorrowRoute.id, seller.id, options);

deliveryData = await listDeliveryData(options);
const tomorrowUnit = deliveryData.unidades.find((unit) => unit.compra_item_id === tomorrowPurchaseItem.id);
const openTomorrowRoute = deliveryData.rutas.find((route) => route.id === tomorrowRoute.id);
if (!tomorrowUnit || tomorrowUnit.estado !== "EN_PODER_REPARTIDOR" || openTomorrowRoute?.estado !== "ABIERTA_CON_PENDIENTES") {
  throw new Error("La ruta abierta no dejo la unidad con repartidor y ruta pendiente.");
}

await createPurchase({
  proveedor_id: supplier.id,
  moneda: "USD",
  paga_al_retirar: false,
  items: [{ producto_id: productFinanced.id, costo_original: 250 }],
}, options);
purchaseData = await listPurchaseData(options);
const financedItem = purchaseData.compra_items.find((item) => item.producto_id === productFinanced.id);
if (!financedItem) throw new Error("No se encontro compra con proveedor fiado.");

await createRoute({
  repartidor_id: courier.id,
  fecha_programada: "2026-10-03T10:00:00.000Z",
  observaciones: "Proveedor fiado",
  compra_item_ids: [financedItem.id],
  usuario_id: seller.id,
}, options);
deliveryData = await listDeliveryData(options);
const financedRoute = deliveryData.rutas.find((route) => route.observaciones === "Proveedor fiado");
const financedTasks = deliveryData.ruta_items.filter((item) => item.ruta_id === financedRoute?.id);
if (!financedRoute || financedTasks.some((item) => item.tipo === "PAGAR_PROVEEDOR")) {
  throw new Error("Proveedor fiado no debe generar tarea de pago en reparto.");
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
  throw new Error("El modulo Reparto creo tablas fuera del contrato oficial.");
}

writeJson(path.join(localDbPaths.artifactsDir, "sprint7-delivery-summary.json"), {
  rutas: deliveryData.rutas.length,
  ruta_items: deliveryData.ruta_items.length,
  movimientos_dinero: deliveryData.movimientos_dinero.length,
  unidades: deliveryData.unidades.length,
});

console.log("OK: Sprint 7 reparto validado.");
console.log("- Retiro a oficina, ruta mixta con pago/cobro, proveedor fiado y ruta abierta al dia siguiente.");
