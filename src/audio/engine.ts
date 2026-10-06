// One <audio> element does everything. On iOS Safari this is the only way to get
// AirPlay, lock-screen playback and silent-switch-proof audio; Web Audio is never used.
import type { Soundscape } from '../data/soundscapes';
import { asset } from '../data/soundscapes';
import { FADE_IN_MS, FADE_IN_SEC, FADE_OUT_MS, rampLevel, rampMs } from './softFade';
import { FADE_MS } from '../timer';

export type PlayState = 'paused' | 'loading' | 'playing';
/** What the element is playing: the loop, the timer's outro, or the start/pause fade clips (iOS only). */
type Mode = 'loop' | 'outro' | 'fadein' | 'fadeout';

interface AudioSessionNav {
  audioSession?: { type: string };
}

/**
 * Every start fades in over 4 s and every pause fades out over 5 s. Where `audio.volume` works
 * that is a volume ramp; on iOS the element swaps to a pre-rendered clip instead (see
 * scripts/lib/fades.mjs), which costs one barely audible hiccup at the join.
 *
 * Events: `state` (play state changed), `finished` (the outro ran to its end),
 * `timeupdate`, `error`.
 */
export class Engine extends EventTarget {
  readonly el: HTMLAudioElement;
  /** True where `audio.volume` actually works (not iOS). */
  readonly volumeWorks: boolean;
  state: PlayState = 'paused';
  current: Soundscape | null = null;
  mode: Mode = 'loop';
  /** `pause` events we caused ourselves (switching sources) and must not report as user pauses. */
  private selfPauses = 0;
  /** Loop position when the outro took over, to resume from if the outro fails. */
  private loopTime = 0;
  /** `loadedmetadata` seeks meant for the source just set, dropped when it is swapped out. */
  private seeks: AbortController | null = null;
  /** Sleep-timer fade gain and start/pause fade level; the element's volume is their product. */
  private gain = 1;
  private level = 1;
  private rampTimer = 0;
  /** Waiting for the first sound before a fade-in ramp starts (so it is not spent buffering). */
  private pendingFadeIn = false;
  /** Paused by the user, but the fade-out is still sounding. `state` already says "paused". */
  private ghost = false;
  /** Fallback for a clip that never reports `ended`. */
  private clipTimer = 0;

  constructor() {
    super();
    const el = document.createElement('audio');
    el.loop = true;
    el.preload = 'none';
    el.setAttribute('playsinline', '');
    el.setAttribute('x-webkit-airplay', 'allow');
    el.style.display = 'none';
    document.body.append(el);
    this.el = el;

    el.volume = 0.5;
    this.volumeWorks = el.volume === 0.5;
    el.volume = 1;

    try {
      const nav = navigator as Navigator & AudioSessionNav;
      if (nav.audioSession) nav.audioSession.type = 'playback';
    } catch {
      /* ignore */
    }

    el.addEventListener('play', () => {
      if (this.state === 'paused' && !this.ghost) this.set('loading');
    });
    el.addEventListener('waiting', () => {
      if (!el.paused && !this.ghost) this.set('loading');
    });
    el.addEventListener('playing', () => {
      if (this.ghost) return;
      this.set('playing');
      if (this.pendingFadeIn) {
        this.pendingFadeIn = false;
        this.startRamp(1);
      }
    });
    el.addEventListener('pause', () => {
      if (this.selfPauses > 0) {
        this.selfPauses--;
        return;
      }
      if (el.ended) return;
      // paused from outside (lock screen, headphones): no fade is possible any more
      this.ghost = false;
      this.pendingFadeIn = false;
      this.cancelRamp();
      this.level = 1;
      this.apply();
      this.set('paused');
    });
    el.addEventListener('ended', () => this.onEnded());
    el.addEventListener('error', () => {
      if (this.mode === 'outro') return void this.outroFailed();
      if (this.mode === 'fadein') return void this.fadeInFailed();
      if (this.mode === 'fadeout') return this.finishGhost();
      this.ghost = false;
      this.set('paused');
      this.dispatchEvent(new Event('error'));
    });
    el.addEventListener('timeupdate', () => this.dispatchEvent(new Event('timeupdate')));
  }

  private set(s: PlayState) {
    if (this.state === s) return;
    this.state = s;
    this.dispatchEvent(new Event('state'));
  }

  /** Pause without telling the UI (we are about to swap the source). */
  private quietPause() {
    if (!this.el.paused) {
      this.selfPauses++;
      this.el.pause();
    }
  }

