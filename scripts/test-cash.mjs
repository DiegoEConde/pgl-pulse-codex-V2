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
const compiledDir = path.join(localDbPaths.artifactsDir, "compiled-cash");
const testDbPath = path.join(localDbPaths.artifactsDir, "sprint8-cash.local.json");
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
  "lib/local-db/cash.ts",
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
  confirmCustomerDelivery,
} = require(path.join(compiledDir, "lib", "local-db", "delivery.js"));
const {
  closeCash,
  listCashData,
  registerCashAdjustment,
  registerCashSalePayment,
  registerCourierAdvance,
  registerRouteRendition,
  registerSupplierPayment,
} = require(path.join(compiledDir, "lib", "local-db", "cash.js"));

const options = {
  filePath: testDbPath,
  templatePath: localDbPaths.example,
};
const db = createLocalDbClient(options);
const now = "2026-10-01T12:00:00.000Z";

await db.resetFromTemplate();

const admin = await db.insertRow("usuarios", {
  id: "50000000-0000-4000-8000-000000000001",
  auth_user_id: null,
  nombre: "Admin Sprint 8",
  email: "admin.sprint8@example.invalid",
  telefono: null,
  rol: "ADMINISTRADOR",
  activo: true,
  porcentaje_comision: 0,
  costo_envio_usd: 0,
  costo_envio_ars: 0,
  creado_en: now,
  actualizado_en: now,
});

const seller = await db.insertRow("usuarios", {
  id: "50000000-0000-4000-8000-000000000002",
  auth_user_id: null,
  nombre: "Vendedor Sprint 8",
  email: "vendedor.sprint8@example.invalid",
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
  id: "50000000-0000-4000-8000-000000000003",
  auth_user_id: null,
  nombre: "Repartidor Sprint 8",
  email: "repartidor.sprint8@example.invalid",
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
  nombre: "Proveedor Sprint 8",
  telefono: "4444-8888",
  direccion: "Direccion proveedor",
}, options);
const client = await createMasterRecord("clientes", {
  nombre: "Cliente Sprint 8",
  telefono: "5555-8888",
  direccion: "Direccion cliente",
}, options);

const productFull = await createMasterRecord("productos", { categoria: "telefono", marca: "Fixture", modelo: "Caja full", nombre: "Producto caja full" }, options);
const productPartialA = await createMasterRecord("productos", { categoria: "telefono", marca: "Fixture", modelo: "Caja parcial A", nombre: "Producto caja parcial A" }, options);
const productPartialB = await createMasterRecord("productos", { categoria: "tablet", marca: "Fixture", modelo: "Caja parcial B", nombre: "Producto caja parcial B" }, options);
const productSupplierA = await createMasterRecord("productos", { categoria: "notebook", marca: "Fixture", modelo: "Proveedor A", nombre: "Producto proveedor A" }, options);
const productSupplierB = await createMasterRecord("productos", { categoria: "notebook", marca: "Fixture", modelo: "Proveedor B", nombre: "Producto proveedor B" }, options);
const productRouteLess = await createMasterRecord("productos", { categoria: "tablet", marca: "Fixture", modelo: "Ruta menos", nombre: "Producto ruta menos" }, options);
const productRouteMore = await createMasterRecord("productos", { categoria: "tablet", marca: "Fixture", modelo: "Ruta mas", nombre: "Producto ruta mas" }, options);

const fullUnit = await insertUnit(productFull.id, "FULL");
const partialUnitA = await insertUnit(productPartialA.id, "PART-A");
const partialUnitB = await insertUnit(productPartialB.id, "PART-B");
const routeLessUnit = await insertUnit(productRouteLess.id, "ROUTE-LESS");
const routeMoreUnit = await insertUnit(productRouteMore.id, "ROUTE-MORE");

await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: false,
  emitir_comprobante: true,
  items: [{ producto_id: productFull.id, unidad_id: fullUnit.id, precio_venta: 1000, moneda: "USD" }],
}, options);
let salesData = await listSalesData(options);
const fullSale = salesData.ventas.find((sale) => sale.numero === 1);
if (!fullSale || fullSale.saldo_pendiente !== 1000) throw new Error("No se creo venta para cobro total.");

