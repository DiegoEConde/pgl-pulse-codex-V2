# Base local JSON - Sprint 1

Estado: contrato tecnico inicial
Fecha: 2026-10-01

Sprint 1 deja definida la base local de PGL Pulse v2. No usa Supabase ni datos de v1/beta. La fuente de verdad del modelo sigue siendo `docs/base-datos-v2.json`.

## Archivos

- `.env.local.example`: variables locales esperadas para usar JSON como persistencia.
- `data/pgl-pulse-v2.local.example.json`: plantilla versionada, vacia y sin datos reales.
- `data/pgl-pulse-v2.local.json`: base local de trabajo, ignorada por Git.
- `scripts/local-db-utils.mjs`: utilidades compartidas para crear y validar la base.
- `scripts/reset-local-db.mjs`: crea la base local de trabajo desde la plantilla.
- `scripts/validate-local-db.mjs`: valida un archivo local contra el contrato oficial.
- `scripts/test-local-db.mjs`: prueba la base vacia y un fixture tecnico ficticio.

## Comandos

```powershell
npm run local-db:reset
npm run local-db:validate
npm test
```

`npm run local-db:reset` sobreescribe `data/pgl-pulse-v2.local.json` desde la plantilla vacia. Ese archivo queda fuera de Git porque puede contener datos comerciales durante el desarrollo.

## Validaciones cubiertas

- Presencia exacta de las tablas oficiales.
- Claves primarias, campos obligatorios y tipos logicos.
- Enums de estados basicos.
- Referencias entre tablas.
- Unicidad logica y secuencias visibles.
- Roles logicos de vendedor y repartidor.
- Indices logicos declarados en `docs/base-datos-v2.json`.

## Politica de datos

- Datos reales: prohibidos hasta aprobacion explicita.
- Datos de v1/beta: no se migran automaticamente.
- Fixtures tecnicos: permitidos solo para pruebas controladas y generados en `tests/artifacts/`, fuera de Git.
