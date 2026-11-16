import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const index = args.indexOf("--backend-root");
const backend = index >= 0 ? args[index + 1] : process.env.PORTAL_BACKEND_ROOT;
if (!backend) throw new Error("Pass --backend-root <backend repository> or set PORTAL_BACKEND_ROOT.");
const project = resolve(backend, "src/SecureClientPortal.Api/SecureClientPortal.Api.csproj");
const assembly = resolve(backend, "src/SecureClientPortal.Api/bin/Release/net8.0/SecureClientPortal.Api.dll");
const run = (command, commandArgs) => {
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}).`);
};
const temp = await mkdtemp(join(tmpdir(), "portal-openapi-"));
try {
  run("dotnet", ["build", project, "--configuration", "Release", "--verbosity", "quiet"]);
  run("dotnet", ["run", "--project", resolve(backend, "tools/ContractMetadata/ContractMetadata.csproj"), "--configuration", "Release", "--", resolve(backend), ...(args.includes("--check") ? ["--check"] : [])]);
  if (!args.includes("--check")) run("dotnet", ["build", project, "--configuration", "Release", "--no-restore", "--verbosity", "quiet"]);
  const exported = join(temp, "portal-api.json");
  run("dotnet", [assembly, "--export-openapi", exported]);
  const contract = await readFile(exported, "utf8");
  const destination = join(root, "openapi/portal-api.json");
  if (args.includes("--check")) {
    const existing = await readFile(destination, "utf8");
    if (contract.replace(/\r\n/g, "\n") !== existing.replace(/\r\n/g, "\n"))
      throw new Error("Backend contract differs from the frontend snapshot. Run npm run api:sync with this backend repository.");
  } else {
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, contract);
  }
  run(process.execPath, [join(root, "tools/generate-api.mjs"), ...(args.includes("--check") ? ["--check"] : [])]);
} finally {
  const local = relative(tmpdir(), temp);
  if (!local.startsWith("portal-openapi-") || local.includes("..") || local.includes("/") || local.includes("\\"))
    throw new Error("Refusing to remove an unexpected temporary path.");
  await rm(temp, { recursive: true, force: true });
}
