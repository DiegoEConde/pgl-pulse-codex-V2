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
const out = path.resolve("docs", "PGL-Pulse-v2-mockup-pestanas.pdf");
const doc = new jsPDF({ unit: "pt", format: "a4" });
const page = { w: 595.28, h: 841.89, margin: 42 };
let y = page.margin;

function addPageIfNeeded(height = 40) {
  if (y + height > page.h - page.margin) {
    doc.addPage();
    y = page.margin;
  }
}

function text(value, size = 10, style = "normal", color = [30, 41, 59], indent = 0) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const width = page.w - page.margin * 2 - indent;
  const lines = doc.splitTextToSize(value, width);
  addPageIfNeeded(lines.length * (size + 4) + 2);
  doc.text(lines, page.margin + indent, y);
  y += lines.length * (size + 4) + 2;
}

function title(value) {
  addPageIfNeeded(56);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(value, page.margin, y);
  y += 30;
}

function h2(value) {
  addPageIfNeeded(42);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(value, page.margin, y);
  y += 20;
}

function h3(value) {
  addPageIfNeeded(34);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(value, page.margin, y);
  y += 17;
}

function bullets(items, indent = 10) {
  for (const item of items) text("- " + item, 9.5, "normal", [51, 65, 85], indent);
  y += 4;
}

function field(label, value) {
  text(label + ": " + value, 9.5, "normal", [51, 65, 85], 10);
}

function divider() {
  addPageIfNeeded(20);
  doc.setDrawColor(203, 213, 225);
  doc.line(page.margin, y, page.w - page.margin, y);
  y += 16;
}

const commonElements = [
  "Logo PGL Pulse: vuelve a Inicio. En el mockup conserva la identidad visual heredada de v1.",
  "Barra de pestañas: es el unico comportamiento real del mockup. Permite cambiar entre las superficies de v2.",
  "Estado 'Boceto v2 / Visual estatico': avisa que no hay backend, operaciones ni datos reales conectados.",
  "Chip de accion de cada pantalla: representa el boton principal futuro. Hoy no ejecuta acciones.",
  "Tarjetas metricas superiores: resumen rapido de los indicadores clave de la pestaña.",
  "Panel de flujo o estados: muestra en que parte del circuito operativo se encuentra cada cosa.",
  "Tarjetas de resumen: agrupan alertas, subtotales o datos secundarios que ayudan a decidir.",
  "Tabla principal: simula el listado operativo que luego tendra busqueda, filtros, detalle y acciones.",
  "Panel lateral: muestra una vista de detalle o contexto sin salir de la pestaña."
];

