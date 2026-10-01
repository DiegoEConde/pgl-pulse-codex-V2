import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(__dirname, "..");

export const localDbPaths = {
  contract: path.join(projectRoot, "docs", "base-datos-v2.json"),
  example: path.join(projectRoot, "data", "pgl-pulse-v2.local.example.json"),
  runtime: path.join(projectRoot, "data", "pgl-pulse-v2.local.json"),
  artifactsDir: path.join(projectRoot, "tests", "artifacts"),
};

export const sequenceKeys = [
  "compras.numero",
  "ventas.numero",
  "ventas.comprobante_numero",
];

export function resolveProjectPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
}

export function toProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function loadContract() {
  return readJson(localDbPaths.contract);
}

export function createEmptyTables(contract) {
  return Object.fromEntries(Object.keys(contract.tables).map((tableName) => [tableName, []]));
}

export function createDefaultSequences() {
  return Object.fromEntries(sequenceKeys.map((key) => [key, 0]));
}

export function buildLocalContractSnapshot(contract) {
  return {
    source: "docs/base-datos-v2.json",
    version: contract.version,
    tables: Object.keys(contract.tables),
    sequenceKeys,
    logicalIndexesSource: "docs/base-datos-v2.json tables.*.indexes",
    validation: [
      "tablas oficiales presentes y sin tablas extra",
      "claves primarias y campos obligatorios",
      "enums de estados basicos",
      "referencias entre tablas",
      "unicidad logica y secuencias",
      "roles logicos de vendedores y repartidores",
      "indices logicos definidos en el contrato",
    ],
  };
}

export function buildEmptyLocalDb(contract, { date = "2026-10-01" } = {}) {
  return {
    meta: {
      schema: contract.schema,
      version: contract.version,
      mode: contract.localPersistence.mode,
      createdAt: date,
      updatedAt: date,
      sourceContract: "docs/base-datos-v2.json",
      realDataAllowed: false,
      seedPolicy: contract.seedPolicy,
      notes: [
        "Archivo ejemplo para desarrollo local.",
        "No cargar datos reales hasta que los flujos principales funcionen y el usuario lo apruebe.",
        "No migrar automaticamente datos de v1/beta.",
        "Copiar a data/pgl-pulse-v2.local.json para usarlo como base local de trabajo.",
      ],
    },
    contract: buildLocalContractSnapshot(contract),
    sequences: createDefaultSequences(),
    tables: createEmptyTables(contract),
  };
}

