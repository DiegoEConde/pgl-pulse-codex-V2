# Base de datos - Modelo simplificado v2

Estado: modelo oficial simplificado para implementacion local
Fecha: 2026-09-29

Este documento reemplaza el boceto inicial de muchas tablas. PGL Pulse v2 parte de una base mas simple, pensada para ventas, compras, reparto, caja y stock por unidad, sin separar entidades que todavia no necesitan una tabla propia.

No es una migracion SQL ni un contrato de Supabase. Es el contrato que debe respetar la base local JSON y cualquier implementacion posterior.

Decision actual: por ahora no se usara Supabase. Todo el desarrollo de datos sera local.

## Principios

1. La base de datos local nueva es el punto de partida del desarrollo.
2. La venta es la entidad comercial principal.
3. Clientes y proveedores siempre van en tablas separadas.
4. Vendedor y repartidor son usuarios con rol y datos operativos, no tablas separadas.
5. Cada producto vendido o comprado se maneja como item individual.
6. La unidad guarda IMEI, ubicacion fisica, estado y garantia como estado.
7. El comprobante de cliente vive en la venta como numero y snapshot, no como tabla separada inicial.
8. Caja, cobros, pagos, rendiciones, diferencias y cierres salen de movimientos de dinero.
9. Retiros de proveedor y entregas a cliente se concentran en rutas y ruta_items.
10. Los cambios sensibles van a historial_eventos.
11. No se cargan datos reales ni datos beta hasta que los flujos funcionen localmente.

## Tipos comunes

Estos nombres funcionan como tipos logicos del contrato. En la base local JSON se guardan como strings, numeros, booleanos u objetos JSON segun corresponda; no implican usar PostgreSQL ni Supabase.

- IDs: `uuid`, salvo numeros visibles como venta/comprobante.
- Importes: `numeric(14,2)`.
- Moneda: `USD` o `ARS`.
- Fechas: `timestamptz`.
- Estados: `text` con `check` mientras el modelo siga en ajuste.
- JSON: `jsonb` para snapshots, atributos flexibles y auditoria.
- Auditoria minima: `creado_en`, `actualizado_en`, `creado_por`, `actualizado_por` donde aplique.

## Tablas oficiales iniciales

### `usuarios`

Usuarios internos del sistema. Existe para manejar accesos, permisos, vendedores y repartidores sin duplicar personas en tablas distintas.

Campos clave:

- `id`
- `auth_user_id` nullable para una autenticacion futura si se decide agregarla
- `nombre`
- `email`
- `telefono`
- `rol`: `ADMINISTRADOR`, `VENDEDOR`, `REPARTIDOR`
- `activo`
- `porcentaje_comision`
- `costo_envio_usd`
- `costo_envio_ars`

Notas:

- `porcentaje_comision` aplica hacia adelante.
- `costo_envio_usd` y `costo_envio_ars` aplican hacia adelante.
- El rol repartidor puede quedar temporal hasta aprobacion final del cliente.

### `clientes`

Personas o empresas que compran. Existe porque las deudas, comprobantes, entregas, historial y ventas necesitan una entidad propia de cliente.

Campos clave:

- `id`
- `nombre`
- `telefono`
- `direccion`
- `localidad`
- `observaciones`
- `activo`

### `proveedores`

Personas o empresas a las que se pide mercaderia. Existe porque compras, retiros, pagos, deuda y horarios pertenecen al proveedor, no al cliente.

Campos clave:

- `id`
- `nombre`
- `telefono`
- `direccion`
- `horario`
- `observaciones`
- `activo`

### `productos`

Catalogo comercial. Existe para describir que se compra y vende. No representa una unidad fisica concreta.

Campos clave:

- `id`
- `categoria`
- `marca`
- `modelo`
- `nombre`
- `atributos`: `jsonb`
- `activo`

Notas:

- Por simplicidad no hay tabla `categorias` ni `producto_caracteristica` inicial.
- RAM, almacenamiento, color base, pulgadas u otros datos pueden vivir en `atributos`.
- Si el catalogo crece demasiado, se puede separar categorias mas adelante.

### `compras`

Pedido o compra a proveedor. Existe para agrupar productos pedidos, registrar proveedor, asignar repartidor de retiro y controlar si se pago o quedo fiado.

