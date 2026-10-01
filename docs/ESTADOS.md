# Estados oficiales - Boceto v2

Estado: boceto inicial  
Fecha: 2026-09-29

Este documento propone los estados persistentes y derivados de PGL Pulse v2. Antes de crear migraciones, estos estados deben revisarse contra los flujos reales.

## Criterio general

No se debe forzar todo en un unico estado gigante.

PGL Pulse v2 separa dimensiones:

- estado comercial de la venta;
- estado de cada item vendido;
- estado fisico de la unidad;
- estado financiero de caja, pagos, cobros, rendiciones y diferencias;
- estado logistico de reparto, rutas y paradas;
- estado documental del comprobante.

Algunas etiquetas de pantalla se calculan combinando esas dimensiones. Por ejemplo, "entregada con deuda" puede derivarse de venta entregada + saldo pendiente, sin necesitar un estado unico que mezcle entrega y pago.

Los estados no implican pestañas separadas. Pagos y rendiciones se operan desde Caja; comprobantes se operan desde el detalle de Ventas; repartidores se administran en Datos y se asignan desde Reparto.

## Venta

Estado persistente propuesto para `venta.estado`:

| Estado | Significado | Regla |
| --- | --- | --- |
| `BORRADOR` | Venta cargada pero no confirmada. | No emite comprobante. Puede eliminarse. |
| `CONFIRMADA` | Venta oficial. | Puede tener comprobante, pagos, reserva, abastecimiento y entrega. |
| `FINALIZADA` | Venta cerrada. | Todos los items estan entregados, pagados, con IMEI cargado y confirmados como finalizados. |
| `CANCELADA` | Venta anulada antes de entrega. | Debe liberar reservas y ajustar compra/stock si corresponde. |

Etiquetas derivadas de venta:

- `pendiente de abastecimiento`;
- `pendiente de entrega`;
- `entregada con deuda`;
- `entregada y pagada pendiente de IMEI`;
- `lista para finalizar`;
- `finalizada`.

## Item de venta

Cada producto vendido se representa como item individual. Aunque dos productos sean iguales, si se venden dos unidades deben existir dos items.

Estado propuesto para `venta_item.estado`:

| Estado | Significado |
| --- | --- |
| `PENDIENTE_ABASTECIMIENTO` | La venta existe, pero el item depende de un pedido a proveedor. |
| `RESERVADO_OFICINA` | La unidad esta en oficina y reservada exclusivamente para esta venta. |
| `ASIGNADO_RUTA` | El item esta asignado a una ruta de entrega. |
| `EN_PODER_REPARTIDOR` | El repartidor tiene fisicamente el producto. |
| `ENTREGADO` | El cliente recibio el producto. Puede tener saldo pendiente. |
| `FINALIZADO` | Item entregado, pagado, con IMEI y confirmado como ineditable. |
| `CANCELADO` | Item cancelado antes de entrega. |
| `GARANTIA` | Item devuelto o afectado por garantia. Sale del circuito normal. |

## Compra

Estado propuesto para `compra.estado`:

| Estado | Significado |
| --- | --- |
| `BORRADOR` | Compra cargada pero no confirmada. |
| `PEDIDA` | Pedido confirmado al proveedor. |
| `EN_RETIRO` | Hay items asignados a una ruta de retiro. |
| `RECIBIDA_PARCIAL` | Algunos items fueron recibidos o entregados directo. |
| `RECIBIDA_TOTAL` | Todos los items fueron resueltos. |
| `CERRADA` | Compra sin pendientes operativos ni financieros. |
| `CANCELADA` | Compra anulada. |

## Item de compra

Estado propuesto para `compra_item.estado`:

| Estado | Significado |
| --- | --- |
| `PEDIDO` | Item pedido al proveedor. |
| `ASIGNADO_RUTA` | Item asignado a repartidor. |
| `RETIRADO_PROVEEDOR` | Retirado del proveedor. |
| `EN_PODER_REPARTIDOR` | Fisicamente con repartidor. |
| `RECIBIDO_OFICINA` | Recibido en oficina. |
| `ENTREGADO_DIRECTO` | Retirado en proveedor y entregado directo al cliente. |
| `CANCELADO` | Item cancelado porque no se consiguio o se anulo. |

## Unidad

Estado propuesto para `unidad.estado`:

