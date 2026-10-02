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
const compiledDir = path.join(localDbPaths.artifactsDir, "compiled-qa-integral");
const testDbPath = path.join(localDbPaths.artifactsDir, "sprint10-qa.local.json");
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
  "lib/local-db/insights.ts",
  "lib/permissions.ts",
], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const { createLocalDbClient } = require(path.join(compiledDir, "lib", "local-db", "client.js"));
const { createMasterRecord } = require(path.join(compiledDir, "lib", "local-db", "masters.js"));
const { cancelPurchaseItem, createPurchase, listPurchaseData } = require(path.join(compiledDir, "lib", "local-db", "purchases.js"));
const { cancelSaleItem, createSale, listSalesData } = require(path.join(compiledDir, "lib", "local-db", "sales.js"));
const { finalizeUnit, listStockData, moveUnitToWarranty } = require(path.join(compiledDir, "lib", "local-db", "stock.js"));
const {
  confirmCustomerCollection,
  confirmCustomerDelivery,
  confirmProviderPayment,
  confirmRoutePickup,
  createRoute,
  listDeliveryData,
  markRouteOpenNextDay,
} = require(path.join(compiledDir, "lib", "local-db", "delivery.js"));
const {
  closeCash,
  listCashData,
  registerCourierAdvance,
  registerRouteRendition,
} = require(path.join(compiledDir, "lib", "local-db", "cash.js"));
const { listInsightsData, scopeInsightsForRole } = require(path.join(compiledDir, "lib", "local-db", "insights.js"));
const { getRoleAccess } = require(path.join(compiledDir, "lib", "permissions.js"));

const options = {
  filePath: testDbPath,
  templatePath: localDbPaths.example,
};
const db = createLocalDbClient(options);
const now = "2026-10-02T12:00:00.000Z";
const flows = [];

await db.resetFromTemplate();

const admin = await insertUser({
  id: "70000000-0000-4000-8000-000000000001",
  nombre: "Admin Sprint 10",
  email: "admin.sprint10@example.invalid",
  rol: "ADMINISTRADOR",
});
const seller = await insertUser({
  id: "70000000-0000-4000-8000-000000000002",
  nombre: "Vendedor Sprint 10",
  email: "vendedor.sprint10@example.invalid",
  rol: "VENDEDOR",
  porcentaje_comision: 5,
});
const courier = await insertUser({
  id: "70000000-0000-4000-8000-000000000003",
  nombre: "Repartidor Sprint 10",
  email: "repartidor.sprint10@example.invalid",
  rol: "REPARTIDOR",
  costo_envio_usd: 3,
});

const supplier = await createMasterRecord("proveedores", {
  nombre: "Proveedor QA Integral",
  telefono: "4444-1010",
  direccion: "Deposito QA 100",
}, options);
const client = await createMasterRecord("clientes", {
  nombre: "Cliente QA Integral",
  telefono: "5555-1010",
  direccion: "Calle QA 200",
}, options);

const productOffice = await product("telefono", "QA", "Retiro oficina");
const productDirect = await product("tablet", "QA", "Entrega directa");
const productPartialA = await product("telefono", "QA", "Pago parcial A");
const productPartialB = await product("telefono", "QA", "Pago parcial B");
const productDebtDelivery = await product("notebook", "QA", "Entrega con deuda");
const productCancelPurchaseA = await product("accesorio", "QA", "Compra cancelada A");
const productCancelPurchaseB = await product("accesorio", "QA", "Compra activa B");
const productCancelSaleA = await product("tablet", "QA", "Venta cancelada A");
const productCancelSaleB = await product("tablet", "QA", "Venta activa B");

await flowProviderOfficeSaleDeliveryCollection();
await flowProviderDirectDeliveryCollection();
await flowPartialPaymentDebt();
await flowDeliveryWithDebtAndWarranty();
await flowCancellations();
await flowCashCloseAndInsights();
await validateFinalDb();

writeJson(path.join(localDbPaths.artifactsDir, "sprint10-qa-summary.json"), {
  flows,
  tables: Object.fromEntries(Object.entries(readJson(testDbPath).tables).map(([table, rows]) => [table, rows.length])),
});

console.log("OK: Sprint 10 QA integral local validada.");
console.log("- Flujos end-to-end con datos ficticios controlados.");
console.log("- Cancelaciones, garantia, alertas/reportes y cierre de caja con diferencias.");

