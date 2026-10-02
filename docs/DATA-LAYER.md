# Capa de datos local - Sprint 2

Estado: implementacion tecnica inicial
Fecha: 2026-10-01

Sprint 2 conecta el frontend con el modelo v2 sin reescribir la estetica. La app sigue mostrando el mockup visual, pero la pagina inicial ya consulta el estado real de la base local JSON.

## Archivos

- `lib/local-db/schema.ts`: tipos, enums y nombres oficiales de las 13 tablas v2.
- `lib/local-db/client.ts`: cliente local server-side para leer, escribir, insertar, actualizar, borrar y manejar secuencias.
- `lib/local-db/masters.ts`: operaciones de productos, clientes y proveedores agregadas en Sprint 3.
- `lib/local-db/purchases.ts`: operaciones de compras, items y rutas automaticas agregadas en Sprint 4.
- `lib/local-db/sales.ts`: operaciones de ventas, cobros, comprobantes y rutas de entrega agregadas en Sprint 5.
- `lib/local-db/stock.ts`: operaciones de unidades, IMEI, recepcion, entrega, finalizacion y garantia agregadas en Sprint 6.
- `lib/local-db/delivery.ts`: operaciones de rutas, retiros, pagos, entregas y cobros agregadas en Sprint 7.
- `lib/local-db/cash.ts`: operaciones de caja, deudas, rendiciones, diferencias y cierres agregadas en Sprint 8.
- `lib/local-db/index.ts`: punto de entrada de la capa local.
- `scripts/test-local-data-layer.mjs`: prueba tecnica de lectura/escritura contra un JSON temporal.
- `scripts/test.mjs`: ejecuta las pruebas de base local y capa local.

## API disponible

- `createLocalDbClient(options)`: crea un cliente apuntando a un archivo JSON.
- `ensureLocalDb()`: lee la base local o la crea desde la plantilla si falta.
- `listRows(tableName)`: lee filas de una tabla oficial.
- `getRowById(tableName, id)`: busca una fila por `id`.
- `insertRow(tableName, row)`: inserta una fila y genera `id` si no se envia.
- `updateRow(tableName, id, changes)`: actualiza una fila existente.
- `deleteRow(tableName, id)`: elimina una fila por `id`.
- `nextSequence(key)`: incrementa secuencias visibles como `ventas.numero`.
- `getLocalDbStatus()`: devuelve estado, path, cantidad de tablas y cantidad de filas.
- `createSale(values)`: crea venta, items, reservas, cobro inicial, ruta de envio y comprobante si corresponde.
- `registerSalePayment(saleId, payment)`: registra un cobro real y actualiza saldos de venta e item.
- `upsertReceipt(saleId)`: emite o reimprime el comprobante de la venta con snapshot historico.
- `receivePurchaseItem(values)`: crea una unidad desde un item de compra y actualiza compra/venta segun destino.
- `updateUnitIdentity(unitId, values)`: edita IMEI, serie, color o identificador mientras la unidad no este finalizada.
- `deliverUnit(unitId)`: marca entregada la venta asociada sin permitir entrega parcial.
- `finalizeUnit(unitId)`: bloquea una unidad entregada, pagada e identificada.
- `moveUnitToWarranty(unitId)`: mueve una unidad al circuito de garantia y deja historial.
- `createRoute(values)`: arma una ruta mixta con retiros a proveedor y entregas a cliente.
- `confirmRoutePickup(routeItemId, values)`: confirma retiro y crea/ubica la unidad segun destino.
- `confirmProviderPayment(routeItemId, values)`: registra pago real a proveedor en ruta.
- `confirmCustomerDelivery(routeItemId)`: confirma entrega a cliente sobre la unidad asociada.
- `confirmCustomerCollection(routeItemId, values)`: registra cobro real a cliente y actualiza saldo de venta.
- `registerCashSalePayment(saleId, values)`: registra cobro de cliente desde Caja y actualiza saldos.
- `registerSupplierPayment(values)`: registra pago a proveedor desde Caja, con pago parcial por compra o item.
- `registerCourierAdvance(values)`: registra entrega de dinero a repartidor.
- `registerRouteRendition(values)`: registra rendicion de ruta y diferencias por moneda.
- `registerCashAdjustment(values)`: registra ajuste manual de caja.
- `closeCash(values)`: crea cierre de caja con snapshot y agrupa movimientos por `cierre_codigo`.

## Aislamiento del modelo viejo

La ruta activa `app/page.tsx` usa `lib/local-db` y no consulta Supabase. Los archivos heredados en `lib/supabase/*` quedan como stubs deshabilitados para que las pantallas viejas no ejecuten operaciones reales mientras se adaptan en sprints posteriores.

## Pruebas

```powershell
npm run typecheck
npm test
npm run build
```

`npm test` compila la capa local en `tests/artifacts/compiled-local-db`, crea un JSON temporal, inserta fixtures tecnicos en todas las tablas, lee cada tabla por lista e id, actualiza una venta y valida el resultado contra `docs/base-datos-v2.json`.

## Restricciones

- No se cargan datos reales.
- No se migran datos de v1/beta.
- El cliente local usa `fs`, por lo tanto debe usarse del lado server o desde scripts Node.
