# Sprint 5 - Ventas, detalle y comprobantes

Estado: implementacion local
Fecha: 2026-10-01

Sprint 5 convierte la pestana Ventas en una pantalla funcional sobre el modelo v2. La venta pasa a operar como entidad comercial principal, con items propios, saldo pendiente, movimientos reales de cobro y comprobante guardado en la venta.

## Alcance

- Alta de venta en `ventas`.
- Multiples productos por venta en `venta_items`.
- Venta desde unidad disponible de stock.
- Venta sin stock solo si existe un `compra_item` disponible y vinculado.
- Pago inicial total, parcial o cero.
- Pago parcial asignable a un item puntual.
- Registro de cobros como `movimientos_dinero`.
- Entrega local o envio por repartidor.
- Creacion automatica de ruta de entrega/cobro cuando hay envio.
- Emision y reimpresion de comprobante desde el detalle de venta.
- Descarga PDF y envio por WhatsApp desde el detalle visual de la venta.

## Implementacion

- `lib/local-db/sales.ts`: reglas locales de ventas, items, pagos, comprobantes y rutas de entrega.
- `app/api/local-db/sales/route.ts`: API local para listar ventas, crear ventas, registrar cobros y emitir/reimprimir comprobantes.
- `components/features/sales/SalesV2Screen.tsx`: pantalla funcional de Ventas.
- `components/features/sales/SalesV2Screen.module.css`: estilos alineados al mockup v2.
- `components/mockup/PulseMockup.tsx`: usa la pantalla funcional en la pestana Ventas.
- `scripts/test-sales.mjs`: prueba integral del Sprint 5.

## Reglas aplicadas

- Cada venta tiene uno o mas `venta_items`.
- Una venta sin stock no se crea sin `compra_item` asociado.
- Una unidad vendida desde stock queda reservada para esa venta.
- El pago total no implica entrega.
- La entrega no implica pago.
- Todo cobro genera un movimiento en `movimientos_dinero`.
- El saldo de la venta y el saldo del item se actualizan juntos.
- El comprobante vive en `ventas` como numero, estado y snapshot.
- Al completar el pago, el mismo comprobante se reimprime como `PAGADO`.

## Pruebas

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

`npm test` incluye `scripts/test-sales.mjs`, que prueba venta simple desde stock, venta multiple con pago parcial por item, venta sin stock vinculada a compra, movimiento de dinero y reimpresion del mismo comprobante con estado pagado.