async function flowProviderOfficeSaleDeliveryCollection() {
  await createPurchase({
    proveedor_id: supplier.id,
    repartidor_retiro_id: courier.id,
    fecha_retiro_programada: "2026-10-02T09:00:00.000Z",
    moneda: "USD",
    paga_al_retirar: false,
    observaciones: "QA retiro a oficina",
    items: [{ producto_id: productOffice.id, costo_original: 600 }],
  }, options);

  let deliveryData = await listDeliveryData(options);
  const purchaseItem = findOne(deliveryData.compra_items, (item) => item.producto_id === productOffice.id, "item de compra para retiro a oficina");
  const pickupTask = findOne(deliveryData.ruta_items, (item) => item.compra_item_id === purchaseItem.id && item.tipo === "RETIRAR_PROVEEDOR", "tarea de retiro a oficina");

  await confirmRoutePickup(pickupTask.id, {
    destino: "OFICINA",
    imei: "QA-OFFICE-IMEI",
    usuario_id: courier.id,
  }, options);

  let stockData = await listStockData(options);
  const officeUnit = findOne(stockData.unidades, (unit) => unit.compra_item_id === purchaseItem.id, "unidad recibida en oficina");
  assert(officeUnit.estado === "EN_OFICINA_DISPONIBLE", "El retiro a oficina debe dejar unidad disponible.");

  await createSale({
    cliente_id: client.id,
    vendedor_id: seller.id,
    moneda_principal: "USD",
    con_envio: true,
    direccion_entrega: client.direccion,
    repartidor_entrega_id: courier.id,
    emitir_comprobante: true,
    items: [{ producto_id: productOffice.id, unidad_id: officeUnit.id, precio_venta: 1000, moneda: "USD" }],
  }, options);

  let salesData = await listSalesData(options);
  const saleItem = findOne(salesData.venta_items, (item) => item.unidad_id === officeUnit.id, "item vendido desde oficina");
  const sale = findOne(salesData.ventas, (row) => row.id === saleItem.venta_id, "venta desde oficina");
  deliveryData = await listDeliveryData(options);
  const deliveryTask = findOne(deliveryData.ruta_items, (item) => item.venta_item_id === saleItem.id && item.tipo === "ENTREGAR_CLIENTE", "entrega de venta desde oficina");
  const collectionTask = findOne(deliveryData.ruta_items, (item) => item.ruta_id === deliveryTask.ruta_id && item.tipo === "COBRAR_CLIENTE", "cobro de venta desde oficina");

  await confirmCustomerDelivery(deliveryTask.id, courier.id, options);
  await confirmCustomerCollection(collectionTask.id, {
    importe: 1000,
    moneda: "USD",
    medio_pago: "EFECTIVO_USD",
    venta_item_id: saleItem.id,
    usuario_id: courier.id,
  }, options);
  await registerRouteRendition({
    ruta_id: deliveryTask.ruta_id,
    devoluciones: [{ importe: 990, moneda: "USD", medio_pago: "EFECTIVO_USD" }],
    usuario_id: admin.id,
    observaciones: "QA faltante controlado",
  }, options);
  await finalizeUnit(officeUnit.id, admin.id, options);

  salesData = await listSalesData(options);
  stockData = await listStockData(options);
  const finalizedSale = findOne(salesData.ventas, (row) => row.id === sale.id, "venta finalizada desde oficina");
  const finalizedUnit = findOne(stockData.unidades, (unit) => unit.id === officeUnit.id, "unidad finalizada desde oficina");
  assert(finalizedSale.estado === "FINALIZADA", "La venta pagada y entregada debe poder finalizarse.");
  assert(finalizedUnit.estado === "FINALIZADA", "La unidad pagada, entregada y con IMEI debe finalizarse.");
  flows.push("pedido proveedor -> retiro -> oficina -> venta -> entrega -> cobro");
}

