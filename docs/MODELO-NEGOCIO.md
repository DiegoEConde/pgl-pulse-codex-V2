# Modelo de negocio

Estado: propuesta inicial para revision  
Fecha: 2026-09-29

## Objetivo

PGL Pulse v2 gestiona todo el ciclo operativo y financiero basico de PGL:

- compras;
- ventas;
- stock;
- unidades con IMEI o serie;
- clientes;
- proveedores;
- vendedores;
- repartidores;
- rutas;
- entregas;
- comprobantes;
- pagos;
- caja real;
- rendiciones.

## Entidades principales

### Producto

Modelo comercial que PGL compra y vende. Puede tener categoria, marca, modelo y caracteristicas.

No representa por si mismo una existencia fisica.

### Stock

Representa disponibilidad vendible.

Debe soportar dos formas:

- stock unitario identificable: celulares, consolas, notebooks u otros productos con IMEI, serie o identificador;
- stock por cantidad: accesorios u otros productos donde no se controla cada unidad individual.

### Unidad identificable

Item fisico individual dentro del stock, cuando corresponde controlar IMEI, serie o identificador.

El IMEI puede cargarse:

- al recibir una compra;
- al vender;
- despues de vender.

El IMEI queda abierto para edicion hasta que se defina una regla de bloqueo posterior.

### Compra

Operacion de compra a proveedor.

Puede generar stock de oficina o mercaderia que se retira y se entrega directamente a cliente sin pasar por stock fisico de oficina.

### Venta

Operacion comercial con un cliente.

Una venta puede incluir varios productos. Puede contener productos en stock y productos que todavia deben comprarse o retirarse de proveedor.

La venta tiene estado propio, saldo propio, comprobantes propios y relacion con entregas propias.

### Venta detalle

Linea de una venta. Indica producto, cantidad, precio, moneda, costo estimado o real y, si aplica, unidad identificable.

### Cliente

Persona o entidad que compra. Puede tener datos de contacto, direccion y observaciones.

### Proveedor

Persona o entidad a la que PGL compra productos. Puede fiar total o parcialmente una compra.

### Vendedor

Persona que registra o genera una venta. Puede tener comision.

Vendedor no es lo mismo que usuario del sistema ni repartidor.

### Repartidor

Persona que realiza una ruta. Puede retirar productos de proveedores, entregar productos a clientes, cobrar dinero y rendir al volver.

### Ruta

Recorrido asignado a un repartidor.

Una ruta puede incluir en el mismo viaje:

- retiro de productos en proveedores;
- pago a proveedores;
- entrega de productos a clientes;
- cobro a clientes;
- entrega directa proveedor -> cliente;
- rendicion posterior.

La ruta puede cerrarse el mismo dia o el dia siguiente.

### Parada de ruta

Punto dentro de una ruta. Puede ser proveedor, cliente u otro destino operativo.

Debe tener orden, tipo, direccion, importes esperados y resultado.

### Comprobante

Documento numerado entregable al cliente.

Debe poder generarse en PDF y enviarse por WhatsApp.

Hay al menos dos tipos:

- comprobante de compra/venta creada;
- comprobante de producto pagado o saldo cancelado.

### Pago

Movimiento de dinero asociado a una venta, compra, proveedor, cliente o ruta.

Debe registrar:

- importe;
- moneda;
- medio de pago;
- fecha;
- responsable;
- origen;
- destino;
- operacion relacionada.

### Caja

Registro real de dinero en dolares y pesos.

No es solo una vista de saldos: debe representar movimientos reales.

### Rendicion

Cierre financiero de una ruta. Compara lo esperado contra lo realmente devuelto o informado por el repartidor.

Debe detectar diferencias.

## Monedas y medios de pago

La app debe trabajar con caja real en dolares y pesos.

Cada movimiento debe indicar moneda. Si se usan conversiones, la tasa de cambio debe quedar guardada en la operacion y no recalcularse historicamente.

Medios de pago iniciales a definir:

- efectivo USD;
- efectivo ARS;
- transferencia;
- otros medios que el usuario confirme.

## Relacion con v1

En v1, `unidad` absorbia venta, estado fisico, cliente, vendedor, precio, pago y entrega. En v2 esas responsabilidades se separan.

La unidad queda como trazabilidad fisica. La venta, los pagos, las rutas y la caja tienen tablas propias.
