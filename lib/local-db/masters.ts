import { createLocalDbClient, type LocalDbClientOptions } from "./client";
import type { ClienteRow, ProductoRow, ProveedorRow, UUID } from "./schema";

export type MasterKind = "productos" | "clientes" | "proveedores";

export interface MasterData {
  productos: ProductoRow[];
  clientes: ClienteRow[];
  proveedores: ProveedorRow[];
}

export type ProductMasterInput = {
  categoria: string;
  marca: string;
  modelo: string;
  nombre: string;
  atributos?: Record<string, unknown>;
  activo?: boolean;
};

export type ClientMasterInput = {
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  observaciones?: string | null;
  activo?: boolean;
};

export type SupplierMasterInput = {
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  horario?: string | null;
  observaciones?: string | null;
  activo?: boolean;
};

export type MasterInputMap = {
  productos: ProductMasterInput;
  clientes: ClientMasterInput;
  proveedores: SupplierMasterInput;
};

export type MasterRowMap = {
  productos: ProductoRow;
  clientes: ClienteRow;
  proveedores: ProveedorRow;
};

export type MasterInput<Kind extends MasterKind> = MasterInputMap[Kind];
export type MasterRow<Kind extends MasterKind> = MasterRowMap[Kind];

export function emptyMasterData(): MasterData {
  return {
    productos: [],
    clientes: [],
    proveedores: [],
  };
}

export async function listMasterData(options: LocalDbClientOptions = {}): Promise<MasterData> {
  const db = createLocalDbClient(options);
  const [productos, clientes, proveedores] = await Promise.all([
    db.listRows("productos"),
    db.listRows("clientes"),
    db.listRows("proveedores"),
  ]);

  return {
    productos: sortProducts(productos),
    clientes: sortNamedRows(clientes),
    proveedores: sortNamedRows(proveedores),
  };
}

export async function createMasterRecord<Kind extends MasterKind>(
  kind: Kind,
  input: MasterInput<Kind>,
  options: LocalDbClientOptions = {},
): Promise<MasterRow<Kind>> {
  const db = createLocalDbClient(options);
  const now = new Date().toISOString();

  if (kind === "productos") {
    const payload = normalizeProductInput(input as ProductMasterInput);
    await assertUniqueProduct(payload, options);

    return db.insertRow("productos", {
      categoria: payload.categoria,
      marca: payload.marca,
      modelo: payload.modelo,
      nombre: payload.nombre,
      atributos: payload.atributos,
      activo: payload.activo,
      creado_en: now,
      actualizado_en: now,
      creado_por: null,
      actualizado_por: null,
    }) as Promise<MasterRow<Kind>>;
  }

  if (kind === "clientes") {
    const payload = normalizeClientInput(input as ClientMasterInput);

    return db.insertRow("clientes", {
      nombre: payload.nombre,
      telefono: payload.telefono,
      direccion: payload.direccion,
      localidad: payload.localidad,
      observaciones: payload.observaciones,
      activo: payload.activo,
      creado_en: now,
      actualizado_en: now,
      creado_por: null,
      actualizado_por: null,
    }) as Promise<MasterRow<Kind>>;
  }

  const payload = normalizeSupplierInput(input as SupplierMasterInput);

  return db.insertRow("proveedores", {
    nombre: payload.nombre,
    telefono: payload.telefono,
    direccion: payload.direccion,
    horario: payload.horario,
    observaciones: payload.observaciones,
    activo: payload.activo,
    creado_en: now,
    actualizado_en: now,
    creado_por: null,
    actualizado_por: null,
  }) as Promise<MasterRow<Kind>>;
}

export async function updateMasterRecord<Kind extends MasterKind>(
  kind: Kind,
  id: UUID,
  input: Partial<MasterInput<Kind>>,
  options: LocalDbClientOptions = {},
): Promise<MasterRow<Kind>> {
  const db = createLocalDbClient(options);

  if (kind === "productos") {
    const current = await db.getRowById("productos", id);
    if (!current) throw new Error("Producto inexistente.");
    const merged = normalizeProductInput({ ...current, ...(input as Partial<ProductMasterInput>) });
    await assertUniqueProduct(merged, options, id);

    return db.updateRow("productos", id, {
      categoria: merged.categoria,
      marca: merged.marca,
      modelo: merged.modelo,
      nombre: merged.nombre,
      atributos: merged.atributos,
      activo: merged.activo,
    }) as Promise<MasterRow<Kind>>;
  }

  if (kind === "clientes") {
    const current = await db.getRowById("clientes", id);
    if (!current) throw new Error("Cliente inexistente.");
    const merged = normalizeClientInput({ ...current, ...(input as Partial<ClientMasterInput>) });

    return db.updateRow("clientes", id, {
      nombre: merged.nombre,
      telefono: merged.telefono,
      direccion: merged.direccion,
      localidad: merged.localidad,
      observaciones: merged.observaciones,
      activo: merged.activo,
    }) as Promise<MasterRow<Kind>>;
  }

  const current = await db.getRowById("proveedores", id);
  if (!current) throw new Error("Proveedor inexistente.");
  const merged = normalizeSupplierInput({ ...current, ...(input as Partial<SupplierMasterInput>) });

  return db.updateRow("proveedores", id, {
    nombre: merged.nombre,
    telefono: merged.telefono,
    direccion: merged.direccion,
    horario: merged.horario,
    observaciones: merged.observaciones,
    activo: merged.activo,
  }) as Promise<MasterRow<Kind>>;
}

