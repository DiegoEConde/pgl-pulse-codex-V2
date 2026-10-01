import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  LOCAL_DB_SCHEMA,
  LOCAL_DB_VERSION,
  LOCAL_SEQUENCE_KEYS,
  LOCAL_TABLE_NAMES,
  type LocalDbFile,
  type LocalDbInsert,
  type LocalDbRow,
  type LocalDbStatus,
  type LocalDbTableCounts,
  type LocalDbUpdate,
  type LocalSequenceKey,
  type LocalTableName,
  type UUID,
} from "./schema";

const DEFAULT_DB_PATH = "data/pgl-pulse-v2.local.json";
const DEFAULT_TEMPLATE_PATH = "data/pgl-pulse-v2.local.example.json";

export interface LocalDbClientOptions {
  filePath?: string;
  templatePath?: string;
}

export interface LocalDbClient {
  get filePath(): string;
  ensure(): Promise<LocalDbFile>;
  read(): Promise<LocalDbFile>;
  write(db: LocalDbFile): Promise<void>;
  resetFromTemplate(): Promise<LocalDbFile>;
  listRows<TableName extends LocalTableName>(tableName: TableName): Promise<LocalDbRow<TableName>[]>;
  getRowById<TableName extends LocalTableName>(tableName: TableName, id: UUID): Promise<LocalDbRow<TableName> | null>;
  insertRow<TableName extends LocalTableName>(tableName: TableName, row: LocalDbInsert<TableName>): Promise<LocalDbRow<TableName>>;
  updateRow<TableName extends LocalTableName>(tableName: TableName, id: UUID, changes: LocalDbUpdate<TableName>): Promise<LocalDbRow<TableName>>;
  deleteRow<TableName extends LocalTableName>(tableName: TableName, id: UUID): Promise<boolean>;
  nextSequence(key: LocalSequenceKey): Promise<number>;
  status(): Promise<LocalDbStatus>;
}

export function createLocalDbClient(options: LocalDbClientOptions = {}): LocalDbClient {
  return {
    get filePath() {
      return toProjectPath(resolveDbPath(options));
    },
    ensure: () => ensureLocalDb(options),
    read: () => readLocalDb(options),
    write: (db) => writeLocalDb(db, options),
    resetFromTemplate: () => resetLocalDbFromTemplate(options),
    listRows: (tableName) => listRows(tableName, options),
    getRowById: (tableName, id) => getRowById(tableName, id, options),
    insertRow: (tableName, row) => insertRow(tableName, row, options),
    updateRow: (tableName, id, changes) => updateRow(tableName, id, changes, options),
    deleteRow: (tableName, id) => deleteRow(tableName, id, options),
    nextSequence: (key) => nextSequence(key, options),
    status: () => getLocalDbStatus(options),
  };
}

export const localDb = createLocalDbClient();

export async function ensureLocalDb(options: LocalDbClientOptions = {}): Promise<LocalDbFile> {
  try {
    return await readLocalDb(options);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return resetLocalDbFromTemplate(options);
    }

    throw error;
  }
}

export async function readLocalDb(options: LocalDbClientOptions = {}): Promise<LocalDbFile> {
  const filePath = resolveDbPath(options);
  const raw = await fs.readFile(filePath, "utf8");
  const db = JSON.parse(raw) as unknown;
  assertLocalDbFile(db, filePath);
  return db;
}

export async function writeLocalDb(db: LocalDbFile, options: LocalDbClientOptions = {}): Promise<void> {
  assertLocalDbFile(db, resolveDbPath(options));
  const filePath = resolveDbPath(options);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tmpPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  await fs.rename(tmpPath, filePath);
}

