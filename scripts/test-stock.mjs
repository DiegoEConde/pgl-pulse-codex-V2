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
const compiledDir = path.join(localDbPaths.artifactsDir, "compiled-stock");
const testDbPath = path.join(localDbPaths.artifactsDir, "sprint6-stock.local.json");
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
const { createSale } = require(path.join(compiledDir, "lib", "local-db", "sales.js"));
const {
  deliverUnit,
  finalizeUnit,
  listStockData,
  moveUnitToWarranty,
  receivePurchaseItem,
  updateUnitIdentity,
} = require(path.join(compiledDir, "lib", "local-db", "stock.js"));

const options = {
  filePath: testDbPath,
  templatePath: localDbPaths.example,
};
const db = createLocalDbClient(options);
const now = "2026-10-01T12:00:00.000Z";

await db.resetFromTemplate();

const seller = await db.insertRow("usuarios", {
  id: "30000000-0000-4000-8000-000000000001",
  auth_user_id: null,
  nombre: "Vendedor Sprint 6",
  email: "vendedor.sprint6@example.invalid",
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
  id: "30000000-0000-4000-8000-000000000002",
  auth_user_id: null,
  nombre: "Repartidor Sprint 6",
  email: "repartidor.sprint6@example.invalid",
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
  nombre: "Proveedor Sprint 6",
  telefono: "4444-6666",
  direccion: "Direccion proveedor",
}, options);
const client = await createMasterRecord("clientes", {
  nombre: "Cliente Sprint 6",
  telefono: "5555-6666",
  direccion: "Direccion cliente",
}, options);
const productA = await createMasterRecord("productos", { categoria: "telefono", marca: "Fixture", modelo: "A", nombre: "Producto A Sprint 6" }, options);
const productB = await createMasterRecord("productos", { categoria: "tablet", marca: "Fixture", modelo: "B", nombre: "Producto B Sprint 6" }, options);
const productC = await createMasterRecord("productos", { categoria: "notebook", marca: "Fixture", modelo: "C", nombre: "Producto C Sprint 6" }, options);

await createPurchase({
  proveedor_id: supplier.id,
  moneda: "USD",
  paga_al_retirar: false,
  items: [
    { producto_id: productA.id, costo_original: 500 },
  ],
}, options);

let purchaseData = await listPurchaseData(options);
const stockPurchaseItem = purchaseData.compra_items.find((item) => item.producto_id === productA.id);
if (!stockPurchaseItem) throw new Error("No se encontro item de compra para stock.");

await receivePurchaseItem({
  compra_item_id: stockPurchaseItem.id,
  destino: "OFICINA",
  imei: "IMEI-S6-STOCK",
  color: "negro",
  usuario_id: seller.id,
}, options);

let stockData = await listStockData(options);
const officeUnit = stockData.unidades.find((unit) => unit.compra_item_id === stockPurchaseItem.id);
if (!officeUnit || officeUnit.estado !== "EN_OFICINA_DISPONIBLE" || officeUnit.ubicacion_tipo !== "OFICINA") {
  throw new Error("La recepcion en oficina no creo unidad disponible.");
}
if (!stockData.historial_eventos.some((event) => event.entidad_id === officeUnit.id && event.tipo === "UNIDAD_RECIBIDA")) {
  throw new Error("La recepcion no dejo historial.");
}

await updateUnitIdentity(officeUnit.id, {
  serie: "SERIE-S6-STOCK",
  usuario_id: seller.id,
}, options);
stockData = await listStockData(options);
const editedOfficeUnit = stockData.unidades.find((unit) => unit.id === officeUnit.id);
if (editedOfficeUnit?.serie !== "SERIE-S6-STOCK") throw new Error("No se edito la serie antes de entregar.");

await createPurchase({
  proveedor_id: supplier.id,
  moneda: "USD",
  paga_al_retirar: false,
  items: [
    { producto_id: productB.id, costo_original: 650 },
  ],
}, options);
purchaseData = await listPurchaseData(options);
const linkedPurchaseItem = purchaseData.compra_items.find((item) => item.producto_id === productB.id);
if (!linkedPurchaseItem) throw new Error("No se encontro item de compra para venta sin stock.");

await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: false,
  items: [
    { producto_id: productB.id, compra_item_id: linkedPurchaseItem.id, precio_venta: 900, moneda: "USD" },
  ],
  pago_inicial: {
    importe: 900,
    moneda: "USD",
    medio_pago: "EFECTIVO_USD",
    line_index: 0,
  },
}, options);

await receivePurchaseItem({
  compra_item_id: linkedPurchaseItem.id,
  destino: "OFICINA",
  color: "azul",
  usuario_id: seller.id,
}, options);

stockData = await listStockData(options);
const reservedUnit = stockData.unidades.find((unit) => unit.compra_item_id === linkedPurchaseItem.id);
if (!reservedUnit || reservedUnit.estado !== "EN_OFICINA_RESERVADA" || !reservedUnit.venta_item_id) {
  throw new Error("La recepcion vinculada a venta no reservo la unidad.");
}

