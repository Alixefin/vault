import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  adminSettings: defineTable({
    key: v.string(),
    passwordHash: v.string(),
  }).index("by_key", ["key"]),

  folders: defineTable({
    name: v.string(),
    createdAt: v.number(),
    password: v.optional(v.string()),
  }).index("by_name", ["name"]),

  media: defineTable({
    folderId: v.id("folders"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    type: v.union(v.literal("image"), v.literal("video")),
    size: v.number(),
    createdAt: v.number(),
  }).index("by_folder", ["folderId"]),

  shareLinks: defineTable({
    folderId: v.id("folders"),
    mediaId: v.optional(v.id("media")),
    token: v.string(),
    permission: v.union(v.literal("view"), v.literal("save")),
    viewOnce: v.optional(v.boolean()),
    viewed: v.optional(v.boolean()),
    password: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_folder", ["folderId"]),
});
