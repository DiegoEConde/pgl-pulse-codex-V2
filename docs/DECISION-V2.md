# Decision V2

Fecha: 2026-09-29  
Estado: propuesta inicial para revision

## Decision

PGL Pulse v2 se desarrollara como una nueva version del producto, con modelo de negocio y base de datos nuevos.

El sistema deja de estar centrado en la unidad fisica y pasa a estar centrado en compras, ventas, stock, reparto, caja real, comprobantes y rendiciones.

La organizacion inicial de pantallas aprobada es:

- Inicio;
- Compras;
- Ventas;
- Stock;
- Reparto;
- Caja;
- Datos;
- Reportes.

Pagos, cobros, entregas de dinero a repartidores, rendiciones, diferencias y cierres se gestionan dentro de Caja. Comprobantes se generan y consultan desde el detalle de una venta. Repartidores se administran como usuarios en Datos y se operan dentro de Reparto cuando tienen una ruta asignada.

La unidad fisica sigue existiendo cuando sea necesaria para controlar IMEI, serie, color, estado fisico o trazabilidad, pero ya no sera la entidad principal sobre la que se fuerzan ventas, cobros y entregas.

## Motivo

El negocio cambio de alcance. La version actual sirve para gestionar unidades, pedidos, stock y ventas simples, pero no representa correctamente:

- ventas con varios productos;
- ventas de productos que aun no estan en stock;
- retiro en proveedor y entrega directa al cliente;
- repartidores con dinero entregado;
- rutas mixtas de proveedores y clientes;
- comprobantes numerados;
- pagos parciales o pendientes;
- caja real en dolares y pesos;
- rendiciones con diferencias.

Agregar campos al modelo actual produciria reglas confusas, porque hoy muchas operaciones se apoyan en la tabla `unidad`. En v2, la venta y la ruta deben existir como entidades propias.

## Consecuencias

- Se recomienda crear un repositorio nuevo: `pgl-pulse-v2`.
- Por ahora no se usara Supabase. La base v2 se desarrollara localmente en JSON.
- El codigo actual puede reutilizarse como base visual y tecnica, pero no como contrato de datos definitivo.
- Los datos actuales de v1/beta son datos de prueba usados por testers. No deben migrarse como datos reales.
- V2 debe iniciar con datos reales cargados de forma intencional o con catalogos aprobados explicitamente por el usuario.
- Las ventas, compras, pagos, repartos y stock historicos de v1/beta no se migran automaticamente.
- Las nuevas reglas de negocio deben documentarse antes de crear migraciones.
- Cualquier migracion a nube o base remota requiere una decision posterior explicita.

## Principios

- La fuente de verdad de una venta es `venta`, no `unidad`.
- La fuente de verdad de los cobros y pagos es el movimiento de dinero, no un booleano.
- La fuente de verdad de una ruta es la ruta asignada a un repartidor, no el estado de una unidad.
- La fuente de verdad de caja es `movimientos_dinero`, incluyendo cobros, pagos, rendiciones, diferencias y cierres.
- El IMEI debe poder cargarse al recibir, al vender o despues de vender. Se bloquea solo cuando el producto queda entregado, pagado, con IMEI cargado y el usuario confirma la finalizacion.

## Fuera de alcance por ahora

- Crear la base definitiva.
- Migrar datos reales.
- Reescribir pantallas.
- Publicar v2.

Primero se debe aprobar el modelo de negocio.