export async function resetLocalDbFromTemplate(options: LocalDbClientOptions = {}): Promise<LocalDbFile> {
  const templatePath = resolveTemplatePath(options);
  const targetPath = resolveDbPath(options);
  const raw = await fs.readFile(templatePath, "utf8");
  const db = JSON.parse(raw) as LocalDbFile;

  db.meta.resetAt = new Date().toISOString();
  db.meta.runtimePath = toProjectPath(targetPath);
  assertLocalDbFile(db, templatePath);
  await writeLocalDb(db, options);

  return clone(db);
}

export async function listRows<TableName extends LocalTableName>(
  tableName: TableName,
  options: LocalDbClientOptions = {},
): Promise<LocalDbRow<TableName>[]> {
  const db = await ensureLocalDb(options);
  assertKnownTable(tableName);
  return clone(db.tables[tableName]);
}

export async function getRowById<TableName extends LocalTableName>(
  tableName: TableName,
  id: UUID,
  options: LocalDbClientOptions = {},
): Promise<LocalDbRow<TableName> | null> {
  const rows = await listRows(tableName, options);
  return rows.find((row) => row.id === id) ?? null;
}

export async function insertRow<TableName extends LocalTableName>(
  tableName: TableName,
  row: LocalDbInsert<TableName>,
  options: LocalDbClientOptions = {},
): Promise<LocalDbRow<TableName>> {
  assertKnownTable(tableName);
  return mutateLocalDb(options, (db) => {
    const rows = db.tables[tableName];
    const nextRow = { ...row, id: row.id ?? randomUUID() } as LocalDbRow<TableName>;

    if (rows.some((current) => current.id === nextRow.id)) {
      throw new Error(`Ya existe ${tableName}.${nextRow.id}.`);
    }

    rows.push(nextRow);
    return nextRow;
  });
}

export async function updateRow<TableName extends LocalTableName>(
  tableName: TableName,
  id: UUID,
  changes: LocalDbUpdate<TableName>,
  options: LocalDbClientOptions = {},
): Promise<LocalDbRow<TableName>> {
  assertKnownTable(tableName);
  return mutateLocalDb(options, (db) => {
    const rows = db.tables[tableName];
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) throw new Error(`No existe ${tableName}.${id}.`);

    const updated = {
      ...rows[index],
      ...changes,
      id,
    } as LocalDbRow<TableName>;

    if ("actualizado_en" in updated && !("actualizado_en" in changes)) {
      updated.actualizado_en = new Date().toISOString();
    }

    rows[index] = updated;
    return updated;
  });
}

export async function deleteRow<TableName extends LocalTableName>(
  tableName: TableName,
  id: UUID,
  options: LocalDbClientOptions = {},
): Promise<boolean> {
  assertKnownTable(tableName);
  return mutateLocalDb(options, (db) => {
    const rows = db.tables[tableName];
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) return false;
    rows.splice(index, 1);
    return true;
  });
}

export async function nextSequence(key: LocalSequenceKey, options: LocalDbClientOptions = {}): Promise<number> {
  assertKnownSequence(key);
  return mutateLocalDb(options, (db) => {
    db.sequences[key] += 1;
    return db.sequences[key];
  });
}

export async function getLocalDbStatus(options: LocalDbClientOptions = {}): Promise<LocalDbStatus> {
  const filePath = toProjectPath(resolveDbPath(options));
  const emptyCounts = createEmptyCounts();

  try {
    const db = await ensureLocalDb(options);
    const tables = LOCAL_TABLE_NAMES.reduce((counts, tableName) => {
      counts[tableName] = db.tables[tableName].length;
      return counts;
    }, createEmptyCounts());
    const rowCount = Object.values(tables).reduce((total, value) => total + value, 0);

    return {
      connected: true,
      mode: "local-json",
      filePath,
      sourceContract: db.meta.sourceContract,
      tableCount: LOCAL_TABLE_NAMES.length,
      rowCount,
      tables,
      issue: null,
    };
  } catch (error) {
    return {
      connected: false,
      mode: "local-json",
      filePath,
      sourceContract: "docs/base-datos-v2.json",
      tableCount: LOCAL_TABLE_NAMES.length,
      rowCount: 0,
      tables: emptyCounts,
      issue: error instanceof Error ? error.message : "No se pudo leer la base local.",
    };
  }
}

