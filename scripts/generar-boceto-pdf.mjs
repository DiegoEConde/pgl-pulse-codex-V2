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

function text(value, size = 10, style = "normal", color = [30, 41, 59]) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(value, page.w - page.margin * 2);
  addPageIfNeeded(lines.length * (size + 4));
  doc.text(lines, page.margin, y);
  y += lines.length * (size + 4);
}

function title(value) {
  addPageIfNeeded(44);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(24, 33, 47);
  doc.text(value, page.margin, y);
  y += 30;
}

function h2(value) {
  addPageIfNeeded(36);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(24, 33, 47);
  doc.text(value, page.margin, y);
  y += 20;
}

function bullets(items) {
  for (const item of items) text("- " + item, 10);
  y += 4;
}

function table(headers, rows, widths) {
  const x0 = page.margin;
  const rowH = 24;
  addPageIfNeeded(rowH * (rows.length + 2));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setFillColor(232, 239, 247);
  doc.rect(x0, y, widths.reduce((a, b) => a + b, 0), rowH, "F");
  let x = x0;
  headers.forEach((header, index) => {
    doc.text(header, x + 6, y + 16);
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

function drawBox(x, yBox, w, h, label, fill = [255, 255, 255]) {
  doc.setDrawColor(86, 102, 122);
  doc.setFillColor(...fill);
  doc.roundedRect(x, yBox, w, h, 5, 5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(24, 33, 47);
  doc.text(label, x + 8, yBox + 18);
}

function line(x1, y1, x2, y2) {
  doc.setDrawColor(100, 116, 139);
  doc.line(x1, y1, x2, y2);
}

title("PGL Pulse v2 - Boceto de estados y base de datos");
text("Documento de revision generado desde la documentacion v2. No es una migracion SQL final. Sirve para validar reglas, estados, tablas y relaciones antes de implementar.", 11);

h2("Reglas que guian el diseno");
bullets([
  "La venta es la entidad principal.",
  "Todos los productos se manejan por unidad.",
  "Retiro, recepcion, entrega, cobro y rendicion son eventos independientes.",
  "Una venta sin stock solo puede crearse si existe un pedido al proveedor con ese dispositivo.",
  "Caja real se basa en movimientos de dinero.",
  "Los pagos parciales pueden aplicarse a una unidad/producto concreto.",
  "El comprobante es unico y puede reimprimirse con estado pagado.",
  "Los datos actuales de beta no se migran como datos reales."
]);

h2("Estados principales");
table(
  ["Entidad", "Estados propuestos"],
  [
    ["venta", "BORRADOR, CONFIRMADA, FINALIZADA, CANCELADA"],
    ["venta_item", "PENDIENTE_ABASTECIMIENTO, RESERVADO_OFICINA, ASIGNADO_RUTA, EN_PODER_REPARTIDOR, ENTREGADO, FINALIZADO, CANCELADO, GARANTIA"],
    ["compra", "BORRADOR, PEDIDA, EN_RETIRO, RECIBIDA_PARCIAL, RECIBIDA_TOTAL, CERRADA, CANCELADA"],
    ["compra_item", "PEDIDO, ASIGNADO_RUTA, RETIRADO_PROVEEDOR, EN_PODER_REPARTIDOR, RECIBIDO_OFICINA, ENTREGADO_DIRECTO, CANCELADO"],
    ["unidad", "ESPERADA_PROVEEDOR, EN_PODER_REPARTIDOR, EN_OFICINA_DISPONIBLE, EN_OFICINA_RESERVADA, ENTREGADA, FINALIZADA, GARANTIA, CANCELADA"],
    ["ruta", "BORRADOR, PROGRAMADA, EN_CURSO, ABIERTA_CON_PENDIENTES, PARCIALMENTE_RENDIDA, RENDIDA, CANCELADA"],
    ["comprobante", "EMITIDO, PAGADO, EDITADO, ANULADO reservado"],
    ["rendicion", "ABIERTA, PARCIAL, CERRADA_OK, CERRADA_CON_DIFERENCIA"]
  ],
  [110, 400]
);

h2("Tablas propuestas");
table(
  ["Area", "Tablas"],
  [
    ["Seguridad", "usuario_perfil"],
    ["Catalogos", "categoria, producto, producto_caracteristica"],
    ["Terceros", "cliente, proveedor, vendedor, repartidor"],
    ["Ventas", "venta, venta_item"],
    ["Compras", "compra, compra_item"],
    ["Stock", "unidad, unidad_evento"],
    ["Rutas", "ruta, ruta_parada, ruta_tarea"],
    ["Caja", "caja, movimiento_dinero, movimiento_aplicacion, cotizacion"],
    ["Comprobantes", "comprobante, comprobante_item"],
    ["Rendiciones", "ruta_rendicion, ruta_rendicion_item"],
    ["Garantia", "garantia, garantia_evento"],
    ["Auditoria", "auditoria_evento"]
  ],
  [120, 390]
);

h2("Fuentes de verdad");
table(
  ["Dato", "Tabla fuente"],
  [
    ["Venta existe", "venta"],
    ["Productos vendidos", "venta_item"],
    ["Estado fisico y ubicacion", "unidad"],
    ["Stock disponible", "unidad.estado = EN_OFICINA_DISPONIBLE"],
    ["Reserva para venta", "unidad.venta_item_id + estado reservado"],
    ["Cobros y pagos reales", "movimiento_dinero"],
    ["Pago aplicado a producto", "movimiento_aplicacion"],
    ["Ruta del repartidor", "ruta, ruta_parada, ruta_tarea"],
    ["Rendicion", "ruta_rendicion"],
    ["Comprobante impreso", "comprobante, comprobante_item"],
    ["Garantia", "garantia"]
  ],
  [180, 330]
);

doc.addPage();
y = page.margin;
title("Diagrama conceptual de tablas");
text("Vista simplificada. El diagrama completo en Mermaid y SVG queda en docs/diagramas/.", 10);

const c = {
  blue: [238, 246, 255],
  green: [240, 248, 237],
  yellow: [255, 247, 232],
  purple: [246, 239, 255],
  gray: [246, 246, 246],
};

drawBox(42, 100, 110, 38, "categoria", c.blue);
drawBox(180, 100, 110, 38, "producto", c.blue);
drawBox(318, 100, 135, 38, "producto_caract.", c.blue);
line(152, 119, 180, 119); line(290, 119, 318, 119);

drawBox(42, 170, 90, 38, "cliente", c.blue);
drawBox(155, 170, 90, 38, "proveedor", c.blue);
drawBox(268, 170, 90, 38, "vendedor", c.blue);
drawBox(381, 170, 90, 38, "repartidor", c.blue);

drawBox(42, 270, 120, 45, "venta", [255, 255, 255]);
drawBox(210, 270, 120, 45, "venta_item", [255, 255, 255]);
drawBox(42, 370, 120, 45, "compra", [255, 255, 255]);
drawBox(210, 370, 120, 45, "compra_item", [255, 255, 255]);
drawBox(380, 320, 120, 52, "unidad", [255, 255, 255]);
line(162, 292, 210, 292); line(330, 292, 380, 346); line(162, 392, 210, 392); line(330, 392, 380, 346); line(270, 370, 270, 315);

drawBox(42, 500, 110, 42, "caja", c.yellow);
drawBox(180, 500, 145, 42, "movimiento_dinero", c.yellow);
drawBox(355, 500, 160, 42, "movimiento_aplicacion", c.yellow);
line(152, 521, 180, 521); line(325, 521, 355, 521); line(435, 500, 270, 315);

drawBox(42, 610, 130, 42, "comprobante", c.purple);
drawBox(210, 610, 145, 42, "comprobante_item", c.purple);
line(172, 631, 210, 631); line(282, 610, 270, 315);

drawBox(380, 170, 110, 42, "ruta", c.green);
drawBox(380, 235, 120, 42, "ruta_parada", c.green);
drawBox(380, 395, 120, 42, "ruta_tarea", c.green);
drawBox(380, 610, 130, 42, "ruta_rendicion", c.green);
line(435, 212, 440, 235); line(440, 277, 440, 395); line(440, 437, 445, 610); line(380, 416, 330, 392); line(380, 416, 330, 292);

drawBox(42, 705, 110, 42, "garantia", c.gray);
drawBox(180, 705, 125, 42, "garantia_evento", c.gray);
drawBox(340, 705, 145, 42, "auditoria_evento", c.gray);
line(152, 726, 180, 726); line(97, 705, 440, 372);

doc.addPage();
y = page.margin;
title("Archivos generados");
bullets([
  "docs/ESTADOS.md",
  "docs/BASE-DATOS.md",
  "docs/diagramas/base-datos-v2.mmd",
  "docs/diagramas/base-datos-v2.svg",
  "docs/PGL-Pulse-v2-boceto-estados-base.pdf"
]);
h2("Proximos pasos");
bullets([
  "Revisar si los estados son suficientes para los casos reales.",
  "Confirmar si los IDs seran uuid o bigint.",
  "Definir permisos por rol para cada accion.",
  "Convertir este boceto en migraciones Supabase v2 cuando el modelo este aprobado."
]);

fs.mkdirSync(path.dirname(out), { recursive: true });
doc.save(out);
console.log("PDF generado:", out);
