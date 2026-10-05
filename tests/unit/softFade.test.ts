import { describe, expect, it } from 'vitest';
import { FADE_IN_MS, FADE_OUT_MS, rampLevel, rampMs } from '../../src/audio/softFade';

describe('soft fade', () => {
  it('takes 2 s for a full fade in and 5 s for a full fade out', () => {
    expect(rampMs(0, 1)).toBe(FADE_IN_MS);
    expect(rampMs(1, 0)).toBe(FADE_OUT_MS);
    expect(FADE_IN_MS).toBe(2000);
    expect(FADE_OUT_MS).toBe(5000);
  });

  it('fades in as x² and out as (1-x)²', () => {
    expect(rampLevel(0, 1, 0)).toBe(0);
    expect(rampLevel(0, 1, FADE_IN_MS / 2)).toBeCloseTo(0.25, 6);
    expect(rampLevel(0, 1, FADE_IN_MS)).toBe(1);
    expect(rampLevel(1, 0, FADE_OUT_MS / 2)).toBeCloseTo(0.25, 6);
    expect(rampLevel(1, 0, FADE_OUT_MS)).toBe(0);
  });

  it('stays within 0..1 and clamps past the end', () => {
    expect(rampLevel(0, 1, 99_999)).toBe(1);
    expect(rampLevel(1, 0, -5)).toBe(1);
    expect(rampLevel(2, -1, 100)).toBeGreaterThanOrEqual(0);
  });

  it('continues smoothly from a partial level (an interrupted fade)', () => {
    const half = 0.25; // where a fade-in is after 2.5 s
    expect(rampLevel(half, 1, 0)).toBeCloseTo(half, 6);
    expect(rampMs(half, 1)).toBeCloseTo(FADE_IN_MS / 2, 6);
    expect(rampLevel(half, 1, rampMs(half, 1))).toBe(1);
    expect(rampMs(1, 1)).toBe(0);
    expect(rampLevel(1, 1, 0)).toBe(1);
  });
});
