# PGL Pulse v2

Nueva version de PGL Pulse basada en el cambio de modelo de negocio definido el 2026-09-29.

PGL Pulse v2 reutiliza la estetica, estructura frontend y componentes principales de PGL Pulse v1, pero redefine el dominio interno: deja de ser un sistema centrado en la unidad fisica y pasa a ser un sistema de compras, ventas, stock, reparto, caja real y reportes.

La organizacion inicial aprobada de la app es: Inicio, Compras, Ventas, Stock, Reparto, Caja, Datos y Reportes. Caja concentra cobros, pagos, entregas de dinero, rendiciones, diferencias y cierres. Los comprobantes se generan desde el detalle de Ventas. Los repartidores se administran como usuarios en Datos y se asignan desde Reparto.

## Estado

Proyecto local inicial. No usa Supabase por ahora; la base v2 se desarrollara localmente desde JSON.

La documentacion oficial esta en `docs/`:

- `DECISION-V2.md`
- `MODELO-NEGOCIO.md`
- `REGLAS-NEGOCIO.md`
- `FLUJOS-OPERATIVOS.md`
- `ESTADOS-Y-CASOS-BORDE.md`
- `ESTADOS.md`
- `BASE-DATOS.md`
- `ROADMAP.md`

Entregable de revision:

- `docs/PGL-Pulse-v2-mockup-pestanas.pdf`

Base local Sprint 1:

- `docs/LOCAL-DB.md`
- `docs/DATA-LAYER.md`
- `docs/SPRINT-3-DATOS.md`
- `docs/SPRINT-4-COMPRAS.md`
- `docs/SPRINT-5-VENTAS.md`
- `docs/SPRINT-6-STOCK.md`
- `docs/SPRINT-7-REPARTO.md`
- `docs/SPRINT-8-CAJA.md`
- `docs/SPRINT-9-ALERTAS-REPORTES-PERMISOS.md`
- `data/pgl-pulse-v2.local.example.json`
- `.env.local.example`

## Principio de trabajo

La estetica debe mantenerse alineada con PGL Pulse v1. Se espera reutilizar gran parte del frontend existente, pero no se debe forzar el nuevo negocio dentro del modelo viejo de base de datos.

La base de datos local nueva es el punto de partida. Primero se define la estructura en JSON, despues se adapta el frontend y luego se prueban flujos completos en local. Cualquier migracion a nube queda fuera de esta etapa y requiere aprobacion explicita.

Cada sprint cerrado debe tener pruebas y commit local. No se hace push hasta que el usuario lo pida explicitamente; el repo local v2 ya tiene remoto `origin` configurado para ese momento.

## Ejecutar

Base heredada del proyecto Next.js actual:

```powershell
npm ci
npm run local-db:reset
npm run typecheck
npm test
npm run dev
```

Abrir `http://localhost:3000`.
