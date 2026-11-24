import { useEffect, useEffectEvent, useRef, useState } from "react";

// The only code that knows how sound is made. Full-song playback (MusicKit, Spotify's
// iFrame API) can replace this behind the same { playing, play, pause } shape.
// `nextAfterEnd` runs when a clip finishes and returns the next clip to play, if any.
export function usePreviewPlayer(rate: number, nextAfterEnd: () => string | null | undefined) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const audio = () => (audioRef.current ??= new Audio());
  const next = useEffectEvent(nextAfterEnd);

  const play = (src: string) => {
    const element = audio();
    if (element.src !== src) element.src = src;
    return element.play().catch(() => setPlaying(false));
  };

  useEffect(() => {
    const element = audio();
    const sync = () => setPlaying(!element.paused);
    const advance = () => {
      const src = next();
      if (src) void play(src);
      else sync();
    };
    element.addEventListener("play", sync);
    element.addEventListener("pause", sync);
    element.addEventListener("ended", advance);
    return () => {
      element.pause();
      element.removeEventListener("play", sync);
      element.removeEventListener("pause", sync);
      element.removeEventListener("ended", advance);
    };
  }, []);

  useEffect(() => {
    // A record at the wrong speed changes pitch too, and loading a new src resets playbackRate.
    const element = audio();
    element.preservesPitch = false;
    element.defaultPlaybackRate = element.playbackRate = rate;
  }, [rate]);

  return { playing, play, pause: () => audio().pause() };
}
