import { track as trackEvent } from "@databuddy/sdk";
import { useQuery } from "convex/react";
import { useState } from "react";
import cover from "@/assets/listening-lounge-cover.jpg";
import { Listeners } from "@/components/listeners";
import { Turntable } from "@/components/turntable";
import { SPEEDS } from "@/lib/speeds";
import { usePreviewPlayer } from "@/lib/use-preview-player";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import "./lounge.css";

const PLAYLIST_URL =
  "https://music.apple.com/us/playlist/convex-listening-lounge-i/pl.u-kPjluWkz08e";

// Newest first; add a row after each lounge.
const PAST_SESSIONS = [
  {
    name: "Listening Lounge I",
    url: "https://luma.com/convex-vxua",
    start: "2026-11-19T18:00-08:00",
    month: "Nov",
    day: "19",
    year: "2026",
    where: "San Francisco · 6–9 PM",
    schedule: [
      ["6:00", "Coworking, dinner & drinks"],
      ["7:30", "Vinyl listening session"],
      ["8:30", "Closing"],
    ],
  },
];

function App() {
  const tracks = useQuery(api.tracks.list);
  const [selectedId, setSelectedId] = useState<Id<"tracks">>();
  const [speed, setSpeed] = useState(0);
  // 33⅓ is the record's own speed; 45 and 78 play it fast, like a real deck.
  // When a clip ends, the next playable record goes on, wrapping back to the first.
  const player = usePreviewPlayer(SPEEDS[speed].rpm / SPEEDS[0].rpm, () => {
    const playable = tracks?.filter((track) => track.previewUrl) ?? [];
    const current = playable.findIndex((track) => track._id === selectedId);
    const next = playable[(current + 1) % playable.length];
    if (next) {
      setSelectedId(next._id);
      trackEvent("record_played", { via: "auto_advance" });
    }
    return next?.previewUrl;
  });
  const selected = tracks?.find((track) => track._id === selectedId);

  // via: how the record went on, the one moment worth counting in analytics.
  const putOn = (track: Doc<"tracks">, via: "crate" | "play_button") => {
    setSelectedId(track._id);
    if (!track.previewUrl) return;
    void player.play(track.previewUrl);
    trackEvent("record_played", { via });
  };

  const togglePlay = () => {
    if (player.playing) {
      player.pause();
      return;
    }
    const track = selected ?? tracks?.find((candidate) => candidate.previewUrl);
    if (track) putOn(track, "play_button");
  };

  return (
    <main className="lounge">
      <div className="lounge-stage">
        <Listeners tracks={tracks} trackId={selectedId} playing={player.playing} />
        <Turntable
          labelArt={selected?.artworkUrl}
          playing={player.playing}
          onTogglePlay={togglePlay}
          speed={speed}
          onSpeedChange={setSpeed}
        />
        <div className="now" aria-live="polite">
          <p className="now-title">{selected?.title ?? "Convex Listening Lounge I"}</p>
          <p className="now-artist">
            {selected?.artist ??
              (tracks ? `${tracks.length} records in the crate` : "Pulling records…")}
          </p>
          <p className="now-status">
            {player.playing ? "Spinning" : selected ? "Stopped" : "Pick a record"} ·{" "}
            {SPEEDS[speed].name} rpm
          </p>
          {selected && (
            <a className="now-link" href={selected.externalUrl} target="_blank" rel="noreferrer">
              Full song on Apple Music ↗
            </a>
          )}
        </div>
      </div>

      <div className="lounge-paper">
        <header className="lounge-head">
          <div className="lounge-title">
            <h1>Listening Lounge</h1>
            <p className="lounge-by">by convex</p>
          </div>
          <p className="lounge-tagline">
            A place to tune in
            <br />
            and slow down
          </p>
        </header>

        <section className="playlist" aria-labelledby="playlist-heading">
          <span className="playlist-art sleeve-art">
            <img src={cover} alt="Playlist cover: red headphones against a pale blue sky" />
          </span>
          <div>
            <p className="playlist-kicker">Playlist</p>
            <h2 id="playlist-heading">Convex Listening Lounge I</h2>
            <p className="playlist-meta">
              {tracks ? `${tracks.length} records · ${runtime(tracks)}` : "Pulling records…"}
            </p>
            <p className="playlist-link">
              Listen in full on{" "}
              <a href={PLAYLIST_URL} target="_blank" rel="noreferrer">
                Apple Music ↗
              </a>
            </p>
          </div>
        </section>

        <section aria-labelledby="crate-heading">
          <div className="crate-head">
            <h2 id="crate-heading">Pick a record</h2>
            <p>30-second previews</p>
          </div>
          {tracks === undefined ? (
            <p className="crate-note">Pulling records…</p>
          ) : tracks.length === 0 ? (
            <p className="crate-note">The crate is empty.</p>
          ) : (
            <ul className="crate">
              {tracks.map((track) => (
                <li key={track._id}>
                  <button
                    type="button"
                    className="sleeve"
                    aria-pressed={track._id === selectedId}
                    disabled={!track.previewUrl}
                    onClick={() => putOn(track, "crate")}
                  >
                    <span className="sleeve-art">
                      <img src={track.artworkUrl} alt="" loading="lazy" />
                    </span>
                    <span className="sleeve-title">{track.title}</span>
                    <span className="sleeve-artist">{track.artist}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="sessions" aria-labelledby="sessions-heading">
          <div className="crate-head">
            <h2 id="sessions-heading">Past sessions</h2>
          </div>
          {PAST_SESSIONS.map((session) => (
            <article key={session.url} className="ticket">
              <time className="ticket-stub" dateTime={session.start}>
                <span>{session.month}</span>
                <b>{session.day}</b>
                <span>{session.year}</span>
              </time>
              <div className="ticket-body">
                <h3>{session.name}</h3>
                <p>{session.where}</p>
                <ul>
                  {session.schedule.map(([time, what]) => (
                    <li key={time}>
                      <span>{time}</span> {what}
                    </li>
                  ))}
                </ul>
                <a href={session.url} target="_blank" rel="noreferrer">
                  Event page on Luma ↗
                </a>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function runtime(tracks: Doc<"tracks">[]) {
  const minutes = Math.round(tracks.reduce((sum, track) => sum + track.durationMs, 0) / 60_000);
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

export default App;
