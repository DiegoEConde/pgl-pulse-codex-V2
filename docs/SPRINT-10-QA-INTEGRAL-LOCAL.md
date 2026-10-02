# Sprint 10 - QA integral local

Estado: implementado en local
Fecha: 2026-10-02

## Objetivo

Probar PGL Pulse v2 de punta a punta con datos ficticios controlados antes de considerar cualquier publicacion o base remota.

Este sprint no carga datos reales, no usa Supabase y no cambia la politica de publicacion. Todo corre sobre una base JSON temporal en `tests/artifacts/sprint10-qa.local.json`.

## Entregables

- `scripts/test-qa-integral.mjs`: prueba end-to-end local con datos ficticios.
- `tests/artifacts/sprint10-qa.local.json`: base temporal generada al ejecutar la prueba.
- `tests/artifacts/sprint10-qa-summary.json`: resumen de flujos y conteos por tabla.
- `cancelSaleItem(itemId)`: correccion de capa local para cancelar un item vendido antes de entrega y sin pagos aplicados.
- Accion API `cancel-item` en `app/api/local-db/sales/route.ts`.

## Flujos cubiertos

1. Pedido proveedor -> retiro -> oficina -> venta -> entrega -> cobro.
2. Pedido proveedor -> retiro -> entrega directa -> cobro.
3. Pago parcial y deuda abierta.
4. Entrega con deuda.
5. Ruta abierta al dia siguiente.
6. Cancelacion de item pedido y de item vendido.
7. Garantia.
8. Cierre de caja con diferencia de rendicion.

La prueba tambien valida que alertas, reportes y permisos sigan coherentes despues de mezclar flujos reales: deuda de cliente, ruta abierta, diferencia de caja, venta finalizada y acceso a reportes solo para administrador.

## Regla corregida

La documentacion oficial ya contemplaba que una venta puede cancelarse antes de entregar y que un item vendido puede cancelarse sin cancelar toda la venta.

Hasta este sprint existia cancelacion de `compra_items`, pero no una operacion equivalente para `venta_items`. Se agrego una cancelacion conservadora:

- solo antes de entrega, finalizacion o garantia;
- solo si el item no tiene pagos aplicados;
- rechaza ventas con pagos sin item especifico para evitar repartir dinero de forma ambigua;
- libera la unidad reservada a stock de oficina;
- desvincula el `compra_item` asociado si existia;
- cancela tareas de ruta abiertas relacionadas;
- recalcula total y saldo de la venta;
- marca el comprobante como `EDITADO` o `ANULADO` si la venta queda sin items;
- deja historial `ITEM_CANCELADO`.

## Checklist pre-publicacion futura

- La base local valida contra `docs/base-datos-v2.json`.
- No se crean tablas fuera del contrato oficial.
- Los movimientos financieros salen de operaciones reales, no de estados visuales.
- Caja conserva diferencias de rendicion y cierre con snapshot.
- Reportes solo cuentan ganancia cerrada de ventas finalizadas.
- Vendedor no recibe reportes administrativos.
- Reparto puede dejar rutas abiertas para el dia siguiente.
- Garantia queda como estado propio, no como retorno automatico a stock.
- No se migran ni cargan datos reales.

## Pruebas

```powershell
node scripts/test-qa-integral.mjs
npm test
npm run typecheck
npm run lint
npm run build
```

Sprint 10 queda listo cuando estas pruebas pasan y el commit local queda pendiente de push hasta pedido explicito del usuario.
