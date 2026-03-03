import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Simple hash function using built-in crypto
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const getSettings = query({
    args: {},
    handler: async (ctx) => {
        const settings = await ctx.db
            .query("adminSettings")
            .withIndex("by_key", (q) => q.eq("key", "admin"))
            .first();
        return { hasPassword: !!settings };
    },
});

export const initPassword = mutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db
            .query("adminSettings")
            .withIndex("by_key", (q) => q.eq("key", "admin"))
            .first();

        if (existing) return { alreadySet: true };

        const hash = await hashPassword("Max12345");
        await ctx.db.insert("adminSettings", {
            key: "admin",
            passwordHash: hash,
        });
        return { alreadySet: false };
    },
});

export const verifyPassword = mutation({
    args: { password: v.string() },
    handler: async (ctx, args) => {
        const settings = await ctx.db
            .query("adminSettings")
            .withIndex("by_key", (q) => q.eq("key", "admin"))
            .first();

        if (!settings) {
            // Auto-init with default password
            const defaultHash = await hashPassword("Max12345");
            await ctx.db.insert("adminSettings", {
                key: "admin",
                passwordHash: defaultHash,
            });
            const hash = await hashPassword(args.password);
            return hash === defaultHash;
        }

        const hash = await hashPassword(args.password);
        return hash === settings.passwordHash;
    },
});

export const changePassword = mutation({
    args: {
        oldPassword: v.string(),
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        const settings = await ctx.db
            .query("adminSettings")
            .withIndex("by_key", (q) => q.eq("key", "admin"))
            .first();

        if (!settings) {
            throw new Error("Admin settings not found");
        }

        const oldHash = await hashPassword(args.oldPassword);
        if (oldHash !== settings.passwordHash) {
            return { success: false, error: "Incorrect current password" };
        }

        const newHash = await hashPassword(args.newPassword);
        await ctx.db.patch(settings._id, { passwordHash: newHash });
        return { success: true };
    },
});
