// Sleep timer: pure logic. The timer stores an absolute `endsAt` so it survives the
// page being hidden or throttled; everything else is derived from "now".

export const FADE_MS = 60_000;

export interface TimerState {
  /** Epoch ms when the sound must be silent. */
  endsAt: number;
  /** Epoch ms when the timer was started. */
  startedAt: number;
  /** Chosen length in minutes. */
  minutes: number;
}

export type TimerPhase = 'running' | 'fading' | 'expired';

export function startTimer(now: number, minutes: number): TimerState | null {
  if (!(minutes > 0)) return null;
  return { startedAt: now, endsAt: now + minutes * 60_000, minutes };
}

export const remainingMs = (t: TimerState, now: number) => Math.max(0, t.endsAt - now);

/** Fade length: 60 s, but never longer than the timer itself. */
export const fadeLengthMs = (t: TimerState) => Math.min(FADE_MS, t.endsAt - t.startedAt);

export const fadeStartsAt = (t: TimerState) => t.endsAt - fadeLengthMs(t);

export function timerPhase(t: TimerState, now: number): TimerPhase {
  if (now >= t.endsAt) return 'expired';
  if (now >= fadeStartsAt(t)) return 'fading';
  return 'running';
}

/**
 * Volume multiplier (1 → 0) during the fade. Logarithmic-feeling: perceived loudness
 * follows a power law, so a cubic ramp sounds even.
 */
export function fadeGain(t: TimerState, now: number): number {
  const len = fadeLengthMs(t);
  if (len <= 0) return now >= t.endsAt ? 0 : 1;
  const x = Math.min(1, Math.max(0, (now - fadeStartsAt(t)) / len));
  return Math.pow(1 - x, 3);
}

/** Fraction of the timer still left, 1 → 0. */
export function remainingFraction(t: TimerState, now: number): number {
  const total = t.endsAt - t.startedAt;
  return total > 0 ? Math.min(1, Math.max(0, (t.endsAt - now) / total)) : 0;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "23:41" – wall-clock time at which a timer of `minutes` started at `now` ends. */
export function endClockLabel(now: number, minutes: number): string {
  const d = new Date(now + minutes * 60_000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "45 min", "1 h", "1 h 30", "∞". */
export function durationLabel(minutes: number): string {
  if (!(minutes > 0)) return '∞';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${pad(m)}` : `${h} h`;
}

/** "42:10" / "1:05:00" countdown. */
export function countdownLabel(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
