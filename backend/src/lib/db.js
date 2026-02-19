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
    console.warn("[db] DATABASE_URL not set. Running with in-memory store only.");
    return { enabled: false };
  }

  try {
    const db = getDb();
    await db.$connect();
    console.log("[db] PostgreSQL connection established.");
    return { enabled: true };
  } catch (error) {
    console.error("[db] Failed to connect to PostgreSQL:", error.message);
    console.warn("[db] Continuing with in-memory store for now.");
    return { enabled: false, error };
  }
}