await deliverUnit(reservedUnit.id, seller.id, options);
stockData = await listStockData(options);
let deliveredUnit = stockData.unidades.find((unit) => unit.id === reservedUnit.id);
let deliveredSaleItem = stockData.venta_items.find((item) => item.id === reservedUnit.venta_item_id);
if (deliveredUnit?.estado !== "ENTREGADA" || deliveredSaleItem?.estado !== "ENTREGADO") {
  throw new Error("La entrega no actualizo unidad e item de venta.");
}

await updateUnitIdentity(reservedUnit.id, {
  imei: "IMEI-S6-POST-DELIVERY",
  usuario_id: seller.id,
}, options);
stockData = await listStockData(options);
deliveredUnit = stockData.unidades.find((unit) => unit.id === reservedUnit.id);
if (deliveredUnit?.imei !== "IMEI-S6-POST-DELIVERY") {
  throw new Error("No se pudo cargar IMEI despues de entregar.");
}

await finalizeUnit(reservedUnit.id, seller.id, options);
stockData = await listStockData(options);
const finalizedUnit = stockData.unidades.find((unit) => unit.id === reservedUnit.id);
const finalizedSaleItem = stockData.venta_items.find((item) => item.id === reservedUnit.venta_item_id);
const finalizedSale = finalizedSaleItem ? stockData.ventas.find((sale) => sale.id === finalizedSaleItem.venta_id) : null;
if (finalizedUnit?.estado !== "FINALIZADA" || !finalizedUnit.finalizada_en || finalizedSaleItem?.estado !== "FINALIZADO" || finalizedSale?.estado !== "FINALIZADA") {
  throw new Error("La finalizacion no bloqueo unidad, item y venta.");
}

let rejectedEditAfterFinalization = false;
try {
  await updateUnitIdentity(reservedUnit.id, {
    imei: "IMEI-NO-DEBE-CAMBIAR",
    usuario_id: seller.id,
  }, options);
} catch {
  rejectedEditAfterFinalization = true;
}
if (!rejectedEditAfterFinalization) throw new Error("Una unidad finalizada no debe permitir editar IMEI.");

await createPurchase({
  proveedor_id: supplier.id,
  repartidor_retiro_id: courier.id,
  moneda: "USD",
  paga_al_retirar: false,
  items: [
    { producto_id: productC.id, costo_original: 1000 },
  ],
}, options);
purchaseData = await listPurchaseData(options);
const directPurchaseItem = purchaseData.compra_items.find((item) => item.producto_id === productC.id);
if (!directPurchaseItem) throw new Error("No se encontro item de compra para entrega directa.");

await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: true,
  direccion_entrega: "Direccion cliente",
  repartidor_entrega_id: courier.id,
  items: [
    { producto_id: productC.id, compra_item_id: directPurchaseItem.id, precio_venta: 1300, moneda: "USD" },
  ],
}, options);

await receivePurchaseItem({
  compra_item_id: directPurchaseItem.id,
  destino: "ENTREGA_DIRECTA",
  imei: "IMEI-S6-DIRECT",
  usuario_id: courier.id,
}, options);

stockData = await listStockData(options);
const directUnit = stockData.unidades.find((unit) => unit.compra_item_id === directPurchaseItem.id);
const directSaleItem = directUnit?.venta_item_id ? stockData.venta_items.find((item) => item.id === directUnit.venta_item_id) : null;
if (!directUnit || directUnit.estado !== "ENTREGADA" || directUnit.ubicacion_cliente_id !== client.id || directSaleItem?.estado !== "ENTREGADO") {
  throw new Error("La entrega directa no dejo unidad entregada al cliente.");
}

await moveUnitToWarranty(directUnit.id, {
  motivo: "Devolucion tecnica de prueba",
  usuario_id: seller.id,
}, options);
stockData = await listStockData(options);
const warrantyUnit = stockData.unidades.find((unit) => unit.id === directUnit.id);
if (warrantyUnit?.estado !== "GARANTIA") throw new Error("La unidad no paso a garantia.");
if (!stockData.historial_eventos.some((event) => event.entidad_id === directUnit.id && event.tipo === "GARANTIA_INICIADA")) {
  throw new Error("La garantia no dejo historial.");
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
  throw new Error("El modulo Stock creo tablas fuera del contrato oficial.");
}

writeJson(path.join(localDbPaths.artifactsDir, "sprint6-stock-summary.json"), {
  unidades: stockData.unidades.length,
  finalizadas: stockData.unidades.filter((unit) => unit.estado === "FINALIZADA").length,
  garantias: stockData.unidades.filter((unit) => unit.estado === "GARANTIA").length,
  historial: stockData.historial_eventos.length,
});

console.log("OK: Sprint 6 stock validado.");
console.log("- Recepcion en oficina, entrega directa y reserva de venta sin stock.");
console.log("- IMEI antes/despues de entregar, finalizacion con bloqueo y garantia con historial.");
