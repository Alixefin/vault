import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  folders: defineTable({
    name: v.string(),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  media: defineTable({
    folderId: v.id("folders"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    type: v.union(v.literal("image"), v.literal("video")),
    size: v.number(),
    createdAt: v.number(),
  }).index("by_folder", ["folderId"]),
});
