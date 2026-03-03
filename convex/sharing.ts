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

export const createShareLink = mutation({
    args: {
        folderId: v.id("folders"),
        mediaId: v.optional(v.id("media")),
        permission: v.union(v.literal("view"), v.literal("save")),
    },
    handler: async (ctx, args) => {
        const token = generateToken();
        await ctx.db.insert("shareLinks", {
            folderId: args.folderId,
            mediaId: args.mediaId,
            token,
            permission: args.permission,
            createdAt: Date.now(),
        });
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
        };
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
