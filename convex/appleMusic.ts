import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// Fills the crate from a public Apple Music playlist:
//   npx convex run appleMusic:importPlaylist '{"url":"https://music.apple.com/us/playlist/…"}'
export const importPlaylist = internalAction({
  args: { url: v.string() },
  returns: v.object({ imported: v.number(), withPreview: v.number() }),
  handler: async (ctx, { url }) => {
    const songs = await readPlaylistPage(url);
    const previews = await lookupPreviews(songs.map((song) => song.id));
    await ctx.runMutation(internal.tracks.replaceAll, {
      tracks: songs.map((song, position) => ({
        source: "appleMusic" as const,
        sourceId: song.id,
        position,
        title: song.title,
        artist: song.artist,
        durationMs: song.durationMs,
        artworkUrl: song.artworkUrl,
        externalUrl: song.url,
        previewUrl: previews.get(song.id) ?? null,
      })),
    });
    return { imported: songs.length, withPreview: previews.size };
  },
});

type PageItem = {
  title: string;
  artistName: string;
  duration: number;
  artwork: { dictionary: { url: string } };
  contentDescriptor?: { kind?: string; url: string; identifiers: { storeAdamID: string | number } };
};

// shortcut: reads the JSON Apple embeds in the public playlist page, which is undocumented and can change;
// move to the Apple Music API (needs a MusicKit developer token) when full-song playback lands.
async function readPlaylistPage(url: string) {
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`Apple Music returned ${response.status} for ${url}`);
  const html = await response.text();
  const json = html.match(/<script[^>]*id="serialized-server-data"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) throw new Error("No playlist data found on the Apple Music page");
  const page = JSON.parse(json) as { data?: { data?: { sections?: { items?: PageItem[] }[] } }[] };
  const items = (page.data?.[0]?.data?.sections ?? []).flatMap((section) => section.items ?? []);
  const songs = items.filter((item) => item.contentDescriptor?.kind === "song");
  if (songs.length === 0) throw new Error("The Apple Music page listed no songs");
  return songs.map((item) => ({
    id: String(item.contentDescriptor!.identifiers.storeAdamID),
    title: item.title,
    artist: item.artistName,
    durationMs: item.duration,
    artworkUrl: item.artwork.dictionary.url.replace("{w}x{h}bb.{f}", "600x600bb.jpg"),
    url: item.contentDescriptor!.url,
  }));
}

// iTunes Lookup is Apple's public catalog API: no key needed, and it returns 30-second preview clips.
async function lookupPreviews(ids: string[]) {
  const previews = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 150) {
    const batch = ids.slice(i, i + 150).join(",");
    const response = await fetch(
      `https://itunes.apple.com/lookup?country=us&entity=song&id=${batch}`,
    );
    if (!response.ok) throw new Error(`iTunes lookup returned ${response.status}`);
    const { results } = (await response.json()) as {
      results: { trackId?: number; previewUrl?: string }[];
    };
    for (const result of results) {
      if (result.trackId && result.previewUrl)
        previews.set(String(result.trackId), result.previewUrl);
    }
  }
  return previews;
}
