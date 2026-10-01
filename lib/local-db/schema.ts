export const LOCAL_TABLE_NAMES = [
  "usuarios",
  "clientes",
  "proveedores",
  "productos",
  "compras",
  "compra_items",
  "ventas",
  "venta_items",
  "unidades",
  "rutas",
  "ruta_items",
  "movimientos_dinero",
  "historial_eventos",
] as const;

export const LOCAL_SEQUENCE_KEYS = [
  "compras.numero",
  "ventas.numero",
  "ventas.comprobante_numero",
] as const;

export const LOCAL_DB_SCHEMA = "pgl_pulse_v2";
export const LOCAL_DB_VERSION = "0.1.0";

export type LocalTableName = (typeof LOCAL_TABLE_NAMES)[number];
export type LocalSequenceKey = (typeof LOCAL_SEQUENCE_KEYS)[number];
export type UUID = string;
export type IsoDateString = string;
export type JsonObject = Record<string, unknown>;

export type RolUsuario = "ADMINISTRADOR" | "VENDEDOR" | "REPARTIDOR";
export type Moneda = "USD" | "ARS";
export type MedioPago = "EFECTIVO_USD" | "EFECTIVO_ARS" | "TRANSFERENCIA_ARS" | "CREDITO" | "DEBITO";
export type VentaEstado = "BORRADOR" | "CONFIRMADA" | "FINALIZADA" | "CANCELADA";
export type VentaItemEstado =
  | "PENDIENTE_ABASTECIMIENTO"
  | "RESERVADO_OFICINA"
  | "ASIGNADO_RUTA"
  | "EN_PODER_REPARTIDOR"
  | "ENTREGADO"
  | "FINALIZADO"
  | "CANCELADO"
  | "GARANTIA";
export type CompraEstado =
  | "BORRADOR"
  | "PEDIDA"
  | "EN_RETIRO"
  | "RECIBIDA_PARCIAL"
  | "RECIBIDA_TOTAL"
  | "CERRADA"
  | "CANCELADA";
export type CompraItemEstado =
  | "PEDIDO"
  | "ASIGNADO_RUTA"
  | "RETIRADO_PROVEEDOR"
  | "EN_PODER_REPARTIDOR"
  | "RECIBIDO_OFICINA"
  | "ENTREGADO_DIRECTO"
  | "CANCELADO";
export type UnidadEstado =
  | "ESPERADA_PROVEEDOR"
  | "EN_PODER_REPARTIDOR"
  | "EN_OFICINA_DISPONIBLE"
  | "EN_OFICINA_RESERVADA"
  | "ENTREGADA"
  | "FINALIZADA"
  | "GARANTIA"
  | "CANCELADA";
export type UbicacionTipo = "PROVEEDOR" | "REPARTIDOR" | "OFICINA" | "CLIENTE";
export type RutaEstado =
  | "BORRADOR"
  | "PROGRAMADA"
  | "EN_CURSO"
  | "ABIERTA_CON_PENDIENTES"
  | "PARCIALMENTE_RENDIDA"
  | "RENDIDA"
  | "CANCELADA";
export type RutaItemTipo =
  | "RETIRAR_PROVEEDOR"
  | "PAGAR_PROVEEDOR"
  | "ENTREGAR_CLIENTE"
  | "COBRAR_CLIENTE"
  | "RENDIR_OFICINA";
export type RutaItemDestinoTipo = "PROVEEDOR" | "CLIENTE" | "OFICINA" | "OTRO";
export type RutaItemEstado = "PENDIENTE" | "CONFIRMADA" | "ABIERTA" | "RENDIDA" | "OMITIDA" | "CANCELADA";
export type MovimientoDineroTipo =
  | "COBRO_CLIENTE"
  | "PAGO_PROVEEDOR"
  | "ENTREGA_REPARTIDOR"
  | "RENDICION_REPARTIDOR"
  | "DIFERENCIA_RENDICION"
  | "AJUSTE"
  | "DEVOLUCION"
  | "CIERRE_CAJA";
export type MovimientoDineroSigno = "INGRESO" | "EGRESO" | "NEUTRO";
export type MovimientoDineroEstado = "REGISTRADO" | "APLICADO_PARCIAL" | "APLICADO_TOTAL" | "ANULADO";
export type ComprobanteEstado = "EMITIDO" | "PAGADO" | "EDITADO" | "ANULADO";
export type HistorialEntidad = Exclude<LocalTableName, "historial_eventos">;

