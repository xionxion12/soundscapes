import { describe, expect, it } from 'vitest';
import {
  FADE_MS, countdownLabel, durationLabel, endClockLabel, fadeGain, fadeStartsAt, remainingFraction, remainingMs, startTimer, timerPhase,
} from '../../src/timer';

const T0 = new Date(2026, 5, 1, 22, 56, 0).getTime();
const MIN = 60_000;

describe('timer', () => {
  it('stores an absolute endsAt', () => {
    const t = startTimer(T0, 45)!;
    expect(t.endsAt).toBe(T0 + 45 * MIN);
    expect(remainingMs(t, T0 + 10 * MIN)).toBe(35 * MIN);
    expect(remainingMs(t, T0 + 99 * MIN)).toBe(0);
  });

  it('has no timer for ∞', () => {
    expect(startTimer(T0, 0)).toBeNull();
  });

  it('starts the fade 60 s before the end', () => {
    const t = startTimer(T0, 30)!;
    expect(fadeStartsAt(t)).toBe(t.endsAt - FADE_MS);
    expect(timerPhase(t, T0 + 10 * MIN)).toBe('running');
    expect(timerPhase(t, t.endsAt - FADE_MS - 1)).toBe('running');
    expect(timerPhase(t, t.endsAt - FADE_MS)).toBe('fading');
    expect(timerPhase(t, t.endsAt - 1)).toBe('fading');
    expect(timerPhase(t, t.endsAt)).toBe('expired');
  });

  it('resumes correctly after the page was hidden: phase depends only on now', () => {
    const t = startTimer(T0, 30)!;
    // page hidden for 29.5 min, becomes visible again mid-fade
    const now = T0 + 29.5 * MIN;
    expect(timerPhase(t, now)).toBe('fading');
    expect(fadeGain(t, now)).toBeCloseTo(Math.pow(0.5, 3), 5);
    // …or after the end
    expect(timerPhase(t, T0 + 5 * 60 * MIN)).toBe('expired');
  });

  it('fades monotonically from 1 to 0', () => {
    const t = startTimer(T0, 15)!;
    expect(fadeGain(t, t.endsAt - FADE_MS)).toBe(1);
    expect(fadeGain(t, t.endsAt)).toBe(0);
    let prev = 1;
    for (let s = 0; s <= 60; s++) {
      const g = fadeGain(t, t.endsAt - FADE_MS + s * 1000);
      expect(g).toBeLessThanOrEqual(prev);
      prev = g;
    }
    expect(fadeGain(t, T0)).toBe(1);
  });

  it('caps the fade at the timer length for very short timers', () => {
    const t = startTimer(T0, 0.5)!; // 30 s
    expect(fadeStartsAt(t)).toBe(t.startedAt);
  });

  it('reports the remaining fraction', () => {
    const t = startTimer(T0, 60)!;
    expect(remainingFraction(t, T0)).toBe(1);
    expect(remainingFraction(t, T0 + 15 * MIN)).toBeCloseTo(0.75);
    expect(remainingFraction(t, T0 + 61 * MIN)).toBe(0);
  });

  it('formats the "ends at" clock across midnight', () => {
    expect(endClockLabel(T0, 45)).toBe('23:41');
    expect(endClockLabel(T0, 90)).toBe('00:26');
  });

  it('formats durations and countdowns', () => {
    expect(durationLabel(0)).toBe('∞');
    expect(durationLabel(45)).toBe('45 min');
    expect(durationLabel(60)).toBe('1 h');
    expect(durationLabel(90)).toBe('1 h 30');
    expect(countdownLabel(42 * MIN + 10_000)).toBe('42:10');
    expect(countdownLabel(65 * MIN)).toBe('1:05:00');
  });
});
