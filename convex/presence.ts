import { Presence } from "@convex-dev/presence";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";

// The lounge is anonymous: anyone with the page open is a listener. Add auth checks here once
// visitors sign in.
export const presence = new Presence(components.presence);

export const heartbeat = mutation({
  args: { roomId: v.string(), userId: v.string(), sessionId: v.string(), interval: v.number() },
  returns: v.object({ roomToken: v.string(), sessionToken: v.string() }),
  handler: (ctx, { roomId, userId, sessionId, interval }) =>
    presence.heartbeat(ctx, roomId, userId, sessionId, interval),
});

export const list = query({
  args: { roomToken: v.string() },
  returns: v.array(
    v.object({
      userId: v.string(),
      online: v.boolean(),
      lastDisconnected: v.number(),
      data: v.optional(v.any()),
    }),
  ),
  // No per-user reads, so every listener shares one cached subscription.
  handler: (ctx, { roomToken }) => presence.list(ctx, roomToken),
});

export const disconnect = mutation({
  args: { sessionToken: v.string() },
  returns: v.null(),
  // Called over HTTP from sendBeacon when a tab closes.
  handler: (ctx, { sessionToken }) => presence.disconnect(ctx, sessionToken),
});

// What a listener has on their platter and what they're browsing with, shown on their disc.
export const updateListener = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    trackId: v.union(v.id("tracks"), v.null()),
    playing: v.boolean(),
    agent: v.object({ bot: v.boolean(), browser: v.string(), os: v.string() }),
  },
  returns: v.null(),
  handler: async (ctx, { roomId, userId, trackId, playing, agent }) => {
    // Only crate records are accepted, so nobody can push an arbitrary image onto everyone's screen.
    if (trackId && !(await ctx.db.get("tracks", trackId))) throw new Error("Unknown record");
    // The agent is client-reported text shown to every listener, so keep it to short labels.
    const label = (text: string) => text.slice(0, 40);
    return presence.updateRoomUser(ctx, roomId, userId, {
      trackId,
      playing,
      agent: { bot: agent.bot, browser: label(agent.browser), os: label(agent.os) },
    });
  },
});
