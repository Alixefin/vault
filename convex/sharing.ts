import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function generateToken(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const createShareLink = mutation({
    args: {
        folderId: v.id("folders"),
        mediaId: v.optional(v.id("media")),
        permission: v.union(v.literal("view"), v.literal("save")),
        viewOnce: v.optional(v.boolean()),
        password: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const token = generateToken();
        const data: any = {
            folderId: args.folderId,
            mediaId: args.mediaId,
            token,
            permission: args.permission,
            createdAt: Date.now(),
        };
        if (args.viewOnce) {
            data.viewOnce = true;
            data.viewed = false;
        }
        if (args.password && args.password.trim().length > 0) {
            data.password = await hashPassword(args.password.trim());
        }
        await ctx.db.insert("shareLinks", data);
        return token;
    },
});

export const getShareData = query({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const shareLink = await ctx.db
            .query("shareLinks")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!shareLink) return null;

        // Check if view-once and already viewed
        if (shareLink.viewOnce && shareLink.viewed) {
            return { isExpired: true };
        }

        // Check if password-protected — don't return media until verified
        if (shareLink.password) {
            return {
                requiresPassword: true,
                viewOnce: shareLink.viewOnce || false,
                permission: shareLink.permission,
                isSingleItem: !!shareLink.mediaId,
            };
        }

        const folder = await ctx.db.get(shareLink.folderId);
        if (!folder) return null;

        // If sharing a specific media item
        if (shareLink.mediaId) {
            const mediaItem = await ctx.db.get(shareLink.mediaId);
            if (!mediaItem) return null;
            const url = await ctx.storage.getUrl(mediaItem.storageId);
            return {
                permission: shareLink.permission,
                folder: { name: folder.name },
                media: [{ ...mediaItem, url }],
                isSingleItem: true,
                viewOnce: shareLink.viewOnce || false,
            };
        }

        // Sharing entire folder
        const mediaItems = await ctx.db
            .query("media")
            .withIndex("by_folder", (q) => q.eq("folderId", shareLink.folderId))
            .order("desc")
            .collect();

        const mediaWithUrls = await Promise.all(
            mediaItems.map(async (item) => {
                const url = await ctx.storage.getUrl(item.storageId);
                return { ...item, url };
            })
        );

        return {
            permission: shareLink.permission,
            folder: { name: folder.name },
            media: mediaWithUrls,
            isSingleItem: false,
            viewOnce: shareLink.viewOnce || false,
        };
    },
});

// Verify password for a password-protected share link and return the data
export const verifySharePassword = mutation({
    args: {
        token: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        const shareLink = await ctx.db
            .query("shareLinks")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!shareLink) return { success: false, error: "Link not found" };

        // Check if expired
        if (shareLink.viewOnce && shareLink.viewed) {
            return { success: false, error: "This link has expired" };
        }

        // Verify password
        if (!shareLink.password) {
            return { success: false, error: "No password set" };
        }

        const hash = await hashPassword(args.password);
        if (hash !== shareLink.password) {
            return { success: false, error: "Incorrect password" };
        }

        // Password correct — mark as viewed if view-once
        if (shareLink.viewOnce) {
            await ctx.db.patch(shareLink._id, { viewed: true });
        }

        // Return the data
        const folder = await ctx.db.get(shareLink.folderId);
        if (!folder) return { success: false, error: "Folder not found" };

        if (shareLink.mediaId) {
            const mediaItem = await ctx.db.get(shareLink.mediaId);
            if (!mediaItem) return { success: false, error: "File not found" };
            const url = await ctx.storage.getUrl(mediaItem.storageId);
            return {
                success: true,
                data: {
                    permission: shareLink.permission,
                    folder: { name: folder.name },
                    media: [{ ...mediaItem, url }],
                    isSingleItem: true,
                    viewOnce: shareLink.viewOnce || false,
                },
            };
        }

        const mediaItems = await ctx.db
            .query("media")
            .withIndex("by_folder", (q) => q.eq("folderId", shareLink.folderId))
            .order("desc")
            .collect();

        const mediaWithUrls = await Promise.all(
            mediaItems.map(async (item) => {
                const url = await ctx.storage.getUrl(item.storageId);
                return { ...item, url };
            })
        );

        return {
            success: true,
            data: {
                permission: shareLink.permission,
                folder: { name: folder.name },
                media: mediaWithUrls,
                isSingleItem: false,
                viewOnce: shareLink.viewOnce || false,
            },
        };
    },
});

// Mark a view-once link as viewed (for non-password links)
export const markShareViewed = mutation({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const shareLink = await ctx.db
            .query("shareLinks")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!shareLink) return;
        if (shareLink.viewOnce && !shareLink.viewed) {
            await ctx.db.patch(shareLink._id, { viewed: true });
        }
    },
});

export const listShareLinks = query({
    args: { folderId: v.id("folders") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("shareLinks")
            .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
            .order("desc")
            .collect();
    },
});