async function flowProviderDirectDeliveryCollection() {
  await createPurchase({
    proveedor_id: supplier.id,
    moneda: "USD",
    paga_al_retirar: true,
    observaciones: "QA entrega directa",
    items: [{ producto_id: productDirect.id, costo_original: 800 }],
  }, options);

  let purchaseData = await listPurchaseData(options);
  const purchaseItem = findOne(purchaseData.compra_items, (item) => item.producto_id === productDirect.id, "item para entrega directa");

  await createSale({
    cliente_id: client.id,
    vendedor_id: seller.id,
    moneda_principal: "USD",
    con_envio: false,
    emitir_comprobante: true,
    items: [{ producto_id: productDirect.id, compra_item_id: purchaseItem.id, precio_venta: 1200, moneda: "USD" }],
  }, options);

  let salesData = await listSalesData(options);
  const saleItem = findOne(salesData.venta_items, (item) => item.compra_item_id === purchaseItem.id, "item de venta directa");
  await createRoute({
    repartidor_id: courier.id,
    fecha_programada: "2026-10-02T12:00:00.000Z",
    observaciones: "QA ruta directa",
    compra_item_ids: [purchaseItem.id],
    venta_item_ids: [saleItem.id],
    usuario_id: admin.id,
  }, options);

  let deliveryData = await listDeliveryData(options);
  const route = findOne(deliveryData.rutas, (row) => row.observaciones === "QA ruta directa", "ruta directa");
  const pickupTask = findOne(deliveryData.ruta_items, (item) => item.ruta_id === route.id && item.tipo === "RETIRAR_PROVEEDOR", "retiro directo");
  const providerPaymentTask = findOne(deliveryData.ruta_items, (item) => item.ruta_id === route.id && item.tipo === "PAGAR_PROVEEDOR", "pago proveedor directo");
  const collectionTask = findOne(deliveryData.ruta_items, (item) => item.ruta_id === route.id && item.tipo === "COBRAR_CLIENTE", "cobro directo");

  await registerCourierAdvance({
    ruta_id: route.id,
    importe: 800,
    moneda: "USD",
    medio_pago: "EFECTIVO_USD",
    usuario_id: admin.id,
  }, options);
  await confirmRoutePickup(pickupTask.id, {
    destino: "ENTREGA_DIRECTA",
    imei: "QA-DIRECT-IMEI",
    usuario_id: courier.id,
  }, options);
  await confirmProviderPayment(providerPaymentTask.id, {
    importe: 800,
    moneda: "USD",
    medio_pago: "EFECTIVO_USD",
    usuario_id: courier.id,
  }, options);
  await confirmCustomerCollection(collectionTask.id, {
    importe: 1200,
    moneda: "USD",
    medio_pago: "EFECTIVO_USD",
    venta_item_id: saleItem.id,
    usuario_id: courier.id,
  }, options);
  await registerRouteRendition({
    ruta_id: route.id,
    devoluciones: [{ importe: 1200, moneda: "USD", medio_pago: "EFECTIVO_USD" }],
    usuario_id: admin.id,
  }, options);

  salesData = await listSalesData(options);
  deliveryData = await listDeliveryData(options);
  const directSale = findOne(salesData.ventas, (sale) => sale.id === saleItem.venta_id, "venta directa cobrada");
  const directUnit = findOne(deliveryData.unidades, (unit) => unit.compra_item_id === purchaseItem.id, "unidad entrega directa");
  assert(directSale.saldo_pendiente === 0, "La entrega directa debe quedar cobrada.");
  assert(directUnit.estado === "ENTREGADA", "La entrega directa debe dejar unidad entregada al cliente.");
  flows.push("pedido proveedor -> retiro -> entrega directa -> cobro");
}

async function flowPartialPaymentDebt() {
  const unitA = await insertOfficeUnit(productPartialA.id, "PARTIAL-A");
  const unitB = await insertOfficeUnit(productPartialB.id, "PARTIAL-B");

  await createSale({
    cliente_id: client.id,
    vendedor_id: seller.id,
    moneda_principal: "USD",
    con_envio: false,
    emitir_comprobante: true,
    items: [
      { producto_id: productPartialA.id, unidad_id: unitA.id, precio_venta: 400, moneda: "USD" },
      { producto_id: productPartialB.id, unidad_id: unitB.id, precio_venta: 600, moneda: "USD" },
    ],
    pago_inicial: {
      importe: 400,
      moneda: "USD",
      medio_pago: "EFECTIVO_USD",
      line_index: 0,
    },
  }, options);

  const salesData = await listSalesData(options);
  const sale = findOne(salesData.ventas, (row) => row.total === 1000 && row.saldo_pendiente === 600, "venta con pago parcial");
  const cashData = await listCashData(options);
  const debt = findOne(cashData.deudas_clientes, (row) => row.venta_id === sale.id, "deuda de cliente por pago parcial");
  assert(debt.saldo_pendiente === 600, "La deuda abierta debe conservar el saldo del item impago.");
  flows.push("pago parcial y deuda abierta");
}

