import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
    args: { name: v.string() },
    handler: async (ctx, args) => {
        const folderId = await ctx.db.insert("folders", {
            name: args.name,
            createdAt: Date.now(),
        });
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
                };
            })
        );
        return foldersWithCount;
    },
});

export const get = query({
    args: { folderId: v.id("folders") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.folderId);
    },
});
