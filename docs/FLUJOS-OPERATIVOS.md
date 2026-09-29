# Flujos operativos

Estado: propuesta inicial para revision  
Fecha: 2026-09-29

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
- Como se registran devoluciones.
- Si se permite cobrar en una moneda distinta a la venta.
- Reglas de auditoria para comprobantes editados.
