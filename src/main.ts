import './styles.css';
import { soundscapes, asset, type Soundscape } from './data/soundscapes';
import { decodeEnvelope, type Envelope } from './data/envelope';
import { Engine } from './audio/engine';
import { setupAirPlay } from './audio/airplay';
import { clearPosition, setPlaybackState, setTimerPosition, setupMediaSession, updateMetadata } from './audio/mediaSession';
import { loadSaved, save } from './state';
import {
  TIMER_OPTIONS, countdownLabel, durationLabel, endClockLabel, fadeGain, remainingMs, startTimer, timerPhase, type TimerState,
} from './timer';
import { setupCarousel } from './ui/carousel';
import { setupSheet } from './ui/sheet';
import { Visualizer } from './ui/visualizer';
import { tick as haptic } from './ui/haptics';

const $ = <T extends HTMLElement | SVGElement = HTMLElement>(id: string) => document.getElementById(id) as unknown as T;
const DIM_AFTER_MS = 15_000;

const saved = loadSaved();
let index = Math.max(0, soundscapes.findIndex((s) => s.id === saved.soundscapeId));
let minutes = saved.minutes;
let timer: TimerState | null = null;
let outroTried = false;
let dimmed = false;
let lastTouch = Date.now();
let fastTick = 0;

const engine = new Engine();
const envCache = new Map<string, Envelope>();
const currentScape = (): Soundscape => soundscapes[index]!;
const currentEnv = (): Envelope | null => {
  const sc = currentScape();
  if (!envCache.has(sc.id)) envCache.set(sc.id, decodeEnvelope(sc.envelope));
  return envCache.get(sc.id) ?? null;
};

const orb = $<HTMLButtonElement>('orb');
const glyph = $<SVGPathElement>('glyph-path');
const dots = $('dots');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// ---- visuals --------------------------------------------------------------------------
const viz = new Visualizer({
  canvas: $<HTMLCanvasElement>('scene'),
  time: () => engine.time,
  envelope: currentEnv,
  playing: () => engine.state === 'playing',
  onLevels: (lv) => {
    const p = Math.round(lv[0] * 100) / 100;
    if (p !== lastPulse) {
      lastPulse = p;
      $('orb-wrap').style.setProperty('--pulse', String(p));
    }
  },
});
let lastPulse = -1;

// ---- timer ----------------------------------------------------------------------------
function setMinutes(m: number) {
  minutes = m;
  save({ soundscapeId: currentScape().id, minutes });
  if (engine.state !== 'paused') {
    // restart the running timer with the new length
    outroTried = false;
    const wasOutro = engine.mode === 'outro';
    void engine.resetFade(wasOutro);
    timer = startTimer(Date.now(), minutes);
  }
  render();
}

function clearTimer() {
  timer = null;
  outroTried = false;
  void engine.resetFade(false);
  clearPosition();
}

// ---- timer chips / dots ---------------------------------------------------------------
const presets = $('presets');
for (const m of TIMER_OPTIONS) {
  const b = document.createElement('button');
  b.className = 'chip';
  b.type = 'button';
  b.dataset.minutes = String(m);
  b.textContent = durationLabel(m);
  b.setAttribute('aria-label', m === 0 ? 'No timer' : m < 60 ? `${m} minutes` : `${m / 60} hours`);
  b.addEventListener('click', () => {
    haptic();
    setMinutes(m);
  });
  presets.append(b);
}

soundscapes.forEach((sc, i) => {
  const d = document.createElement('button');
  d.className = 'dot';
  d.type = 'button';
  d.setAttribute('role', 'tab');
  d.setAttribute('aria-label', sc.name);
  d.addEventListener('click', () => void select(i, Math.sign(i - index) as 1 | -1));
  dots.append(d);
});

// ---- render ---------------------------------------------------------------------------
const PLAY = 'M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z';
const PAUSE = 'M7 4.5h3.4v15H7zM13.6 4.5H17v15h-3.6z';

function render() {
  const now = Date.now();
  const sc = currentScape();
  const active = engine.state !== 'paused';

  glyph.setAttribute('d', active ? PAUSE : PLAY);
  orb.setAttribute('aria-label', active ? 'Pause' : 'Play');
  orb.setAttribute('aria-busy', String(engine.state === 'loading'));

  let main: string;
  let end: string;
  if (active && timer) {
    const left = remainingMs(timer, now);
    main = left < 60_000 ? countdownLabel(left) : durationLabel(Math.ceil(left / 60_000));
    end = `ends at ${endClockLabel(timer.endsAt, 0)}`;
  } else {
    main = durationLabel(minutes);
    end = minutes > 0 ? `ends at ${endClockLabel(now, minutes)}` : 'until you stop it';
  }
  $('readout-main').textContent = main;
  $('readout-end').textContent = end;

  presets.querySelectorAll<HTMLButtonElement>('.chip').forEach((c) => c.setAttribute('aria-pressed', String(Number(c.dataset.minutes) === minutes)));
  dots.querySelectorAll('.dot').forEach((d, i) => d.setAttribute('aria-selected', String(i === index)));
  document.documentElement.dataset.theme = sc.theme;
}