async function mutateLocalDb<Result>(
  options: LocalDbClientOptions,
  mutator: (db: LocalDbFile) => Result,
): Promise<Result> {
  const db = await ensureLocalDb(options);
  const result = mutator(db);
  db.meta.updatedAt = new Date().toISOString();
  await writeLocalDb(db, options);
  return clone(result);
}

function assertLocalDbFile(value: unknown, filePath: string): asserts value is LocalDbFile {
  if (!isRecord(value)) throw new Error(`${toProjectPath(filePath)} no contiene un objeto JSON.`);
  if (!isRecord(value.meta)) throw new Error(`${toProjectPath(filePath)} no tiene meta.`);
  if (value.meta.schema !== LOCAL_DB_SCHEMA) throw new Error(`${toProjectPath(filePath)} no es ${LOCAL_DB_SCHEMA}.`);
  if (value.meta.version !== LOCAL_DB_VERSION) throw new Error(`${toProjectPath(filePath)} no es version ${LOCAL_DB_VERSION}.`);
  if (value.meta.mode !== "local-json") throw new Error(`${toProjectPath(filePath)} no esta en modo local-json.`);
  if (value.meta.realDataAllowed !== false) throw new Error(`${toProjectPath(filePath)} no puede habilitar datos reales en Sprint 2.`);

  if (!isRecord(value.sequences)) throw new Error(`${toProjectPath(filePath)} no tiene sequences.`);
  for (const sequenceKey of LOCAL_SEQUENCE_KEYS) {
    if (!Number.isInteger(value.sequences[sequenceKey])) {
      throw new Error(`${toProjectPath(filePath)} no tiene secuencia ${sequenceKey}.`);
    }
  }

  if (!isRecord(value.tables)) throw new Error(`${toProjectPath(filePath)} no tiene tables.`);
  const tables = value.tables as Partial<Record<LocalTableName, unknown>>;
  for (const tableName of LOCAL_TABLE_NAMES) {
    if (!Array.isArray(tables[tableName])) {
      throw new Error(`${toProjectPath(filePath)} no tiene tabla ${tableName}.`);
    }
  }

  for (const tableName of Object.keys(value.tables)) {
    if (!LOCAL_TABLE_NAMES.includes(tableName as LocalTableName)) {
      throw new Error(`${toProjectPath(filePath)} contiene tabla no oficial ${tableName}.`);
    }
  }
}

function assertKnownTable(tableName: LocalTableName) {
  if (!LOCAL_TABLE_NAMES.includes(tableName)) {
    throw new Error(`Tabla local no soportada: ${String(tableName)}.`);
  }
}

function assertKnownSequence(key: LocalSequenceKey) {
  if (!LOCAL_SEQUENCE_KEYS.includes(key)) {
    throw new Error(`Secuencia local no soportada: ${String(key)}.`);
  }
}

function resolveDbPath(options: LocalDbClientOptions) {
  return resolveProjectPath(options.filePath ?? process.env.PGL_LOCAL_DB_PATH ?? DEFAULT_DB_PATH);
}

function resolveTemplatePath(options: LocalDbClientOptions) {
  return resolveProjectPath(options.templatePath ?? process.env.PGL_LOCAL_DB_TEMPLATE ?? DEFAULT_TEMPLATE_PATH);
}

function resolveProjectPath(filePath: string) {
  return path.isAbsolute(filePath) ? filePath : path.join(/*turbopackIgnore: true*/ process.cwd(), filePath);
}

function toProjectPath(filePath: string) {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
}

function createEmptyCounts(): LocalDbTableCounts {
  return LOCAL_TABLE_NAMES.reduce((counts, tableName) => {
    counts[tableName] = 0;
    return counts;
  }, {} as LocalDbTableCounts);
}

function clone<Value>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
