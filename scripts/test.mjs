import { spawnSync } from "node:child_process";
import path from "node:path";
import { projectRoot } from "./local-db-utils.mjs";

const testScripts = [
  "test-local-db.mjs",
  "test-local-data-layer.mjs",
  "test-masters.mjs",
  "test-purchases.mjs",
  "test-sales.mjs",
  "test-stock.mjs",
  "test-delivery.mjs",
  "test-cash.mjs",
  "test-insights.mjs",
];

for (const script of testScripts) {
  const result = spawnSync(process.execPath, [path.join(projectRoot, "scripts", script)], {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