let titleAnim: Animation | null = null;
async function showTitles(sc: Soundscape, dir: number) {
  const el = $('titles');
  const setText = () => {
    $('title').textContent = sc.name;
    $('subtitle').textContent = sc.subtitle;
  };
  titleAnim?.cancel();
  if (!dir || reducedMotion.matches || !el.animate) return setText();
  titleAnim = el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 28}px)` }], { duration: 140, fill: 'forwards' });
  try {
    await titleAnim.finished;
  } catch {
    return;
  }
  setText();
  titleAnim.cancel();
  titleAnim = el.animate([{ opacity: 0, transform: `translateX(${dir * 28}px)` }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(0.2,0.8,0.2,1)' });
}

// ---- selecting a soundscape -----------------------------------------------------------
async function select(i: number, dir = 0) {
  const n = soundscapes.length;
  const next = ((i % n) + n) % n;
  if (next === index && engine.current) return;
  const keepPlaying = engine.state !== 'paused';
  index = next;
  const sc = currentScape();
  save({ soundscapeId: sc.id, minutes });
  haptic();
  viz.setTheme(sc.theme, !dir);
  void showTitles(sc, dir);
  updateMetadata(sc);
  render();
  // iOS: if the timer is already fading, the next tick swaps this soundscape to its own outro
  outroTried = false;
  await engine.load(sc, keepPlaying);
}

// ---- play / pause / timer -------------------------------------------------------------
function onEngineState() {
  const active = engine.state !== 'paused';
  if (active && !timer && minutes > 0) timer = startTimer(Date.now(), minutes);
  if (!active) {
    clearTimer();
    wake();
  }
  setPlaybackState(active ? (engine.state === 'playing' ? 'playing' : 'paused') : 'paused');
  render();
}
engine.addEventListener('state', onEngineState);
engine.addEventListener('finished', () => {
  clearTimer();
  wake();
  render();
});
engine.addEventListener('timeupdate', () => throttledTick());

orb.addEventListener('click', () => {
  void engine.toggle();
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) {
    e.preventDefault();
    void engine.toggle();
  }
});

/** Called from timeupdate, visibilitychange and a 1 s interval (any may be throttled). */
function tick() {
  const now = Date.now();
  if (timer) {
    const phase = timerPhase(timer, now);
    if (phase === 'fading') {
      if (engine.volumeWorks) {
        engine.setVolume(fadeGain(timer, now));
      } else if (!outroTried) {
        outroTried = true;
        void engine.startOutro(remainingMs(timer, now)); // on failure the pause at endsAt below takes over
      }
      if (!fastTick && engine.volumeWorks) fastTick = window.setInterval(tick, 250);
    } else if (phase === 'expired') {
      // the outro ends by itself at the same moment; give it a moment before forcing a stop
      if (engine.mode !== 'outro' || now > timer.endsAt + 4000) {
        engine.stop();
        clearTimer();
      }
    }
  }
  if (!timer && fastTick) {
    clearInterval(fastTick);
    fastTick = 0;
  }
  if (engine.state === 'playing' && !dimmed && !sheet.isOpen && now - lastTouch > DIM_AFTER_MS) setDim(true);
  mediaProgress(now);
  render();
}

let lastTick = 0;
function throttledTick() {
  const t = performance.now();
  if (t - lastTick < 500) return;
  lastTick = t;
  tick();
}

let lastPos = 0;
function mediaProgress(now: number) {
  if (now - lastPos < 5000) return;
  lastPos = now;
  if (timer && engine.state === 'playing') setTimerPosition((timer.endsAt - timer.startedAt) / 1000, (now - timer.startedAt) / 1000);
}

setInterval(tick, 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) tick();
});

// ---- sleep dim ------------------------------------------------------------------------
let swallowClick = false;
function setDim(d: boolean) {
  dimmed = d;
  document.body.classList.toggle('dim', d);
  viz.setDim(d);
}
function wake() {
  lastTouch = Date.now();
  if (dimmed) setDim(false);
}
const onTouch = (e: Event) => {
  lastTouch = Date.now();
  swallowClick = false; // a fresh touch: its click is a real one
  if (dimmed) {
    // the tap that wakes the screen must not also press a button; neither must its click
    e.stopPropagation();
    e.preventDefault();
    setDim(false);
    swallowClick = e.type === 'pointerdown';
  }
};
window.addEventListener('pointerdown', onTouch, true);
window.addEventListener('keydown', onTouch, true);
window.addEventListener(
  'click',
  (e) => {
    if (swallowClick) {
      e.stopPropagation();
      e.preventDefault();
      swallowClick = false;
    }
  },
  true,
);

// ---- swipe, sheet, AirPlay, media session --------------------------------------------
const sheet = setupSheet(() => (lastTouch = Date.now()));
setupCarousel({
  root: $('app'),
  ignore: (t) => sheet.contains(t),
  onSwipe: (dir) => {
    if (!sheet.isOpen) void select(index + dir, dir);
  },
});
$('info').addEventListener('click', () => sheet.open(currentScape()));

const airplay = setupAirPlay(engine.el, (s) => {
  $('airplay').hidden = !s.available;
  $('badge').hidden = !s.wireless;
});
$('airplay').addEventListener('click', () => airplay.showPicker());

setupMediaSession({
  play: () => void engine.play(),
  pause: () => engine.pause(),
  stop: () => engine.stop(),
  next: () => void select(index + 1, 1),
  previous: () => void select(index - 1, -1),
});

// ---- boot -----------------------------------------------------------------------------
viz.setTheme(currentScape().theme, true);
viz.resize();
viz.start();
void showTitles(currentScape(), 0);
updateMetadata(currentScape());
render();
void engine.load(currentScape(), false);

// expose a small hook for the end-to-end tests
(window as unknown as { __soundscapes: object }).__soundscapes = { engine, select, get timer() { return timer; }, get index() { return index; } };

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => {
    navigator.serviceWorker.register(asset('sw.js')).catch(() => {});
  });
}
