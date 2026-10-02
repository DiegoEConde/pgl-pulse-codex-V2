# Sprint 8 - Caja, rendiciones y cierres

Estado: implementacion local
Fecha: 2026-10-01

Sprint 8 convierte la pestana Caja en una pantalla funcional sobre `movimientos_dinero`, sin crear tablas nuevas y manteniendo una caja general en USD y ARS.

## Alcance

- Libro de movimientos de caja.
- Saldos por moneda USD y ARS.
- Cobros de clientes desde Caja.
- Cobros parciales aplicados a `venta_item`.
- Pagos a proveedores desde Caja.
- Pagos parciales aplicados a `compra_item`.
- Entrega de dinero a repartidores.
- Rendicion de rutas por moneda.
- Diferencias de rendicion por faltante o sobrante.
- Ajustes manuales de caja.
- Cierre de caja con snapshot y `cierre_codigo`.
- Consulta visual de deudas de clientes, deudas con proveedores y rutas a rendir.

## Implementacion

- `lib/local-db/cash.ts`: reglas locales de caja, saldos, deudas, entregas, rendiciones, diferencias, ajustes y cierres.
- `app/api/local-db/cash/route.ts`: API local para operar Caja.
- `components/features/cash/CashV2Screen.tsx`: pantalla funcional de Caja.
- `components/features/cash/CashV2Screen.module.css`: estilos alineados al mockup v2.
- `components/mockup/PulseMockup.tsx`: usa la pantalla funcional en la pestana Caja.
- `scripts/test-cash.mjs`: prueba integral del Sprint 8.

## Reglas aplicadas

- Caja usa `movimientos_dinero` como fuente de verdad.
- No existe tabla `caja` en este sprint.
- Cada movimiento registra moneda, medio de pago, signo y referencia operativa cuando corresponde.
- Los cobros de clientes actualizan saldo de venta e item si aplica.
- Los pagos a proveedores quedan vinculados a compra y opcionalmente a item.
- La entrega a repartidor se registra como `ENTREGA_REPARTIDOR`.
- La rendicion calcula por moneda:

```text
dinero_esperado = dinero_entregado_al_repartidor
                 - pagos_realizados_a_proveedores
                 + cobros_recibidos_de_clientes
```

- Si el dinero devuelto difiere del esperado, se registra `DIFERENCIA_RENDICION`.
- El cierre de caja agrega `cierre_codigo` a movimientos abiertos y crea un movimiento `CIERRE_CAJA` con snapshot.

## Pruebas

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

`npm test` incluye `scripts/test-cash.mjs`, que prueba cobro total, cobro parcial por item, pago parcial a proveedor, rendiciones con faltante/sobrante, saldos USD/ARS y cierre de caja.
