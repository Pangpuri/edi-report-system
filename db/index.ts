import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schemaDefinition from "./schema";

// 1. สร้าง Pool เชื่อมต่อ (แบบ Pure ที่สุด)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. ส่งออกตัวแปร db ผ่าน node-postgres driver
export const db = drizzle(pool, { 
  schema: schemaDefinition 
});