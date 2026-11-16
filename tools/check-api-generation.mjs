import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, appendFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

test("contract guard detects stale and missing generated types", async () => {
  const temp = await mkdtemp(join(tmpdir(), "portal-api-test-"));
  const output = join(temp, "portal-api.d.ts");
  const generator = fileURLToPath(new URL("./generate-api.mjs", import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [generator, "--output", output, ...args], { encoding: "utf8" });
  try {
    assert.equal(run("--check").status, 1);
    assert.equal(run().status, 0);
    assert.equal(run("--check").status, 0);
    await appendFile(output, "\n// stale generated file\n");
    const stale = run("--check");
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /Generated API types are stale/);
    assert.equal(run().status, 0);
    assert.equal(run("--check").status, 0);
  } finally {
    const local = relative(tmpdir(), temp);
    assert.ok(local.startsWith("portal-api-test-") && !/[\\/]/.test(local) && !local.includes(".."));
    await rm(temp, { recursive: true, force: true });
  }
});
