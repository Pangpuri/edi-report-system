import { db } from "./db";
import { user as userTable } from "./db/schema";
import { auth } from "./lib/auth";
import { eq } from "drizzle-orm";

async function createAdmin() {
    const adminData = {
        name: "EDI ADMIN",
        email: "edi@admain.com",
        password: "00000000",
        phone: "0800000000"
    };

    console.log("🚀 Starting Admin registration...");

    try {
        // Use signUpEmail to handle password hashing and account creation
        // Note: BetterAuth hooks might set role to 'user' by default
        const result = await auth.api.signUpEmail({
            body: {
                email: adminData.email,
                password: adminData.password,
                name: adminData.name,
            }
        });

        if (result) {
            console.log("✅ Basic account created. Updating role to admin and setting phone...");
            
            await db.update(userTable)
                .set({ 
                    role: "admin",
                    phone: adminData.phone,
                    username: adminData.phone // Using phone as username as requested for login
                })
                .where(eq(userTable.email, adminData.email));
            
            console.log("🎊 Admin registration complete!");
            process.exit(0);
        } else {
            console.error("❌ Sign up failed without error message.");
            process.exit(1);
        }
    } catch (error: unknown) {
        const err = error as { message?: string; code?: string };
        if (err.message?.includes("already exists") || err.code === "user_already_exists") {
            console.log("ℹ️ User already exists. Attempting to promote to admin and update phone...");
            await db.update(userTable)
                .set({ 
                    role: "admin",
                    phone: adminData.phone,
                    username: adminData.phone
                })
                .where(eq(userTable.email, adminData.email));
            console.log("✅ User updated to admin.");
            process.exit(0);
        } else {
            console.error("🚨 Registration Error:", error);
            process.exit(1);
        }
    }
}

createAdmin();
