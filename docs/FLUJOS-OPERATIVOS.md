# Flujos operativos

Estado: propuesta inicial para revision  
Fecha: 2026-09-29

## Flujos reales confirmados

Estos son los casos comunes de la operacion real. Las pantallas y la base de datos deben poder representar estos caminos sin forzar estados falsos.

### Caso A - Retiro, oficina y entrega en local

1. Se hace el pedido al proveedor.
2. Se envia un repartidor a buscar el pedido.
3. Se genera la venta al cliente.
4. El repartidor retira el dispositivo del proveedor.
5. El dispositivo se recepciona en la oficina.
6. Se registra el IMEI si esta disponible.
7. Se entrega el dispositivo al cliente desde la oficina.
8. Se registra el cobro del cliente: total, parcial o cero.

### Caso B - Retiro y entrega directa al cliente

1. Se hace el pedido al proveedor.
2. Se envia un repartidor a buscar el pedido.
3. Se genera la venta al cliente.
4. La venta indica que debe entregarse en una direccion.
5. El repartidor retira el producto del proveedor.
6. El repartidor va directamente a la direccion del cliente.
7. El repartidor entrega el dispositivo.
8. El repartidor registra el cobro del cliente: total, parcial o cero.
9. El producto no pasa por stock fisico de oficina.

### Caso C - Recepcion en oficina y envio posterior

1. Se hace el pedido al proveedor.
2. Se envia un repartidor a buscarlo.
3. El producto se recepciona en oficina.
4. La venta queda pendiente de entrega a domicilio.
5. Al dia siguiente, u otro dia posterior, se asigna una nueva ruta.
6. Otro repartidor puede entregar el producto al cliente.
7. Se registra entrega y cobro segun corresponda.

### Caso D - Mismo repartidor entrega al dia siguiente

1. Se hace el pedido al proveedor.
2. Se asigna el retiro a un repartidor.
3. El repartidor retira el producto.
4. La entrega al cliente queda para el dia siguiente.
5. El mismo repartidor conserva o retoma la entrega pendiente segun se defina operativamente.
6. La ruta/rendicion debe quedar abierta o vinculada hasta registrar entrega, cobro y rendicion.

### Caso E - Pago parcial, total o nulo

En cualquiera de los casos anteriores, el cliente puede:

- pagar el total;
- pagar parcialmente;
- no pagar al momento de la entrega o venta.

La entrega y el pago se controlan por separado. Una venta puede estar entregada y seguir con saldo pendiente.

## 1. Venta con stock disponible

1. El usuario crea una venta.
2. Selecciona cliente.
3. Agrega uno o varios productos.
4. Elige unidades disponibles en stock.
5. Registra precio, moneda y vendedor.
6. Registra pago inicial: total, parcial o cero.
7. El sistema genera saldo pendiente si corresponde.
8. El sistema permite emitir comprobante de venta.
9. Si el cliente retira en local, se registra entrega.
10. Si se envia por repartidor, se agrega a una ruta.

## 2. Venta sin stock disponible

1. El usuario crea una venta aunque el producto no este en stock.
2. La venta queda confirmada, no cerrada, y genera una alerta de abastecimiento.
3. Se vincula a una compra o retiro de proveedor.
4. El producto puede:
   - ingresar a stock de oficina y luego entregarse;
   - retirarse del proveedor y entregarse directamente al cliente.
5. El pago del cliente puede ser total, parcial o cero.
6. La entrega y el pago se controlan por separado.
7. Si el proveedor no consigue el producto, se cancela esa linea tanto de la compra como de la venta.

## 3. Compra para stock de oficina

1. El usuario registra compra a proveedor.
2. La compra puede quedar pendiente de retiro o recepcion.
3. Si un repartidor retira, la compra se agrega a una ruta.
4. Si se le entrega dinero al repartidor, se registra en la ruta.
5. Al recibir la mercaderia en oficina, se actualiza stock.
6. Si estan disponibles, se cargan IMEI o series.
7. Si no se cargan en ese momento, quedan pendientes pero editables.

## 4. Compra para entrega directa

1. Existe una venta pendiente de un producto sin stock.
2. Se registra o selecciona una compra a proveedor para abastecer esa venta.
3. Se agrega a una ruta de repartidor.
4. El repartidor retira el producto del proveedor.
5. El producto no pasa por stock fisico de oficina.
6. El repartidor entrega al cliente.
7. Se registra entrega, cobro si corresponde e IMEI si esta disponible.
8. La trazabilidad debe mostrar proveedor, venta, cliente y repartidor.

## 5. Ruta mixta de repartidor

1. El usuario crea una ruta.
2. Selecciona repartidor.
3. Agrega paradas de proveedor.
4. Agrega paradas de cliente.
5. Ordena la ruta.
6. Registra dinero entregado al repartidor, si corresponde.
7. La ruta muestra:
   - que debe retirar;
   - que debe entregar;
   - cuanto debe pagar;
   - cuanto debe cobrar;
   - comprobantes disponibles.
8. El repartidor realiza la ruta.
9. Al volver, se registra rendicion.

## 6. Entrega a cliente por repartidor

1. La venta esta pendiente de entrega.
2. Se agrega a una ruta.
3. La parada indica productos a entregar y saldo a cobrar.
4. El repartidor entrega productos.
5. Si cobra, se registra importe, moneda y medio de pago.
6. Si no cobra o cobra parcial, la venta conserva saldo.
7. Se puede entregar comprobante por WhatsApp/PDF.
8. En pagos parciales se debe poder indicar que producto o unidad queda abonado.

## 7. Rendicion de repartidor

1. Se abre la ruta pendiente de rendicion.
2. El sistema muestra dinero entregado al salir.
3. El sistema muestra pagos esperados a proveedores.
4. El sistema muestra cobros esperados a clientes.
5. El usuario registra pagos y cobros reales.
6. El sistema calcula dinero esperado a devolver.
7. El usuario registra dinero devuelto por moneda.
8. El sistema calcula diferencia.
9. La ruta queda rendida, o queda con diferencia pendiente de resolver.

## 8. Comprobante de venta

1. Al crear una venta, el usuario puede emitir comprobante.
2. El comprobante tiene numero.
3. El comprobante puede descargarse como PDF.
4. El comprobante puede enviarse por WhatsApp.
5. El comprobante debe conservar los importes emitidos.

## 9. Comprobante pagado

1. Una venta completa su pago.
2. El sistema permite reimprimir el mismo comprobante con estado pagado.
3. El comprobante conserva el mismo numero.
4. El comprobante puede descargarse como PDF o enviarse por WhatsApp.

## Pendientes de definicion

- Si la ruta se puede editar despues de iniciada.
- En el caso de entrega al dia siguiente con el mismo repartidor, definir si el producto queda fisicamente con el repartidor o vuelve a oficina hasta la entrega.
- En el caso de entrega al dia siguiente, definir si la rendicion del retiro queda abierta hasta entregar o si se separa en dos rendiciones vinculadas.
- Definir si "recepcion en oficina" siempre implica ingreso a stock disponible o si puede quedar reservado inmediatamente para una venta ya creada.
- Como se registran devoluciones.
- Si se permite cobrar en una moneda distinta a la venta.
- Reglas de auditoria para comprobantes editados.
