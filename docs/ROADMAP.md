# Roadmap de trabajo - PGL Pulse v2

Estado: roadmap operativo inicial
Fecha: 2026-09-29

Este roadmap define como se va a construir PGL Pulse v2. La regla central es: primero base local JSON y flujos completos. No se usara Supabase por ahora.

## Reglas de trabajo

1. La base de datos nueva es el punto de partida de cada modulo.
2. Se reutiliza la estetica y gran parte del frontend de PGL Pulse actual.
3. No se cargan datos reales hasta que los flujos principales funcionen localmente.
4. Cada sprint debe cerrar una funcionalidad grande o una pestaña completa, no ajustes sueltos.
5. Ningun sprint se considera terminado sin pruebas y commit local.
6. Si una regla de negocio cambia, se actualiza la documentacion antes o junto con el codigo.
7. El autor de los commits debe figurar solo como DiegoEConde.

## Politica de cierre de sprint

Para dar un sprint por terminado deben cumplirse estos puntos:

1. La funcionalidad del sprint esta implementada en local.
2. La documentacion afectada esta actualizada.
3. Los cambios de base local estan versionados.
4. Se ejecutaron las pruebas correspondientes.
5. `git status` queda limpio despues del commit.
6. El push queda pendiente hasta pedido explicito del usuario.

Pruebas minimas por tipo de sprint:

| Tipo de cambio | Pruebas obligatorias |
| --- | --- |
| Solo documentacion | Revision de archivos, `npm test` si el proyecto lo permite |
| Base de datos | Reset de JSON local, verificacion de tablas, constraints logicos e indices |
| Capa de datos | Typecheck, pruebas de lectura/escritura contra base local |
| Pantallas | Lint, build, prueba manual del flujo principal |
| Flujos criticos | Prueba end-to-end local del caso feliz y al menos dos casos borde |
| Caja | Prueba de saldos, pagos parciales, cierres, diferencias y deudas |
| Reparto | Prueba de retiro, entrega, cobro, rendicion parcial y pendiente al dia siguiente |

Nota: el repo v2 local ya tiene `origin` configurado. Los sprints se commitean localmente y se pushean juntos cuando el usuario lo indique.

## Sprints

### Sprint 0 - Contrato tecnico y repositorio

Objetivo: dejar oficializada la forma de trabajo antes de programar la nueva base.

Entregables:

- Base de datos simplificada documentada.
- Roadmap documentado.
- Documentacion enlazada desde README e indice de docs.
- Repositorio local limpio.
- Remoto GitHub creado o vinculado como `origin` antes del primer push solicitado.

Pruebas:

- Revisar que `BASE-DATOS.md` ya no apunte al modelo viejo.
- Ejecutar `npm test` si esta disponible.
- Verificar autor/committer de Git.

Cierre Git:

- Commit sugerido: `docs: definir base simplificada y roadmap v2`.
- Push pendiente hasta pedido explicito.

### Sprint 1 - Base local v2 y contrato inicial

Objetivo: crear la base local nueva con las tablas oficiales simplificadas.

Entregables:

- Entorno local JSON definido.
- Contrato local con tablas, claves, estados basicos e indices logicos principales.
- `.env.local.example` para la base local.
- Sin datos reales ni datos beta.

Tablas incluidas:

- `usuarios`
- `clientes`
- `proveedores`
- `productos`
- `compras`
- `compra_items`
- `ventas`
- `venta_items`
- `unidades`
- `rutas`
- `ruta_items`
- `movimientos_dinero`
- `historial_eventos`

Pruebas:

- Crear la base local desde el JSON ejemplo.
- Validar que el JSON respete el contrato.
- Verificar claves logicas, checks e indices minimos en la capa local.
- Probar inserciones tecnicas minimas sin datos comerciales reales.

Cierre Git:

- Commit de base local JSON y configuracion local.
- Push pendiente hasta pedido explicito.

### Sprint 2 - Capa de datos y adaptacion tecnica

Objetivo: conectar el frontend heredado con el nuevo modelo sin reescribir la estetica.

Entregables:

