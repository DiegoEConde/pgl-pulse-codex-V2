import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function loadJsPdf() {
  try {
    return require("jspdf").jsPDF;
  } catch {
    const fallback = path.resolve(process.cwd(), "..", "pgl-pulse-codex", "node_modules", "jspdf");
    return require(fallback).jsPDF;
  }
}

const jsPDF = loadJsPdf();
const out = path.resolve("docs", "PGL-Pulse-v2-boceto-estados-base.pdf");
const doc = new jsPDF({ unit: "pt", format: "a4" });
const page = { w: 595.28, h: 841.89, margin: 42 };
let y = page.margin;

function addPageIfNeeded(height = 40) {
  if (y + height > page.h - page.margin) {
    doc.addPage();
    y = page.margin;
  }
}

function write(value, size = 10, style = "normal") {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(30, 41, 59);
  const lines = doc.splitTextToSize(value, page.w - page.margin * 2);
  addPageIfNeeded(lines.length * (size + 4));
  doc.text(lines, page.margin, y);
  y += lines.length * (size + 4);
}

function title(value) {
  addPageIfNeeded(44);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(value, page.margin, y);
  y += 30;
}

function h2(value) {
  addPageIfNeeded(34);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(value, page.margin, y);
  y += 20;
}

function bullets(items) {
  for (const item of items) write("- " + item, 10);
  y += 4;
}

function table(headers, rows, widths) {
  const x0 = page.margin;
  const rowH = 28;
  addPageIfNeeded(rowH * (rows.length + 2));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setFillColor(232, 239, 247);
  doc.rect(x0, y, widths.reduce((a, b) => a + b, 0), rowH, "F");
  let x = x0;
  headers.forEach((header, index) => {
    doc.text(header, x + 6, y + 17);
    x += widths[index];
  });
  y += rowH;
  doc.setFont("helvetica", "normal");
  for (const row of rows) {
    addPageIfNeeded(rowH + 8);
    x = x0;
    row.forEach((cell, index) => {
      doc.rect(x, y, widths[index], rowH);
      const lines = doc.splitTextToSize(String(cell), widths[index] - 10);
      doc.text(lines.slice(0, 2), x + 5, y + 14);
      x += widths[index];
    });
    y += rowH;
  }
  y += 12;
}

