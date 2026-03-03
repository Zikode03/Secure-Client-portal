import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:4010/api";

const results = [];
function record(ok, name, detail = "") {
  results.push({ ok, name, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}: ${name}${detail ? ` - ${detail}` : ""}`);
}

async function mustContain(filePath, needle, label) {
  const abs = path.resolve(rootDir, filePath);
  const content = await fs.readFile(abs, "utf8");
  record(content.includes(needle), label, filePath);
}

async function login(email, password) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`Login failed for ${email}: ${response.status} ${payload}`);
  }
  const payload = await response.json();
  return payload.token;
}

async function callApi(name, token, endpoint, expectedStatuses) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  record(expectedStatuses.includes(response.status), name, `status ${response.status}`);
}

async function runNavChecks() {
  const accountantPages = [
    "Accountant/dashboards.html",
    "Accountant/clients.html",
    "Accountant/documents.html",
    "Accountant/review-queue.html",
    "Accountant/compliance-board.html",
    "Accountant/tasks.html",
    "Accountant/messages.html",
    "Accountant/settings.html",
  ];
  for (const page of accountantPages) {
    await mustContain(page, "accountant-nav.js", "Accountant nav script linked");
  }

  const clientPages = [
    "Client/Clientpages/Clientportal.html",
    "Client/Clientpages/documents.html",
    "Client/Clientpages/upload.html",
    "Client/Clientpages/clientrequest.html",
    "Client/Clientpages/messages.html",
    "Client/Clientpages/settings.html",
  ];
  for (const page of clientPages) {
    await mustContain(page, "client-nav.js", "Client nav script linked");
  }
}

async function runRoleChecks() {
  const accountantEmail = process.env.SMOKE_ACCOUNTANT_EMAIL || "accountant@prospera.com";
  const accountantPassword = process.env.SMOKE_ACCOUNTANT_PASSWORD || "Password123!";
  const clientEmail = process.env.SMOKE_CLIENT_EMAIL || "jane@acmecorp.com";
  const clientPassword = process.env.SMOKE_CLIENT_PASSWORD || "Password123!";

  const accountantToken = await login(accountantEmail, accountantPassword);
  const clientToken = await login(clientEmail, clientPassword);

  await callApi("Accountant can read dashboard summary", accountantToken, "/dashboard/summary", [200]);
  await callApi("Client cannot read dashboard summary", clientToken, "/dashboard/summary", [403]);
  await callApi("Accountant can read compliance portfolio", accountantToken, "/compliance/portfolio", [200]);
  await callApi("Client cannot read compliance portfolio", clientToken, "/compliance/portfolio", [403]);
}

async function main() {
  try {
    console.log(`Running smoke tests against ${baseUrl}`);
    await runNavChecks();
    await runRoleChecks();
  } catch (error) {
    record(false, "Smoke run aborted", error.message);
  }

  const failures = results.filter((item) => !item.ok);
  console.log(`\nSmoke result: ${results.length - failures.length}/${results.length} passed`);
  if (failures.length) {
    process.exitCode = 1;
  }
}

await main();
