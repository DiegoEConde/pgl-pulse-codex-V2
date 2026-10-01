import path from "node:path";
import {
  buildEmptyLocalDb,
  createTechnicalFixture,
  formatValidationResult,
  loadContract,
  localDbPaths,
  readJson,
  validateLocalDb,
  writeJson,
} from "./local-db-utils.mjs";

const contract = loadContract();
const example = readJson(localDbPaths.example);
const checks = [];

checks.push(["JSON ejemplo", validateLocalDb(example, contract)]);

const generatedEmptyDb = buildEmptyLocalDb(contract);
checks.push(["Base vacia generada desde contrato", validateLocalDb(generatedEmptyDb, contract)]);

const fixture = createTechnicalFixture(contract);
checks.push(["Fixture tecnico", validateLocalDb(fixture, contract, { allowFixture: true })]);

for (const [label, result] of checks) {
  if (!result.ok) {
    console.error(`\n${label}`);
    console.error(formatValidationResult(result));
    process.exit(1);
  }
}

const expectedTables = Object.keys(contract.tables);
const fixtureTablesWithRows = expectedTables.filter((tableName) => fixture.tables[tableName]?.length > 0);
if (fixtureTablesWithRows.length !== expectedTables.length) {
  const missing = expectedTables.filter((tableName) => !fixture.tables[tableName]?.length);
  console.error(`Fixture tecnico sin filas en: ${missing.join(", ")}`);
  process.exit(1);
}

writeJson(path.join(localDbPaths.artifactsDir, "local-db-from-example.json"), example);
writeJson(path.join(localDbPaths.artifactsDir, "local-db-technical-fixture.json"), fixture);

console.log("OK: Sprint 1 base local validada.");
console.log(`- Tablas oficiales: ${expectedTables.length}`);
console.log("- JSON ejemplo crea una base local vacia valida.");
console.log("- Fixture tecnico cubre tablas, referencias, enums, unicidad, secuencias e indices logicos.");
