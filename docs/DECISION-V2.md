# Decision V2

Fecha: 2026-09-29  
Estado: propuesta inicial para revision

## Decision

PGL Pulse v2 se desarrollara como una nueva version del producto, con modelo de negocio y base de datos nuevos.

El sistema deja de estar centrado en la unidad fisica y pasa a estar centrado en ventas, compras, stock, rutas, pagos, caja real, comprobantes y rendiciones.

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
- Se recomienda crear una base Supabase nueva para v2.
- El codigo actual puede reutilizarse como base visual y tecnica, pero no como contrato de datos definitivo.
- Los datos de v1 no se migran automaticamente. Se evaluara que conservar: productos, categorias, clientes, proveedores, vendedores y stock inicial validado.
- Las ventas historicas de v1 solo se migraran si se define una regla explicita de conversion.
- Las nuevas reglas de negocio deben documentarse antes de crear migraciones.

## Principios

- La fuente de verdad de una venta es `venta`, no `unidad`.
- La fuente de verdad de los cobros es el movimiento de pago, no un booleano.
- La fuente de verdad de una ruta es la ruta asignada a un repartidor, no el estado de una unidad.
- La fuente de verdad de caja es el movimiento de caja/rendicion.
- El IMEI debe poder cargarse al recibir, al vender o despues de vender. Se bloquea solo cuando el producto queda entregado, pagado, con IMEI cargado y el usuario confirma la finalizacion.

## Fuera de alcance por ahora

- Crear la base definitiva.
- Migrar datos reales.
- Reescribir pantallas.
- Publicar v2.

Primero se debe aprobar el modelo de negocio.
