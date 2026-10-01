type Money = number;

type CatalogValue = string | number | null | Record<string, string>;

type Producto = {
  id: number;
  nombre: string;
  marca: string | null;
  categoria: string;
  categoria_id: number | null;
  atributos: Record<string, string> | null;
  [key: string]: CatalogValue;
};

type Proveedor = {
  id: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  direccion: string | null;
  horario_desde: string | null;
  horario_hasta: string | null;
  observaciones: string | null;
  [key: string]: CatalogValue;
};

type Cliente = {
  id: number;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  localidad: string | null;
  observaciones: string | null;
  [key: string]: CatalogValue;
};

type Vendedor = {
  id: number;
  nombre: string;
  telefono: string | null;
  porcentaje_comision: number;
  observaciones: string | null;
  [key: string]: CatalogValue;
};

type Pedido = {
  id: number;
  proveedor_id: number;
  estado: string;
  fecha_pedido: string | null;
  fecha_estimada: string | null;
  costo_envio_usd: Money;
  cerrado_en: string | null;
  observaciones: string | null;
};

type DetallePedido = {
  id: number;
  pedido_id: number;
  producto_id: number;
  color: string;
  cantidad: number;
  precio_costo_usd: Money;
  atributos?: Record<string, string> | null;
};

type Unidad = {
  id: number;
  producto_id: number;
  pedido_id: number;
  detalle_pedido_id: number;
  variante: string | null;
  ram: string | null;
  color: string;
  codigo: string | null;
  fecha_ingreso_stock: string;
  precio_costo_usd: Money;
  costo_envio_usd: Money;
  precio_sugerido_usd: Money | null;
  estado: string;
  fecha_venta: string | null;
  cliente_id: number | null;
  vendedor_id: number | null;
  precio_venta_usd: Money | null;
  comision_usd: Money | null;
  pago_verificado: boolean;
  fecha_entrega: string | null;
};

type ReporteConfig = {
  id: number;
  nombre?: string | null;
  configuracion?: Record<string, string> | null;
};

type DatabaseTables = {
  producto: Producto;
  proveedor: Proveedor;
  cliente: Cliente;
  vendedor: Vendedor;
  pedido: Pedido;
  detalle_pedido: DetallePedido;
  unidad: Unidad;
  reporte_config: ReporteConfig;
};

export type Tables<T extends keyof DatabaseTables> = DatabaseTables[T];