Campos clave:

- `id`
- `numero`
- `proveedor_id`
- `repartidor_retiro_id`: usuario con rol repartidor
- `estado`
- `fecha_pedido`
- `fecha_retiro_programada`
- `moneda`
- `total_estimado`
- `paga_al_retirar`
- `observaciones`

### `compra_items`

Producto individual pedido al proveedor. Existe porque se puede cancelar un producto puntual sin cancelar toda la compra, y porque una venta sin stock debe estar vinculada a un item pedido.

Campos clave:

- `id`
- `compra_id`
- `producto_id`
- `venta_item_id`
- `unidad_id`
- `estado`
- `costo_original`
- `moneda`
- `cancelado_en`

### `ventas`

Cabecera de la venta al cliente. Existe para agrupar items vendidos, cliente, vendedor, condicion de envio, comprobante y estado comercial general.

Campos clave:

- `id`
- `numero`
- `cliente_id`
- `vendedor_id`: usuario vendedor o administrador
- `estado`
- `fecha`
- `moneda_principal`
- `total`
- `saldo_pendiente`
- `con_envio`
- `direccion_entrega`
- `repartidor_entrega_id`: usuario con rol repartidor
- `comprobante_numero`
- `comprobante_estado`: `EMITIDO`, `PAGADO`, `EDITADO`, `ANULADO`
- `comprobante_snapshot`: `jsonb`
- `observaciones`

Notas:

- No hay tabla `comprobantes` inicial.
- El comprobante es el snapshot de la venta impresa o enviada.
- Se reimprime el mismo numero con estado pagado cuando corresponde.

### `venta_items`

Producto individual vendido. Existe porque el negocio necesita pagar, entregar, reservar, cancelar, finalizar o cargar IMEI por producto/unidad, aunque todo pertenezca a una sola venta.

Campos clave:

- `id`
- `venta_id`
- `producto_id`
- `unidad_id`
- `compra_item_id`
- `estado`
- `precio_venta`
- `moneda`
- `saldo_pendiente`
- `pagado_en`
- `entregado_en`
- `finalizado_en`

### `unidades`

Unidad fisica o esperada de un producto. Existe para controlar stock real, IMEI, ubicacion, reserva, entrega directa, garantia y bloqueo final.

Campos clave:

- `id`
- `producto_id`
- `estado`
- `imei`
- `serie`
- `color`
- `atributos`: `jsonb`
- `ubicacion_tipo`: `PROVEEDOR`, `REPARTIDOR`, `OFICINA`, `CLIENTE`
- `ubicacion_usuario_id`
- `ubicacion_cliente_id`
- `ubicacion_proveedor_id`
- `compra_item_id`
- `venta_item_id`
- `finalizada_en`

Notas:

- Garantia es un estado de `unidades`, no una tabla separada inicial.
- El IMEI queda editable hasta que la unidad este entregada, pagada, con IMEI cargado y el usuario confirme finalizacion.

### `rutas`

Salida o trabajo asignado a un repartidor. Existe para agrupar retiros, pagos a proveedores, entregas, cobros y rendiciones que puede hacer una misma persona en la calle.

Campos clave:

- `id`
- `repartidor_id`: usuario con rol repartidor
- `estado`
- `fecha_programada`
- `iniciada_en`
- `cerrada_en`
- `observaciones`

### `ruta_items`

Accion concreta dentro de una ruta. Existe para simplificar lo que antes eran paradas y tareas separadas. Una fila puede ser retirar, pagar, entregar, cobrar o rendir.

Campos clave:

- `id`
- `ruta_id`
- `orden`
- `tipo`: `RETIRAR_PROVEEDOR`, `PAGAR_PROVEEDOR`, `ENTREGAR_CLIENTE`, `COBRAR_CLIENTE`, `RENDIR_OFICINA`
- `destino_tipo`: `PROVEEDOR`, `CLIENTE`, `OFICINA`, `OTRO`
- `proveedor_id`
- `cliente_id`
- `direccion`
- `compra_item_id`
- `venta_item_id`
- `unidad_id`
- `importe_esperado`
- `moneda`
- `estado`
- `realizado_en`

### `movimientos_dinero`

Registro unico de dinero. Existe para que finanzas sea la fuente real de caja, cobros, pagos, rendiciones, diferencias, deudas y cierres.