  private onEnded() {
    if (this.mode === 'outro') {
      this.restoreLoop();
      this.set('paused');
      this.dispatchEvent(new Event('finished'));
    } else if (this.mode === 'fadein') {
      void this.afterFadeIn();
    } else if (this.mode === 'fadeout') {
      this.finishGhost();
    } else {
      this.set('paused');
    }
  }

  /** Position within the loop, for the visualiser envelope. */
  get time(): number {
    return this.el.currentTime;
  }

  private loopSrc(sc: Soundscape) {
    return new URL(asset(sc.file), location.href).href;
  }

  private clipSrc(path: string) {
    return new URL(asset(path), location.href).href;
  }

  /** Apply the sleep-timer gain and the start/pause level to the element's volume. */
  private apply() {
    if (this.volumeWorks) this.el.volume = Math.min(1, Math.max(0, this.gain * this.level));
  }

  private cancelRamp() {
    clearInterval(this.rampTimer);
    this.rampTimer = 0;
  }

  /** Ramp the start/pause level from where it is to `to`, timed by the clock so a throttled page still ends on time. */
  private startRamp(to: number, done?: () => void) {
    this.cancelRamp();
    const from = this.level;
    const total = rampMs(from, to);
    if (total <= 0) {
      this.level = to;
      this.apply();
      return void done?.();
    }
    const t0 = Date.now();
    const step = () => {
      const elapsed = Date.now() - t0;
      this.level = rampLevel(from, to, elapsed);
      this.apply();
      if (elapsed >= total) {
        this.cancelRamp();
        done?.();
      }
    };
    this.rampTimer = window.setInterval(step, 50);
    step();
  }

  /** Select a soundscape; with `autoplay` it keeps playing without the UI seeing a pause. */
  async load(sc: Soundscape, autoplay: boolean): Promise<void> {
    this.current = sc;
    this.quietPause();
    this.ghost = false;
    this.pendingFadeIn = false;
    this.cancelRamp();
    this.clearClipTimer();
    this.mode = 'loop';
    this.newSeek();
    this.el.loop = true;
    this.el.src = this.loopSrc(sc);
    this.gain = 1;
    this.level = 1;
    this.apply();
    if (autoplay) await this.play();
    else this.set('paused');
  }

  /** Start (or resume) with a 4 s fade-in. */
  async play(): Promise<void> {
    const sc = this.current;
    if (!sc) return;
    this.el.preload = 'auto';
    if (!this.volumeWorks) return this.playWithClip(sc);
    // play() during a fade-out turns it round from wherever it has got to
    const turnaround = this.ghost;
    const from = turnaround ? this.level : 0;
    this.ghost = false;
    if (this.mode !== 'loop') this.restoreLoop();
    if (!this.el.src) this.el.src = this.loopSrc(sc);
    this.level = from;
    this.apply();
    if (turnaround) {
      this.set('playing');
      this.startRamp(1);
    } else {
      this.pendingFadeIn = true;
      if (this.state === 'paused') this.set('loading');
    }
    try {
      await this.el.play();
    } catch (e) {
      this.pendingFadeIn = false;
      this.level = 1;
      this.apply();
      if ((e as DOMException)?.name !== 'AbortError') this.set('paused');
    }
  }

  /** iOS: the first 4 s come from the fade-in clip, then the loop carries on from 4 s. */
  private async playWithClip(sc: Soundscape): Promise<void> {
    this.ghost = false;
    this.quietPause();
    this.clearClipTimer();
    this.mode = 'fadein';
    this.el.loop = false;
    this.newSeek();
    this.el.src = this.clipSrc(sc.fadeIn);
    if (this.state === 'paused') this.set('loading');
    this.clipTimer = window.setTimeout(() => void this.afterFadeIn(), FADE_IN_MS + 2500);
    try {
      await this.el.play();
    } catch (e) {
      if (this.mode === 'fadein') await this.fadeInFailed((e as DOMException)?.name === 'AbortError');
    }
  }

  /** The fade-in clip has finished: continue the loop where the clip left off. */
  private async afterFadeIn(): Promise<void> {
    if (this.mode !== 'fadein' || !this.current) return;
    this.clearClipTimer();
    this.quietPause();
    this.mode = 'loop';
    this.el.loop = true;
    this.el.src = this.loopSrc(this.current);
    this.el.addEventListener('loadedmetadata', () => (this.el.currentTime = FADE_IN_SEC), { once: true, signal: this.newSeek() });
    try {
      await this.el.play();
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') this.set('paused');
    }
  }

  /** The fade-in clip could not play (refused, or not loadable offline): start the loop without a fade. */
  private async fadeInFailed(aborted = false): Promise<void> {
    if (aborted) return;
    this.quietPause();
    this.restoreLoop();
    try {
      await this.el.play();
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') this.set('paused');
    }
  }

