# Estados y casos borde

Estado: propuesta inicial para revision  
Fecha: 2026-09-29

Este documento registra las reglas finas definidas antes de disenar la base de datos v2.

La organizacion funcional aprobada para la interfaz inicial es Inicio, Compras, Ventas, Stock, Reparto, Caja, Datos y Reportes. Esta organizacion concentra lo financiero en Caja, deja los comprobantes dentro de Ventas y evita una pestaña separada de Repartidores.

## Roles y accesos

PGL Pulse v2 contempla tres roles:

- administrador;
- vendedor;
- repartidor.

### Administrador

Puede realizar todas las acciones del sistema.

### Vendedor

Puede operar ventas, compras, stock, clientes, proveedores y tareas comerciales, pero no puede ver metricas ni reportes reservados.

### Repartidor

Rol temporal pendiente de aprobacion final del cliente.

Tendra una vista especial o filtrada dentro de Reparto donde podra ver:

- proveedores a visitar;
- productos que debe retirar en cada proveedor;
- entregas programadas a clientes;
- importe a cobrar en cada entrega;
- modales para confirmar retiro de productos;
- modales para confirmar entrega a clientes;
- importe abonado por proveedor o cliente.

El repartidor no tendra acceso general al sistema.

## Caja

La decision inicial es trabajar con una sola caja general.

La caja debe soportar:

- efectivo USD;
- efectivo ARS;
- transferencia ARS;
- credito;
- debito.

La caja debe poder consultarse por fecha y tambien admitir cierre de caja.

Caja es la unica seccion principal para:

- cobros de clientes;
- pagos a proveedores;
- entregas de dinero a repartidores;
- rendiciones;
- diferencias;
- ajustes;
- cierres de caja.

### Cajas multiples: beneficio futuro

Por ahora no se implementan, pero podrian servir si el negocio necesita separar responsabilidades o saldos.

Ejemplos:

- caja local: dinero fisico en el local;
- caja banco: transferencias y movimientos bancarios;
- caja repartidor: dinero temporal entregado o cobrado por un repartidor;
- caja USD y caja ARS: separacion estricta por moneda;
- caja Mercado Pago o tarjeta: si en el futuro se registra liquidacion por plataforma.

El beneficio de varias cajas es auditar de donde entra y sale cada dinero. El costo es mayor complejidad operativa.

## Monedas y cotizacion

Las ventas pueden registrarse en USD o ARS.

El usuario elige metodo de pago.

Si se necesita conversion, la app debe intentar obtener automaticamente la cotizacion desde una fuente web y calcular el equivalente.

La cotizacion usada en una operacion debe quedar guardada historicamente. No se recalculan operaciones anteriores si cambia el valor del dolar.

## Ventas

Una venta puede contener varios productos.

La venta se paga como operacion unica, pero en pagos parciales el usuario debe poder seleccionar que unidad o producto se esta pagando.

Una venta sin stock queda confirmada, pero no cerrada. Debe generar una alerta en el centro de alertas.

Una venta de producto sin stock solo puede crearse si ya existe un pedido al proveedor que incluya ese dispositivo.

No se permite entrega parcial de una venta con varios productos. La entrega debe resolverse completa.

La ganancia se considera definitiva cuando la venta queda finalizada.

Si el producto se recepciona en oficina y ya esta vinculado a una venta, queda reservado exclusivamente para esa venta a menos que la venta se cancele.

## Venta sin stock y proveedor

Si se vende un producto sin stock, se genera una necesidad de compra/retiro.

Si luego el costo real cambia, se conserva el costo original previsto para la operacion.

Si el proveedor no consigue el producto, se cancela ese producto individualmente tanto de la compra como de la venta.

## Stock e IMEI

Todos los productos se manejan por unidad.

Todos los productos deben poder tener IMEI, serie o identificador. No hay excepciones por categoria en esta regla inicial.

El IMEI puede completarse:

- al recibir;
- al vender;
- despues de entregar;
- despues de cobrar.

Si un producto esta entregado y pagado pero sin IMEI, el IMEI sigue editable.

Cuando se cumplen las tres condiciones:

- entregado;
- pagado;
- IMEI cargado;

