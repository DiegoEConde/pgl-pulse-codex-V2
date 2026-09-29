import type { Snapshot } from "@/types/operations";
import { decodePurchaseDetails, memoryLabel, variantLabel } from "./purchase-details";

export function buildDeliveryGroups(raw: Snapshot) {
  const products = new Map(raw.products.map(product => [product.id, product]));
  const suppliers = new Map(raw.suppliers.map(supplier => [supplier.id, supplier]));
  const groups = new Map<number, {
    supplierId: number; name: string; address: string; phone: string;
    from: string; until: string;
    lines: { id: number; orderId: number; product: string; ram: string; rom: string; variant: string; color: string; quantity: number; cost: number; status: string }[];
  }>();
  // Un cierre histórico no acredita recepción: el pedido sigue pendiente hasta RECIBIDO.
  for (const order of raw.orders) {
    if (order.estado !== "BORRADOR") continue;
    const supplier = suppliers.get(order.proveedor_id);
    const specs = decodePurchaseDetails(order.observaciones).lines;
    const lines = raw.lines.filter(line => line.pedido_id === order.id).map(line => {
      const product = products.get(line.producto_id);
      const spec = specs.find(item => item.producto_id === line.producto_id && item.color === line.color);
      return { id: line.id, orderId: order.id, product: product ? [product.marca, product.nombre].filter(Boolean).join(" · ") : "Producto no disponible",
        ram: line.atributos?.ram ?? spec?.ram ?? "", rom: line.atributos?.rom ?? spec?.rom ?? "", variant: variantLabel(line.atributos), color: line.color, quantity: line.cantidad, cost: line.precio_costo_usd, status: order.estado };
    });
    if (!lines.length) continue;
    let group = groups.get(order.proveedor_id);
    if (!group) {
      group = { supplierId: order.proveedor_id, name: supplier?.nombre ?? "Proveedor no disponible",
        address: supplier?.direccion ?? "", phone: supplier?.telefono ?? "",
        from: supplier?.horario_desde?.slice(0, 5) ?? "", until: supplier?.horario_hasta?.slice(0, 5) ?? "", lines: [] };
      groups.set(order.proveedor_id, group);
    }
    group.lines.push(...lines);
  }
  return [...groups.values()].map(group => ({ ...group, lines: group.lines.sort((a,b) => a.orderId - b.orderId || a.id - b.id) }))
    .sort((a,b) => (a.from || "99:99").localeCompare(b.from || "99:99") || a.name.localeCompare(b.name, "es") || a.supplierId - b.supplierId);
}

export function buildPendingOrders(raw: Snapshot) {
  const products = new Map(raw.products.map(product => [product.id, product]));
  const suppliers = new Map(raw.suppliers.map(supplier => [supplier.id, supplier]));
  const payments = raw.supplierPayments ?? [];
  return raw.orders.filter(order => order.estado === "PEDIDO" || order.estado === "ENVÍO").map(order => {
    const specs = decodePurchaseDetails(order.observaciones).lines;
    const lines = raw.lines.filter(line => line.pedido_id === order.id).map(line => {
      const product = products.get(line.producto_id);
      const spec = specs.find(item => item.producto_id === line.producto_id && item.color === line.color);
      return { ...line, product: product ? [product.marca, product.nombre].filter(Boolean).join(" · ") : "Producto no disponible", ram: line.atributos?.ram ?? spec?.ram ?? "", rom: line.atributos?.rom ?? spec?.rom ?? "", variant: variantLabel(line.atributos) };
    });
    const total = lines.reduce((sum, line) => sum + line.cantidad * line.precio_costo_usd, 0) + order.costo_envio_usd;
    const paid = payments.filter(payment => payment.pedido_id === order.id).reduce((sum, payment) => sum + payment.importe_usd, 0);
    return { id: order.id, date: order.fecha_pedido ?? "", supplierId: order.proveedor_id, supplier: suppliers.get(order.proveedor_id)?.nombre ?? "Proveedor no disponible", lines, total, paid, debt: Math.max(0, total - paid) };
  }).sort((a, b) => a.id - b.id);
}

// Exporta el conjunto completo, aunque la tarjeta muestre solo una página de productos.
export function formatDeliveryMessage(groups: ReturnType<typeof buildDeliveryGroups>): string {
  const clean = (value: string) => value.replace(/[\r\n]+/g, " ").replace(/\*/g, "").trim();
  const money = (cents: number) => (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  const time = (value: string) => value.endsWith(":00") ? String(Number(value.slice(0, 2))) : value;
  return groups.map(group => {
    const hours = group.from && group.until ? `de ${time(group.from)} a ${time(group.until)}` : group.from ? `desde ${time(group.from)}` : group.until ? `hasta ${time(group.until)}` : "Horario sin definir";
    const lines = group.lines.map(line => {
      const name = clean(line.product.replace(/ · /g, " ")).toUpperCase();
      const memory = line.ram || line.rom ? ` ${memoryLabel(clean(line.ram), clean(line.rom), true)}` : "";
      return `(${line.quantity}) ${name}${memory}${line.variant ? " " + clean(line.variant) : ""} - $ ${money(Math.round(line.cost * 100))}\n${clean(line.color).toUpperCase()}`;
    });
    const total = group.lines.reduce((sum, line) => sum + Math.round(line.cost * 100) * line.quantity, 0);
    return `*${clean(group.name).toUpperCase()} - ${clean(group.address) || "Dirección sin cargar"}*\n${hours}\n\n${lines.join("\n\n")}\n\n*(TOTAL: USD ${money(total)})*`;
  }).join("\n\n---\n\n");
}
