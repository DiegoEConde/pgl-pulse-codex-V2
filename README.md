# PGL Pulse v2

Nueva version de PGL Pulse basada en el cambio de modelo de negocio definido el 2026-09-29.

PGL Pulse v2 reutiliza la estetica, estructura frontend y componentes principales de PGL Pulse v1, pero redefine el dominio interno: deja de ser un sistema centrado en la unidad fisica y pasa a ser un sistema de ventas, compras, stock, rutas, repartidores, comprobantes, pagos, caja real y rendiciones.

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

- `docs/PGL-Pulse-v2-boceto-estados-base.pdf`

## Principio de trabajo

La estetica debe mantenerse alineada con PGL Pulse v1. Se espera reutilizar gran parte del frontend existente, pero no se debe forzar el nuevo negocio dentro del modelo viejo de base de datos.

La base de datos local nueva es el punto de partida. Primero se define la estructura en JSON, despues se adapta el frontend y luego se prueban flujos completos en local. Cualquier migracion a nube queda fuera de esta etapa y requiere aprobacion explicita.

Cada sprint cerrado debe tener pruebas, commit y push al repositorio nuevo de GitHub. El repo local v2 aun necesita remoto `origin` antes del primer push obligatorio.

## Ejecutar

Pendiente de ajustar cuando la app lea y escriba la base local JSON.

Base heredada del proyecto Next.js actual:

```powershell
npm ci
npm run dev
```

Abrir `http://localhost:3000`.
