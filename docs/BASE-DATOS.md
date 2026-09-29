# Base de datos - Boceto v2

Estado: boceto inicial  
Fecha: 2026-09-29

Este documento propone la estructura base de PGL Pulse v2. No es una migracion SQL todavia.

## Principios

1. La venta es entidad principal.
2. La unidad fisica existe para trazabilidad, IMEI, ubicacion y estado fisico.
3. Cada producto vendido debe representarse como item individual.
4. Caja real se calcula desde movimientos de dinero.
5. Los pagos se aplican a items concretos cuando el usuario lo indique.
6. Las rutas contienen paradas y tareas, no solo texto.
7. Los comprobantes guardan snapshot propio para no cambiar silenciosamente.
8. No se cargan datos iniciales todavia.

## Tipos comunes

- IDs: `uuid` o `bigint` identity. La decision final puede tomarse al escribir migraciones.
- Importes: `numeric(14,2)`.
- Moneda: `USD` o `ARS`.
- Fechas: `timestamptz`.
- Estados: `text` con `check` o enums PostgreSQL. Se recomienda `check` mientras el modelo siga en revision.
- Auditoria minima: `creado_en`, `actualizado_en`, `creado_por`, `actualizado_por`.

## Seguridad y usuarios

### `usuario_perfil`

Perfil interno asociado a autenticacion.

Campos clave:

- `id`
- `auth_user_id`
- `nombre`
- `rol`: `ADMINISTRADOR`, `VENDEDOR`, `REPARTIDOR`
- `activo`

Fuente de verdad para permisos de app.

## Catalogos

### `categoria`

Categorias de productos.

Campos clave:

- `id`
- `nombre`

### `producto`

Modelo comercial vendible/comprable.

Campos clave:

- `id`
- `categoria_id`
- `marca`
- `modelo`
- `nombre`
- `activo`

### `producto_caracteristica`

Definicion de atributos por categoria/producto.

Campos clave:

- `id`
- `categoria_id`
- `clave`
- `etiqueta`
- `tipo`
- `obligatoria`
- `valores`

## Terceros

### `cliente`

Campos clave:

- `id`
- `nombre`
- `telefono`
- `direccion`
- `localidad`
- `observaciones`

### `proveedor`

Campos clave:

- `id`
- `nombre`
- `telefono`
- `direccion`
- `horario`
- `observaciones`

### `vendedor`

Campos clave:

- `id`
- `nombre`
- `telefono`
- `porcentaje_comision`
- `activo`

El porcentaje aplica hacia adelante y no recalcula ventas historicas.

### `repartidor`

Campos clave:

- `id`
- `nombre`
- `telefono`
- `costo_envio_usd`
- `costo_envio_ars`
- `activo`

El costo de envio aplica hacia adelante y no recalcula operaciones anteriores.

## Ventas

### `venta`

Cabecera comercial.

Campos clave:

- `id`
- `numero`
- `cliente_id`
- `vendedor_id`
- `estado`
- `fecha`
- `moneda_principal`
- `total`
- `observaciones`

Fuente de verdad para existencia de la venta.

### `venta_item`

Item individual vendido. Todos los productos se manejan por unidad, por lo que una venta de dos productos iguales genera dos items.

Campos clave:

- `id`
- `venta_id`
- `producto_id`
- `unidad_id`
- `compra_item_id`
- `estado`
- `precio_venta`
- `moneda`
- `costo_estimado`
- `comision_estimado`
- `entregado_en`
- `finalizado_en`

Permite pagos parciales aplicados por unidad/producto.

## Compras

### `compra`

Cabecera de compra a proveedor.

Campos clave:

- `id`
- `proveedor_id`
- `estado`
- `fecha_pedido`
- `moneda`
- `total_estimado`
- `observaciones`

### `compra_item`

Unidad pedida al proveedor.

Campos clave:

- `id`
- `compra_id`
- `producto_id`
- `venta_item_id`
- `unidad_id`
- `estado`
- `costo_original`
- `moneda`

Si abastece una venta, se vincula con `venta_item_id`.

## Stock y unidades

### `unidad`

Unidad operativa/fisica. Puede nacer como esperada por proveedor y luego pasar por repartidor, oficina o cliente.

Campos clave:

- `id`
- `producto_id`
- `estado`
- `imei`
- `serie`
- `color`
- `atributos`
- `ubicacion_tipo`: `PROVEEDOR`, `REPARTIDOR`, `OFICINA`, `CLIENTE`
- `ubicacion_id`
- `compra_item_id`
- `venta_item_id`
- `finalizada_en`

Fuente de verdad para estado fisico y trazabilidad.

### `unidad_evento`

Historial de cambios fisicos y de IMEI.

Campos clave:

- `id`
- `unidad_id`
- `tipo`
- `detalle`
- `creado_en`
- `creado_por`

## Rutas

### `ruta`

Ruta asignada a un repartidor.

Campos clave:

- `id`
- `repartidor_id`
- `estado`
- `fecha_programada`
- `iniciada_en`
- `cerrada_en`
- `observaciones`

### `ruta_parada`

Proveedor, cliente u oficina dentro de una ruta.

Campos clave:

- `id`
- `ruta_id`
- `orden`
- `tipo`: `PROVEEDOR`, `CLIENTE`, `OFICINA`, `OTRO`
- `proveedor_id`
- `cliente_id`
- `direccion`
- `estado`

