import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs without types
import { seamMetrics } from '../../scripts/lib/seam.mjs';

const RATE = 16000;
const SECONDS = 20;

/** Band-limited pseudo-noise plus slow wobble: stands in for an ambient recording. */
function ambience(n: number, seed = 1): Float32Array {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    lp += (rnd() - lp) * 0.3;
    out[i] = lp * 0.2 * (1 + 0.3 * Math.sin((2 * Math.PI * i) / (RATE * 3)));
  }
  return out;
}

/** The same construction as build-audio: s[X..D+X] crossfaded (equal power) into s[0..X]. */
function crossfadedLoop(src: Float32Array, d: number, x: number): Float32Array {
  const D = d * RATE, X = x * RATE;
  const out = new Float32Array(D);
  for (let i = 0; i < D - X; i++) out[i] = src[X + i]!;
  for (let i = 0; i < X; i++) {
    const t = i / X;
    out[D - X + i] = src[D + i]! * Math.cos((t * Math.PI) / 2) + src[i]! * Math.sin((t * Math.PI) / 2);
  }
  return out;
}

describe('seam detector', () => {
  const src = ambience((SECONDS + 3) * RATE);

  it('accepts an equal-power crossfaded loop', () => {
    const loop = crossfadedLoop(src, SECONDS, 3);
    const m = seamMetrics(loop, RATE, SECONDS);
    expect(m.jumpRatio).toBeLessThan(1.5);
    expect(m.fluxRatio).toBeLessThan(1.5);
  });

  it('flags a hard cut (no crossfade) with a DC step at the join', () => {
    const loop = src.slice(3 * RATE, (SECONDS + 3) * RATE);
    for (let i = 0; i < loop.length; i++) loop[i] = loop[i]! + 0.3 * (i / loop.length); // slow drift: end ≠ start
    const m = seamMetrics(loop, RATE, SECONDS);
    expect(m.jumpRatio).toBeGreaterThan(1.5);
  });

  it('flags a click injected at the seam', () => {
    const loop = crossfadedLoop(src, SECONDS, 3);
    loop[loop.length - 1] = 0.9;
    const m = seamMetrics(loop, RATE, SECONDS);
    expect(m.jumpRatio).toBeGreaterThan(1.5);
  });
});