await registerCashSalePayment(fullSale.id, {
  importe: 1000,
  moneda: "USD",
  medio_pago: "EFECTIVO_USD",
  usuario_id: admin.id,
}, options);
salesData = await listSalesData(options);
const paidFullSale = salesData.ventas.find((sale) => sale.id === fullSale.id);
if (!paidFullSale || paidFullSale.saldo_pendiente !== 0) throw new Error("Caja no registro cobro total de cliente.");

await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: false,
  emitir_comprobante: true,
  items: [
    { producto_id: productPartialA.id, unidad_id: partialUnitA.id, precio_venta: 400, moneda: "USD" },
    { producto_id: productPartialB.id, unidad_id: partialUnitB.id, precio_venta: 600, moneda: "USD" },
  ],
}, options);
salesData = await listSalesData(options);
const partialSale = salesData.ventas.find((sale) => sale.numero === 2);
const partialItems = partialSale ? salesData.venta_items.filter((item) => item.venta_id === partialSale.id) : [];
const targetPartialItem = partialItems.find((item) => item.producto_id === productPartialA.id);
if (!partialSale || !targetPartialItem) throw new Error("No se creo venta para pago parcial por item.");

await registerCashSalePayment(partialSale.id, {
  importe: 400,
  moneda: "USD",
  medio_pago: "EFECTIVO_USD",
  venta_item_id: targetPartialItem.id,
  usuario_id: admin.id,
}, options);
salesData = await listSalesData(options);
const paidPartialItem = salesData.venta_items.find((item) => item.id === targetPartialItem.id);
const updatedPartialSale = salesData.ventas.find((sale) => sale.id === partialSale.id);
if (paidPartialItem?.saldo_pendiente !== 0 || updatedPartialSale?.saldo_pendiente !== 600) {
  throw new Error("Caja no aplico cobro parcial al item correcto.");
}

await createPurchase({
  proveedor_id: supplier.id,
  moneda: "USD",
  paga_al_retirar: false,
  items: [
    { producto_id: productSupplierA.id, costo_original: 300 },
    { producto_id: productSupplierB.id, costo_original: 500 },
  ],
}, options);
let purchaseData = await listPurchaseData(options);
const supplierPurchase = purchaseData.compras.find((purchase) => purchase.numero === 1);
const supplierItem = purchaseData.compra_items.find((item) => item.compra_id === supplierPurchase?.id && item.producto_id === productSupplierA.id);
if (!supplierPurchase || !supplierItem) throw new Error("No se creo compra para pago a proveedor.");

await registerSupplierPayment({
  compra_id: supplierPurchase.id,
  compra_item_id: supplierItem.id,
  importe: 150,
  moneda: "USD",
  medio_pago: "EFECTIVO_USD",
  usuario_id: admin.id,
}, options);
let cashData = await listCashData(options);
const supplierDebt = cashData.deudas_proveedores.find((debt) => debt.compra_id === supplierPurchase.id);
const supplierItemDebt = supplierDebt?.item_debts.find((item) => item.compra_item_id === supplierItem.id);
if (!supplierDebt || supplierDebt.saldo_pendiente !== 650 || supplierItemDebt?.saldo_pendiente !== 150) {
  throw new Error("Caja no calculo deuda parcial con proveedor.");
}

await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: true,
  direccion_entrega: "Direccion cliente",
  repartidor_entrega_id: courier.id,
  emitir_comprobante: true,
  items: [{ producto_id: productRouteLess.id, unidad_id: routeLessUnit.id, precio_venta: 700, moneda: "USD" }],
}, options);
await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: true,
  direccion_entrega: "Direccion cliente",
  repartidor_entrega_id: courier.id,
  emitir_comprobante: true,
  items: [{ producto_id: productRouteMore.id, unidad_id: routeMoreUnit.id, precio_venta: 200, moneda: "USD" }],
}, options);

salesData = await listSalesData(options);
const routeLessSale = salesData.ventas.find((sale) => sale.numero === 3);
const routeMoreSale = salesData.ventas.find((sale) => sale.numero === 4);
if (!routeLessSale || !routeMoreSale) throw new Error("No se crearon ventas con envio para rendicion.");

await resolveRouteWithCollection(routeLessSale.id, 100, 790);
await resolveRouteWithCollection(routeMoreSale.id, 0, 220);

await registerCashAdjustment({
  importe: 10000,
  moneda: "ARS",
  medio_pago: "EFECTIVO_ARS",
  signo: "INGRESO",
  usuario_id: admin.id,
  observaciones: "Ingreso ARS fixture",
}, options);

