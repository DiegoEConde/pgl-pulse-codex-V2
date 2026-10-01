# Sprint 3 - Catalogo, clientes y proveedores

Estado: implementacion local
Fecha: 2026-10-01

Sprint 3 convierte la pestana Datos en una pantalla funcional para los maestros que alimentan Compras y Ventas.

## Alcance

- Productos usando la tabla oficial `productos`.
- Clientes usando la tabla oficial `clientes`.
- Proveedores usando la tabla oficial `proveedores`.
- Busqueda por texto.
- Filtro por activos e inactivos.
- Alta, edicion y activacion/desactivacion.
- Validaciones basicas de campos obligatorios.
- Sin tablas auxiliares nuevas.

## Implementacion

- `lib/local-db/masters.ts`: normalizacion, validacion y operaciones de maestros.
- `app/api/local-db/masters/route.ts`: API local para la pantalla Datos.
- `components/features/masters/MastersScreen.tsx`: pantalla real de Datos.
- `components/features/masters/MastersScreen.module.css`: estilos alineados al mockup v2.
- `components/mockup/PulseMockup.tsx`: usa la pantalla funcional solo en la pestana Datos.

## Reglas aplicadas

- Producto es catalogo comercial, no unidad fisica.
- Cliente y proveedor viven separados.
- Desactivar conserva historial local y evita borrados operativos prematuros.
- No se cargan datos reales ni datos beta automaticamente.

## Pruebas

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

`npm test` incluye `scripts/test-masters.mjs`, que crea un JSON temporal, prueba altas, ediciones, desactivacion y busquedas de los tres maestros, y valida que las tablas sigan siendo exactamente las del contrato v2.
