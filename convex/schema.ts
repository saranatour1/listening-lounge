import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // One row per record in the crate. `source` leaves room for Spotify or full Apple Music later.
  tracks: defineTable({
    source: v.literal("appleMusic"),
    sourceId: v.string(),
    position: v.number(),
    title: v.string(),
    artist: v.string(),
    durationMs: v.number(),
    artworkUrl: v.string(),
    externalUrl: v.string(),
    previewUrl: v.union(v.string(), v.null()),
  }).index("by_position", ["position"]),
});
