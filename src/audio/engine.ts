// One <audio> element does everything. On iOS Safari this is the only way to get
// AirPlay, lock-screen playback and silent-switch-proof audio; Web Audio is never used.
import type { Soundscape } from '../data/soundscapes';
import { asset } from '../data/soundscapes';

export type PlayState = 'paused' | 'loading' | 'playing';
type Mode = 'loop' | 'outro';

interface AudioSessionNav {
  audioSession?: { type: string };
}

/**
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
      if (this.state === 'paused') this.set('loading');
    });
    el.addEventListener('waiting', () => {
      if (!el.paused) this.set('loading');
    });
    el.addEventListener('playing', () => this.set('playing'));
    el.addEventListener('pause', () => {
      if (this.selfPauses > 0) {
        this.selfPauses--;
        return;
      }
      if (!el.ended) this.set('paused');
    });
    el.addEventListener('ended', () => this.onEnded());
    el.addEventListener('error', () => {
      if (this.mode === 'outro') return void this.outroFailed();
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

  /** Select a soundscape; with `autoplay` it keeps playing without the UI seeing a pause. */
  async load(sc: Soundscape, autoplay: boolean): Promise<void> {
    this.current = sc;
    this.quietPause();
    this.mode = 'loop';
    this.newSeek();
    this.el.loop = true;
    this.el.src = this.loopSrc(sc);
    this.el.volume = 1;
    if (autoplay) await this.play();
    else this.set('paused');
  }

  async play(): Promise<void> {
    if (!this.current) return;
    if (!this.el.src) this.el.src = this.loopSrc(this.current);
    this.el.preload = 'auto';
    try {
      if (this.state === 'paused') this.set('loading');
      await this.el.play();
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') this.set('paused');
    }
  }

  pause(): void {
    this.el.pause();
  }

  async toggle(): Promise<void> {
    if (this.state === 'paused') await this.play();
    else this.pause();
  }

  /** Stop playback and make the next play() start the loop with the volume restored. */
  stop(): void {
    this.quietPause();
    this.restoreLoop();
    this.set('paused');
  }

  // ---- end-of-timer fade ---------------------------------------------------------

  /** Desktop/Android: drive the volume directly (0..1). */
  setVolume(v: number): void {
    if (this.volumeWorks) this.el.volume = Math.min(1, Math.max(0, v));
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
      const skip = Math.max(0, Math.min(60, sc.duration) - remainingMs / 1000);
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
    this.el.volume = 1;
    this.newSeek();
    if (this.mode === 'outro' && this.current) {
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
      this.el.volume = 1;
    }
  }
}
