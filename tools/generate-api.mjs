import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import openapiTS, { astToString } from "openapi-typescript";
import ts from "typescript";

const schemaUrl = new URL("../openapi/portal-api.json", import.meta.url);
const outputIndex = process.argv.indexOf("--output");
if (outputIndex >= 0 && !process.argv[outputIndex + 1]) throw new Error("--output requires a file path.");
const outputUrl = outputIndex >= 0 ? pathToFileURL(resolve(process.argv[outputIndex + 1]))
  : new URL("../src/services/generated/portal-api.d.ts", import.meta.url);
const schema = JSON.parse(await readFile(schemaUrl, "utf8"));
const operations = new Set();
for (const [path, item] of Object.entries(schema.paths)) {
  for (const method of ["get", "post", "put", "patch", "delete", "head", "options"]) {
    const operation = item[method];
    if (!operation) continue;
    if (!operation.operationId || operations.has(operation.operationId)) throw new Error(`Missing or duplicate operationId: ${method} ${path}`);
    const success = Object.entries(operation.responses ?? {}).filter(([status]) => status.startsWith("2"));
    if (!success.some(([, response]) => response["x-empty-body"] || Object.values(response.content ?? {}).some((content) => content.schema)))
      throw new Error(`Missing success response contract: ${method} ${path}`);
    operations.add(operation.operationId);
  }
}
function validateReferences(value) {
  if (!value || typeof value !== "object") return;
  if (typeof value.$ref === "string") {
    if (!value.$ref.startsWith("#/")) throw new Error(`Contract must be self-contained: ${value.$ref}`);
    let target = schema;
    for (const part of value.$ref.slice(2).split("/")) target = target?.[part.replace(/~1/g, "/").replace(/~0/g, "~")];
    if (!target) throw new Error(`Unresolved schema reference: ${value.$ref}`);
  }
  for (const item of Object.values(value)) validateReferences(item);
}
validateReferences(schema);
const contents = "// Generated from openapi/portal-api.json. Run npm run api:generate; do not edit.\n" +
  astToString(await openapiTS(schema, { alphabetize: true, silent: true,
    transform: (value) => value.type === "string" && value.format === "binary" ? ts.factory.createTypeReferenceNode("Blob") : undefined,
  }));
if (process.argv.includes("--check")) {
  let current = "";
  try { current = await readFile(outputUrl, "utf8"); } catch { /* Missing output is stale. */ }
  if (current.replace(/\r\n/g, "\n") !== contents.replace(/\r\n/g, "\n")) {
    console.error("Generated API types are stale. Run npm run api:generate and commit the result.");
    process.exitCode = 1;
  } else console.log(`OpenAPI types match ${operations.size} operations.`);
} else {
  await mkdir(new URL(".", outputUrl), { recursive: true });
  await writeFile(outputUrl, contents);
  console.log(`Generated ${operations.size} typed operations: ${fileURLToPath(outputUrl)}`);
}
