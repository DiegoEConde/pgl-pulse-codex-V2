# Reglas de negocio

Estado: propuesta inicial para revision  
Fecha: 2026-09-29

## Reglas generales

1. PGL Pulse v2 gestiona compras, ventas, stock, rutas, comprobantes, pagos, caja real y rendiciones.
2. La venta es una entidad principal.
3. La unidad fisica no es la entidad central del sistema.
4. Un registro financiero no debe depender solamente de un estado visual.
5. Todo movimiento de dinero debe quedar registrado como movimiento.
6. Los importes historicos no se recalculan si despues cambia un precio, comision, cotizacion o dato maestro.

## Ventas

1. Una venta puede tener uno o varios productos.
2. Una venta puede incluir productos disponibles en stock.
3. Una venta puede incluir productos que aun no estan en stock.
4. Si un producto vendido no esta en stock, puede comprarse o retirarse de proveedor para entrega directa al cliente.
5. Una venta puede pagarse total, parcial o no pagarse al crearla.
6. Una venta puede quedar pendiente de entrega.
7. Una venta puede ser cobrada por el local o por el repartidor.
8. La venta debe conservar saldo pendiente hasta que los pagos registrados completen el total.
9. El pago total no implica por si solo que el producto fue entregado.
10. La entrega no implica por si sola que el producto fue pagado.

## Stock

1. El sistema debe soportar stock por cantidad y stock por unidad identificable.
2. Los productos con IMEI, serie o identificador deben permitir trazabilidad individual.
3. El IMEI puede cargarse al recibir, al vender o despues de vender.
4. El IMEI queda abierto para edicion hasta que se defina una regla explicita de bloqueo.
5. Una venta puede reservar stock existente.
6. Una venta tambien puede generar una necesidad de compra o retiro si no hay stock.
7. La entrega directa proveedor -> cliente debe quedar registrada sin simular ingreso fisico a oficina.

## Compras y proveedores

1. Una compra pertenece a un proveedor.
2. Un proveedor puede cobrar al retirar mercaderia o fiar total/parcialmente.
3. El dinero entregado al repartidor para pagar proveedores debe registrarse.
4. El pago real al proveedor debe registrarse por movimiento.
5. Una compra puede abastecer stock de oficina o una venta especifica.
6. Si una compra abastece una venta especifica, debe conservarse esa relacion.

## Repartidores y rutas

1. Una ruta pertenece a un repartidor.
2. Una ruta puede mezclar retiro de proveedores y entrega a clientes.
3. Una ruta puede tener dinero entregado antes de salir o salir sin dinero.
4. Una ruta puede incluir proveedores que fian mercaderia.
5. Una ruta debe registrar cuanto se esperaba pagar y cobrar.
6. Una ruta debe registrar cuanto se pago y cobro realmente.
7. El repartidor debe rendir al regresar, el mismo dia o el dia siguiente.
8. La rendicion debe calcular cuanto dinero debe traer el repartidor.
9. La rendicion debe detectar diferencias entre lo esperado y lo real.

## Formula inicial de rendicion

El dinero esperado al volver se calcula asi:

```text
dinero_esperado = dinero_entregado_al_repartidor
                 - pagos_realizados_a_proveedores
                 + cobros_recibidos_de_clientes
```

Si el repartidor devuelve menos o mas que lo esperado, se registra una diferencia de rendicion.

Esta formula puede ampliarse si se agregan gastos, cambios de moneda o devoluciones.

## Comprobantes

1. Los comprobantes son para el cliente.
2. Deben poder generarse en PDF.
3. Deben poder enviarse por WhatsApp.
4. Deben estar numerados.
5. Al crear una venta debe poder emitirse un comprobante de compra/venta.
6. Al completar el pago debe poder emitirse un comprobante de producto pagado o saldo cancelado.
7. Un comprobante emitido no debe cambiar silenciosamente si se modifica una venta; si se permite correccion, debe quedar rastro.

## Caja

1. PGL Pulse v2 debe llevar caja real.
2. La caja debe trabajar en dolares y pesos.
3. Cada movimiento debe registrar moneda y medio de pago.
4. Las rendiciones de repartidor afectan caja.
5. Los pagos de clientes afectan caja.
6. Los pagos a proveedores afectan caja.
7. Las diferencias de rendicion deben quedar visibles.

## Decisiones pendientes

- Estados exactos de venta.
- Estados exactos de ruta.
- Estados exactos de compra.
- Medios de pago definitivos.
- Manejo de cotizacion USD/ARS.
- Si habra caja por usuario, por local o una caja general.
- Reglas para anular ventas y comprobantes.
- Reglas para bloquear edicion de IMEI.
- Numeracion exacta de comprobantes.
