import { db } from "./db";
import { importLogs, systemConfigs } from "./db/schema";
import { desc } from "drizzle-orm";

async function debug() {
  console.log("--- SYSTEM CONFIGS ---");
  const configs = await db.select().from(systemConfigs);
  console.table(configs);

  console.log("\n--- RECENT IMPORT LOGS (LATEST 10) ---");
  const logs = await db.select().from(importLogs).orderBy(desc(importLogs.id)).limit(10);
  console.table(logs);
}

debug().catch(console.error);