| Estado | Significado |
| --- | --- |
| `ESPERADA_PROVEEDOR` | Unidad esperada por compra, aun no retirada. |
| `EN_PODER_REPARTIDOR` | Unidad con repartidor. |
| `EN_OFICINA_DISPONIBLE` | Unidad en oficina sin venta asignada. |
| `EN_OFICINA_RESERVADA` | Unidad en oficina reservada para una venta. |
| `ENTREGADA` | Unidad entregada al cliente. |
| `FINALIZADA` | Unidad entregada, pagada, con IMEI y bloqueada por confirmacion. |
| `GARANTIA` | Unidad devuelta o en circuito de garantia. |
| `CANCELADA` | Unidad operativa anulada por cancelacion de compra/venta. |

## Ruta

Estado propuesto para `ruta.estado`:

| Estado | Significado |
| --- | --- |
| `BORRADOR` | Ruta en preparacion. |
| `PROGRAMADA` | Ruta lista para repartidor. |
| `EN_CURSO` | Ruta iniciada. |
| `ABIERTA_CON_PENDIENTES` | Ruta con tareas pendientes, por ejemplo entrega al dia siguiente. |
| `PARCIALMENTE_RENDIDA` | Se rindieron algunos movimientos, pero quedan tareas abiertas. |
| `RENDIDA` | Ruta cerrada sin pendientes. |
| `CANCELADA` | Ruta anulada. |

## Parada de ruta

Estado propuesto para `ruta_parada.estado`:

| Estado | Significado |
| --- | --- |
| `PENDIENTE` | Parada por visitar. |
| `COMPLETADA_PARCIAL` | Se resolvio parte de la parada. |
| `COMPLETADA` | Parada resuelta. |
| `FALLIDA` | No se pudo completar. |
| `CANCELADA` | Parada anulada. |

## Tarea de ruta

Estado propuesto para `ruta_tarea.estado`:

| Estado | Significado |
| --- | --- |
| `PENDIENTE` | Tarea pendiente. |
| `CONFIRMADA` | Tarea realizada. |
| `ABIERTA` | Tarea realizada parcialmente o pendiente de evento futuro. |
| `RENDIDA` | Tarea incluida en rendicion. |
| `OMITIDA` | Tarea no realizada por decision operativa. |
| `CANCELADA` | Tarea anulada. |

## Movimiento de dinero

Estado propuesto para `movimiento_dinero.estado`:

| Estado | Significado |
| --- | --- |
| `REGISTRADO` | Movimiento valido. |
| `APLICADO_PARCIAL` | Importe aplicado parcialmente a items/operaciones. |
| `APLICADO_TOTAL` | Importe aplicado totalmente. |
| `ANULADO` | Movimiento revertido por correccion. |

## Comprobante

Estado propuesto para `comprobante.estado`:

| Estado | Significado |
| --- | --- |
| `EMITIDO` | Comprobante de venta creado. |
| `PAGADO` | Mismo comprobante reimpreso o marcado como pagado. |
| `EDITADO` | Comprobante corregido. Debe conservar auditoria. |
| `ANULADO` | Estado reservado para casos futuros si se decide anular en lugar de editar. |

## Rendicion

Estado propuesto para `ruta_rendicion.estado`:

| Estado | Significado |
| --- | --- |
| `ABIERTA` | Rendicion pendiente. |
| `PARCIAL` | Se rindio parte de la ruta, pero quedan tareas abiertas. |
| `CERRADA_OK` | Rendicion cerrada sin diferencia. |
| `CERRADA_CON_DIFERENCIA` | Rendicion cerrada con deuda o saldo del repartidor. |

Estos estados se consultan y modifican desde Caja en la organizacion inicial de pantallas.

## Garantia

Estado propuesto para `garantia.estado`:

| Estado | Significado |
| --- | --- |
| `ABIERTA` | Garantia iniciada. |
| `EN_REVISION` | Producto en revision. |
| `EN_PROVEEDOR` | Producto enviado a proveedor. |
| `RESUELTA_REPARADO` | Resuelta con reparacion. |
| `RESUELTA_CAMBIO` | Resuelta con cambio de producto. |
| `RESUELTA_DEVOLUCION` | Resuelta con devolucion de dinero u otra compensacion. |
| `CERRADA` | Garantia cerrada. |

## Decisiones pendientes

- Confirmar si se usara `BORRADOR` para ventas y compras o solo como estado local de formulario.
- Definir si `ANULADO` en comprobantes queda habilitado desde v2 inicial o solo reservado.
- Definir si las tareas de ruta pueden reabrirse despues de rendidas.
- Definir estados exactos de edicion/auditoria cuando se corrige comprobante y stock.