Campos clave:

- `id`
- `tipo`: `COBRO_CLIENTE`, `PAGO_PROVEEDOR`, `ENTREGA_REPARTIDOR`, `RENDICION_REPARTIDOR`, `DIFERENCIA_RENDICION`, `AJUSTE`, `DEVOLUCION`, `CIERRE_CAJA`
- `signo`: `INGRESO`, `EGRESO`, `NEUTRO`
- `moneda`
- `medio_pago`: `EFECTIVO_USD`, `EFECTIVO_ARS`, `TRANSFERENCIA_ARS`, `CREDITO`, `DEBITO`
- `importe`
- `estado`
- `fecha`
- `venta_id`
- `venta_item_id`
- `compra_id`
- `compra_item_id`
- `ruta_id`
- `ruta_item_id`
- `cliente_id`
- `proveedor_id`
- `usuario_id`
- `cierre_codigo`
- `cotizacion_usada`
- `snapshot`: `jsonb`
- `observaciones`

Notas:

- Un pago parcial por producto se registra apuntando a `venta_item_id` o `compra_item_id`.
- Un cierre de caja se registra como movimiento `CIERRE_CAJA` con snapshot de saldos.
- No hay tabla `caja` inicial porque la decision actual es una caja general.
- No hay tabla `cotizacion` inicial; cada operacion guarda la cotizacion usada.

### `historial_eventos`

Auditoria e historial operativo. Existe para registrar cambios importantes sin crear una tabla de historial para cada entidad.

Campos clave:

- `id`
- `entidad`
- `entidad_id`
- `tipo`
- `antes`: `jsonb`
- `despues`: `jsonb`
- `detalle`
- `usuario_id`
- `creado_en`

Debe usarse especialmente para:

- cambios de IMEI;
- edicion de venta o comprobante;
- cancelacion de items;
- cambios de estado de unidad;
- garantia;
- ajustes de caja;
- diferencias de rendicion;
- cambios de comision o costo de envio.

## Fuentes de verdad

| Dato | Fuente de verdad |
| --- | --- |
| Usuarios, roles y permisos | `usuarios` |
| Clientes | `clientes` |
| Proveedores | `proveedores` |
| Catalogo | `productos` |
| Venta existe | `ventas` |
| Productos vendidos | `venta_items` |
| Compra a proveedor | `compras` |
| Productos pedidos | `compra_items` |
| Stock, IMEI, garantia y ubicacion | `unidades` |
| Ruta del repartidor | `rutas`, `ruta_items` |
| Cobros, pagos, rendiciones y caja | `movimientos_dinero` |
| Pago aplicado a una unidad | `movimientos_dinero.venta_item_id` o `movimientos_dinero.compra_item_id` |
| Comprobante emitido | `ventas.comprobante_numero` y `ventas.comprobante_snapshot` |
| Auditoria sensible | `historial_eventos` |

## Tablas fusionadas o descartadas del boceto anterior

| Antes | Ahora |
| --- | --- |
| `categoria` | Campo `productos.categoria` |
| `producto_caracteristica` | Campo `productos.atributos` |
| `vendedor` | Rol/datos dentro de `usuarios` |
| `repartidor` | Rol/datos dentro de `usuarios` |
| `ruta_parada` + `ruta_tarea` | `ruta_items` |
| `caja` | Caja general implicita en `movimientos_dinero` |
| `movimiento_aplicacion` | Referencias directas en `movimientos_dinero` |
| `cotizacion` | `cotizacion_usada` en operaciones |
| `comprobante` + `comprobante_item` | Campos y snapshot en `ventas` |
| `garantia` + `garantia_evento` | Estado de `unidades` + `historial_eventos` |
| `unidad_evento` + `auditoria_evento` | `historial_eventos` |
| `ruta_rendicion` + `ruta_rendicion_item` | `movimientos_dinero` + `ruta_items` |

## Decisiones pendientes

- Definir checks exactos de estados antes de implementar validaciones locales.
- Definir autenticacion local antes de cargar datos reales.
- Definir en que momento, si corresponde, el JSON local deja de alcanzar y se evalua otra persistencia.
- Definir si se usaran ramas por sprint o commits directos a `main` cuando el remoto exista.
