# PGL Pulse v2

Nueva version de PGL Pulse basada en el cambio de modelo de negocio definido el 2026-09-29.

PGL Pulse v2 reutiliza la estetica, estructura frontend y componentes principales de PGL Pulse v1, pero redefine el dominio interno: deja de ser un sistema centrado en la unidad fisica y pasa a ser un sistema de ventas, compras, stock, rutas, repartidores, comprobantes, pagos, caja real y rendiciones.

## Estado

Proyecto local inicial. Todavia no tiene base Supabase v2 ni migraciones nuevas.

La documentacion oficial inicial esta en `docs/`:

- `DECISION-V2.md`
- `MODELO-NEGOCIO.md`
- `REGLAS-NEGOCIO.md`
- `FLUJOS-OPERATIVOS.md`
- `ESTADOS-Y-CASOS-BORDE.md`

## Principio de trabajo

La estetica debe mantenerse alineada con PGL Pulse v1. Se espera reutilizar gran parte del frontend existente, pero no se debe forzar el nuevo negocio dentro del modelo viejo de base de datos.

Primero se define el negocio, despues la base de datos, y recien despues se adaptan pantallas y codigo.

## Ejecutar

Pendiente de ajustar cuando exista la base v2.

Base heredada del proyecto Next.js actual:

```powershell
npm ci
npm run dev
```

Abrir `http://localhost:3000`.
