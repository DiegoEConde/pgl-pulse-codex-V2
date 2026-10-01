# Sprint 4 - Compras y pedidos a proveedor

Estado: implementacion local
Fecha: 2026-10-01

Sprint 4 convierte la pestana Compras en una pantalla funcional para registrar pedidos a proveedores como origen de stock o abastecimiento de ventas sin stock.

## Alcance

- Alta de compra en `compras`.
- Multiples productos por compra en `compra_items`.
- Seleccion de proveedor.
- Indicacion de moneda, pago al retirar o proveedor fiado.
- Asignacion opcional de repartidor para retiro.
- Creacion automatica de `rutas` y `ruta_items` cuando hay repartidor.
- Vinculacion opcional de un item de compra a un `venta_item` pendiente de abastecimiento.
- Cancelacion individual de `compra_items` sin cancelar toda la compra si quedan items activos.

## Implementacion

- `lib/local-db/purchases.ts`: reglas locales de compras, items y rutas automaticas.
- `app/api/local-db/purchases/route.ts`: API local para crear compras y cancelar items.
- `components/features/purchases/PurchasesV2Screen.tsx`: pantalla funcional de Compras.
- `components/features/purchases/PurchasesV2Screen.module.css`: estilos alineados al mockup v2.
- `components/mockup/PulseMockup.tsx`: usa la pantalla funcional solo en la pestana Compras.

## Reglas aplicadas

- Una compra pertenece a un proveedor.
- Cada producto pedido vive como `compra_item`.
- Si se asigna repartidor, la compra queda `EN_RETIRO` y los items quedan `ASIGNADO_RUTA`.
- Si `paga_al_retirar` es true, se genera tarea de pago a proveedor en `ruta_items`.
- Si el proveedor queda fiado, se genera retiro sin tarea de pago al retirar.
- Si un item abastece una venta sin stock, se conserva la relacion en `compra_items.venta_item_id` y `venta_items.compra_item_id`.

## Pruebas

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

`npm test` incluye `scripts/test-purchases.mjs`, que prueba compra para stock, compra vinculada a venta sin stock, compra con repartidor asignado, proveedor fiado, ruta automatica y cancelacion individual de item sin cancelar toda la compra.
