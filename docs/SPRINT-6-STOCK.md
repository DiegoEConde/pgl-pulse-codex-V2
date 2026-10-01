# Sprint 6 - Stock, unidades, IMEI y estados

Estado: implementacion local
Fecha: 2026-10-01

Sprint 6 convierte la pestana Stock en una pantalla funcional para controlar unidades reales, IMEI/serie, ubicacion fisica, entrega, finalizacion y garantia sin volver a centrar toda la app en `unidad`.

## Alcance

- Recepcion de `compra_items` como `unidades`.
- Unidad disponible para stock de oficina.
- Unidad reservada cuando la compra abastece una venta.
- Entrega directa proveedor -> cliente sin simular ingreso a oficina.
- Edicion de IMEI, serie, color e identificador alternativo.
- Edicion de IMEI antes y despues de entregar.
- Entrega de unidad asociada a venta.
- Finalizacion solo si esta entregada, pagada y con identificador.
- Bloqueo de edicion despues de finalizar.
- Garantia como estado de `unidades`.
- Historial en `historial_eventos` para recepcion, IMEI, entrega, finalizacion y garantia.

## Implementacion

- `lib/local-db/stock.ts`: reglas locales de unidades, recepcion, identidad, entrega, finalizacion y garantia.
- `app/api/local-db/stock/route.ts`: API local para acciones de stock.
- `components/features/stock/StockV2Screen.tsx`: pantalla funcional de Stock.
- `components/features/stock/StockV2Screen.module.css`: estilos alineados al mockup v2.
- `components/mockup/PulseMockup.tsx`: usa la pantalla funcional en la pestana Stock.
- `scripts/test-stock.mjs`: prueba integral del Sprint 6.

## Reglas aplicadas

- Todos los productos se manejan por unidad.
- El IMEI puede cargarse al recibir, al vender, despues de entregar o despues de cobrar.
- Una unidad finalizada no permite editar IMEI, serie ni identificadores.
- Una compra para stock crea una unidad `EN_OFICINA_DISPONIBLE`.
- Una compra vinculada a venta crea una unidad `EN_OFICINA_RESERVADA`.
- La entrega directa crea una unidad `ENTREGADA` ubicada en cliente.
- La finalizacion marca `unidades`, `venta_items` y, si corresponde, `ventas`.
- Garantia es un estado de `unidades` y no una tabla separada inicial.

## Pruebas

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

`npm test` incluye `scripts/test-stock.mjs`, que prueba recepcion en oficina, reserva de venta sin stock, entrega directa, carga de IMEI despues de entregar, finalizacion con bloqueo de edicion y cambio a garantia con historial.