el sistema debe avisar al usuario si desea dar por finalizada la transaccion. Al finalizar, el producto queda ineditable.

Todos los usuarios habilitados pueden editar IMEI hasta ese cierre.

## Comprobantes

El comprobante muestra todo lo que el cliente pidio, aunque todavia no este entregado o pagado.

Al completar el pago no se crea un comprobante nuevo: se reimprime el mismo comprobante con estado pagado.

La numeracion es unica. No hay numeraciones separadas por tipo.

Si hay error, el comprobante se puede editar. Si se elimina un producto y se agrega otro, deben ajustarse los stocks relacionados.

Esta regla exige auditoria posterior, porque una edicion de comprobante afecta ventas y stock.

Los comprobantes se generan, consultan, descargan, envian y reimprimen desde el detalle/modal de la venta. No existe una pestaña principal de Comprobantes en la organizacion inicial.

## Reparto, rutas y repartidores

Una ruta puede armarse antes de salir y tambien puede recibir paradas nuevas mientras el repartidor esta en la calle.

Una misma ruta puede incluir:

- retiros en proveedores;
- pagos a proveedores;
- entregas a clientes;
- cobros a clientes.

Esto es un caso normal, no una excepcion.

El dinero entregado al repartidor puede ser en USD, ARS o ambos.

No se registran gastos del repartidor como nafta, peaje o estacionamiento.

Si existe costo de envio, se maneja como una caracteristica del repartidor. Ese costo puede modificarse en su perfil y aplica solo hacia adelante, nunca retroactivamente.

Los perfiles de repartidores se administran en Datos como usuarios con rol `REPARTIDOR`. La operacion diaria del repartidor se ve en Reparto.

## Rendicion

El repartidor rinde a alguien del local. La carga y cierre de rendicion se operan desde Caja, vinculadas a la ruta.

Si la rendicion queda para el dia siguiente, la caja/ruta queda abierta.

El repartidor puede rendir otros dispositivos, dinero sobrante de compras u otros cobros aunque una entrega puntual quede abierta para el dia siguiente.

Si el mismo repartidor entrega al dia siguiente, el producto queda fisicamente con el repartidor hasta la entrega.

Si falta o sobra dinero, se registra como saldo/deuda del repartidor, no solo como diferencia informativa.

## Proveedores

Si un proveedor fia, se genera deuda a proveedor automaticamente.

Los pagos a proveedor pueden ser parciales y en varias fechas.

La deuda siempre debe estar asociada a compras concretas, no a una cuenta corriente libre sin origen.

## Clientes

Si un cliente queda debiendo, debe haber alerta, historial y accion para registrar pago.

La deuda siempre debe estar asociada a ventas concretas y, cuando corresponda, al producto o unidad que se esta pagando.

## Vendedores y comisiones

El vendedor tiene porcentaje fijo en su perfil.

El porcentaje puede modificarse, pero los cambios aplican hacia adelante y no recalculan operaciones anteriores.

La comision se considera ganada al finalizar toda la venta.

## Reportes imprescindibles

Desde el inicio deben contemplarse reportes comunes para administracion:

- productos vendidos;
- productos comprados;
- costos;
- ganancias;
- ventas por dia, semana, mes y anio;
- comparativas entre periodos;
- porcentaje de costo de reparto;
- porcentaje de comisiones;
- saldos de clientes;
- saldos de proveedores;
- rendiciones de repartidores;
- diferencias de caja/rendicion.

## Cancelaciones y devoluciones

Una venta puede cancelarse antes de entregar.

Las devoluciones existen. Un producto devuelto queda en estado garantia y pasa a una gestion separada.

La garantia debe modelarse como circuito propio, no como simple vuelta automatica a stock.

## Migracion desde v1

La base actual contiene datos de prueba utilizados para la beta. No se consideran datos reales del negocio.

Regla inicial:

- no migrar ventas historicas de prueba;
- no migrar compras historicas de prueba;
- no migrar pagos o cobros de prueba;
- no migrar repartos o rendiciones de prueba;
- no migrar stock de prueba como stock real.

Se podrian reutilizar estructuras, criterios de catalogo o datos aprobados explicitamente, pero la carga real de v2 debe hacerse con informacion confirmada por el usuario.
