import {
  formatValidationResult,
  loadContract,
  readJson,
  resolveProjectPath,
  toProjectPath,
  validateLocalDb,
} from "./local-db-utils.mjs";

const args = process.argv.slice(2);
const allowFixture = args.includes("--allow-fixture");
const fileArg = args.find((arg) => !arg.startsWith("--")) ?? "data/pgl-pulse-v2.local.example.json";
const filePath = resolveProjectPath(fileArg);

const contract = loadContract();
const db = readJson(filePath);
const result = validateLocalDb(db, contract, { allowFixture });

console.log(`Validando ${toProjectPath(filePath)}`);
console.log(formatValidationResult(result));

if (!result.ok) {
  process.exit(1);
}
