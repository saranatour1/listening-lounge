import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import schema from "./schema";

// A crate is one playlist; Apple caps a playlist's first page well under this.
const CRATE_LIMIT = 300;

const track = schema.tables.tracks.validator;

export const list = query({
  args: {},
  returns: v.array(v.object({ _id: v.id("tracks"), _creationTime: v.number(), ...track.fields })),
  handler: (ctx) => ctx.db.query("tracks").withIndex("by_position").take(CRATE_LIMIT),
});

// The crate is small, so a full swap is simpler than diffing.
export const replaceAll = internalMutation({
  args: { tracks: v.array(track) },
  returns: v.null(),
  handler: async (ctx, { tracks }) => {
    const old = await ctx.db.query("tracks").withIndex("by_position").take(CRATE_LIMIT);
    for (const row of old) await ctx.db.delete(row._id);
    for (const row of tracks.slice(0, CRATE_LIMIT)) await ctx.db.insert("tracks", row);
    return null;
  },
});
