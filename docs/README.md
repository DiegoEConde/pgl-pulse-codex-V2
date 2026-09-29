# PGL Pulse v2 - Documentacion oficial inicial

Esta carpeta define el nuevo modelo de negocio de PGL Pulse v2 antes de crear la base nueva o modificar pantallas.

PGL Pulse v1/beta estaba centrado en la unidad fisica. PGL Pulse v2 se redefine como un sistema de ventas, compras, stock, rutas, repartidores, comprobantes, pagos, caja real y rendiciones.

## Orden de autoridad

1. `DECISION-V2.md`: por que existe v2 y que cambia frente a v1.
2. `MODELO-NEGOCIO.md`: entidades reales del negocio y fuente de verdad de cada dato.
3. `REGLAS-NEGOCIO.md`: reglas que el sistema no debe romper.
4. `FLUJOS-OPERATIVOS.md`: pasos reales de trabajo que deben soportar las pantallas.
5. `ESTADOS-Y-CASOS-BORDE.md`: roles, estados implicitos, caja, comprobantes, cancelaciones, rendiciones y decisiones finas.

Si una implementacion entra en conflicto con estos documentos, se corrige la implementacion o se actualiza primero la regla oficial. No se inventan reglas desde el codigo.

## Estado

Documento inicial basado en la definicion del usuario del 2026-09-29. Pendiente de revision antes de disenar la base de datos nueva.
