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
const compiledDir = path.join(localDbPaths.artifactsDir, "compiled-insights");
const testDbPath = path.join(localDbPaths.artifactsDir, "sprint9-insights.local.json");
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
  "lib/permissions.ts",
  "lib/local-db/schema.ts",
  "lib/local-db/client.ts",
  "lib/local-db/masters.ts",
  "lib/local-db/purchases.ts",
  "lib/local-db/sales.ts",
  "lib/local-db/stock.ts",
  "lib/local-db/delivery.ts",
  "lib/local-db/cash.ts",
  "lib/local-db/insights.ts",
], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const { getRoleAccess, resolvePageForRole } = require(path.join(compiledDir, "lib", "permissions.js"));
const { createLocalDbClient } = require(path.join(compiledDir, "lib", "local-db", "client.js"));
const { createMasterRecord } = require(path.join(compiledDir, "lib", "local-db", "masters.js"));
const { createPurchase, listPurchaseData } = require(path.join(compiledDir, "lib", "local-db", "purchases.js"));
const { createSale, listSalesData } = require(path.join(compiledDir, "lib", "local-db", "sales.js"));
const { deliverUnit, finalizeUnit, receivePurchaseItem, updateUnitIdentity } = require(path.join(compiledDir, "lib", "local-db", "stock.js"));
const { confirmCustomerDelivery } = require(path.join(compiledDir, "lib", "local-db", "delivery.js"));
const { registerCashSalePayment, registerRouteRendition } = require(path.join(compiledDir, "lib", "local-db", "cash.js"));
const { listInsightsData, scopeInsightsForRole } = require(path.join(compiledDir, "lib", "local-db", "insights.js"));

const options = {
  filePath: testDbPath,
  templatePath: localDbPaths.example,
};
const db = createLocalDbClient(options);
const now = "2026-10-01T12:00:00.000Z";

await db.resetFromTemplate();

const admin = await db.insertRow("usuarios", {
  id: "60000000-0000-4000-8000-000000000001",
  auth_user_id: null,
  nombre: "Admin Sprint 9",
  email: "admin.sprint9@example.invalid",
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
  id: "60000000-0000-4000-8000-000000000002",
  auth_user_id: null,
  nombre: "Vendedor Sprint 9",
  email: "vendedor.sprint9@example.invalid",
  telefono: null,
  rol: "VENDEDOR",
  activo: true,
  porcentaje_comision: 10,
  costo_envio_usd: 0,
  costo_envio_ars: 0,
  creado_en: now,
  actualizado_en: now,
});

const courier = await db.insertRow("usuarios", {
  id: "60000000-0000-4000-8000-000000000003",
  auth_user_id: null,
  nombre: "Repartidor Sprint 9",
  email: "repartidor.sprint9@example.invalid",
  telefono: null,
  rol: "REPARTIDOR",
  activo: true,
  porcentaje_comision: 0,
  costo_envio_usd: 4,
  costo_envio_ars: 0,
  creado_en: now,
  actualizado_en: now,
});

const otherCourier = await db.insertRow("usuarios", {
  id: "60000000-0000-4000-8000-000000000004",
  auth_user_id: null,
  nombre: "Otro Repartidor Sprint 9",
  email: "otro.repartidor.sprint9@example.invalid",
  telefono: null,
  rol: "REPARTIDOR",
  activo: true,
  porcentaje_comision: 0,
  costo_envio_usd: 4,
  costo_envio_ars: 0,
  creado_en: now,
  actualizado_en: now,
});

const supplier = await createMasterRecord("proveedores", {
  nombre: "Proveedor Sprint 9",
  telefono: "4444-9999",
  direccion: "Direccion proveedor",
}, options);
const client = await createMasterRecord("clientes", {
  nombre: "Cliente Sprint 9",
  telefono: "5555-9999",
  direccion: "Direccion cliente",
}, options);

const productNoStock = await createMasterRecord("productos", { categoria: "telefono", marca: "Fixture", modelo: "Sin stock", nombre: "Producto alerta sin stock" }, options);
const productDebt = await createMasterRecord("productos", { categoria: "tablet", marca: "Fixture", modelo: "Deuda", nombre: "Producto alerta deuda" }, options);
const productDelivery = await createMasterRecord("productos", { categoria: "tablet", marca: "Fixture", modelo: "Entrega", nombre: "Producto alerta entrega" }, options);
const productImei = await createMasterRecord("productos", { categoria: "telefono", marca: "Fixture", modelo: "IMEI", nombre: "Producto alerta IMEI" }, options);
const productFinal = await createMasterRecord("productos", { categoria: "notebook", marca: "Fixture", modelo: "Final", nombre: "Producto reporte final" }, options);
const productOpen = await createMasterRecord("productos", { categoria: "notebook", marca: "Fixture", modelo: "Abierta", nombre: "Producto reporte abierta" }, options);

