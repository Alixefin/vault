import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const checkName = query({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        const folders = await ctx.db
            .query("folders")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .collect();
        return folders;
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        password: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const folderData: {
            name: string;
            createdAt: number;
            password?: string;
        } = {
            name: args.name,
            createdAt: Date.now(),
        };

        if (args.password && args.password.trim().length > 0) {
            folderData.password = await hashPassword(args.password.trim());
        }

        const folderId = await ctx.db.insert("folders", folderData);
        return folderId;
    },
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        const folders = await ctx.db.query("folders").order("desc").collect();
        const foldersWithCount = await Promise.all(
            folders.map(async (folder) => {
                const media = await ctx.db
                    .query("media")
                    .withIndex("by_folder", (q) => q.eq("folderId", folder._id))
                    .collect();
                return {
                    ...folder,
                    mediaCount: media.length,
                    hasPassword: !!folder.password,
                };
            })
        );
        return foldersWithCount;
    },
});

export const get = query({
    args: { folderId: v.id("folders") },
    handler: async (ctx, args) => {
        const folder = await ctx.db.get(args.folderId);
        if (!folder) return null;
        return {
            ...folder,
            hasPassword: !!folder.password,
        };
    },
});

export const verifyFolderPassword = mutation({
    args: {
        folderId: v.id("folders"),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        const folder = await ctx.db.get(args.folderId);
        if (!folder) return false;
        if (!folder.password) return true; // No password set
        const hash = await hashPassword(args.password);
        return hash === folder.password;
    },
});

export const resetFolderPassword = mutation({
    args: {
        folderId: v.id("folders"),
        newPassword: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (args.newPassword && args.newPassword.trim().length > 0) {
            const hash = await hashPassword(args.newPassword.trim());
            await ctx.db.patch(args.folderId, { password: hash });
        } else {
            await ctx.db.patch(args.folderId, { password: undefined });
        }
        return { success: true };
    },
});

export const searchByName = query({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        const folders = await ctx.db
            .query("folders")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .collect();
        return folders.map((f) => ({
            _id: f._id,
            name: f.name,
            hasPassword: !!f.password,
            createdAt: f.createdAt,
        }));
    },
});

export const deleteFolder = mutation({
    args: { folderId: v.id("folders") },
    handler: async (ctx, args) => {
        const folder = await ctx.db.get(args.folderId);
        if (!folder) return { success: false };

        // Delete all media in folder
        const mediaItems = await ctx.db
            .query("media")
            .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
            .collect();

        for (const item of mediaItems) {
            await ctx.storage.delete(item.storageId);
            await ctx.db.delete(item._id);
        }

        // Delete all share links for this folder
        const shareLinks = await ctx.db
            .query("shareLinks")
            .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
            .collect();

        for (const link of shareLinks) {
            await ctx.db.delete(link._id);
        }

        // Delete folder
        await ctx.db.delete(args.folderId);
        return { success: true };
    },
});

export const changePassword = mutation({
    args: {
        folderId: v.id("folders"),
        currentPassword: v.optional(v.string()),
        newPassword: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const folder = await ctx.db.get(args.folderId);
        if (!folder) return { success: false, error: "Folder not found" };

        // Verify current password if folder has one
        if (folder.password) {
            if (!args.currentPassword) {
                return { success: false, error: "Current password required" };
            }
            const hash = await hashPassword(args.currentPassword);
            if (hash !== folder.password) {
                return { success: false, error: "Incorrect current password" };
            }
        }

        // Set or remove password
        if (args.newPassword && args.newPassword.trim().length > 0) {
            const newHash = await hashPassword(args.newPassword.trim());
            await ctx.db.patch(args.folderId, { password: newHash });
        } else {
            await ctx.db.patch(args.folderId, { password: undefined });
        }

        return { success: true };
    },
});
