// Persisted app state: last soundscape and last timer. Every storage access is guarded,
// storage can throw (private mode, blocked site data) or come back empty.

const KEY = 'soundscapes:v1';

export interface Saved {
  soundscapeId: string | null;
  minutes: number;
}

export const DEFAULTS: Saved = { soundscapeId: null, minutes: 30 };

export function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const j = JSON.parse(raw) as Partial<Saved>;
    return {
      soundscapeId: typeof j.soundscapeId === 'string' ? j.soundscapeId : null,
      minutes: typeof j.minutes === 'number' && j.minutes >= 0 && j.minutes <= 180 ? j.minutes : DEFAULTS.minutes,
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