export interface UsuarioRow {
  id: UUID;
  auth_user_id: UUID | null;
  nombre: string;
  email: string | null;
  telefono: string | null;
  rol: RolUsuario;
  activo: boolean;
  porcentaje_comision: number;
  costo_envio_usd: number;
  costo_envio_ars: number;
  creado_en: IsoDateString;
  actualizado_en: IsoDateString;
}

export interface ClienteRow {
  id: UUID;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  localidad: string | null;
  observaciones: string | null;
  activo: boolean;
  creado_en: IsoDateString;
  actualizado_en: IsoDateString;
  creado_por: UUID | null;
  actualizado_por: UUID | null;
}

export interface ProveedorRow {
  id: UUID;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  horario: string | null;
  observaciones: string | null;
  activo: boolean;
  creado_en: IsoDateString;
  actualizado_en: IsoDateString;
  creado_por: UUID | null;
  actualizado_por: UUID | null;
}

export interface ProductoRow {
  id: UUID;
  categoria: string;
  marca: string;
  modelo: string;
  nombre: string;
  atributos: JsonObject;
  activo: boolean;
  creado_en: IsoDateString;
  actualizado_en: IsoDateString;
  creado_por: UUID | null;
  actualizado_por: UUID | null;
}

export interface CompraRow {
  id: UUID;
  numero: number;
  proveedor_id: UUID;
  repartidor_retiro_id: UUID | null;
  estado: CompraEstado;
  fecha_pedido: IsoDateString;
  fecha_retiro_programada: IsoDateString | null;
  moneda: Moneda;
  total_estimado: number;
  paga_al_retirar: boolean;
  observaciones: string | null;
  creado_en: IsoDateString;
  actualizado_en: IsoDateString;
  creado_por: UUID | null;
  actualizado_por: UUID | null;
}

export interface CompraItemRow {
  id: UUID;
  compra_id: UUID;
  producto_id: UUID;
  venta_item_id: UUID | null;
  unidad_id: UUID | null;
  estado: CompraItemEstado;
  costo_original: number;
  moneda: Moneda;
  cancelado_en: IsoDateString | null;
  creado_en: IsoDateString;
  actualizado_en: IsoDateString;
  creado_por: UUID | null;
  actualizado_por: UUID | null;
}

export interface VentaRow {
  id: UUID;
  numero: number;
  cliente_id: UUID;
  vendedor_id: UUID;
  estado: VentaEstado;
  fecha: IsoDateString;
  moneda_principal: Moneda;
  total: number;
  saldo_pendiente: number;
  con_envio: boolean;
  direccion_entrega: string | null;
  repartidor_entrega_id: UUID | null;
  comprobante_numero: number | null;
  comprobante_estado: ComprobanteEstado | null;
  comprobante_snapshot: JsonObject;
  observaciones: string | null;
  creado_en: IsoDateString;
  actualizado_en: IsoDateString;
  creado_por: UUID | null;
  actualizado_por: UUID | null;
}

export interface VentaItemRow {
  id: UUID;
  venta_id: UUID;
  producto_id: UUID;
  unidad_id: UUID | null;
  compra_item_id: UUID | null;
  estado: VentaItemEstado;
  precio_venta: number;
  moneda: Moneda;
  saldo_pendiente: number;
  pagado_en: IsoDateString | null;
  entregado_en: IsoDateString | null;
  finalizado_en: IsoDateString | null;
  creado_en: IsoDateString;
  actualizado_en: IsoDateString;
  creado_por: UUID | null;
  actualizado_por: UUID | null;
}

export interface UnidadRow {
  id: UUID;
  producto_id: UUID;
  estado: UnidadEstado;
  imei: string | null;
  serie: string | null;
  color: string | null;
  atributos: JsonObject;
  ubicacion_tipo: UbicacionTipo;
  ubicacion_usuario_id: UUID | null;
  ubicacion_cliente_id: UUID | null;
  ubicacion_proveedor_id: UUID | null;
  compra_item_id: UUID | null;
  venta_item_id: UUID | null;
  finalizada_en: IsoDateString | null;
  creado_en: IsoDateString;
  actualizado_en: IsoDateString;
  creado_por: UUID | null;
  actualizado_por: UUID | null;
}

