'use server';

import { db } from '@/db';
import { customer } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function fetchCustomersAction() {
  try {
    // 🛡️ ตัด .orderBy(desc(customer.created_at)) ออก เพราะฟิลด์นี้ไม่มีอยู่จริงใน DB ปังฮะ
    const data = await db.select().from(customer).limit(50); 
    
    return { success: true, data };
  } catch (error) {
    console.error("Database Error:", error);
    return { success: false, data: [], error: "ไม่สามารถดึงข้อมูลลูกค้าได้" };
  }
}