export async function deactivateMasterRecord(
  kind: MasterKind,
  id: UUID,
  options: LocalDbClientOptions = {},
) {
  return updateMasterRecord(kind, id, { activo: false }, options);
}

export function searchMasterData(data: MasterData, query: string, activeFilter: "todos" | "activos" | "inactivos" = "todos"): MasterData {
  return {
    productos: filterRows(data.productos, query, activeFilter, (row) => [row.categoria, row.marca, row.modelo, row.nombre]),
    clientes: filterRows(data.clientes, query, activeFilter, (row) => [row.nombre, row.telefono, row.direccion, row.localidad]),
    proveedores: filterRows(data.proveedores, query, activeFilter, (row) => [row.nombre, row.telefono, row.direccion, row.horario]),
  };
}

function normalizeProductInput(input: ProductMasterInput): Required<ProductMasterInput> {
  const categoria = requiredText(input.categoria, "Categoria");
  const marca = requiredText(input.marca, "Marca");
  const modelo = requiredText(input.modelo, "Modelo");
  const nombre = requiredText(input.nombre, "Nombre");

  return {
    categoria,
    marca,
    modelo,
    nombre,
    atributos: isPlainObject(input.atributos) ? input.atributos : {},
    activo: input.activo ?? true,
  };
}

function normalizeClientInput(input: ClientMasterInput): Required<ClientMasterInput> {
  return {
    nombre: requiredText(input.nombre, "Nombre"),
    telefono: optionalText(input.telefono),
    direccion: optionalText(input.direccion),
    localidad: optionalText(input.localidad),
    observaciones: optionalText(input.observaciones),
    activo: input.activo ?? true,
  };
}

function normalizeSupplierInput(input: SupplierMasterInput): Required<SupplierMasterInput> {
  return {
    nombre: requiredText(input.nombre, "Nombre"),
    telefono: optionalText(input.telefono),
    direccion: optionalText(input.direccion),
    horario: optionalText(input.horario),
    observaciones: optionalText(input.observaciones),
    activo: input.activo ?? true,
  };
}

async function assertUniqueProduct(input: Required<ProductMasterInput>, options: LocalDbClientOptions, ignoredId?: UUID) {
  const db = createLocalDbClient(options);
  const products = await db.listRows("productos");
  const normalizedKey = productKey(input);
  const duplicated = products.some((product) => product.id !== ignoredId && productKey(product) === normalizedKey);

  if (duplicated) {
    throw new Error("Ya existe un producto con esa categoria, marca, modelo y nombre.");
  }
}

function productKey(product: Pick<ProductoRow, "categoria" | "marca" | "modelo" | "nombre">) {
  return [product.categoria, product.marca, product.modelo, product.nombre].map((value) => value.trim().toLowerCase()).join("|");
}

function filterRows<Row extends { activo: boolean }>(
  rows: Row[],
  query: string,
  activeFilter: "todos" | "activos" | "inactivos",
  fields: (row: Row) => Array<string | null | undefined>,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return rows.filter((row) => {
    if (activeFilter === "activos" && !row.activo) return false;
    if (activeFilter === "inactivos" && row.activo) return false;
    if (!normalizedQuery) return true;

    return fields(row).some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery));
  });
}

function requiredText(value: unknown, label: string) {
  const text = optionalText(value);
  if (!text) throw new Error(`${label} es obligatorio.`);
  return text;
}

function optionalText(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function sortNamedRows<Row extends { nombre: string }>(rows: Row[]) {
  return [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

function sortProducts(rows: ProductoRow[]) {
  return [...rows].sort((a, b) => [a.categoria, a.marca, a.modelo, a.nombre].join(" ").localeCompare([b.categoria, b.marca, b.modelo, b.nombre].join(" "), "es"));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
