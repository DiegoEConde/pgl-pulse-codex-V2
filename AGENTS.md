# Instrucciones del proyecto PGL Pulse v2

## Direccion del proyecto

PGL Pulse v2 es una redefinicion del producto. El sistema ya no debe modelarse como una gestion centrada en `unidad`.

El nuevo eje del negocio es:

- ventas;
- compras;
- stock;
- unidades identificables cuando corresponda;
- rutas;
- repartidores;
- comprobantes;
- pagos;
- caja real;
- rendiciones.

## Documentacion oficial

La fuente de verdad inicial esta en:

- `docs/DECISION-V2.md`
- `docs/MODELO-NEGOCIO.md`
- `docs/REGLAS-NEGOCIO.md`
- `docs/FLUJOS-OPERATIVOS.md`

Antes de crear migraciones, cambiar tablas o adaptar pantallas, verificar que la decision este contemplada en esos documentos.

Si el codigo entra en conflicto con la documentacion oficial, no se debe parchar el codigo para sostener una regla vieja: primero se revisa y actualiza la documentacion.

## Relacion con PGL Pulse v1

Se reutilizara la mayor parte posible del aspecto visual y de los componentes del proyecto anterior.

No se deben copiar automaticamente reglas de negocio de v1 si contradicen el modelo v2. En especial:

- la venta no debe depender de `unidad` como entidad principal;
- los pagos deben registrarse como movimientos reales;
- la ruta debe existir como entidad propia;
- la caja debe representar movimientos reales en USD y ARS;
- el repartidor debe poder rendir con diferencias.

## Base de datos

La base Supabase de v2 sera nueva. No usar las migraciones de v1 como esquema definitivo.

Los datos de v1 que podrian migrarse se definiran explicitamente, por ejemplo:

- productos;
- categorias;
- proveedores;
- clientes;
- vendedores;
- stock inicial validado.

No migrar ventas historicas, pagos o unidades sin una regla de conversion aprobada.

## Seguridad

Como v2 llevara caja real, pagos y rendiciones, no se debe considerar aceptable una arquitectura final sin usuarios, auditoria y reglas de acceso.

La autenticacion y las politicas de acceso deben disenarse antes de produccion.

## Estado actual

Scaffold local inicial creado a partir del frontend existente. Pendiente:

- definir `BASE-DATOS.md`;
- crear migraciones v2;
- ajustar contrato de datos;
- adaptar pantallas;
- crear pruebas v2.
