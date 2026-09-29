export type CatalogId = "products" | "suppliers" | "clients" | "sellers";
export type MasterRecord = { id: number; nombre: string; [key: string]: string | number | null | Record<string, string> };
export type CatalogField = { key: string; label: string; type?: "text" | "tel" | "time" | "number" | "textarea"; required?: boolean; maxLength?: number };
export type CatalogConfig = { label: string; singular: string; table: string; description: string; fields: CatalogField[] };
export const catalogConfig: Record<CatalogId, CatalogConfig> = {
  "products": {
    "label": "Productos",
    "singular": "Producto",
    "table": "producto",
    "description": "Modelos, marcas y categorías.",
    "fields": [
      {
        "key": "marca",
        "label": "Marca",
        "required": false,
        "maxLength": 80
      },
      {
        "key": "nombre",
        "label": "Nombre",
        "required": true,
        "maxLength": 150
      },
      {
        "key": "categoria",
        "label": "Categoría",
        "required": true,
        "maxLength": 80
      }
    ]
  },
  "suppliers": {
    "label": "Proveedores",
    "singular": "Proveedor",
    "table": "proveedor",
    "description": "Contactos, direcciones y horarios de proveedores.",
    "fields": [
      {
        "key": "nombre",
        "label": "Nombre",
        "required": true,
        "maxLength": 120
      },
      {
        "key": "contacto",
        "label": "Contacto",
        "maxLength": 120
      },
      {
        "key": "telefono",
        "label": "Teléfono",
        "type": "tel",
        "maxLength": 50
      },
      {
        "key": "direccion",
        "label": "Dirección",
        "type": "textarea"
      },
      {
        "key": "horario_desde",
        "label": "Horario desde",
        "type": "time"
      },
      {
        "key": "horario_hasta",
        "label": "Horario hasta",
        "type": "time"
      },
      {
        "key": "observaciones",
        "label": "Observaciones",
        "type": "textarea"
      }
    ]
  },
  "clients": {
    "label": "Clientes",
    "singular": "Cliente",
    "table": "cliente",
    "description": "Clientes, teléfonos y direcciones de entrega.",
    "fields": [
      {
        "key": "nombre",
        "label": "Nombre",
        "required": true,
        "maxLength": 120
      },
      {
        "key": "telefono",
        "label": "Teléfono",
        "type": "tel",
        "maxLength": 50
      },
      {
        "key": "direccion",
        "label": "Dirección",
        "type": "textarea"
      },
      {
        "key": "localidad",
        "label": "Localidad",
        "maxLength": 120
      },
      {
        "key": "observaciones",
        "label": "Observaciones",
        "type": "textarea"
      }
    ]
  },
  "sellers": {
    "label": "Vendedores",
    "singular": "Vendedor",
    "table": "vendedor",
    "description": "Vendedores, teléfonos y porcentajes de comisión.",
    "fields": [
      {
        "key": "nombre",
        "label": "Nombre",
        "required": true,
        "maxLength": 120
      },
      {
        "key": "telefono",
        "label": "Teléfono",
        "type": "tel",
        "maxLength": 50
      },
      {
        "key": "porcentaje_comision",
        "label": "Comisión (%)",
        "type": "number",
        "required": true
      },
      {
        "key": "observaciones",
        "label": "Observaciones",
        "type": "textarea"
      }
    ]
  }
};
