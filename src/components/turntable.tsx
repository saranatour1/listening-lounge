import { useEffect, useRef, useState } from "react";
import stickerArt from "@/assets/abstract-label.jpg";
import symbol from "@/assets/abstract-symbol.svg";
import wordmark from "@/assets/abstract-wordmark.svg";
import { SPEEDS } from "@/lib/speeds";
import "./turntable.css";

// Where the knob's orange dot sits for each speed, clockwise from 12 o'clock.
const DETENTS = [225, 292.5, 360];
// Label radius as a fraction of the record radius, measured off the reference player.
const LABEL = 0.415;
const TAU = Math.PI * 2;

// HTML-in-Canvas: the label is live DOM painted into the record canvas.
// Browsers without it get the same label element laid over the canvas instead.
const htmlInCanvas =
  "requestPaint" in HTMLCanvasElement.prototype &&
  "drawElementImage" in CanvasRenderingContext2D.prototype;

type Props = {
  /** Cover art for the record's label; the Abstract sticker when nothing is on the platter. */
  labelArt?: string;
  playing: boolean;
  onTogglePlay: () => void;
  /** Index into SPEEDS. */
  speed: number;
  onSpeedChange: (speed: number) => void;
};

export function Turntable({ labelArt, playing, onTogglePlay, speed, onSpeedChange }: Props) {
  const [lidOpen, setLidOpen] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const holoRef = useRef<HTMLDivElement>(null);
  const goal = useRef(0);
  const wake = useRef(() => {});

  useEffect(() => {
    const canvas = canvasRef.current!;
    const label = labelRef.current!;
    const holo = holoRef.current!;
    const ctx = canvas.getContext("2d")!;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let vinyl: HTMLCanvasElement | undefined;
    let turn = 0;
    let rate = 0;
    let frame = 0;
    let before = 0;

    const draw = () => {
      const size = canvas.width;
      if (!size) return;
      if (vinyl?.width !== size) vinyl = pressVinyl(size);
      const r = size / 2;
      ctx.reset();
      ctx.drawImage(vinyl, 0, 0);
      ctx.translate(r, r);
      // The sheen belongs to the room light, so it stays put and only rocks with the disc's wobble.
      drawSheen(ctx, r, Math.sin((turn * Math.PI) / 180) * Math.min(1, rate / 200) * 0.8);
      if (htmlInCanvas) {
        const l = r * LABEL;
        ctx.rotate((turn * Math.PI) / 180);
        ctx.drawElementImage?.(label, -l, -l, 2 * l, 2 * l);
      }
    };

    const render = () => {
      holo.style.setProperty("--holo", `${(-turn * 1.5).toFixed(1)}deg`);
      if (htmlInCanvas) {
        canvas.requestPaint?.();
      } else {
        label.style.rotate = `${turn.toFixed(2)}deg`;
        draw();
      }
    };

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - before) / 1000);
      before = now;
      rate += (goal.current - rate) * (1 - Math.exp(-dt / 0.42));
      turn = (turn + rate * dt) % 360;
      render();
      frame = goal.current === 0 && rate < 0.5 ? 0 : requestAnimationFrame(step);
    };

    wake.current = () => {
      if (still || frame) return;
      before = performance.now();
      frame = requestAnimationFrame(step);
    };

    const resize = new ResizeObserver(([entry]) => {
      const box = entry.devicePixelContentBoxSize?.[0];
      canvas.width = canvas.height = Math.round(
        box ? box.inlineSize : entry.contentRect.width * devicePixelRatio,
      );
      render();
    });
    try {
      resize.observe(canvas, { box: "device-pixel-content-box" });
    } catch {
      resize.observe(canvas); // Safari has no device-pixel-content-box
    }
    // Fires when the label's snapshot changes (fonts load, new track) and after requestPaint().
    if (htmlInCanvas) canvas.addEventListener("paint", draw);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      canvas.removeEventListener("paint", draw);
      wake.current = () => {};
    };
  }, []);

  useEffect(() => {
    goal.current = playing ? (SPEEDS[speed].rpm * 360) / 60 : 0;
    wake.current();
  }, [playing, speed]);

  // The sticker from the Abstract Conf. player: a frame of the abstract.convex.dev hero under the cream mark.
  const label = (
    <div ref={labelRef} className="tt-label" drawable="" aria-hidden="true">
      {labelArt ? (
        // CORS-clean, so HTML-in-Canvas can paint it.
        <img src={labelArt} alt="" crossOrigin="anonymous" />
      ) : (
        <>
          <img src={stickerArt} alt="" />
          <img src={symbol} alt="" className="tt-label-symbol" />
        </>
      )}
    </div>
  );

  return (
    <section className="tt" aria-label="Turntable">
      <div className="tt-body">
        <i className="tt-hinge" />
        <i className="tt-hinge" />
        <div className="tt-well" />
        <div className="tt-platter">
          <canvas
            ref={canvasRef}
            className="tt-record"
            content={htmlInCanvas ? "drawable" : undefined}
            layoutsubtree={htmlInCanvas ? "true" : undefined}
          >
            {htmlInCanvas && label}
          </canvas>
          {!htmlInCanvas && label}
          <div ref={holoRef} className="tt-holo" />
          <div className="tt-dome" />
        </div>

        {/* Pointer shortcut only; the lid button below is the accessible control. */}
        <div
          className="tt-lid"
          data-open={lidOpen || undefined}
          aria-hidden="true"
          onClick={() => setLidOpen((open) => !open)}
        >
          <img src={wordmark} alt="" className="tt-wordmark" draggable={false} />
          <i className="tt-foot" />
          <i className="tt-foot" />
        </div>

        <div className="tt-knob">
          <span className="tt-knob-shade" />
          <span className="tt-knob-cap">
            <span className="tt-knob-dial" style={{ rotate: `${DETENTS[speed]}deg` }}>
              <i />
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={2}
            step={1}
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
            aria-label="Speed"
            aria-valuetext={`${SPEEDS[speed].name} rpm`}
          />
        </div>

        <button
          type="button"
          className="tt-btn tt-btn-lid"
          aria-label={lidOpen ? "Close lid" : "Open lid"}
          onClick={() => setLidOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
        <button
          type="button"
          className="tt-btn tt-btn-play"
          aria-label="Play"
          aria-pressed={playing}
          onClick={onTogglePlay}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path
              fill="currentColor"
              d={playing ? "M9.4 8.4h1.9v7.2H9.4zM12.7 8.4h1.9v7.2h-1.9z" : "M10 8.3v7.4l5.8-3.7z"}
            />
          </svg>
        </button>
      </div>
    </section>
  );
}

