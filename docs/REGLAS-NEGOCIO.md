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
7. Administrador, vendedor y repartidor tienen accesos distintos.
8. La documentacion de estados y casos borde completa estas reglas y debe revisarse antes de disenar tablas.
9. Retiro de proveedor, recepcion en oficina, entrega al cliente, cobro y rendicion son eventos independientes aunque puedan ocurrir en la misma ruta.

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
11. En pagos parciales debe poder indicarse que producto o unidad se esta pagando.
12. No se permite entrega parcial de una venta con varios productos.
13. Una venta sin stock queda confirmada, pero no cerrada, y debe generar alerta.
14. Una venta puede quedar entregada con saldo pendiente.
15. Una venta de producto sin stock solo puede crearse si existe un pedido al proveedor que incluya ese dispositivo.

## Stock

1. Todos los productos se manejan por unidad.
2. Todos los productos deben poder registrar IMEI, serie o identificador.
3. El IMEI puede cargarse al recibir, al vender o despues de vender.
4. El IMEI queda abierto para edicion hasta que el producto este entregado, pagado, con IMEI cargado y el usuario confirme la finalizacion.
5. Una venta puede reservar stock existente.
6. Una venta tambien puede generar una necesidad de compra o retiro si no hay stock.
7. La entrega directa proveedor -> cliente debe quedar registrada sin simular ingreso fisico a oficina.
8. Si el producto esta entregado, pagado y con IMEI cargado, el sistema debe permitir finalizarlo y bloquear su edicion.
9. Si una unidad recepcionada en oficina ya esta asociada a una venta, queda reservada exclusivamente para esa venta hasta entrega o cancelacion.

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
10. Una rendicion puede cerrarse parcialmente: otros retiros, cobros o sobrantes pueden rendirse aunque una entrega puntual quede abierta para el dia siguiente.
11. Si el mismo repartidor entrega al dia siguiente, el producto puede quedar fisicamente con el repartidor y esa entrega queda abierta hasta completarse.

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
6. Al completar el pago se reimprime el mismo comprobante con estado pagado.
7. La numeracion es unica.
8. Un comprobante emitido puede editarse, pero toda edicion que modifique productos debe ajustar stock y conservar auditoria.

## Caja

1. PGL Pulse v2 debe llevar caja real.
2. La caja debe trabajar en dolares y pesos.
3. Cada movimiento debe registrar moneda y medio de pago.
4. Las rendiciones de repartidor afectan caja.
5. Los pagos de clientes afectan caja.
6. Los pagos a proveedores afectan caja.
7. Las diferencias de rendicion deben quedar visibles.
8. La decision inicial es una sola caja general, con posibilidad de evaluar cajas multiples mas adelante.
9. Debe haber consulta por fecha y cierre de caja.

## Decisiones pendientes

- Estados exactos de venta.
- Estados exactos de ruta.
- Estados exactos de compra.
- Reglas tecnicas para obtener cotizacion automatica.
- Auditoria para comprobantes editados.
