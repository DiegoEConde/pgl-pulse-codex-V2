import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import {
  createTechnicalFixture,
  formatValidationResult,
  loadContract,
  localDbPaths,
  projectRoot,
  readJson,
  validateLocalDb,
  writeJson,
} from "./local-db-utils.mjs";

const require = createRequire(import.meta.url);
const compiledDir = path.join(localDbPaths.artifactsDir, "compiled-local-db");
const testDbPath = path.join(localDbPaths.artifactsDir, "sprint2-data-layer.local.json");
const tscPath = path.join(projectRoot, "node_modules", "typescript", "bin", "tsc");

fs.rmSync(compiledDir, { recursive: true, force: true });
fs.mkdirSync(compiledDir, { recursive: true });

const compile = spawnSync(process.execPath, [
  tscPath,
  "--outDir",
  compiledDir,
  "--rootDir",
  projectRoot,
  "--module",
  "CommonJS",
  "--moduleResolution",
  "Node",
  "--target",
  "ES2022",
  "--lib",
  "ES2022,DOM",
  "--types",
  "node",
  "--strict",
  "--skipLibCheck",
  "--esModuleInterop",
  "lib/local-db/schema.ts",
  "lib/local-db/client.ts",
], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const { createLocalDbClient } = require(path.join(compiledDir, "lib", "local-db", "client.js"));
const { LOCAL_TABLE_NAMES } = require(path.join(compiledDir, "lib", "local-db", "schema.js"));

const contract = loadContract();
const fixture = createTechnicalFixture(contract);
const dbClient = createLocalDbClient({
  filePath: testDbPath,
  templatePath: localDbPaths.example,
});

await dbClient.resetFromTemplate();

fixture.tables.compras[0].numero = await dbClient.nextSequence("compras.numero");
fixture.tables.ventas[0].numero = await dbClient.nextSequence("ventas.numero");
fixture.tables.ventas[0].comprobante_numero = await dbClient.nextSequence("ventas.comprobante_numero");
fixture.tables.ventas[0].comprobante_snapshot = {
  numero: fixture.tables.ventas[0].comprobante_numero,
  estado: "EMITIDO",
  total: fixture.tables.ventas[0].total,
};

for (const tableName of LOCAL_TABLE_NAMES) {
  const rows = fixture.tables[tableName];
  for (const row of rows) {
    await dbClient.insertRow(tableName, row);
  }

  const storedRows = await dbClient.listRows(tableName);
  if (storedRows.length !== rows.length) {
    throw new Error(`${tableName}: se esperaban ${rows.length} filas y se leyeron ${storedRows.length}.`);
  }

  const firstRow = await dbClient.getRowById(tableName, rows[0].id);
  if (!firstRow) {
    throw new Error(`${tableName}: no se pudo leer por id.`);
  }
}

const updatedSale = await dbClient.updateRow("ventas", fixture.tables.ventas[0].id, {
  estado: "FINALIZADA",
  saldo_pendiente: 0,
});

if (updatedSale.estado !== "FINALIZADA" || updatedSale.saldo_pendiente !== 0) {
  throw new Error("ventas: updateRow no persistio los cambios esperados.");
}

const status = await dbClient.status();
if (!status.connected || status.tableCount !== LOCAL_TABLE_NAMES.length || status.rowCount < LOCAL_TABLE_NAMES.length) {
  throw new Error("status: la base local no reporta el estado esperado.");
}

const finalDb = readJson(testDbPath);
const validation = validateLocalDb(finalDb, contract);
if (!validation.ok) {
  console.error(formatValidationResult(validation));
  process.exit(1);
}

writeJson(path.join(localDbPaths.artifactsDir, "sprint2-data-layer-status.json"), status);

console.log("OK: Sprint 2 capa local validada.");
console.log(`- Tablas con lectura/escritura: ${LOCAL_TABLE_NAMES.length}`);
console.log(`- Filas tecnicas persistidas: ${status.rowCount}`);
console.log("- Cliente local compila y opera contra JSON sin datos reales.");