export function createTechnicalFixture(contract) {
  const db = buildEmptyLocalDb(contract);
  const now = "2026-10-01T12:00:00.000Z";
  const ids = {
    admin: "00000000-0000-4000-8000-000000000001",
    seller: "00000000-0000-4000-8000-000000000002",
    courier: "00000000-0000-4000-8000-000000000003",
    client: "00000000-0000-4000-8000-000000000101",
    supplier: "00000000-0000-4000-8000-000000000201",
    product: "00000000-0000-4000-8000-000000000301",
    purchase: "00000000-0000-4000-8000-000000000401",
    purchaseItem: "00000000-0000-4000-8000-000000000402",
    sale: "00000000-0000-4000-8000-000000000501",
    saleItem: "00000000-0000-4000-8000-000000000502",
    unit: "00000000-0000-4000-8000-000000000601",
    route: "00000000-0000-4000-8000-000000000701",
    routeItem: "00000000-0000-4000-8000-000000000702",
    money: "00000000-0000-4000-8000-000000000801",
    history: "00000000-0000-4000-8000-000000000901",
  };

  db.meta.fixtureKind = "technical";
  db.meta.notes.unshift("Fixture tecnico ficticio para validar relaciones. No representa datos comerciales reales.");
  db.sequences = {
    "compras.numero": 1,
    "ventas.numero": 1,
    "ventas.comprobante_numero": 1,
  };

  db.tables.usuarios = [
    {
      id: ids.admin,
      auth_user_id: null,
      nombre: "Fixture Administrador",
      email: "admin.fixture@example.invalid",
      telefono: null,
      rol: "ADMINISTRADOR",
      activo: true,
      porcentaje_comision: 0,
      costo_envio_usd: 0,
      costo_envio_ars: 0,
      creado_en: now,
      actualizado_en: now,
    },
    {
      id: ids.seller,
      auth_user_id: null,
      nombre: "Fixture Vendedor",
      email: "vendedor.fixture@example.invalid",
      telefono: null,
      rol: "VENDEDOR",
      activo: true,
      porcentaje_comision: 5,
      costo_envio_usd: 0,
      costo_envio_ars: 0,
      creado_en: now,
      actualizado_en: now,
    },
    {
      id: ids.courier,
      auth_user_id: null,
      nombre: "Fixture Repartidor",
      email: "repartidor.fixture@example.invalid",
      telefono: null,
      rol: "REPARTIDOR",
      activo: true,
      porcentaje_comision: 0,
      costo_envio_usd: 3,
      costo_envio_ars: 0,
      creado_en: now,
      actualizado_en: now,
    },
  ];

  db.tables.clientes = [
    {
      id: ids.client,
      nombre: "Cliente Fixture",
      telefono: null,
      direccion: "Direccion fixture",
      localidad: "Localidad fixture",
      observaciones: null,
      activo: true,
      creado_en: now,
      actualizado_en: now,
      creado_por: ids.admin,
      actualizado_por: ids.admin,
    },
  ];

  db.tables.proveedores = [
    {
      id: ids.supplier,
      nombre: "Proveedor Fixture",
      telefono: null,
      direccion: "Direccion proveedor fixture",
      horario: null,
      observaciones: null,
      activo: true,
      creado_en: now,
      actualizado_en: now,
      creado_por: ids.admin,
      actualizado_por: ids.admin,
    },
  ];

  db.tables.productos = [
    {
      id: ids.product,
      categoria: "telefono",
      marca: "Marca Fixture",
      modelo: "Modelo Fixture",
      nombre: "Producto Fixture",
      atributos: { color: "fixture", almacenamiento: "128GB" },
      activo: true,
      creado_en: now,
      actualizado_en: now,
      creado_por: ids.admin,
      actualizado_por: ids.admin,
    },
  ];

  db.tables.compras = [
    {
      id: ids.purchase,
      numero: 1,
      proveedor_id: ids.supplier,
      repartidor_retiro_id: ids.courier,
      estado: "RECIBIDA_TOTAL",
      fecha_pedido: now,
      fecha_retiro_programada: now,
      moneda: "USD",
      total_estimado: 100,
      paga_al_retirar: true,
      observaciones: "Fixture tecnico",
      creado_en: now,
      actualizado_en: now,
      creado_por: ids.admin,
      actualizado_por: ids.admin,
    },
  ];

  db.tables.compra_items = [
    {
      id: ids.purchaseItem,
      compra_id: ids.purchase,
      producto_id: ids.product,
      venta_item_id: null,
      unidad_id: ids.unit,
      estado: "RECIBIDO_OFICINA",
      costo_original: 100,
      moneda: "USD",
      cancelado_en: null,
      creado_en: now,
      actualizado_en: now,
      creado_por: ids.admin,
      actualizado_por: ids.admin,
    },
  ];

  db.tables.ventas = [
    {
      id: ids.sale,
      numero: 1,
      cliente_id: ids.client,
      vendedor_id: ids.seller,
      estado: "CONFIRMADA",
      fecha: now,
      moneda_principal: "USD",
      total: 150,
      saldo_pendiente: 50,
      con_envio: true,
      direccion_entrega: "Direccion fixture",
      repartidor_entrega_id: ids.courier,
      comprobante_numero: 1,
      comprobante_estado: "EMITIDO",
      comprobante_snapshot: { numero: 1, estado: "EMITIDO", total: 150 },
      observaciones: "Fixture tecnico",
      creado_en: now,
      actualizado_en: now,
      creado_por: ids.seller,
      actualizado_por: ids.seller,
    },
  ];

  db.tables.venta_items = [
    {
      id: ids.saleItem,
      venta_id: ids.sale,
      producto_id: ids.product,
      unidad_id: ids.unit,
      compra_item_id: null,
      estado: "ASIGNADO_RUTA",
      precio_venta: 150,
      moneda: "USD",
      saldo_pendiente: 50,
      pagado_en: null,
      entregado_en: null,
      finalizado_en: null,
      creado_en: now,
      actualizado_en: now,
      creado_por: ids.seller,
      actualizado_por: ids.seller,
    },
  ];

  db.tables.unidades = [
    {
      id: ids.unit,
      producto_id: ids.product,
      estado: "EN_PODER_REPARTIDOR",
      imei: null,
      serie: null,
      color: "fixture",
      atributos: {},
      ubicacion_tipo: "REPARTIDOR",
      ubicacion_usuario_id: ids.courier,
      ubicacion_cliente_id: null,
      ubicacion_proveedor_id: null,
      compra_item_id: ids.purchaseItem,
      venta_item_id: ids.saleItem,
      finalizada_en: null,
      creado_en: now,
      actualizado_en: now,
      creado_por: ids.admin,
      actualizado_por: ids.admin,
    },
  ];

  db.tables.rutas = [
    {
      id: ids.route,
      repartidor_id: ids.courier,
      estado: "EN_CURSO",
      fecha_programada: now,
      iniciada_en: now,
      cerrada_en: null,
      observaciones: "Fixture tecnico",
      creado_en: now,
      actualizado_en: now,
      creado_por: ids.admin,
      actualizado_por: ids.admin,
    },
  ];

  db.tables.ruta_items = [
    {
      id: ids.routeItem,
      ruta_id: ids.route,
      orden: 1,
      tipo: "ENTREGAR_CLIENTE",
      destino_tipo: "CLIENTE",
      proveedor_id: null,
      cliente_id: ids.client,
      direccion: "Direccion fixture",
      compra_item_id: null,
      venta_item_id: ids.saleItem,
      unidad_id: ids.unit,
      importe_esperado: 50,
      moneda: "USD",
      estado: "PENDIENTE",
      realizado_en: null,
      creado_en: now,
      actualizado_en: now,
      creado_por: ids.admin,
      actualizado_por: ids.admin,
    },
  ];

  db.tables.movimientos_dinero = [
    {
      id: ids.money,
      tipo: "COBRO_CLIENTE",
      signo: "INGRESO",
      moneda: "USD",
      medio_pago: "EFECTIVO_USD",
      importe: 100,
      estado: "APLICADO_PARCIAL",
      fecha: now,
      venta_id: ids.sale,
      venta_item_id: ids.saleItem,
      compra_id: null,
      compra_item_id: null,
      ruta_id: ids.route,
      ruta_item_id: ids.routeItem,
      cliente_id: ids.client,
      proveedor_id: null,
      usuario_id: ids.seller,
      cierre_codigo: null,
      cotizacion_usada: null,
      snapshot: { saldo_anterior: 150, saldo_posterior: 50 },
      observaciones: "Fixture tecnico",
      creado_en: now,
      actualizado_en: now,
      creado_por: ids.seller,
      actualizado_por: ids.seller,
    },
  ];

  db.tables.historial_eventos = [
    {
      id: ids.history,
      entidad: "ventas",
      entidad_id: ids.sale,
      tipo: "VENTA_CONFIRMADA",
      antes: {},
      despues: { estado: "CONFIRMADA" },
      detalle: "Fixture tecnico",
      usuario_id: ids.seller,
      creado_en: now,
    },
  ];

  return db;
}