### `ruta_tarea`

Accion concreta dentro de una parada.

Campos clave:

- `id`
- `ruta_parada_id`
- `tipo`: `RETIRAR_PROVEEDOR`, `PAGAR_PROVEEDOR`, `ENTREGAR_CLIENTE`, `COBRAR_CLIENTE`, `RENDIR_OFICINA`
- `compra_item_id`
- `venta_item_id`
- `unidad_id`
- `importe_esperado`
- `moneda`
- `estado`

Fuente de verdad logistica de que debe hacer el repartidor.

## Caja y dinero

### `caja`

Caja general inicial.

Campos clave:

- `id`
- `nombre`
- `activa`

Aunque v2 empiece con una sola caja, esta tabla permite evolucionar a cajas multiples.

### `movimiento_dinero`

Movimiento real de dinero.

Campos clave:

- `id`
- `caja_id`
- `tipo`: `COBRO_CLIENTE`, `PAGO_PROVEEDOR`, `ENTREGA_REPARTIDOR`, `RENDICION_REPARTIDOR`, `AJUSTE`, `DEVOLUCION`
- `moneda`
- `medio_pago`
- `importe`
- `estado`
- `fecha`
- `venta_id`
- `compra_id`
- `ruta_id`
- `repartidor_id`
- `cliente_id`
- `proveedor_id`

Fuente de verdad de caja real.

### `movimiento_aplicacion`

Aplicacion de un movimiento a una operacion concreta.

Campos clave:

- `id`
- `movimiento_dinero_id`
- `venta_item_id`
- `compra_item_id`
- `importe`
- `moneda`

Permite decir que pago parcial corresponde a que producto/unidad.

### `cotizacion`

Cotizacion usada para conversiones.

Campos clave:

- `id`
- `fecha`
- `fuente`
- `moneda_origen`
- `moneda_destino`
- `valor`

Las operaciones guardan la cotizacion usada y no se recalculan historicamente.

## Comprobantes

### `comprobante`

Comprobante numerado de venta.

Campos clave:

- `id`
- `numero`
- `venta_id`
- `estado`
- `emitido_en`
- `pagado_en`
- `total`
- `moneda`

### `comprobante_item`

Snapshot del item impreso.

Campos clave:

- `id`
- `comprobante_id`
- `venta_item_id`
- `descripcion`
- `precio`
- `moneda`

Si se edita un comprobante, debe quedar auditoria.

## Rendiciones

### `ruta_rendicion`

Cierre financiero de ruta.

Campos clave:

- `id`
- `ruta_id`
- `estado`
- `esperado_usd`
- `esperado_ars`
- `devuelto_usd`
- `devuelto_ars`
- `diferencia_usd`
- `diferencia_ars`
- `cerrada_en`

### `ruta_rendicion_item`

Detalle de que tareas/movimientos entraron en la rendicion.

Campos clave:

- `id`
- `ruta_rendicion_id`
- `ruta_tarea_id`
- `movimiento_dinero_id`
- `estado`

## Garantia

### `garantia`

Circuito separado de devoluciones/garantias.

Campos clave:

- `id`
- `unidad_id`
- `venta_item_id`
- `cliente_id`
- `estado`
- `motivo`
- `abierta_en`
- `cerrada_en`

### `garantia_evento`

Historial de garantia.

Campos clave:

- `id`
- `garantia_id`
- `tipo`
- `detalle`
- `creado_en`
- `creado_por`

## Auditoria

### `auditoria_evento`

Registro general de acciones sensibles.

Campos clave:

- `id`
- `usuario_id`
- `entidad`
- `entidad_id`
- `accion`
- `antes`
- `despues`
- `creado_en`

Debe usarse especialmente para:

- edicion de comprobantes;
- cambios de IMEI;
- cancelaciones;
- ajustes de caja;
- diferencias de rendicion;
- cambios de costo de envio o comision.

## Fuentes de verdad

| Dato | Fuente de verdad |
| --- | --- |
| Venta existe | `venta` |
| Productos vendidos | `venta_item` |
| Estado fisico | `unidad` |
| Stock disponible | `unidad.estado = EN_OFICINA_DISPONIBLE` |
| Reserva para venta | `unidad.venta_item_id` y `unidad.estado = EN_OFICINA_RESERVADA` |
| Cobros y pagos reales | `movimiento_dinero` |
| Pago aplicado a producto | `movimiento_aplicacion` |
| Deuda cliente | total de `venta_item` menos aplicaciones de cobro |
| Deuda proveedor | total de `compra_item` menos aplicaciones de pago |
| Ruta del repartidor | `ruta`, `ruta_parada`, `ruta_tarea` |
| Rendicion | `ruta_rendicion` |
| Comprobante impreso | `comprobante`, `comprobante_item` |
| Garantia | `garantia` |

## Decisiones pendientes

- Confirmar si IDs seran `uuid` o `bigint`.
- Definir si `venta.total` se guarda como snapshot o se calcula siempre desde items.
- Definir si se permite una venta con items en distintas monedas.
- Definir politica de anulacion vs edicion de comprobantes.
- Definir si `ubicacion_tipo` alcanza o se separan tablas de ubicacion.
- Definir reglas de RLS y permisos por rol.
