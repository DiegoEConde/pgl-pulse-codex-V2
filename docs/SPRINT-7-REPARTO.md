# Sprint 7 - Reparto, rutas y tareas operativas

Estado: implementacion local
Fecha: 2026-10-01

Sprint 7 convierte la pestana Reparto en una pantalla funcional para coordinar rutas, repartidores, retiros a proveedores, pagos, entregas a clientes, cobros y rutas abiertas.

## Alcance

- Listado y detalle de `rutas`.
- Vista general y vista filtrada por repartidor.
- Creacion manual de rutas mixtas desde `compra_items` y `venta_items` pendientes.
- Inicio de ruta.
- Confirmacion de retiro a proveedor.
- Recepcion con destino oficina, repartidor o entrega directa.
- Pago a proveedor como `movimientos_dinero`.
- Confirmacion de entrega a cliente.
- Cobro a cliente reutilizando la regla de ventas y generando movimiento real.
- Ruta abierta para continuar al dia siguiente.
- Estado de rendicion parcial preparatorio para Caja.
- Proveedor fiado sin tarea de pago al retirar.

## Implementacion

- `lib/local-db/delivery.ts`: reglas locales de rutas, tareas, retiro, pago, entrega, cobro y estados de ruta.
- `app/api/local-db/delivery/route.ts`: API local para operar reparto.
- `components/features/delivery/DeliveryV2Screen.tsx`: pantalla funcional de Reparto.
- `components/features/delivery/DeliveryV2Screen.module.css`: estilos alineados al mockup v2.
- `components/mockup/PulseMockup.tsx`: usa la pantalla funcional en la pestana Reparto.
- `scripts/test-delivery.mjs`: prueba integral del Sprint 7.

## Reglas aplicadas

- Una ruta pertenece a un repartidor.
- Una ruta puede mezclar retiros, pagos a proveedor, entregas y cobros a cliente.
- El retiro de proveedor actualiza stock mediante la regla de unidades.
- La entrega a cliente actualiza la unidad y el item de venta.
- El cobro a cliente se registra como movimiento real y actualiza saldo de venta/item.
- El pago a proveedor se registra como movimiento real vinculado a ruta y compra.
- Si el proveedor fia, no se genera tarea de pago.
- Si el repartidor conserva producto para otro dia, la ruta queda `ABIERTA_CON_PENDIENTES`.
- La rendicion parcial se marca en ruta, pero el cierre financiero queda para Caja.

## Pruebas

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

`npm test` incluye `scripts/test-delivery.mjs`, que prueba retiro a oficina, ruta mixta con retiro/pago/entrega/cobro, proveedor fiado y ruta abierta al dia siguiente.