const debtUnit = await insertUnit(productDebt.id, "DEBT", "IMEI-SPRINT9-DEBT");
const deliveryUnit = await insertUnit(productDelivery.id, "DELIVERY", "IMEI-SPRINT9-DELIVERY");
const missingImeiUnit = await insertUnit(productImei.id, "MISSING", null);
const openUnit = await insertUnit(productOpen.id, "OPEN", "IMEI-SPRINT9-OPEN");

await createPurchase({
  proveedor_id: supplier.id,
  moneda: "USD",
  paga_al_retirar: false,
  items: [{ producto_id: productNoStock.id, costo_original: 300 }],
}, options);
let purchaseData = await listPurchaseData(options);
const noStockPurchaseItem = purchaseData.compra_items.find((item) => item.producto_id === productNoStock.id);
if (!noStockPurchaseItem) throw new Error("No se creo compra para venta sin stock.");

await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: false,
  emitir_comprobante: true,
  items: [{ producto_id: productNoStock.id, compra_item_id: noStockPurchaseItem.id, precio_venta: 500, moneda: "USD" }],
}, options);

let insights = await listInsightsData(options);
const noStockAlert = findAlert(insights, "VENTA_SIN_STOCK");
if (!noStockAlert) throw new Error("Debe aparecer alerta de venta sin stock.");

await receivePurchaseItem({
  compra_item_id: noStockPurchaseItem.id,
  destino: "OFICINA",
  imei: "IMEI-SPRINT9-NOSTOCK",
  usuario_id: admin.id,
}, options);
insights = await listInsightsData(options);
if (insights.alertas.some((alert) => alert.id === noStockAlert.id)) throw new Error("La alerta de venta sin stock debe desaparecer al recibir la unidad.");

await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: false,
  emitir_comprobante: true,
  items: [{ producto_id: productDebt.id, unidad_id: debtUnit.id, precio_venta: 450, moneda: "USD" }],
}, options);
let salesData = await listSalesData(options);
const debtSale = salesData.ventas.find((sale) => sale.numero === 2);
if (!debtSale) throw new Error("No se creo venta con deuda.");
insights = await listInsightsData(options);
const debtAlert = insights.alertas.find((alert) => alert.tipo === "VENTA_CON_DEUDA" && alert.entidad_id === debtSale.id);
if (!debtAlert) throw new Error("Debe aparecer alerta de venta con deuda.");
await registerCashSalePayment(debtSale.id, {
  importe: 450,
  moneda: "USD",
  medio_pago: "EFECTIVO_USD",
  usuario_id: admin.id,
}, options);
insights = await listInsightsData(options);
if (insights.alertas.some((alert) => alert.id === debtAlert.id)) throw new Error("La alerta de deuda debe desaparecer al cobrar.");

await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: true,
  direccion_entrega: "Direccion cliente",
  repartidor_entrega_id: courier.id,
  emitir_comprobante: true,
  items: [{ producto_id: productDelivery.id, unidad_id: deliveryUnit.id, precio_venta: 700, moneda: "USD" }],
  pago_inicial: { importe: 700, moneda: "USD", medio_pago: "EFECTIVO_USD", line_index: 0 },
}, options);
salesData = await listSalesData(options);
const deliverySale = salesData.ventas.find((sale) => sale.numero === 3);
const deliveryItem = deliverySale ? salesData.venta_items.find((item) => item.venta_id === deliverySale.id) : null;
const deliveryRouteItem = deliveryItem ? salesData.ruta_items.find((item) => item.venta_item_id === deliveryItem.id && item.tipo === "ENTREGAR_CLIENTE") : null;
if (!deliverySale || !deliveryItem || !deliveryRouteItem) throw new Error("No se creo entrega pendiente.");
insights = await listInsightsData(options);
const deliveryAlert = insights.alertas.find((alert) => alert.tipo === "ENTREGA_PENDIENTE" && alert.entidad_id === deliveryRouteItem.id);
const courierScope = scopeInsightsForRole(insights, "REPARTIDOR", courier.id);
const otherCourierScope = scopeInsightsForRole(insights, "REPARTIDOR", otherCourier.id);
if (!deliveryAlert) throw new Error("Debe aparecer alerta de entrega pendiente.");
if (!courierScope.alertas.some((alert) => alert.id === deliveryAlert.id)) throw new Error("El repartidor asignado debe ver su alerta operativa.");
if (otherCourierScope.alertas.some((alert) => alert.id === deliveryAlert.id)) throw new Error("Otro repartidor no debe ver la alerta ajena.");