- Cliente de base local conectado.
- Tipos o contratos de datos para las tablas nuevas.
- Funciones base de lectura/escritura.
- Eliminacion o aislamiento de referencias al modelo viejo.
- Pantalla/app levantando con datos vacios sin romper.

Pruebas:

- Typecheck.
- Build local.
- Lectura/escritura tecnica en cada tabla principal.
- Smoke test de carga inicial de la app.

Cierre Git:

- Commit de capa de datos.
- Push pendiente hasta pedido explicito.

### Sprint 3 - Catalogo, clientes y proveedores

Objetivo: adaptar las pantallas maestras que alimentan compras y ventas.

Entregables:

- Pestaña o seccion de productos usando `productos`.
- ABM de clientes usando `clientes`.
- ABM de proveedores usando `proveedores`.
- Busquedas y filtros principales.
- Validaciones basicas.

Pruebas:

- Crear, editar, desactivar y buscar productos.
- Crear, editar y buscar clientes.
- Crear, editar y buscar proveedores.
- Confirmar que no se crean tablas auxiliares innecesarias.

Cierre Git:

- Commit del modulo catalogos/terceros.
- Push pendiente hasta pedido explicito.

### Sprint 4 - Compras y pedidos a proveedor

Objetivo: construir el flujo de pedido a proveedor como origen de stock o de venta sin stock.

Entregables:

- Modal de compra adaptado a `compras` y `compra_items`.
- Seleccion de proveedor.
- Multiples productos por compra.
- Asignacion de repartidor que retira.
- Indicacion de pago al retirar o proveedor fiado.
- Creacion automatica de ruta/ruta_items cuando corresponde.
- Cancelacion individual de `compra_items`.

Pruebas:

- Compra para stock de oficina.
- Compra vinculada a una venta futura.
- Compra con repartidor asignado.
- Compra con proveedor fiado.
- Cancelacion de un item sin cancelar la compra completa.

Cierre Git:

- Commit de compras.
- Push pendiente hasta pedido explicito.

### Sprint 5 - Ventas, detalle y comprobante

Objetivo: convertir la venta en el centro operativo del sistema.

Entregables:

- Modal de venta adaptado a `ventas` y `venta_items`.
- Venta con uno o varios productos.
- Venta desde stock.
- Venta sin stock solo si existe `compra_item` asociado.
- Pago total, parcial o sin pago.
- Seleccion del producto/unidad que se paga en pago parcial.
- Opcion de entrega en local o con envio.
- Seleccion de repartidor cuando hay envio.
- Numero, estado y snapshot de comprobante en la venta.
- Emision, descarga, envio y reimpresion de comprobante desde el detalle/modal de venta.

Pruebas:

- Venta simple desde stock.
- Venta multiple.
- Venta sin stock vinculada a pedido proveedor.
- Pago parcial aplicado a un item puntual.
- Generacion y reimpresion del mismo comprobante con estado pagado.

Cierre Git:

- Commit de ventas y comprobantes.
- Push pendiente hasta pedido explicito.

### Sprint 6 - Unidades, stock, IMEI y estados

Objetivo: hacer que el stock por unidad sea confiable sin volver a centrar toda la app en la unidad.

Entregables:

- Creacion y actualizacion de `unidades` desde compras y ventas.
- Estados de unidad: esperada, con repartidor, oficina disponible, oficina reservada, entregada, finalizada, garantia, cancelada.
- Carga y edicion de IMEI.
- Bloqueo de unidad al estar entregada, pagada, con IMEI y finalizada.
- Garantia como estado de unidad.
- Historial de cambios relevantes.

Pruebas:

- Recepcion en oficina.
- Entrega directa proveedor a cliente.
- IMEI cargado antes y despues de entregar.
- Finalizacion y bloqueo.
- Cambio a garantia.

Cierre Git:

- Commit de unidades/stock.
- Push pendiente hasta pedido explicito.

### Sprint 7 - Pestaña Reparto

Objetivo: crear la pantalla operativa de Reparto con rutas, repartidores asignados, retiros y entregas.

Entregables:

- Pestaña Reparto para administrador/vendedor.
- Vista especial o filtrada para repartidor.
- Retiros a proveedores.
- Pagos a proveedores.
- Entregas a clientes.
- Cobros a clientes.
- Modal de retiro.
- Modal de entrega/cobro.
- Soporte para ruta que queda abierta al dia siguiente.
- Soporte para rendicion parcial.
- Los perfiles de repartidores se administran en Datos, no en una pestaña separada.

Pruebas:

- Repartidor retira y entrega el mismo dia.
- Repartidor retira y deja en oficina.
- Repartidor retira hoy y entrega al dia siguiente.
- Ruta con retiro, pago, entrega y cobro mezclados.
- Ruta con proveedor fiado.

Cierre Git:

- Commit de reparto.
- Push pendiente hasta pedido explicito.

### Sprint 8 - Pestaña Caja

Objetivo: hacer que la caja sea confiable y que los pagos/cobros no dependan de estados visuales.

Entregables:

- Pestaña Caja.
- Cobros de clientes.
- Pagos a proveedores.
- Entregas de dinero a repartidores.
- Pagos parciales por item.
- Deudas de clientes.
- Deudas con proveedores.
- Rendiciones de repartidores.
- Diferencias de rendicion.
- Caja en USD y ARS.
- Cierre de caja con snapshot.
- Historial de movimientos.

Pruebas:

- Cobro total.
- Cobro parcial por producto.
- Pago parcial a proveedor.
- Repartidor rinde menos o mas de lo esperado.
- Cierre de caja por fecha.
- Verificacion de saldos USD/ARS.

Cierre Git:

- Commit de caja.
- Push pendiente hasta pedido explicito.

### Sprint 9 - Alertas, reportes y permisos

Objetivo: agregar control operativo y metricas sin bloquear el trabajo diario.

Entregables:

- Centro de alertas para ventas sin stock, ventas con deuda, entregas pendientes, rutas abiertas, IMEI pendiente y diferencias de caja.
- Reportes para administrador.
- Restriccion de metricas para vendedor.
- Restriccion de pantalla de repartidor.
- Metricas comunes: ventas, compras, costos, ganancias, comisiones, reparto, comparativas por periodo.

Pruebas:

- Usuario administrador ve todo.
- Usuario vendedor no ve metricas.
- Usuario repartidor ve solo su pantalla operativa.
- Alertas aparecen y desaparecen segun estado real.
- Reportes no cuentan ventas sin finalizar como ganancia cerrada.

Cierre Git:

- Commit de alertas/reportes/permisos.
- Push pendiente hasta pedido explicito.

### Sprint 10 - QA integral local

Objetivo: probar la app completa localmente antes de considerar cualquier publicacion o base remota.

Entregables:

- Datos ficticios locales controlados.
- Flujos end-to-end documentados.
- Correcciones de inconsistencias.
- Checklist final para una eventual publicacion futura.

Pruebas:

- Pedido proveedor -> retiro -> oficina -> venta -> entrega -> cobro.
- Pedido proveedor -> retiro -> entrega directa -> cobro.
- Pago parcial y deuda abierta.
- Entrega con deuda.
- Ruta abierta al dia siguiente.
- Cancelacion de item pedido/vendido.
- Garantia.
- Cierre de caja con diferencias.

Cierre Git:

- Commit de QA/correcciones finales locales.
- Push pendiente hasta pedido explicito.

### Sprint 11 - Publicacion futura opcional

Objetivo: evaluar publicacion recien cuando la version local este validada.

Entregables:

- Destino de publicacion acordado explicitamente.
- Migracion o adaptador definidos segun el destino elegido.
- Variables de entorno configuradas.
- Deploy si corresponde.
- Pruebas con datos reales aprobados.
- Verificacion de que no se migraron datos beta como reales.

Pruebas:

- Comparar estructura local vs destino elegido.
- Smoke test del entorno publicado si corresponde.
- Crear flujo real controlado.
- Verificar permisos por rol.
- Verificar caja, venta, compra, reparto y comprobante en nube.

Cierre Git:

- Commit de configuracion nube si corresponde.
- Push pendiente hasta pedido explicito.
- Tag sugerido: `v2-beta-real-1`.