function box(x, yBox, w, h, label, detail, fill = [255, 255, 255]) {
  doc.setDrawColor(71, 85, 105);
  doc.setFillColor(...fill);
  doc.roundedRect(x, yBox, w, h, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(label, x + 8, yBox + 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(doc.splitTextToSize(detail, w - 16).slice(0, 2), x + 8, yBox + 31);
}

function line(x1, y1, x2, y2) {
  doc.setDrawColor(100, 116, 139);
  doc.line(x1, y1, x2, y2);
}

title("PGL Pulse v2 - Base simplificada y estados");
write("Documento de revision generado desde la documentacion v2. No es una migracion SQL final. Sirve para validar reglas, estados, tablas y relaciones antes de implementar localmente.", 11);

h2("Reglas que guian el diseno");
bullets([
  "La base local nueva es el punto de partida.",
  "La venta es la entidad comercial principal.",
  "Clientes y proveedores quedan en tablas separadas.",
  "Vendedores y repartidores son usuarios con rol.",
  "Todos los productos se manejan por unidad.",
  "Garantia es un estado de la unidad.",
  "El comprobante vive como numero y snapshot dentro de la venta.",
  "Caja real se calcula desde movimientos de dinero.",
  "No se migran datos beta como datos reales."
]);

h2("Tablas oficiales iniciales");
table(
  ["Area", "Tablas"],
  [
    ["Usuarios", "usuarios"],
    ["Terceros", "clientes, proveedores"],
    ["Catalogo", "productos"],
    ["Compras", "compras, compra_items"],
    ["Ventas", "ventas, venta_items"],
    ["Stock", "unidades"],
    ["Reparto", "rutas, ruta_items"],
    ["Finanzas", "movimientos_dinero"],
    ["Auditoria", "historial_eventos"]
  ],
  [120, 390]
);

h2("Fusionado frente al boceto anterior");
table(
  ["Antes", "Ahora"],
  [
    ["categoria / producto_caracteristica", "productos.categoria y productos.atributos"],
    ["vendedor / repartidor", "usuarios con rol y datos operativos"],
    ["ruta_parada / ruta_tarea", "ruta_items"],
    ["comprobante / comprobante_item", "campos y snapshot en ventas"],
    ["garantia / garantia_evento", "estado de unidades + historial_eventos"],
    ["caja / rendicion / aplicacion", "movimientos_dinero"],
    ["auditorias especificas", "historial_eventos"]
  ],
  [190, 320]
);

h2("Fuentes de verdad");
table(
  ["Dato", "Tabla fuente"],
  [
    ["Venta existe", "ventas"],
    ["Productos vendidos", "venta_items"],
    ["Compra a proveedor", "compras, compra_items"],
    ["Stock, IMEI, garantia y ubicacion", "unidades"],
    ["Ruta del repartidor", "rutas, ruta_items"],
    ["Cobros, pagos, rendiciones y caja", "movimientos_dinero"],
    ["Comprobante impreso", "ventas.comprobante_snapshot"],
    ["Auditoria sensible", "historial_eventos"]
  ],
  [220, 290]
);

h2("Estados principales");
table(
  ["Entidad", "Estados propuestos"],
  [
    ["ventas", "BORRADOR, CONFIRMADA, ENTREGADA_CON_DEUDA, FINALIZADA, CANCELADA"],
    ["venta_items", "PENDIENTE, RESERVADO, ASIGNADO_RUTA, ENTREGADO, PAGADO, FINALIZADO, CANCELADO"],
    ["compras", "BORRADOR, PEDIDA, EN_RETIRO, RECIBIDA, CERRADA, CANCELADA"],
    ["compra_items", "PEDIDO, RETIRADO, RECIBIDO_OFICINA, ENTREGADO_DIRECTO, CANCELADO"],
    ["unidades", "ESPERADA, CON_REPARTIDOR, OFICINA_DISPONIBLE, OFICINA_RESERVADA, ENTREGADA, FINALIZADA, GARANTIA, CANCELADA"],
    ["rutas", "PROGRAMADA, EN_CURSO, ABIERTA_CON_PENDIENTES, RENDIDA, CANCELADA"],
    ["ruta_items", "PENDIENTE, REALIZADO, PARCIAL, CANCELADO"],
    ["movimientos", "PENDIENTE, CONFIRMADO, ANULADO"]
  ],
  [110, 400]
);

doc.addPage();
y = page.margin;
title("Diagrama conceptual");
write("Vista simplificada de relaciones principales. El diagrama editable queda en docs/diagramas/base-datos-v2.mmd.", 10);

const blue = [238, 246, 255];
const green = [237, 248, 237];
const yellow = [255, 247, 232];
const gray = [246, 246, 246];

box(42, 105, 95, 48, "usuarios", "roles", blue);
box(42, 180, 95, 48, "clientes", "ventas", blue);
box(42, 255, 95, 48, "proveedores", "compras", blue);
box(42, 330, 95, 48, "productos", "catalogo", blue);
box(190, 170, 115, 54, "ventas", "comprobante snapshot");
box(350, 170, 125, 54, "venta_items", "pago/entrega");
box(190, 300, 115, 54, "compras", "proveedor/retiro");
box(350, 300, 125, 54, "compra_items", "pedido unidad");
box(505, 235, 115, 60, "unidades", "IMEI estado garantia");
line(137, 204, 190, 197); line(305, 197, 350, 197); line(475, 197, 505, 250);
line(137, 279, 190, 327); line(305, 327, 350, 327); line(475, 327, 505, 270);
line(137, 354, 350, 197); line(137, 354, 350, 327); line(412, 300, 412, 224);
box(190, 475, 115, 54, "rutas", "repartidor", green);
box(350, 475, 125, 54, "ruta_items", "retiro entrega", green);
line(305, 502, 350, 502); line(475, 502, 560, 295);
box(190, 635, 145, 58, "movimientos", "cobros pagos caja", yellow);
line(412, 529, 262, 635); line(412, 224, 262, 635); line(412, 354, 262, 635);
box(390, 635, 150, 58, "historial_eventos", "auditoria", gray);
line(562, 295, 465, 635); line(262, 693, 390, 664);

h2("Roadmap resumido");
bullets([
  "Sprint 1: base local y migraciones.",
  "Sprint 2: capa de datos y adaptacion tecnica.",
  "Sprint 3: catalogo, clientes y proveedores.",
  "Sprint 4: compras y pedidos proveedor.",
  "Sprint 5: ventas, detalle y comprobante.",
  "Sprint 6: unidades, stock, IMEI y estados.",
  "Sprint 7: reparto.",
  "Sprint 8: finanzas.",
  "Sprint 9: alertas, reportes y permisos.",
  "Sprint 10: QA integral local.",
  "Sprint 11: migracion a Supabase/Vercel."
]);

fs.mkdirSync(path.dirname(out), { recursive: true });
doc.save(out);
console.log("PDF generado:", out);