  /** Pause with a 5 s fade-out (a sleep timer's own end fades over 60 s, see startOutro); the UI says "paused" straight away. */
  pause(): void {
    const sc = this.current;
    // nothing audible yet, or already fading (the timer's outro, the fade-in clip): just stop
    if (this.state !== 'playing' || !sc || this.ghost || this.mode === 'outro' || this.mode === 'fadein') {
      this.el.pause();
      return;
    }
    this.pendingFadeIn = false;
    this.ghost = true;
    if (this.volumeWorks) {
      this.set('paused');
      this.startRamp(0, () => this.finishGhost());
      return;
    }
    // iOS: swap to the fade-out clip, which starts from the loop's beginning
    this.loopTime = this.el.currentTime;
    this.quietPause();
    this.mode = 'fadeout';
    this.el.loop = false;
    this.newSeek();
    this.el.src = this.clipSrc(sc.fadeOut);
    this.set('paused');
    this.clearClipTimer();
    this.clipTimer = window.setTimeout(() => this.finishGhost(), FADE_OUT_MS + 2500);
    this.el.play().catch(() => {
      if (this.mode === 'fadeout') this.finishGhost(); // not when play() was started over meanwhile
    });
  }

  /** The fade-out has run out: really pause, ready for the next play. */
  private finishGhost() {
    this.ghost = false;
    this.cancelRamp();
    this.clearClipTimer();
    this.quietPause();
    this.restoreLoop();
  }

  private clearClipTimer() {
    clearTimeout(this.clipTimer);
    this.clipTimer = 0;
  }

  async toggle(): Promise<void> {
    if (this.state === 'paused') await this.play();
    else this.pause();
  }

  /** Stop playback and make the next play() start the loop with the volume restored. */
  stop(): void {
    this.ghost = false;
    this.pendingFadeIn = false;
    this.quietPause();
    this.restoreLoop();
    this.set('paused');
  }

  // ---- end-of-timer fade ---------------------------------------------------------

  /** Desktop/Android: drive the volume directly (0..1). */
  setVolume(v: number): void {
    this.gain = Math.min(1, Math.max(0, v));
    this.apply();
  }

  /**
   * iOS ignores `volume`, so 60 s before the end we swap the same element over to the
   * pre-rendered outro (first minute of the loop, faded to silence): one hiccup, then a
   * perfectly smooth fade. Returns false if the swap failed: the loop then carries on
   * from where it was and the caller's pause at the end time takes over.
   */
  async startOutro(remainingMs: number): Promise<boolean> {
    if (this.mode === 'outro') return true;
    const sc = this.current;
    if (!sc) return false;
    try {
      this.loopTime = this.el.currentTime;
      this.quietPause();
      this.mode = 'outro';
      this.el.loop = false;
      this.el.src = new URL(asset(sc.outro), location.href).href;
      // already inside the fade (e.g. the page was hidden): skip ahead so it still ends on time
      const skip = Math.max(0, Math.min(FADE_MS / 1000, sc.duration) - remainingMs / 1000);
      if (skip > 0.5) this.el.addEventListener('loadedmetadata', () => (this.el.currentTime = skip), { once: true, signal: this.newSeek() });
      await this.el.play();
      return true;
    } catch {
      // a media error has usually got here first (it fires before play() rejects)
      if (this.mode === 'outro') await this.outroFailed();
      return false;
    }
  }

  /** The outro could not play (refused, or not loadable offline): go back to the loop. */
  private async outroFailed(): Promise<void> {
    const at = this.loopTime;
    this.quietPause();
    this.restoreLoop();
    this.el.addEventListener('loadedmetadata', () => (this.el.currentTime = at), { once: true, signal: this.newSeek() });
    try {
      await this.el.play();
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') this.set('paused');
    }
  }

  /** Drop any pending seek; returns the signal for a new one. */
  private newSeek(): AbortSignal {
    this.seeks?.abort();
    this.seeks = new AbortController();
    return this.seeks.signal;
  }

  private restoreLoop() {
    this.gain = 1;
    this.level = 1;
    this.cancelRamp();
    this.clearClipTimer();
    this.apply();
    this.newSeek();
    if (this.mode !== 'loop' && this.current) {
      this.mode = 'loop';
      this.el.loop = true;
      this.el.src = this.loopSrc(this.current);
    }
  }

  /** Abort a fade in progress. With `resume` the loop starts again if sound was playing. */
  async resetFade(resume: boolean): Promise<void> {
    if (this.mode === 'outro') {
      this.quietPause();
      this.restoreLoop();
      if (resume) await this.play();
    } else {
      this.gain = 1;
      this.apply();
    }
  }
}
