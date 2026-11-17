import ts from "typescript";
import { relative } from "node:path";

const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const helpers = new Set(["apiGetJson", "apiPostJson", "apiPutJson", "apiPatchJson", "apiDelete", "apiPostForm", "apiGetBlob"]);
const errors = [];
let calls = 0, generated = 0;
for (const source of program.getSourceFiles()) {
  const file = relative(process.cwd(), source.fileName).replaceAll("\\", "/");
  if (!file.startsWith("src/") || file.startsWith("src/test/") || file.includes("/generated/") || file === "src/services/apiClient.ts") continue;
  function report(node, message) {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    errors.push(`${file}:${line + 1}: ${message}`);
  }
  function walk(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && /(?:^|\/)test\/|Fixture/.test(node.moduleSpecifier.text))
      report(node, "Production code must not import a fixture or untyped test transport.");
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && helpers.has(node.expression.text)) {
        calls++;
        const signature = checker.getResolvedSignature(node);
        if (signature?.declaration?.typeParameters?.[0]?.name.text !== "P") report(node, "HTTP calls must infer their contract from the OpenAPI endpoint.");
        const response = signature && checker.getAwaitedType(checker.getReturnTypeOfSignature(signature));
        if (!response || response.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Never)) report(node, "HTTP response is not a resolved OpenAPI contract.");
      }
      if (ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText(source) === "portalApiClient") generated++;
      if (ts.isIdentifier(node.expression) && node.expression.text === "fetch" && node.arguments[0] && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0])) && node.arguments[0].text.startsWith("/api/")) report(node, "Backend requests must use the OpenAPI client, not direct fetch.");
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
}
if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
else console.log(`OpenAPI coverage verified: ${calls} typed HTTP calls and ${generated} generated-client operations; no response overrides or untyped production transport.`);
