import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import {
  formatValidationResult,
  loadContract,
  localDbPaths,
  projectRoot,
  readJson,
  validateLocalDb,
  writeJson,
} from "./local-db-utils.mjs";

const require = createRequire(import.meta.url);
const compiledDir = path.join(localDbPaths.artifactsDir, "compiled-masters");
const testDbPath = path.join(localDbPaths.artifactsDir, "sprint3-masters.local.json");
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
  "lib/local-db/masters.ts",
], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const { createLocalDbClient } = require(path.join(compiledDir, "lib", "local-db", "client.js"));
const {
  createMasterRecord,
  listMasterData,
  searchMasterData,
  updateMasterRecord,
} = require(path.join(compiledDir, "lib", "local-db", "masters.js"));

const options = {
  filePath: testDbPath,
  templatePath: localDbPaths.example,
};

const dbClient = createLocalDbClient(options);
await dbClient.resetFromTemplate();

const product = await createMasterRecord("productos", {
  categoria: "telefono",
  marca: "Fixture",
  modelo: "F3",
  nombre: "Producto Sprint 3",
  atributos: { color: "negro", memoria: "128GB" },
}, options);

const client = await createMasterRecord("clientes", {
  nombre: "Cliente Sprint 3",
  telefono: "1111-3333",
  direccion: "Direccion fixture",
  localidad: "Localidad fixture",
}, options);

const supplier = await createMasterRecord("proveedores", {
  nombre: "Proveedor Sprint 3",
  telefono: "2222-3333",
  direccion: "Direccion proveedor",
  horario: "10:00 - 18:00",
}, options);

await updateMasterRecord("productos", product.id, { modelo: "F3 Pro" }, options);
await updateMasterRecord("clientes", client.id, { localidad: "Localidad editada" }, options);
await updateMasterRecord("proveedores", supplier.id, { horario: "11:00 - 17:00" }, options);
await updateMasterRecord("clientes", client.id, { activo: false }, options);

const data = await listMasterData(options);
const filteredProducts = searchMasterData(data, "F3 Pro", "activos").productos;
const inactiveClients = searchMasterData(data, "Sprint 3", "inactivos").clientes;
const filteredSuppliers = searchMasterData(data, "17:00", "activos").proveedores;

if (filteredProducts.length !== 1) throw new Error("No se encontro el producto editado.");
if (inactiveClients.length !== 1) throw new Error("No se encontro el cliente desactivado.");
if (filteredSuppliers.length !== 1) throw new Error("No se encontro el proveedor editado.");

const finalDb = readJson(testDbPath);
const contract = loadContract();
const validation = validateLocalDb(finalDb, contract);
if (!validation.ok) {
  console.error(formatValidationResult(validation));
  process.exit(1);
}

const officialTables = Object.keys(contract.tables).sort();
const finalTables = Object.keys(finalDb.tables).sort();
if (JSON.stringify(officialTables) !== JSON.stringify(finalTables)) {
  throw new Error("El modulo Datos creo tablas fuera del contrato oficial.");
}

writeJson(path.join(localDbPaths.artifactsDir, "sprint3-masters-summary.json"), {
  productos: data.productos.length,
  clientes: data.clientes.length,
  proveedores: data.proveedores.length,
  officialTables: finalTables.length,
});

console.log("OK: Sprint 3 maestros validados.");
console.log("- Crear, editar, desactivar y buscar productos/clientes/proveedores.");
console.log("- Sin tablas auxiliares fuera del contrato v2.");