function ring(g: CanvasRenderingContext2D, radius: number) {
  g.beginPath();
  g.arc(0, 0, radius, 0, TAU);
  g.stroke();
}

// The grooves are rotationally symmetric, so they are pressed once per size and never redrawn.
function pressVinyl(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const r = size / 2;
  g.translate(r, r);

  const body = g.createRadialGradient(0, 0, 0, 0, 0, r);
  body.addColorStop(0, "#30363a");
  body.addColorStop(1, "#24282b");
  g.fillStyle = body;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fill();

  // Hairline grooves with uneven alpha so the vinyl reads pressed, not drawn.
  g.lineWidth = Math.max(1, size / 900);
  for (let i = 0, rr = r * 0.46; rr < r * 0.97; i++, rr += size / 520) {
    const noise = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    g.strokeStyle = `rgb(255 255 255 / ${0.01 + noise * 0.025})`;
    ring(g, rr);
  }

  // Raised ridges lit from above: whichever edge faces the light catches it, the other falls into shadow.
  const lit = (top: string, bottom: string) => {
    const grad = g.createLinearGradient(0, -r, 0, r);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    return grad;
  };
  const outerEdge = lit("rgb(255 255 255 / 0.22)", "rgb(0 0 0 / 0.5)");
  const innerEdge = lit("rgb(0 0 0 / 0.5)", "rgb(255 255 255 / 0.14)");
  const first = r * 0.49;
  const gap = (r * 0.95 - first) / 22;
  for (let i = 0; i <= 22; i++) {
    const rr = first + i * gap;
    g.lineWidth = gap * 0.34;
    g.strokeStyle = "rgb(255 255 255 / 0.03)";
    ring(g, rr);
    g.lineWidth = Math.max(1, gap * 0.09);
    g.strokeStyle = outerEdge;
    ring(g, rr + gap * 0.18);
    g.strokeStyle = innerEdge;
    ring(g, rr - gap * 0.18);
  }

  g.lineWidth = r * 0.014;
  g.strokeStyle = outerEdge;
  ring(g, r * 0.992);

  // A broad pool of window light across the lower right, as in the reference photo.
  const pool = g.createRadialGradient(r * 0.35, r * 0.4, 0, r * 0.35, r * 0.4, r * 0.9);
  pool.addColorStop(0, "rgb(255 255 255 / 0.06)");
  pool.addColorStop(1, "rgb(255 255 255 / 0)");
  g.fillStyle = pool;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fill();
  return canvas;
}

function drawSheen(ctx: CanvasRenderingContext2D, r: number, rock: number) {
  const sheen = ctx.createConicGradient(((rock - 35) * Math.PI) / 180, 0, 0);
  for (const [at, alpha] of [
    [0, 0],
    [0.06, 0.08],
    [0.13, 0],
    [0.5, 0],
    [0.56, 0.055],
    [0.63, 0],
    [1, 0],
  ]) {
    sheen.addColorStop(at, `rgb(255 255 255 / ${alpha})`);
  }
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.97, 0, TAU);
  ctx.arc(0, 0, r * LABEL, 0, TAU, true);
  ctx.fill();
}
