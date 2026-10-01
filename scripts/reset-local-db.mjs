import {
  formatValidationResult,
  loadContract,
  localDbPaths,
  readJson,
  resolveProjectPath,
  toProjectPath,
  validateLocalDb,
  writeJson,
} from "./local-db-utils.mjs";

const targetArg = process.argv[2] ?? localDbPaths.runtime;
const targetPath = resolveProjectPath(targetArg);
const contract = loadContract();
const db = readJson(localDbPaths.example);
const validation = validateLocalDb(db, contract);

if (!validation.ok) {
  console.error(formatValidationResult(validation));
  process.exit(1);
}

db.meta.resetAt = new Date().toISOString();
db.meta.runtimePath = toProjectPath(targetPath);

writeJson(targetPath, db);

console.log(`Base local creada desde ${toProjectPath(localDbPaths.example)} en ${toProjectPath(targetPath)}.`);