await confirmCustomerDelivery(deliveryRouteItem.id, courier.id, options);
insights = await listInsightsData(options);
if (insights.alertas.some((alert) => alert.id === deliveryAlert.id)) throw new Error("La alerta de entrega debe desaparecer al confirmar entrega.");
const openRouteAlert = insights.alertas.find((alert) => alert.tipo === "RUTA_ABIERTA" && alert.entidad_id === deliveryRouteItem.ruta_id);
if (!openRouteAlert) throw new Error("La ruta abierta debe generar alerta hasta rendir.");
await registerRouteRendition({
  ruta_id: deliveryRouteItem.ruta_id,
  devoluciones: [{ importe: 0, moneda: "USD", medio_pago: "EFECTIVO_USD" }],
  usuario_id: admin.id,
}, options);
insights = await listInsightsData(options);
if (insights.alertas.some((alert) => alert.id === openRouteAlert.id)) throw new Error("La alerta de ruta abierta debe desaparecer al rendir.");

insights = await listInsightsData(options);
const imeiAlert = insights.alertas.find((alert) => alert.tipo === "IMEI_PENDIENTE" && alert.entidad_id === missingImeiUnit.id);
if (!imeiAlert) throw new Error("Debe aparecer alerta de IMEI pendiente.");
await updateUnitIdentity(missingImeiUnit.id, { imei: "IMEI-SPRINT9-FIXED", usuario_id: admin.id }, options);
insights = await listInsightsData(options);
if (insights.alertas.some((alert) => alert.id === imeiAlert.id)) throw new Error("La alerta de IMEI debe desaparecer al cargar identificador.");

const diffMovement = await db.insertRow("movimientos_dinero", {
  tipo: "DIFERENCIA_RENDICION",
  signo: "NEUTRO",
  moneda: "USD",
  medio_pago: "EFECTIVO_USD",
  importe: 25,
  estado: "REGISTRADO",
  fecha: now,
  venta_id: null,
  venta_item_id: null,
  compra_id: null,
  compra_item_id: null,
  ruta_id: deliveryRouteItem.ruta_id,
  ruta_item_id: null,
  cliente_id: null,
  proveedor_id: null,
  usuario_id: courier.id,
  cierre_codigo: null,
  cotizacion_usada: null,
  snapshot: { diferencia: -25 },
  observaciones: "Diferencia fixture",
  creado_en: now,
  actualizado_en: now,
  creado_por: admin.id,
  actualizado_por: admin.id,
});
insights = await listInsightsData(options);
const diffAlert = insights.alertas.find((alert) => alert.tipo === "DIFERENCIA_CAJA" && alert.entidad_id === diffMovement.id);
if (!diffAlert) throw new Error("Debe aparecer alerta de diferencia de caja.");
await db.updateRow("movimientos_dinero", diffMovement.id, { estado: "ANULADO" });
insights = await listInsightsData(options);
if (insights.alertas.some((alert) => alert.id === diffAlert.id)) throw new Error("La alerta de diferencia debe desaparecer si el movimiento queda anulado.");

