// Friendly guide: this module (db) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { PrismaClient } from "@prisma/client";
import { config } from "./config.js";

let prismaInstance = null;

export function getDb() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

export async function initDb() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required. In-memory fallback is disabled.");
  }

  const db = getDb();
  await db.$connect();
  console.log("[db] PostgreSQL connection established.");
  return { enabled: true };
}
