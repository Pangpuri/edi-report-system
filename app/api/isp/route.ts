import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { db } from "@/db";
import { branches, systemConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";

// --- Interfaces ---
interface FolderItem {
  name: string;
  isDirectory: boolean;
  size?: number;
  mtime?: Date;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * GET: Folder Navigator
 * Query Params:
 * - branchId: string (ID of the branch to explore)
 * - subPath: string (relative path from branch root)
 */
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<FolderItem[]>>> {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const subPath = searchParams.get("subPath") || "";

    if (!branchId) {
      return NextResponse.json({ success: false, error: "branchId is required" }, { status: 400 });
    }

    // 1. Get Branch Config from DB
    const branch = await db.query.branches.findFirst({
      where: eq(branches.id, parseInt(branchId)),
    });

    if (!branch || !branch.sourcePath) {
      return NextResponse.json({ success: false, error: "Branch configuration not found" }, { status: 404 });
    }

    // 2. Build full path (Windows compatible)
    // ใช้ path.win32 เพื่อความถูกต้องใน Windows Network Paths
    const fullPath = path.win32.join(branch.sourcePath, subPath);

    // 3. Scan directory
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const items: FolderItem[] = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = path.win32.join(fullPath, entry.name);
          let stats;
          try {
            stats = await fs.stat(entryPath);
          } catch {
            // Skip files that can't be stat-ed (busy or permission denied)
          }

          return {
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size: stats?.size,
            mtime: stats?.mtime,
          };
        })
      );

      return NextResponse.json({ success: true, data: items });
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      return NextResponse.json({ 
        success: false, 
        error: `Could not access path: ${error.message}`,
        message: "Network Path unreachable or permission denied"
      }, { status: 500 });
    }
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST: Test Connection or Save Config
 */
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await req.json();
    const { action, branchData, configData } = body;

    // Action: Test Connection
    if (action === "test-connection") {
      const { targetPath } = body;
      if (!targetPath) return NextResponse.json({ success: false, error: "targetPath required" }, { status: 400 });

      try {
        await fs.access(targetPath);
        return NextResponse.json({ success: true, message: "Connection successful" });
      } catch (err: unknown) {
        const error = err as Error;
        return NextResponse.json({ success: false, error: `Connection failed: ${error.message}` }, { status: 500 });
      }
    }

    // Action: Save Branch Configuration
    if (action === "save-branch") {
      if (!branchData.branchCode || !branchData.branchName) {
        return NextResponse.json({ success: false, error: "Missing required branch fields" }, { status: 400 });
      }

      await db.insert(branches).values({
        branchName: branchData.branchName,
        branchCode: branchData.branchCode,
        ipAddress: branchData.ipAddress,
        sourcePath: branchData.sourcePath,
        username: branchData.username,
        password: branchData.password,
        isActive: branchData.isActive ?? true,
      }).onConflictDoUpdate({
        target: branches.branchCode,
        set: {
          branchName: branchData.branchName,
          ipAddress: branchData.ipAddress,
          sourcePath: branchData.sourcePath,
          username: branchData.username,
          password: branchData.password,
          updatedAt: new Date(),
        }
      });

      return NextResponse.json({ success: true, message: "Branch saved successfully" });
    }

    // Action: Global Config
    if (action === "save-global-config") {
      const { key, value } = configData;
      await db.insert(systemConfigs).values({
        configKey: key,
        configValue: value,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: systemConfigs.configKey,
        set: {
          configValue: value,
          updatedAt: new Date(),
        }
      });

      return NextResponse.json({ success: true, message: "Global config saved" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