async function flowDeliveryWithDebtAndWarranty() {
  const unit = await insertOfficeUnit(productDebtDelivery.id, "DEBT-DELIVERY");
  await createSale({
    cliente_id: client.id,
    vendedor_id: seller.id,
    moneda_principal: "USD",
    con_envio: true,
    direccion_entrega: client.direccion,
    repartidor_entrega_id: courier.id,
    emitir_comprobante: true,
    items: [{ producto_id: productDebtDelivery.id, unidad_id: unit.id, precio_venta: 700, moneda: "USD" }],
  }, options);

  let salesData = await listSalesData(options);
  const saleItem = findOne(salesData.venta_items, (item) => item.unidad_id === unit.id, "item entrega con deuda");
  let deliveryData = await listDeliveryData(options);
  const deliveryTask = findOne(deliveryData.ruta_items, (item) => item.venta_item_id === saleItem.id && item.tipo === "ENTREGAR_CLIENTE", "entrega con deuda");

  await confirmCustomerDelivery(deliveryTask.id, courier.id, options);
  await markRouteOpenNextDay(deliveryTask.ruta_id, admin.id, options);
  await moveUnitToWarranty(unit.id, {
    motivo: "QA garantia posterior a entrega",
    usuario_id: admin.id,
  }, options);

  salesData = await listSalesData(options);
  deliveryData = await listDeliveryData(options);
  const debtSale = findOne(salesData.ventas, (sale) => sale.id === saleItem.venta_id, "venta entregada con deuda");
  const openRoute = findOne(deliveryData.rutas, (route) => route.id === deliveryTask.ruta_id, "ruta abierta al dia siguiente");
  const warrantyUnit = findOne(deliveryData.unidades, (row) => row.id === unit.id, "unidad en garantia");
  assert(debtSale.saldo_pendiente === 700, "La entrega no debe cancelar la deuda del cliente.");
  assert(openRoute.estado === "ABIERTA_CON_PENDIENTES", "La ruta debe quedar abierta para el dia siguiente.");
  assert(warrantyUnit.estado === "GARANTIA", "La garantia debe quedar como estado de unidad.");
  flows.push("entrega con deuda");
  flows.push("ruta abierta al dia siguiente");
  flows.push("garantia");
}

async function flowCancellations() {
  await createPurchase({
    proveedor_id: supplier.id,
    moneda: "USD",
    paga_al_retirar: false,
    observaciones: "QA cancelacion compra",
    items: [
      { producto_id: productCancelPurchaseA.id, costo_original: 100 },
      { producto_id: productCancelPurchaseB.id, costo_original: 200 },
    ],
  }, options);

  let purchaseData = await listPurchaseData(options);
  const cancelPurchaseRow = findOne(purchaseData.compras, (purchase) => purchase.observaciones === "QA cancelacion compra", "compra para cancelar item");
  const purchaseItemToCancel = findOne(purchaseData.compra_items, (item) => item.compra_id === cancelPurchaseRow.id && item.producto_id === productCancelPurchaseA.id, "item de compra cancelable");
  await cancelPurchaseItem(purchaseItemToCancel.id, options);

  purchaseData = await listPurchaseData(options);
  const cancelledPurchaseItem = findOne(purchaseData.compra_items, (item) => item.id === purchaseItemToCancel.id, "item de compra cancelado");
  const activePurchase = findOne(purchaseData.compras, (purchase) => purchase.id === cancelPurchaseRow.id, "compra restante");
  assert(cancelledPurchaseItem.estado === "CANCELADO", "El item de compra debe quedar cancelado.");
  assert(activePurchase.estado !== "CANCELADA" && activePurchase.total_estimado === 200, "La compra debe seguir activa si queda otro item.");

  const unitA = await insertOfficeUnit(productCancelSaleA.id, "CANCEL-SALE-A");
  const unitB = await insertOfficeUnit(productCancelSaleB.id, "CANCEL-SALE-B");
  await createSale({
    cliente_id: client.id,
    vendedor_id: seller.id,
    moneda_principal: "USD",
    con_envio: false,
    emitir_comprobante: true,
    items: [
      { producto_id: productCancelSaleA.id, unidad_id: unitA.id, precio_venta: 300, moneda: "USD" },
      { producto_id: productCancelSaleB.id, unidad_id: unitB.id, precio_venta: 500, moneda: "USD" },
    ],
  }, options);

  let salesData = await listSalesData(options);
  const saleItem = findOne(salesData.venta_items, (item) => item.unidad_id === unitA.id, "item de venta cancelable");
  await cancelSaleItem(saleItem.id, options);

  salesData = await listSalesData(options);
  const stockData = await listStockData(options);
  const cancelledSaleItem = findOne(salesData.venta_items, (item) => item.id === saleItem.id, "item de venta cancelado");
  const updatedSale = findOne(salesData.ventas, (sale) => sale.id === saleItem.venta_id, "venta con item cancelado");
  const releasedUnit = findOne(stockData.unidades, (row) => row.id === unitA.id, "unidad liberada por cancelacion");
  assert(cancelledSaleItem.estado === "CANCELADO" && cancelledSaleItem.saldo_pendiente === 0, "El item vendido debe quedar cancelado sin deuda.");
  assert(updatedSale.total === 500 && updatedSale.saldo_pendiente === 500 && updatedSale.comprobante_estado === "EDITADO", "La venta debe recalcular total/saldo y marcar comprobante editado.");
  assert(releasedUnit.estado === "EN_OFICINA_DISPONIBLE" && !releasedUnit.venta_item_id, "La cancelacion debe liberar la unidad reservada.");
  flows.push("cancelacion de item pedido/vendido");
}

