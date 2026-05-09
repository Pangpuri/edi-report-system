import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isAuthPage = pathname.startsWith("/login") || 
                       pathname.startsWith("/register");
    
    const isApiRoute = pathname.startsWith("/api");
    const isPublicApiRoute = pathname.startsWith("/api/auth");

    // 1. Allow public API routes
    if (isPublicApiRoute) {
        return NextResponse.next();
    }

    try {
        // 🛡️ ใน v1.6+ การเรียก getSession ใน Middleware ต้องรันบน Node.js Runtime เท่านั้น
        const session = await auth.api.getSession({
            headers: await headers()
        });

        // 2. Handle Authentication Pages (Login/Register)
        if (isAuthPage) {
            if (session) {
                return NextResponse.redirect(new URL("/", request.url));
            }
            return NextResponse.next();
        }

        // 3. Protect all other routes
        if (!session) {
            if (isApiRoute) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const url = new URL("/login", request.url);
            url.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(url);
        }

        return NextResponse.next();
    } catch (error) {
        // ป้องกัน Error กรณี Database ติดขัด
        console.error("Middleware Auth Error:", error);
        return NextResponse.next();
    }
}

export const config = {
    runtime: "nodejs", 
    // ✨ ลองใช้ matcher แบบนี้แทนค่ะ (เน้น Exclude สิ่งที่ไม่เกี่ยวข้องออกไปให้หมด)
    matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login|register|.*\\.woff2|.*\\.css|.*\\.js).*)"],
};
