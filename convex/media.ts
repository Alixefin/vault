import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

export const saveFile = mutation({
    args: {
        folderId: v.id("folders"),
        storageId: v.id("_storage"),
        fileName: v.string(),
        type: v.union(v.literal("image"), v.literal("video")),
        size: v.number(),
    },
    handler: async (ctx, args) => {
        const mediaId = await ctx.db.insert("media", {
            folderId: args.folderId,
            storageId: args.storageId,
            fileName: args.fileName,
            type: args.type,
            size: args.size,
            createdAt: Date.now(),
        });
        return mediaId;
    },
});

export const getByFolder = query({
    args: { folderId: v.id("folders") },
    handler: async (ctx, args) => {
        const mediaItems = await ctx.db
            .query("media")
            .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
            .order("desc")
            .collect();

        const mediaWithUrls = await Promise.all(
            mediaItems.map(async (item) => {
                const url = await ctx.storage.getUrl(item.storageId);
                return {
                    ...item,
                    url,
                };
            })
        );

        return mediaWithUrls;
    },
});

export const getUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});
