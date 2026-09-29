import type { Snapshot, PurchaseOrder, PurchaseStatus, Sale, StockUnit } from "@/types/operations";
import { decodePurchaseDetails, variantLabel } from "./purchase-details";
import { operationalDate } from "./dates";

// Une los IDs del snapshot con los catálogos, sin modificar los datos recibidos.
export function deriveOperations(data: Snapshot) {
  const products = new Map(data.products.map(row => [row.id, row]));
  const suppliers = new Map(data.suppliers.map(row => [row.id, row]));
  const clients = new Map(data.clients.map(row => [row.id, row]));
  const sellers = new Map(data.sellers.map(row => [row.id, row]));
  const ordersById = new Map(data.orders.map(row => [row.id, row]));
  const orders: PurchaseOrder[] = data.orders.map(order => {
    const details = decodePurchaseDetails(order.observaciones);
    const lines = data.lines.filter(line => line.pedido_id === order.id).map(line => ({ ...line, variant: variantLabel(line.atributos), ram: line.atributos?.ram ?? details.lines.find(spec => spec.producto_id === line.producto_id && spec.color === line.color)?.ram ?? "", rom: line.atributos?.rom ?? details.lines.find(spec => spec.producto_id === line.producto_id && spec.color === line.color)?.rom ?? "", product: products.get(line.producto_id)?.nombre ?? "Producto no disponible" }));
    return { id: order.id, supplier: suppliers.get(order.proveedor_id)?.nombre ?? "—",
      date: order.fecha_pedido ? operationalDate(order.fecha_pedido) : "", expectedDate: order.fecha_estimada ?? "",
      units: lines.reduce((total, line) => total + line.cantidad, 0),
      receivedUnits: data.units.filter(unit => unit.pedido_id === order.id).length,
      status: order.estado as PurchaseStatus, products: lines.map(line => line.product),
      merchandiseUsd: lines.reduce((total, line) => total + line.cantidad * line.precio_costo_usd, 0),
      shippingUsd: order.costo_envio_usd, notes: details.notes || undefined, closed: Boolean(order.cerrado_en), lines };
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const stock: StockUnit[] = data.units.map(unit => {
    const product = products.get(unit.producto_id);
    const order = ordersById.get(unit.pedido_id);
    const purchaseLine = orders.find(item => item.id === unit.pedido_id)?.lines.find(line => line.id === unit.detalle_pedido_id);
    const rawLine = data.lines.find(line => line.id === unit.detalle_pedido_id);
    const orderedVariant = purchaseLine ? [purchaseLine.rom, purchaseLine.variant].filter(Boolean).join(" · ") : "";
    const attributes = { ...(rawLine?.atributos ?? {}) };
    if (purchaseLine?.ram) attributes.ram = purchaseLine.ram;
    if (purchaseLine?.rom) attributes.rom = purchaseLine.rom;
    return { id: "U-" + unit.id, databaseId: unit.id, product: product?.nombre ?? "—", brand: product?.marca ?? "—",
      category: product?.categoria ?? "—", variant: unit.variante ?? orderedVariant, ram: unit.ram ?? purchaseLine?.ram ?? "", color: unit.color,
      code: unit.codigo ?? "", purchaseOrder: unit.pedido_id, supplier: suppliers.get(order?.proveedor_id ?? 0)?.nombre ?? "—",
      receivedAt: operationalDate(unit.fecha_ingreso_stock), costUsd: unit.precio_costo_usd + unit.costo_envio_usd,
      salePriceUsd: unit.precio_sugerido_usd, state: unit.estado, attributes };
  });
  const sales: Sale[] = data.units.filter(unit => unit.fecha_venta && (unit.estado === "REPARTO" || unit.estado === "ENTREGADA")).map(unit => {
    const payments = (data.salePayments ?? []).filter(payment => payment.unidad_id === unit.id);
    // Alpha solo conoce un booleano: se conserva el saldo sin inventar movimientos.
    const openingPaidUsd = unit.cobrado_inicial_usd ?? (unit.pago_verificado ? unit.precio_venta_usd ?? 0 : 0);
    const paidCents = Math.round(openingPaidUsd*100) + payments.reduce((sum,payment) => sum+Math.round(payment.importe_usd*100),0);
    return {
    id: unit.id, unitId: "U-" + unit.id, product: products.get(unit.producto_id)?.nombre ?? "—", code: unit.codigo ?? "",
    client: clients.get(unit.cliente_id ?? 0)?.nombre ?? "—", clientId: unit.cliente_id ?? 0,
    seller: sellers.get(unit.vendedor_id ?? 0)?.nombre ?? "—", date: operationalDate(unit.fecha_venta!),
    priceUsd: unit.precio_venta_usd ?? 0, costUsd: unit.precio_costo_usd + unit.costo_envio_usd,
    commissionUsd: unit.comision_usd ?? 0, paid: unit.pago_verificado,
    openingPaidUsd, payments, paidUsd: paidCents/100,
    pendingUsd: (Math.round((unit.precio_venta_usd ?? 0)*100)-paidCents)/100,
    status: unit.estado as Sale["status"], deliveredAt: unit.fecha_entrega,
  }; }).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  return { orders, stock, sales };
}