async function flowCashCloseAndInsights() {
  let cashData = await listCashData(options);
  assert(cashData.movimientos_dinero.some((movement) => movement.tipo === "DIFERENCIA_RENDICION"), "Debe existir diferencia de rendicion antes del cierre.");

  await closeCash({
    fecha_desde: "2020-01-01T00:00:00.000Z",
    fecha_hasta: "2099-12-31T23:59:59.000Z",
    usuario_id: admin.id,
    observaciones: "QA cierre integral",
  }, options);

  cashData = await listCashData(options);
  const closeMovement = findOne(cashData.movimientos_dinero, (movement) => movement.tipo === "CIERRE_CAJA", "cierre de caja integral");
  assert(closeMovement.snapshot?.movimientos_incluidos > 0, "El cierre debe guardar snapshot con movimientos incluidos.");
  assert(closeMovement.snapshot?.totales_por_tipo?.DIFERENCIA_RENDICION?.USD === 10, "El cierre debe incluir la diferencia de rendicion controlada.");

  const insights = await listInsightsData(options);
  const alertTypes = new Set(insights.alertas.map((alert) => alert.tipo));
  assert(alertTypes.has("VENTA_CON_DEUDA"), "El centro de alertas debe mostrar ventas con deuda.");
  assert(alertTypes.has("RUTA_ABIERTA"), "El centro de alertas debe mostrar rutas abiertas.");
  assert(alertTypes.has("DIFERENCIA_CAJA"), "El centro de alertas debe mostrar diferencias de caja.");
  assert(insights.reportes.resumen.ventas_finalizadas >= 1, "Reportes debe contar ventas finalizadas.");
  assert(insights.reportes.resumen.ganancia_cerrada.USD >= 400, "Reportes debe calcular ganancia cerrada sobre ventas finalizadas.");

  const adminScope = scopeInsightsForRole(insights, "ADMINISTRADOR", admin.id);
  const sellerScope = scopeInsightsForRole(insights, "VENDEDOR", seller.id);
  assert(adminScope.reportes && getRoleAccess("ADMINISTRADOR").canSeeReports, "Administrador debe ver reportes.");
  assert(!sellerScope.reportes && !getRoleAccess("VENDEDOR").canSeeReports, "Vendedor no debe ver reportes.");
  flows.push("cierre de caja con diferencias");
}

async function validateFinalDb() {
  const finalDb = readJson(testDbPath);
  const contract = loadContract();
  const validation = validateLocalDb(finalDb, contract);
  if (!validation.ok) {
    console.error(formatValidationResult(validation));
    process.exit(1);
  }

  const officialTables = Object.keys(contract.tables).sort();
  const finalTables = Object.keys(finalDb.tables).sort();
  assert(JSON.stringify(officialTables) === JSON.stringify(finalTables), "La QA integral creo tablas fuera del contrato oficial.");
}

async function insertUser({
  id,
  nombre,
  email,
  rol,
  porcentaje_comision = 0,
  costo_envio_usd = 0,
  costo_envio_ars = 0,
}) {
  return db.insertRow("usuarios", {
    id,
    auth_user_id: null,
    nombre,
    email,
    telefono: null,
    rol,
    activo: true,
    porcentaje_comision,
    costo_envio_usd,
    costo_envio_ars,
    creado_en: now,
    actualizado_en: now,
  });
}

async function product(categoria, marca, modelo) {
  return createMasterRecord("productos", {
    categoria,
    marca,
    modelo,
    nombre: `${marca} ${modelo}`,
  }, options);
}

async function insertOfficeUnit(productId, suffix) {
  return db.insertRow("unidades", {
    producto_id: productId,
    estado: "EN_OFICINA_DISPONIBLE",
    imei: `QA-${suffix}`,
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

function findOne(rows, predicate, label) {
  const row = rows.find(predicate);
  if (!row) throw new Error(`No se encontro ${label}.`);
  return row;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
