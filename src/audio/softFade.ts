// The fades around starting and pausing: 2 s in, 5 s out (a timer's own end uses the longer 60 s
// fade in timer.ts). Pure maths, so it can be tested.

export const FADE_IN_MS = 2_000;
export const FADE_OUT_MS = 5_000;
export const FADE_IN_SEC = FADE_IN_MS / 1000;
export const FADE_OUT_SEC = FADE_OUT_MS / 1000;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Gain `elapsedMs` into a ramp from `from` to `to`. Loudness is perceived roughly as a power
 * law, so the ramp is linear in √gain (a full fade is x², matching the pre-rendered iOS clips).
 */
export function rampLevel(from: number, to: number, elapsedMs: number): number {
  const a = Math.sqrt(clamp01(from));
  const b = Math.sqrt(clamp01(to));
  const total = rampMs(from, to);
  const x = total > 0 ? clamp01(elapsedMs / total) : 1;
  const p = a + (b - a) * x;
  return p * p;
}

/**
 * Duration of a ramp: a full fade-in takes 2 s and a full fade-out 5 s; a partial one (an
 * interrupted fade) takes proportionally less.
 */
export function rampMs(from: number, to: number): number {
  const span = Math.sqrt(clamp01(to)) - Math.sqrt(clamp01(from));
  return (span >= 0 ? FADE_IN_MS : FADE_OUT_MS) * Math.abs(span);
}
