import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rawFileArchives } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  // 1. Check Auth
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Get Archive ID
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing archive ID" }, { status: 400 });
  }

  try {
    // 3. Find Archive Record
    const archive = await db.query.rawFileArchives.findFirst({
      where: eq(rawFileArchives.id, parseInt(id))
    });

    if (!archive) {
      return NextResponse.json({ error: "Archive not found" }, { status: 404 });
    }

    // 4. Check File Existence
    if (!fs.existsSync(archive.storagePath)) {
      return NextResponse.json({ error: "Physical file not found on server" }, { status: 404 });
    }

    // 5. Serve File
    const fileBuffer = fs.readFileSync(archive.storagePath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${archive.originalName}"`,
      },
    });

  } catch (error) {
    console.error("Download Archive Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
