import { describe, expect, it } from 'vitest';
import {
  MAX_MINUTES, fractionToMinutes, minutesToFraction, pointerAngle, resolveDrag, snapMinutes,
} from '../../src/ui/dialMath';

describe('dial maths', () => {
  it('maps the first 60% of the sweep to the first hour', () => {
    expect(fractionToMinutes(0)).toBe(0);
    expect(fractionToMinutes(0.3)).toBeCloseTo(30);
    expect(fractionToMinutes(0.6)).toBeCloseTo(60);
    expect(fractionToMinutes(1)).toBeCloseTo(MAX_MINUTES);
  });

  it('is finer below an hour than above', () => {
    const below = fractionToMinutes(0.1) - fractionToMinutes(0.0);
    const above = fractionToMinutes(0.9) - fractionToMinutes(0.8);
    expect(below).toBeLessThan(above);
  });

  it('round-trips minutes ↔ fraction', () => {
    for (const m of [0, 5, 15, 30, 45, 60, 90, 120, 180]) {
      expect(fractionToMinutes(minutesToFraction(m))).toBeCloseTo(m, 6);
    }
  });

  it('snaps to 5 min below an hour, 15 min above, ∞ near zero', () => {
    expect(snapMinutes(0)).toBe(0);
    expect(snapMinutes(2)).toBe(0);
    expect(snapMinutes(3)).toBe(5);
    expect(snapMinutes(17)).toBe(15);
    expect(snapMinutes(43)).toBe(45);
    expect(snapMinutes(58)).toBe(60);
    expect(snapMinutes(66)).toBe(60);
    expect(snapMinutes(70)).toBe(75);
    expect(snapMinutes(179)).toBe(180);
  });

  it('computes clockwise angles from 12 o’clock', () => {
    expect(pointerAngle(0, -1)).toBeCloseTo(0);
    expect(pointerAngle(1, 0)).toBeCloseTo(90);
    expect(pointerAngle(0, 1)).toBeCloseTo(180);
    expect(pointerAngle(-1, 0)).toBeCloseTo(270);
  });

  it('resolves a drag to snapped minutes', () => {
    expect(resolveDrag(30, 108)).toBe(30); // 0.3 of the circle
    expect(resolveDrag(0, 216)).toBe(60);
  });

  it('does not wrap through 12 o’clock', () => {
    expect(resolveDrag(180, 5)).toBe(MAX_MINUTES); // dragged past the max
    expect(resolveDrag(0, 355)).toBe(0); // dragged back past zero
    expect(resolveDrag(15, 350)).toBe(0);
    expect(resolveDrag(90, 0)).toBe(MAX_MINUTES); // exactly at the top, coming from the far side
    expect(resolveDrag(30, 359.9)).toBe(0); // …or from the near side
  });
});
