# Roadmap de trabajo - PGL Pulse v2

Estado: roadmap operativo inicial
Fecha: 2026-09-29

Este roadmap define como se va a construir PGL Pulse v2. La regla central es: primero base local y flujos completos; despues Supabase, Vercel y datos reales.

## Reglas de trabajo

1. La base de datos nueva es el punto de partida de cada modulo.
2. Se reutiliza la estetica y gran parte del frontend de PGL Pulse actual.
3. No se cargan datos reales hasta que los flujos principales funcionen localmente.
4. Cada sprint debe cerrar una funcionalidad grande o una pestaña completa, no ajustes sueltos.
5. Ningun sprint se considera terminado sin pruebas, commit y push al repositorio nuevo de GitHub.
6. Si una regla de negocio cambia, se actualiza la documentacion antes o junto con el codigo.
7. El autor de los commits debe figurar solo como DiegoEConde.

## Politica de cierre de sprint

Para dar un sprint por terminado deben cumplirse estos puntos:

1. La funcionalidad del sprint esta implementada en local.
2. La documentacion afectada esta actualizada.
3. Las migraciones o cambios de base estan versionados.
4. Se ejecutaron las pruebas correspondientes.
5. `git status` queda limpio despues del commit.
6. Se hizo push al repositorio nuevo de GitHub.

Pruebas minimas por tipo de sprint:

| Tipo de cambio | Pruebas obligatorias |
| --- | --- |
| Solo documentacion | Revision de archivos, `npm test` si el proyecto lo permite |
| Base de datos | Reset/aplicacion local de migraciones, verificacion de tablas, constraints e indices |
| Capa de datos | Typecheck, pruebas de lectura/escritura contra base local |
| Pantallas | Lint, build, prueba manual del flujo principal |
| Flujos criticos | Prueba end-to-end local del caso feliz y al menos dos casos borde |
| Finanzas | Prueba de saldos, pagos parciales, cierres, diferencias y deudas |
| Reparto | Prueba de retiro, entrega, cobro, rendicion parcial y pendiente al dia siguiente |

Nota: el repo v2 local todavia no tiene remoto configurado. Antes de cerrar el primer sprint de codigo hay que crear o vincular `origin` con el repositorio nuevo de GitHub.

## Sprints

### Sprint 0 - Contrato tecnico y repositorio

Objetivo: dejar oficializada la forma de trabajo antes de programar la nueva base.

Entregables:

- Base de datos simplificada documentada.
- Roadmap documentado.
- Documentacion enlazada desde README e indice de docs.
- Repositorio local limpio.
- Remoto GitHub creado o vinculado como `origin` antes del primer push obligatorio.

Pruebas:

- Revisar que `BASE-DATOS.md` ya no apunte al modelo viejo.
- Ejecutar `npm test` si esta disponible.
- Verificar autor/committer de Git.

Cierre Git:

- Commit sugerido: `docs: definir base simplificada y roadmap v2`.
- Push requerido cuando exista `origin`.

### Sprint 1 - Base local v2 y migraciones iniciales

Objetivo: crear la base local nueva con las tablas oficiales simplificadas.

Entregables:

- Entorno local definido, preferentemente Supabase local/PostgreSQL.
- Migracion inicial con tablas, claves, estados basicos e indices principales.
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

- Levantar la base local desde cero.
- Aplicar migraciones sin errores.
- Verificar claves foraneas, checks e indices minimos.
- Probar inserciones tecnicas minimas sin datos comerciales reales.

Cierre Git:

- Commit de migraciones y configuracion local.
- Push a GitHub.

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
- Push a GitHub.

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
- Push a GitHub.

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
- Push a GitHub.

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
- Numero y snapshot de comprobante en la venta.

Pruebas:

- Venta simple desde stock.
- Venta multiple.
- Venta sin stock vinculada a pedido proveedor.
- Pago parcial aplicado a un item puntual.
- Generacion y reimpresion del mismo comprobante con estado pagado.

Cierre Git:

- Commit de ventas y comprobantes.
- Push a GitHub.

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
- Push a GitHub.

### Sprint 7 - Pestaña Reparto

Objetivo: crear la pantalla operativa de repartidores con retiros y entregas.

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

Pruebas:

- Repartidor retira y entrega el mismo dia.
- Repartidor retira y deja en oficina.
- Repartidor retira hoy y entrega al dia siguiente.
- Ruta con retiro, pago, entrega y cobro mezclados.
- Ruta con proveedor fiado.

Cierre Git:

- Commit de reparto.
- Push a GitHub.

### Sprint 8 - Pestaña Finanzas

Objetivo: hacer que la caja sea confiable y que los pagos/cobros no dependan de estados visuales.

Entregables:

- Pestaña Finanzas.
- Cobros de clientes.
- Pagos a proveedores.
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

- Commit de finanzas.
- Push a GitHub.

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
- Push a GitHub.

### Sprint 10 - QA integral local

Objetivo: probar la app completa localmente antes de tocar Supabase/Vercel.

Entregables:

- Datos ficticios locales controlados.
- Flujos end-to-end documentados.
- Correcciones de inconsistencias.
- Checklist final para migracion nube.

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
- Push a GitHub.

### Sprint 11 - Migracion a Supabase y Vercel

Objetivo: publicar recien cuando la version local este validada.

Entregables:

- Proyecto Supabase v2 o entorno acordado.
- Migraciones aplicadas en Supabase.
- Variables de entorno configuradas.
- Deploy en Vercel.
- Pruebas con datos reales aprobados.
- Verificacion de que no se migraron datos beta como reales.

Pruebas:

- Comparar estructura local vs Supabase.
- Smoke test en Vercel.
- Crear flujo real controlado.
- Verificar permisos por rol.
- Verificar caja, venta, compra, reparto y comprobante en nube.

Cierre Git:

- Commit de configuracion nube si corresponde.
- Push a GitHub.
- Tag sugerido: `v2-beta-real-1`.