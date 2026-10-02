# Sprint 9 - Alertas, reportes y permisos locales

Estado: implementacion local
Fecha: 2026-10-01

Sprint 9 agrega control operativo y metricas administrativas sin cambiar el contrato de base. Las alertas y reportes se calculan desde las tablas v2 existentes.

## Alcance

- Centro de alertas en Inicio.
- Reportes administrativos en Reportes.
- Permisos locales por rol: administrador, vendedor y repartidor.
- Restriccion de metricas para vendedor.
- Restriccion de navegacion para repartidor.
- Alertas para ventas sin stock, ventas con deuda, entregas pendientes, rutas abiertas, IMEI pendiente y diferencias de caja.
- Metricas de ventas, compras, costos, ganancia cerrada, comisiones, reparto y comparativas por periodo.

## Implementacion

- `lib/permissions.ts`: reglas locales de acceso por rol.
- `lib/local-db/insights.ts`: calculo de alertas, reportes y scope por rol.
- `app/api/local-db/insights/route.ts`: API local de lectura para Inicio y Reportes.
- `components/features/insights/HomeV2Screen.tsx`: Inicio funcional con centro de alertas.
- `components/features/insights/ReportsV2Screen.tsx`: Reportes funcionales para administrador.
- `components/features/insights/InsightsV2.module.css`: estilos compartidos.
- `components/mockup/PulseMockup.tsx`: selector local de usuario/rol y navegacion filtrada.
- `scripts/test-insights.mjs`: prueba integral del Sprint 9.

## Reglas aplicadas

- Administrador ve todas las pantallas, metricas y reportes.
- Vendedor opera pantallas comerciales, pero no ve metricas ni reportes reservados.
- Repartidor solo ve Reparto y, si hay usuario seleccionado, solo sus rutas/alertas operativas.
- Una venta sin stock genera alerta hasta que el item tenga unidad asignada.
- Una venta con saldo pendiente genera alerta hasta registrar el cobro.
- Una entrega pendiente genera alerta hasta confirmar entrega.
- Una ruta abierta genera alerta hasta rendirse.
- Una unidad sin IMEI, serie o identificador genera alerta hasta completar identificacion.
- Una diferencia de rendicion genera alerta mientras el movimiento siga activo.
- La ganancia cerrada solo cuenta ventas `FINALIZADA`.

## Pruebas

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

`npm test` incluye `scripts/test-insights.mjs`, que prueba permisos por rol, alertas que aparecen/desaparecen segun estado real y reportes que no cuentan ventas sin finalizar como ganancia cerrada.
