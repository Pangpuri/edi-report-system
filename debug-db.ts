import { db } from "./db";
import { ediRawStaging } from "./db/schema";
import { desc } from "drizzle-orm";

async function debug() {
  const latest = await db.query.ediRawStaging.findFirst({
    where: (t, { eq }) => eq(t.lineType, "D"),
    orderBy: [desc(ediRawStaging.id)]
  });

  if (latest) {
    console.log("ID:", latest.id);
    console.log("Raw Hex Content (First 200 chars):", latest.lineContent.substring(0, 200));
    const buffer = Buffer.from(latest.lineContent, "hex");
    console.log("Buffer Length:", buffer.length);
    console.log("Decoded ASCII (85-98):", buffer.slice(85, 98).toString("ascii"));
    console.log("Decoded CP874 (85-98):", buffer.slice(85, 98).toString("binary"));
  } else {
    console.log("No D line found in staging.");
  }
}

debug().catch(console.error);
