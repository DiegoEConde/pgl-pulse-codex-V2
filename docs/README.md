# PGL Pulse v2 - Documentacion oficial

Esta carpeta define el nuevo modelo de negocio de PGL Pulse v2 antes de crear la base nueva o modificar pantallas.

PGL Pulse v1/beta estaba centrado en la unidad fisica. PGL Pulse v2 se redefine como un sistema de compras, ventas, stock, reparto, caja real y reportes.

La organizacion inicial aprobada de pantallas es: Inicio, Compras, Ventas, Stock, Reparto, Caja, Datos y Reportes. Caja concentra cobros, pagos, entregas de dinero a repartidores, rendiciones, diferencias y cierres. Comprobantes se generan desde Ventas. Repartidores se administran en Datos y se asignan desde Reparto.

## Orden de autoridad

1. `DECISION-V2.md`: por que existe v2 y que cambia frente a v1.
2. `MODELO-NEGOCIO.md`: entidades reales del negocio y fuente de verdad de cada dato.
3. `REGLAS-NEGOCIO.md`: reglas que el sistema no debe romper.
4. `FLUJOS-OPERATIVOS.md`: pasos reales de trabajo que deben soportar las pantallas.
5. `ESTADOS-Y-CASOS-BORDE.md`: roles, estados implicitos, caja, comprobantes, cancelaciones, rendiciones y decisiones finas.
6. `ESTADOS.md`: boceto de estados persistentes y derivados.
7. `BASE-DATOS.md`: modelo simplificado de tablas oficiales iniciales.
8. `ROADMAP.md`: orden de trabajo por sprints, pruebas y politica de commit/push.
9. `LOCAL-DB.md`: base local JSON, scripts y validaciones del Sprint 1.
10. `DATA-LAYER.md`: cliente local, tipos y pruebas de lectura/escritura del Sprint 2.
11. `SPRINT-3-DATOS.md`: implementacion funcional de productos, clientes y proveedores.

## Entregables de revision

- `PGL-Pulse-v2-mockup-pestanas.pdf`: PDF de revision del mockup aprobado y sus pestañas.
- `diagramas/base-datos-v2.mmd`: diagrama Mermaid editable.
- `diagramas/base-datos-v2.svg`: diagrama visual exportable.
- `data/pgl-pulse-v2.local.example.json`: plantilla versionada de base local vacia.
- `lib/local-db/*`: contrato tipado y cliente server-side para la base local.
- `components/features/masters/*`: pantalla funcional de Datos para Sprint 3.

Si una implementacion entra en conflicto con estos documentos, se corrige la implementacion o se actualiza primero la regla oficial. No se inventan reglas desde el codigo.

## Estado

Documentacion inicial basada en la definicion del usuario del 2026-09-29. El modelo de base queda simplificado para iniciar desarrollo local en JSON. No se usara Supabase por ahora.
