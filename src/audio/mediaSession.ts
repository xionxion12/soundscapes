// Lock-screen / Control Center integration.
import type { Soundscape } from '../data/soundscapes';
import { asset } from '../data/soundscapes';

export interface MediaHandlers {
  play(): void;
  pause(): void;
  stop(): void;
  next(): void;
  previous(): void;
}

const ms = (): MediaSession | null => ('mediaSession' in navigator ? navigator.mediaSession : null);

export function setupMediaSession(h: MediaHandlers): void {
  const s = ms();
  if (!s) return;
  const set = (a: MediaSessionAction, fn: () => void) => {
    try {
      s.setActionHandler(a, fn);
    } catch {
      /* action unsupported */
    }
  };
  set('play', h.play);
  set('pause', h.pause);
  set('stop', h.stop);
  set('nexttrack', h.next);
  set('previoustrack', h.previous);
}

export function updateMetadata(sc: Soundscape): void {
  const s = ms();
  if (!s || typeof MediaMetadata === 'undefined') return;
  try {
    s.metadata = new MediaMetadata({
      title: sc.name,
      artist: `${sc.xc.recordist} · xeno-canto XC${sc.xc.id}`,
      album: 'Soundscapes',
      artwork: [{ src: new URL(asset(sc.art), location.href).href, sizes: '512x512', type: 'image/png' }],
    });
  } catch {
    /* ignore */
  }
}

export function setPlaybackState(state: 'playing' | 'paused' | 'none'): void {
  const s = ms();
  if (s) s.playbackState = state;
}

/** Best effort: show the sleep-timer's progress as the "track" position. */
export function setTimerPosition(durationSec: number, positionSec: number): void {
  const s = ms();
  if (!s?.setPositionState) return;
  try {
    s.setPositionState({ duration: Math.max(1, durationSec), position: Math.min(Math.max(0, positionSec), Math.max(1, durationSec)), playbackRate: 1 });
  } catch {
    /* ignore */
  }
}

export function clearPosition(): void {
  try {
    ms()?.setPositionState?.();
  } catch {
    /* ignore */
  }
}