await createPurchase({
  proveedor_id: supplier.id,
  moneda: "USD",
  paga_al_retirar: false,
  items: [{ producto_id: productFinal.id, costo_original: 600 }],
}, options);
purchaseData = await listPurchaseData(options);
const finalPurchaseItem = purchaseData.compra_items.find((item) => item.producto_id === productFinal.id);
if (!finalPurchaseItem) throw new Error("No se creo compra para reporte final.");
await receivePurchaseItem({
  compra_item_id: finalPurchaseItem.id,
  destino: "OFICINA",
  imei: "IMEI-SPRINT9-FINAL",
  usuario_id: admin.id,
}, options);
const finalUnit = (await db.listRows("unidades")).find((unit) => unit.compra_item_id === finalPurchaseItem.id);
if (!finalUnit) throw new Error("No se recibio unidad para reporte final.");
await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: false,
  emitir_comprobante: true,
  items: [{ producto_id: productFinal.id, unidad_id: finalUnit.id, precio_venta: 1000, moneda: "USD" }],
  pago_inicial: { importe: 1000, moneda: "USD", medio_pago: "EFECTIVO_USD", line_index: 0 },
}, options);
await createSale({
  cliente_id: client.id,
  vendedor_id: seller.id,
  moneda_principal: "USD",
  con_envio: false,
  emitir_comprobante: true,
  items: [{ producto_id: productOpen.id, unidad_id: openUnit.id, precio_venta: 800, moneda: "USD" }],
  pago_inicial: { importe: 800, moneda: "USD", medio_pago: "EFECTIVO_USD", line_index: 0 },
}, options);
salesData = await listSalesData(options);
const finalSaleItem = salesData.venta_items.find((item) => item.producto_id === productFinal.id && item.unidad_id === finalUnit.id);
if (!finalSaleItem) throw new Error("No se creo item de venta finalizable.");
await deliverUnit(finalUnit.id, admin.id, options);
await finalizeUnit(finalUnit.id, admin.id, options);

insights = await listInsightsData(options);
if (insights.reportes.resumen.ventas_finalizadas !== 1) throw new Error("El reporte debe contar solo una venta finalizada.");
if (insights.reportes.resumen.ganancia_cerrada.USD !== 400) {
  throw new Error(`La ganancia cerrada debe ser 400 USD, no ${insights.reportes.resumen.ganancia_cerrada.USD}.`);
}
if (insights.reportes.resumen.comisiones.USD !== 100) {
  throw new Error(`La comision cerrada debe ser 100 USD, no ${insights.reportes.resumen.comisiones.USD}.`);
}

const adminAccess = getRoleAccess("ADMINISTRADOR");
const sellerAccess = getRoleAccess("VENDEDOR");
const courierAccess = getRoleAccess("REPARTIDOR");
if (!adminAccess.canSeeMetrics || !adminAccess.canSeeReports || !adminAccess.allowedPages.includes("reportes")) throw new Error("Administrador debe ver todo.");
if (sellerAccess.canSeeMetrics || sellerAccess.canSeeReports || sellerAccess.allowedPages.includes("reportes")) throw new Error("Vendedor no debe ver metricas/reportes.");
if (courierAccess.allowedPages.length !== 1 || courierAccess.allowedPages[0] !== "reparto" || courierAccess.canSeeAllRoutes) throw new Error("Repartidor debe ver solo Reparto operativo.");
if (resolvePageForRole("REPARTIDOR", "ventas") !== "reparto") throw new Error("Repartidor debe caer en Reparto si intenta abrir otra pantalla.");
const sellerScope = scopeInsightsForRole(insights, "VENDEDOR", seller.id);
if (sellerScope.reportes !== null) throw new Error("El scope de vendedor no debe exponer reportes.");
if (sellerScope.alertas.some((alert) => alert.tipo === "DIFERENCIA_CAJA")) throw new Error("El vendedor no debe ver diferencias de caja.");

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
  throw new Error("El modulo Insights creo tablas fuera del contrato oficial.");
}

writeJson(path.join(localDbPaths.artifactsDir, "sprint9-insights-summary.json"), {
  alertas: insights.alertas.length,
  ventas_finalizadas: insights.reportes.resumen.ventas_finalizadas,
  ganancia_cerrada_usd: insights.reportes.resumen.ganancia_cerrada.USD,
  comisiones_usd: insights.reportes.resumen.comisiones.USD,
});

console.log("OK: Sprint 9 alertas, reportes y permisos validado.");
console.log("- Roles admin/vendedor/repartidor, alertas dinamicas y reportes administrativos.");
console.log("- Ganancia cerrada calculada solo con ventas finalizadas.");

function findAlert(data, type) {
  return data.alertas.find((alert) => alert.tipo === type);
}

async function insertUnit(productId, suffix, imei) {
  return db.insertRow("unidades", {
    producto_id: productId,
    estado: "EN_OFICINA_DISPONIBLE",
    imei,
    serie: null,
    color: suffix ? `negro-${suffix}` : "negro",
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