const tabs = [
  {
    name: "Inicio",
    exists: "Existe para que administracion vea el pulso general sin entrar modulo por modulo.",
    purpose: "Resume caja, ventas abiertas, rutas activas, alertas y agenda operativa.",
    elements: {
      action: "Vista diaria: selector futuro de fecha o periodo operativo.",
      metrics: ["Caja USD", "Caja ARS", "Ventas abiertas", "Rutas activas"],
      flow: ["Ventas confirmadas", "Compras pedidas", "En poder repartidor", "Listo para cerrar"],
      cards: ["Clientes con deuda", "Proveedor fiado", "IMEI pendiente"],
      table: "Agenda operativa del dia: compras, ventas, caja y rendiciones pendientes.",
      side: "Pulso financiero: ingresos, egresos y diferencias visibles en un solo bloque."
    }
  },
  {
    name: "Compras",
    exists: "Existe antes que ventas porque es el flujo natural del negocio: primero se pide, retira o recibe mercaderia.",
    purpose: "Controla compras pedidas, retiros, deuda a proveedor y recepcion parcial o total.",
    elements: {
      action: "Nueva compra: futuro alta de compra con proveedor e items individuales.",
      metrics: ["Items pedidos", "Items a retirar", "Fiado proveedor", "Items recibidos"],
      flow: ["Borrador", "Pedida", "En retiro", "Recibida parcial"],
      cards: ["Origen oficina", "Origen venta especifica", "Entrega directa"],
      table: "Pedidos a proveedor con destino, pago y estado.",
      side: "Detalle de una compra y sus items individuales."
    }
  },
  {
    name: "Ventas",
    exists: "Existe porque en v2 la venta es la entidad comercial principal, no la unidad fisica.",
    purpose: "Permite ver ventas con multiples productos, pagos parciales, entrega separada y comprobante propio.",
    elements: {
      action: "Nueva venta: futuro formulario de venta con cliente, items, pago inicial y comprobante.",
      metrics: ["Total vendido", "Saldo pendiente", "Ventas sin stock", "Ventas finalizables"],
      flow: ["Borrador", "Confirmada", "Entregada con deuda", "Finalizada"],
      cards: ["Items por venta", "Comprobante desde detalle", "Comision congelada"],
      table: "Listado de ventas recientes con cliente, items, estado de pago y entrega.",
      side: "Preview de una venta: total, cobrado y saldo pendiente. El comprobante se emite desde el modal/detalle de la venta."
    }
  },
  {
    name: "Stock",
    exists: "Existe porque todos los productos se manejan por unidad y deben tener trazabilidad fisica.",
    purpose: "Muestra disponibilidad, reserva, ubicacion, IMEI, garantia y bloqueo final.",
    elements: {
      action: "Ajustar stock: futuro acceso a correcciones autorizadas y auditoria.",
      metrics: ["Disponibles", "Reservadas", "Con repartidor", "En garantia"],
      flow: ["Proveedor", "Repartidor", "Oficina", "Cliente"],
      cards: ["IMEI cargado", "Pendiente IMEI", "Listas para bloquear"],
      table: "Unidades visibles con producto, ubicacion, IMEI y estado.",
      side: "Trazabilidad de unidad: compra, venta y ruta relacionadas."
    }
  },
  {
    name: "Reparto",
    exists: "Existe como una sola seccion operativa para rutas, paradas y asignacion de repartidores.",
    purpose: "Organiza retiros, entregas, pagos y cobros esperados sin separar repartidores como modulo propio.",
    elements: {
      action: "Nueva ruta: futuro armado de ruta con repartidor, orden de paradas y dinero entregado.",
      metrics: ["Rutas programadas", "Rutas en curso", "Cobro esperado", "Pago esperado"],
      flow: ["Proveedor", "Cliente", "Proveedor", "Oficina/rendicion"],
      cards: ["Dinero entregado", "Productos a retirar", "Repartidor asignado"],
      table: "Rutas del dia con repartidor, paradas, dinero y estado.",
      side: "Parada actual con direccion, producto y saldo a cobrar. Los datos del repartidor se administran en Datos."
    }
  },
  {
    name: "Caja",
    exists: "Existe como seccion unificada para todo lo financiero: cobros, pagos, entregas a repartidores, rendiciones, diferencias y cierres.",
    purpose: "Muestra saldos, movimientos reales, rendiciones, ajustes y cierres desde una sola cabeza mental.",
    elements: {
      action: "Nuevo movimiento: futuro alta de cobro, pago, entrega a repartidor, rendicion, ajuste o cierre.",
      metrics: ["Caja USD", "Caja ARS", "A rendir", "Diferencias"],
      flow: ["Cobros", "Pagos", "Rendiciones", "Cierres"],
      cards: ["Entrega a repartidor", "Diferencia de rendicion", "Cierre diario"],
      table: "Movimientos de caja con cobros, pagos y rendiciones en el mismo libro.",
      side: "Detalle de una rendicion: esperado, devuelto y diferencia."
    }
  },
  {
    name: "Datos",
    exists: "Existe para administrar entidades maestras sin mezclar reglas operativas.",
    purpose: "Centraliza clientes, proveedores, productos y usuarios con roles.",
    elements: {
      action: "Nuevo registro: futuro formulario segun catalogo activo.",
      metrics: ["Clientes", "Proveedores", "Productos", "Usuarios"],
      flow: ["Administrador", "Vendedor", "Repartidor", "Inactivos"],
      cards: ["Productos activos", "Clientes con direccion", "Proveedores con horario"],
      table: "Cambios recientes o registros maestros destacados.",
      side: "Auditoria sensible: cambios de IMEI, ventas y caja."
    }
  },
  {
    name: "Reportes",
    exists: "Existe para administracion y analisis, separado de la operacion diaria.",
    purpose: "Resume ventas, costos, ganancias, reparto, comisiones, saldos y diferencias.",
    elements: {
      action: "Exportar: futuro PDF/Excel o vista imprimible.",
      metrics: ["Ganancia bruta", "Costo reparto", "Comisiones", "Diferencias"],
      flow: ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
      cards: ["Productos vendidos", "Saldos clientes", "Saldos proveedores"],
      table: "Ranking del periodo por producto, costo, ganancia y margen.",
      side: "Margen visual del periodo con ventas, costos y resultado."
    }
  }
];

title("PGL Pulse v2 - Documento del mockup visual");
text("Este documento explica que hace cada pestaña del mockup, por que existe dentro del modelo v2 y cual es la funcion prevista de cada elemento visual. El mockup es deliberadamente estatico: los datos son ficticios y solo funciona la navegacion entre pestañas.", 11);

h2("Elementos comunes");
bullets(commonElements);

h2("Lectura recomendada");
bullets([
  "La pestaña define el area de trabajo.",
  "Las metricas muestran lectura rapida, no datos definitivos.",
  "El panel de flujo muestra estados o pasos esperados.",
  "Las tablas representan listados futuros con filtros, detalle y acciones.",
  "Los paneles laterales sirven para ver contexto sin perder la pantalla principal."
]);

for (const tab of tabs) {
  divider();
  h2(tab.name);
  field("Por que existe", tab.exists);
  field("Que hace", tab.purpose);
  h3("Elementos de la pantalla");
  field("Accion principal", tab.elements.action);
  field("Metricas superiores", tab.elements.metrics.join("; "));
  field("Panel de flujo/estados", tab.elements.flow.join("; "));
  field("Tarjetas de resumen", tab.elements.cards.join("; "));
  field("Tabla principal", tab.elements.table);
  field("Panel lateral", tab.elements.side);
}

divider();
h2("Notas de alcance");
bullets([
  "Este PDF describe el mockup actual, no una implementacion final.",
  "Todo puede cambiar antes de los sprints funcionales.",
  "Antes de programar reglas reales, cada decision debe seguir validandose contra la documentacion oficial de docs/.",
  "La prioridad visual fue conservar el estilo de PGL Pulse v1 y reordenarlo alrededor del negocio v2."
]);

fs.mkdirSync(path.dirname(out), { recursive: true });
doc.save(out);
console.log("PDF generado:", out);