export function validateContract(contract) {
  const errors = [];
  const tableNames = Object.keys(contract.tables ?? {});

  if (!contract.schema) errors.push("Contrato sin schema.");
  if (!contract.version) errors.push("Contrato sin version.");
  if (!contract.enums || typeof contract.enums !== "object") errors.push("Contrato sin enums.");

  for (const tableName of tableNames) {
    const table = contract.tables[tableName];
    const columns = table.columns ?? {};

    for (const primaryColumn of table.primaryKey ?? []) {
      if (!columns[primaryColumn]) {
        errors.push(`${tableName}: clave primaria inexistente ${primaryColumn}.`);
      }
    }

    for (const [columnName, column] of Object.entries(columns)) {
      const enumName = getEnumName(column.check);
      if (enumName && !contract.enums[enumName]) {
        errors.push(`${tableName}.${columnName}: enum inexistente ${enumName}.`);
      }

      if (column.references) {
        const reference = parseReference(column.references);
        if (!reference) {
          errors.push(`${tableName}.${columnName}: referencia invalida ${column.references}.`);
        } else if (!contract.tables[reference.table]?.columns?.[reference.column]) {
          errors.push(`${tableName}.${columnName}: referencia a columna inexistente ${column.references}.`);
        }
      }
    }

    for (const index of table.indexes ?? []) {
      for (const indexColumn of index.columns ?? []) {
        if (!columns[indexColumn]) {
          errors.push(`${tableName}.${index.name}: indice sobre columna inexistente ${indexColumn}.`);
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateLocalDb(db, contract, { allowFixture = false } = {}) {
  const errors = [];
  const warnings = [];
  const contractResult = validateContract(contract);
  errors.push(...contractResult.errors);

  if (!db || typeof db !== "object" || Array.isArray(db)) {
    return { ok: false, errors: ["La base local no es un objeto JSON."], warnings };
  }

  if (db.meta?.schema !== contract.schema) {
    errors.push(`meta.schema esperado ${contract.schema}, recibido ${db.meta?.schema ?? "vacio"}.`);
  }
  if (db.meta?.version !== contract.version) {
    errors.push(`meta.version esperado ${contract.version}, recibido ${db.meta?.version ?? "vacio"}.`);
  }
  if (db.meta?.mode !== "local-json") {
    errors.push("meta.mode debe ser local-json.");
  }
  if (db.meta?.sourceContract !== "docs/base-datos-v2.json") {
    errors.push("meta.sourceContract debe apuntar a docs/base-datos-v2.json.");
  }
  if (db.meta?.realDataAllowed !== false) {
    errors.push("meta.realDataAllowed debe ser false en Sprint 1.");
  }
  if (db.meta?.fixtureKind && !allowFixture) {
    errors.push("Los fixtures tecnicos solo se validan con allowFixture=true.");
  }

  validateSequences(db, errors);
  validateTables(db, contract, errors);
  validateRows(db, contract, errors);
  validateReferences(db, contract, errors);
  validateLogicalRoles(db, errors);
  validateSequenceBounds(db, errors);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function formatValidationResult(result) {
  const lines = [];
  if (result.ok) {
    lines.push("OK: base local valida contra docs/base-datos-v2.json.");
  } else {
    lines.push("ERROR: base local invalida.");
    lines.push(...result.errors.map((error) => `- ${error}`));
  }

  if (result.warnings.length > 0) {
    lines.push("Advertencias:");
    lines.push(...result.warnings.map((warning) => `- ${warning}`));
  }

  return lines.join("\n");
}

function validateSequences(db, errors) {
  if (!db.sequences || typeof db.sequences !== "object" || Array.isArray(db.sequences)) {
    errors.push("sequences debe ser un objeto.");
    return;
  }

  for (const key of sequenceKeys) {
    const value = db.sequences[key];
    if (!Number.isInteger(value) || value < 0) {
      errors.push(`sequences.${key} debe ser un entero >= 0.`);
    }
  }

  for (const key of Object.keys(db.sequences)) {
    if (!sequenceKeys.includes(key)) {
      errors.push(`sequences.${key} no esta definido en el contrato local.`);
    }
  }
}

function validateTables(db, contract, errors) {
  if (!db.tables || typeof db.tables !== "object" || Array.isArray(db.tables)) {
    errors.push("tables debe ser un objeto.");
    return;
  }

  const expectedTables = Object.keys(contract.tables);
  for (const tableName of expectedTables) {
    if (!Array.isArray(db.tables[tableName])) {
      errors.push(`tables.${tableName} debe existir y ser un array.`);
    }
  }

  for (const tableName of Object.keys(db.tables)) {
    if (!contract.tables[tableName]) {
      errors.push(`tables.${tableName} no existe en el contrato oficial.`);
    }
  }
}

function validateRows(db, contract, errors) {
  if (!db.tables || typeof db.tables !== "object") return;

  for (const [tableName, table] of Object.entries(contract.tables)) {
    const rows = db.tables[tableName];
    if (!Array.isArray(rows)) continue;

    const columns = table.columns ?? {};
    const uniqueColumnSets = collectUniqueColumnSets(table);

    rows.forEach((row, rowIndex) => {
      const rowPath = `${tableName}[${rowIndex}]`;
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        errors.push(`${rowPath} debe ser un objeto.`);
        return;
      }

      for (const columnName of Object.keys(row)) {
        if (!columns[columnName]) {
          errors.push(`${rowPath}.${columnName} no existe en el contrato.`);
        }
      }

      for (const [columnName, column] of Object.entries(columns)) {
        validateColumnValue({
          value: row[columnName],
          column,
          columnName,
          path: `${rowPath}.${columnName}`,
          contract,
          errors,
        });
      }
    });

    for (const uniqueSet of uniqueColumnSets) {
      validateUniqueSet(rows, uniqueSet.columns, `${tableName}.${uniqueSet.name}`, errors);
    }
  }
}

function validateColumnValue({ value, column, columnName, path: valuePath, contract, errors }) {
  if (value === undefined) {
    if (column.nullable === false) {
      errors.push(`${valuePath} es obligatorio.`);
    }
    return;
  }

  if (value === null) {
    if (column.nullable === false) {
      errors.push(`${valuePath} no puede ser null.`);
    }
    return;
  }

  const type = column.type;
  if (type === "uuid" && !isUuid(value)) {
    errors.push(`${valuePath} debe ser UUID.`);
  } else if (type === "text" && typeof value !== "string") {
    errors.push(`${valuePath} debe ser texto.`);
  } else if (type === "boolean" && typeof value !== "boolean") {
    errors.push(`${valuePath} debe ser boolean.`);
  } else if ((type === "bigint" || type === "integer") && !Number.isInteger(value)) {
    errors.push(`${valuePath} debe ser entero.`);
  } else if (type === "timestamptz" && !isIsoDate(value)) {
    errors.push(`${valuePath} debe ser fecha ISO 8601.`);
  } else if (type === "jsonb" && !isPlainObject(value)) {
    errors.push(`${valuePath} debe ser objeto JSON.`);
  } else if (type?.startsWith("numeric") && !isFiniteNumber(value)) {
    errors.push(`${valuePath} debe ser numero.`);
  }

  const enumName = getEnumName(column.check);
  if (enumName && !contract.enums[enumName]?.includes(value)) {
    errors.push(`${valuePath} debe pertenecer a enum.${enumName}.`);
  }

  const check = column.check ?? "";
  if (isFiniteNumber(value) && />=\s*0/.test(check) && value < 0) {
    errors.push(`${valuePath} debe ser >= 0.`);
  }
  if (isFiniteNumber(value) && new RegExp(`${escapeRegExp(columnName)}\\s*>\\s*0`).test(check) && value <= 0) {
    errors.push(`${valuePath} debe ser > 0.`);
  }
}

function validateReferences(db, contract, errors) {
  if (!db.tables || typeof db.tables !== "object") return;

  for (const [tableName, table] of Object.entries(contract.tables)) {
    const rows = db.tables[tableName];
    if (!Array.isArray(rows)) continue;

    for (const [columnName, column] of Object.entries(table.columns ?? {})) {
      if (!column.references) continue;
      const reference = parseReference(column.references);
      if (!reference || !Array.isArray(db.tables[reference.table])) continue;

      const validValues = new Set(db.tables[reference.table].map((row) => row?.[reference.column]));
      rows.forEach((row, rowIndex) => {
        const value = row?.[columnName];
        if (value !== null && value !== undefined && !validValues.has(value)) {
          errors.push(`${tableName}[${rowIndex}].${columnName} referencia ${column.references} inexistente.`);
        }
      });
    }
  }
}

function validateLogicalRoles(db, errors) {
  const usersById = new Map((db.tables?.usuarios ?? []).map((user) => [user.id, user]));

  for (const [index, purchase] of (db.tables?.compras ?? []).entries()) {
    if (purchase.repartidor_retiro_id) {
      validateUserRole(usersById, purchase.repartidor_retiro_id, ["REPARTIDOR"], `compras[${index}].repartidor_retiro_id`, errors);
    }
  }

  for (const [index, sale] of (db.tables?.ventas ?? []).entries()) {
    validateUserRole(usersById, sale.vendedor_id, ["VENDEDOR", "ADMINISTRADOR"], `ventas[${index}].vendedor_id`, errors);
    if (sale.repartidor_entrega_id) {
      validateUserRole(usersById, sale.repartidor_entrega_id, ["REPARTIDOR"], `ventas[${index}].repartidor_entrega_id`, errors);
    }
  }

  for (const [index, route] of (db.tables?.rutas ?? []).entries()) {
    validateUserRole(usersById, route.repartidor_id, ["REPARTIDOR"], `rutas[${index}].repartidor_id`, errors);
  }
}

function validateSequenceBounds(db, errors) {
  const sequenceTargets = [
    ["compras.numero", "compras", "numero"],
    ["ventas.numero", "ventas", "numero"],
    ["ventas.comprobante_numero", "ventas", "comprobante_numero"],
  ];

  for (const [sequenceKey, tableName, columnName] of sequenceTargets) {
    const maxValue = Math.max(0, ...(db.tables?.[tableName] ?? []).map((row) => row?.[columnName] ?? 0));
    if ((db.sequences?.[sequenceKey] ?? -1) < maxValue) {
      errors.push(`sequences.${sequenceKey} debe ser >= max(${tableName}.${columnName}) (${maxValue}).`);
    }
  }
}

function validateUserRole(usersById, userId, allowedRoles, label, errors) {
  const user = usersById.get(userId);
  if (!user) {
    errors.push(`${label} no existe en usuarios.`);
    return;
  }

  if (!allowedRoles.includes(user.rol)) {
    errors.push(`${label} debe tener rol ${allowedRoles.join(" o ")}.`);
  }
}

function collectUniqueColumnSets(table) {
  const sets = [];

  if (table.primaryKey?.length) {
    sets.push({ name: "primaryKey", columns: table.primaryKey });
  }

  for (const [columnName, column] of Object.entries(table.columns ?? {})) {
    if (column.unique) {
      sets.push({ name: `${columnName}_unique`, columns: [columnName] });
    }
  }

  for (const index of table.indexes ?? []) {
    if (index.unique) {
      sets.push({ name: index.name, columns: index.columns ?? [] });
    }
  }

  return sets;
}

function validateUniqueSet(rows, columns, label, errors) {
  const seen = new Map();
  rows.forEach((row, index) => {
    const values = columns.map((column) => row?.[column]);
    if (values.some((value) => value === null || value === undefined)) return;
    const key = JSON.stringify(values);
    if (seen.has(key)) {
      errors.push(`${label} duplicado entre filas ${seen.get(key)} y ${index}.`);
    } else {
      seen.set(key, index);
    }
  });
}

function parseReference(reference) {
  const [table, column] = String(reference).split(".");
  if (!table || !column) return null;
  return { table, column };
}

function getEnumName(check) {
  return String(check ?? "").match(/enum\.([a-zA-Z0-9_]+)/)?.[1] ?? null;
}

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
