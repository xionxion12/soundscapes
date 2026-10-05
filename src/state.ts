// Persisted app state: last soundscape and last timer. Every storage access is guarded,
// storage can throw (private mode, blocked site data) or come back empty.

import { TIMER_OPTIONS } from './timer';

const KEY = 'soundscapes:v1';

export interface Saved {
  soundscapeId: string | null;
  minutes: number;
}

export const DEFAULTS: Saved = { soundscapeId: null, minutes: 45 };

export function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const j = JSON.parse(raw) as Partial<Saved>;
    return {
      soundscapeId: typeof j.soundscapeId === 'string' ? j.soundscapeId : null,
      minutes: (TIMER_OPTIONS as readonly number[]).includes(j.minutes as number) ? (j.minutes as number) : DEFAULTS.minutes,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function save(s: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