export interface RutaRow {
  id: UUID;
  repartidor_id: UUID;
  estado: RutaEstado;
  fecha_programada: IsoDateString;
  iniciada_en: IsoDateString | null;
  cerrada_en: IsoDateString | null;
  observaciones: string | null;
  creado_en: IsoDateString;
  actualizado_en: IsoDateString;
  creado_por: UUID | null;
  actualizado_por: UUID | null;
}

export interface RutaItemRow {
  id: UUID;
  ruta_id: UUID;
  orden: number;
  tipo: RutaItemTipo;
  destino_tipo: RutaItemDestinoTipo;
  proveedor_id: UUID | null;
  cliente_id: UUID | null;
  direccion: string | null;
  compra_item_id: UUID | null;
  venta_item_id: UUID | null;
  unidad_id: UUID | null;
  importe_esperado: number;
  moneda: Moneda | null;
  estado: RutaItemEstado;
  realizado_en: IsoDateString | null;
  creado_en: IsoDateString;
  actualizado_en: IsoDateString;
  creado_por: UUID | null;
  actualizado_por: UUID | null;
}

export interface MovimientoDineroRow {
  id: UUID;
  tipo: MovimientoDineroTipo;
  signo: MovimientoDineroSigno;
  moneda: Moneda;
  medio_pago: MedioPago;
  importe: number;
  estado: MovimientoDineroEstado;
  fecha: IsoDateString;
  venta_id: UUID | null;
  venta_item_id: UUID | null;
  compra_id: UUID | null;
  compra_item_id: UUID | null;
  ruta_id: UUID | null;
  ruta_item_id: UUID | null;
  cliente_id: UUID | null;
  proveedor_id: UUID | null;
  usuario_id: UUID | null;
  cierre_codigo: string | null;
  cotizacion_usada: number | null;
  snapshot: JsonObject;
  observaciones: string | null;
  creado_en: IsoDateString;
  actualizado_en: IsoDateString;
  creado_por: UUID | null;
  actualizado_por: UUID | null;
}

export interface HistorialEventoRow {
  id: UUID;
  entidad: HistorialEntidad;
  entidad_id: UUID;
  tipo: string;
  antes: JsonObject;
  despues: JsonObject;
  detalle: string | null;
  usuario_id: UUID | null;
  creado_en: IsoDateString;
}

export interface LocalDbRowMap {
  usuarios: UsuarioRow;
  clientes: ClienteRow;
  proveedores: ProveedorRow;
  productos: ProductoRow;
  compras: CompraRow;
  compra_items: CompraItemRow;
  ventas: VentaRow;
  venta_items: VentaItemRow;
  unidades: UnidadRow;
  rutas: RutaRow;
  ruta_items: RutaItemRow;
  movimientos_dinero: MovimientoDineroRow;
  historial_eventos: HistorialEventoRow;
}

export type LocalDbTables = {
  [TableName in LocalTableName]: LocalDbRowMap[TableName][];
};

export type LocalDbRow<TableName extends LocalTableName> = LocalDbRowMap[TableName];
export type LocalDbInsert<TableName extends LocalTableName> = Omit<LocalDbRowMap[TableName], "id"> & { id?: UUID };
export type LocalDbUpdate<TableName extends LocalTableName> = Partial<Omit<LocalDbRowMap[TableName], "id">>;

export interface LocalDbFile {
  meta: {
    schema: typeof LOCAL_DB_SCHEMA;
    version: typeof LOCAL_DB_VERSION;
    mode: "local-json";
    createdAt: string;
    updatedAt: string;
    sourceContract: "docs/base-datos-v2.json";
    realDataAllowed: false;
    seedPolicy?: JsonObject;
    fixtureKind?: string;
    resetAt?: string;
    runtimePath?: string;
    notes: string[];
    [key: string]: unknown;
  };
  contract?: JsonObject;
  sequences: Record<LocalSequenceKey, number>;
  tables: LocalDbTables;
}

export type LocalDbTableCounts = Record<LocalTableName, number>;

export interface LocalDbStatus {
  connected: boolean;
  mode: "local-json";
  filePath: string;
  sourceContract: string;
  tableCount: number;
  rowCount: number;
  tables: LocalDbTableCounts;
  issue: string | null;
}