cashData = await listCashData(options);
const negativeDifference = cashData.movimientos_dinero.find((movement) => movement.tipo === "DIFERENCIA_RENDICION" && movement.importe === 10);
const positiveDifference = cashData.movimientos_dinero.find((movement) => movement.tipo === "DIFERENCIA_RENDICION" && movement.importe === 20);
if (!negativeDifference || !positiveDifference) throw new Error("Caja no registro diferencias de rendicion por faltante y sobrante.");
if (cashData.saldos.USD !== 3060 || cashData.saldos.ARS !== 10000) {
  throw new Error(`Saldo de caja inesperado: USD ${cashData.saldos.USD}, ARS ${cashData.saldos.ARS}.`);
}

await closeCash({
  fecha_desde: "2020-01-01T00:00:00.000Z",
  fecha_hasta: "2099-12-31T23:59:59.000Z",
  usuario_id: admin.id,
}, options);
cashData = await listCashData(options);
const closeMovement = cashData.movimientos_dinero.find((movement) => movement.tipo === "CIERRE_CAJA");
if (!closeMovement || !closeMovement.cierre_codigo || closeMovement.snapshot?.saldos?.USD !== 3060 || closeMovement.snapshot?.saldos?.ARS !== 10000) {
  throw new Error("El cierre de caja no guardo snapshot de saldos USD/ARS.");
}
const uncoded = cashData.movimientos_dinero.filter((movement) => movement.tipo !== "CIERRE_CAJA" && !movement.cierre_codigo);
if (uncoded.length) throw new Error("El cierre no agrupo todos los movimientos abiertos.");

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
  throw new Error("El modulo Caja creo tablas fuera del contrato oficial.");
}

writeJson(path.join(localDbPaths.artifactsDir, "sprint8-cash-summary.json"), {
  movimientos_dinero: cashData.movimientos_dinero.length,
  cierres: cashData.movimientos_dinero.filter((movement) => movement.tipo === "CIERRE_CAJA").length,
  diferencias: cashData.movimientos_dinero.filter((movement) => movement.tipo === "DIFERENCIA_RENDICION").length,
  saldo_usd: cashData.saldos.USD,
  saldo_ars: cashData.saldos.ARS,
});

console.log("OK: Sprint 8 caja validada.");
console.log("- Cobro total, cobro parcial por item, pago parcial a proveedor y rendiciones con diferencias.");
console.log("- Cierre de caja con snapshot y saldos USD/ARS.");

async function resolveRouteWithCollection(saleId, advance, returned) {
  const data = await listCashData(options);
  const saleItems = data.venta_items.filter((item) => item.venta_id === saleId);
  const deliveryItem = data.ruta_items.find((item) => saleItems.some((saleItem) => saleItem.id === item.venta_item_id) && item.tipo === "ENTREGAR_CLIENTE");
  const route = data.rutas.find((item) => item.id === deliveryItem?.ruta_id);
  const collectionItem = data.ruta_items.find((item) => item.ruta_id === route?.id && item.tipo === "COBRAR_CLIENTE");
  if (!route || !deliveryItem || !collectionItem) throw new Error("No se encontro ruta de venta con envio.");

  if (advance > 0) {
    await registerCourierAdvance({
      ruta_id: route.id,
      importe: advance,
      moneda: "USD",
      medio_pago: "EFECTIVO_USD",
      usuario_id: admin.id,
    }, options);
  }
  await confirmCustomerDelivery(deliveryItem.id, courier.id, options);
  await confirmCustomerCollection(collectionItem.id, {
    importe: collectionItem.importe_esperado,
    moneda: "USD",
    medio_pago: "EFECTIVO_USD",
    venta_item_id: saleItems[0].id,
    usuario_id: courier.id,
  }, options);
  await registerRouteRendition({
    ruta_id: route.id,
    devoluciones: [{ importe: returned, moneda: "USD", medio_pago: "EFECTIVO_USD" }],
    usuario_id: admin.id,
  }, options);
}

async function insertUnit(productId, suffix) {
  return db.insertRow("unidades", {
    producto_id: productId,
    estado: "EN_OFICINA_DISPONIBLE",
    imei: `IMEI-SPRINT8-${suffix}`,
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
    creado_por: admin.id,
    actualizado_por: admin.id,
  });
}
