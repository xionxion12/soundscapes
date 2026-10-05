// Full-screen canvas scene driven by the real recording: each frame we read the
// pre-computed 3-band envelope at audio.currentTime (no Web Audio involved, so it keeps
// working over AirPlay). Canvas 2D, additive pre-rendered sprites, <= 30 fps, DPR <= 2.
import type { Envelope, Levels } from '../data/envelope';
import { envelopeIndex } from '../data/envelope';
import type { ThemeId } from '../data/soundscapes';

const FPS = 30;
const FPS_DIM = 12;

type RGB = [number, number, number];

function sprite(rgb: RGB, size = 64): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const [r, gg, b] = rgb;
  grad.addColorStop(0, `rgba(255,255,255,0.95)`);
  grad.addColorStop(0.18, `rgba(${r},${gg},${b},0.8)`);
  grad.addColorStop(0.5, `rgba(${r},${gg},${b},0.22)`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Frame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  dt: number;
  t: number;
  lv: Levels;
  onset: boolean;
  motion: number;
}

interface Scene {
  resize(w: number, h: number): void;
  draw(f: Frame, alpha: number): void;
}

// ---- Mediterranean: indigo night, amber fireflies, ripples on calls -----------------
class Mediterranean implements Scene {
  private bg = document.createElement('canvas');
  private fly = sprite([255, 190, 80]);
  private flies: { x: number; y: number; ph: number; sp: number; sz: number; wx: number; wy: number }[] = [];
  private ripples: { x: number; y: number; age: number; life: number; max: number }[] = [];

  resize(w: number, h: number) {
    this.bg.width = w;
    this.bg.height = h;
    const g = this.bg.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#07041a');
    grad.addColorStop(0.55, '#150b2c');
    grad.addColorStop(0.86, '#2a1430');
    grad.addColorStop(1, '#05030a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(w * 0.5, h * 0.9, 0, w * 0.5, h * 0.9, h * 0.5);
    glow.addColorStop(0, 'rgba(255,150,60,0.22)');
    glow.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    // hills and cypresses
    g.fillStyle = '#030208';
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 24) g.lineTo(x, h * 0.9 + Math.sin(x / w * 5.2) * h * 0.018 + Math.sin(x / w * 13) * h * 0.006);
    g.lineTo(w, h);
    g.fill();
    for (const [px, s] of [[0.1, 1], [0.17, 0.72], [0.9, 1.15], [0.82, 0.8]] as const) {
      const x = w * px, y = h * 0.915, k = h * 0.15 * s;
      g.beginPath();
      g.moveTo(x, y - k);
      g.bezierCurveTo(x + k * 0.2, y - k * 0.7, x + k * 0.17, y - k * 0.2, x + k * 0.05, y);
      g.lineTo(x - k * 0.05, y);
      g.bezierCurveTo(x - k * 0.17, y - k * 0.2, x - k * 0.2, y - k * 0.7, x, y - k);
      g.fill();
    }
    const n = Math.round((w * h) / 9000);
    this.flies = Array.from({ length: Math.min(90, Math.max(30, n)) }, () => ({
      x: Math.random() * w, y: rand(h * 0.2, h * 0.95), ph: rand(0, 6.28), sp: rand(0.25, 0.8), sz: rand(0.6, 1.5), wx: rand(0.1, 0.4), wy: rand(0.1, 0.35),
    }));
  }

  draw({ ctx, w, h, dt, t, lv, onset, motion }: Frame, alpha: number) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.bg, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    const unit = h / 852;
    for (const f of this.flies) {
      if (motion) {
        f.x += Math.sin(t * f.wx + f.ph) * 14 * dt * motion;
        f.y += Math.cos(t * f.wy + f.ph * 1.7) * 9 * dt * motion;
        if (f.x < -20) f.x = w + 20;
        if (f.x > w + 20) f.x = -20;
      }
      const blink = Math.pow(Math.max(0, Math.sin(t * f.sp + f.ph)), 3);
      const a = (motion ? blink : 0.5) * (0.35 + lv[1] * 0.9);
      if (a < 0.02) continue;
      const s = 34 * f.sz * unit * (0.8 + lv[2] * 0.6);
      ctx.globalAlpha = Math.min(1, a) * alpha;
      ctx.drawImage(this.fly, f.x - s / 2, f.y - s / 2, s, s);
    }
    if (onset && motion && this.ripples.length < 6) {
      this.ripples.push({ x: rand(w * 0.2, w * 0.8), y: rand(h * 0.72, h * 0.88), age: 0, life: rand(3, 4.5), max: rand(w * 0.22, w * 0.4) });
    }
    ctx.lineWidth = 1.4;
    this.ripples = this.ripples.filter((r) => (r.age += dt) < r.life);
    for (const r of this.ripples) {
      const k = r.age / r.life;
      for (let i = 0; i < 3; i++) {
        const kk = Math.max(0, k - i * 0.12);
        if (kk <= 0) continue;
        ctx.strokeStyle = `rgba(255,200,120,${(1 - kk) * 0.32 * (1 - i * 0.3)})`;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.max * kk, r.max * kk * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}

// ---- Rainforest: emerald bioluminescence, high band drives the shimmer ---------------
class Rainforest implements Scene {
  private bg = document.createElement('canvas');
  private sprites = [sprite([40, 255, 170]), sprite([50, 220, 255]), sprite([170, 255, 90])];
  private mist = sprite([20, 190, 140], 128);
  private spores: { x: number; y: number; z: number; ph: number; c: number; sz: number }[] = [];
  private mists: { x: number; y: number; s: number; ph: number }[] = [];
  private shimmer = 0;

  resize(w: number, h: number) {
    this.bg.width = w;
    this.bg.height = h;
    const g = this.bg.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#000a07');
    grad.addColorStop(0.5, '#02261d');
    grad.addColorStop(1, '#000504');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // drooping leaves hanging from the top edge
    g.fillStyle = 'rgba(0,0,0,0.78)';
    for (let i = 0; i < 7; i++) {
      const x = (i / 6) * w + rand(-20, 20), len = h * rand(0.06, 0.15), half = w * rand(0.05, 0.08);
      g.beginPath();
      g.moveTo(x - half, 0);
      g.bezierCurveTo(x - half * 0.9, len * 0.7, x - half * 0.2, len, x + rand(-10, 10), len);
      g.bezierCurveTo(x + half * 0.2, len, x + half * 0.9, len * 0.7, x + half, 0);
      g.fill();
    }
    this.spores = Array.from({ length: 90 }, () => ({
      x: Math.random() * w, y: Math.random() * h, z: rand(0.25, 1), ph: rand(0, 6.28), c: Math.floor(Math.random() * 3), sz: rand(0.6, 1.4),
    }));
    this.mists = Array.from({ length: 6 }, () => ({ x: Math.random() * w, y: rand(h * 0.3, h * 0.9), s: rand(0.5, 0.9) * w, ph: rand(0, 6.28) }));
  }

  draw({ ctx, w, h, dt, t, lv, motion }: Frame, alpha: number) {
    this.shimmer += (lv[2] - this.shimmer) * Math.min(1, dt * 6);
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.bg, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.mists) {
      const dx = motion ? Math.sin(t * 0.05 + m.ph) * 40 : 0;
      ctx.globalAlpha = alpha * (0.07 + lv[0] * 0.18);
      ctx.drawImage(this.mist, m.x + dx - m.s / 2, m.y - m.s / 2, m.s, m.s);
    }
    const unit = h / 852;
    for (const p of this.spores) {
      if (motion) {
        p.y -= (6 + p.z * 14) * dt * motion;
        p.x += Math.sin(t * 0.4 + p.ph) * 8 * p.z * dt * motion;
        if (p.y < -30) { p.y = h + 30; p.x = Math.random() * w; }
      }
      const twinkle = motion ? 0.5 + 0.5 * Math.sin(t * (1.5 + p.z * 3) + p.ph) : 0.7;
      const a = (0.1 + p.z * 0.33) * (0.4 + twinkle * (0.6 + this.shimmer * 1.6));
      const s = (12 + p.z * 30) * p.sz * unit * (0.9 + this.shimmer * 0.6);
      ctx.globalAlpha = Math.min(1, a) * alpha;
      ctx.drawImage(this.sprites[p.c]!, p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}

// ---- Temperate night: moonlit stars that twinkle with the crickets --------------------
class Night implements Scene {
  private bg = document.createElement('canvas');
  private star = sprite([200, 215, 255], 32);
  private moon = sprite([170, 195, 255], 256);
  private stars: { x: number; y: number; ph: number; sp: number; sz: number }[] = [];
  private mx = 0;
  private my = 0;
  private mr = 0;

  resize(w: number, h: number) {
    this.bg.width = w;
    this.bg.height = h;
    const g = this.bg.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#01030a');
    grad.addColorStop(0.6, '#0a1332');
    grad.addColorStop(0.92, '#101a3a');
    grad.addColorStop(1, '#02040a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // treeline
    g.fillStyle = '#01020a';
    g.beginPath();
    g.moveTo(0, h);
    let x = 0;
    while (x <= w + 20) {
      const th = h * rand(0.045, 0.1);
      g.lineTo(x, h - h * 0.02 - th * 0.3);
      g.lineTo(x + 9, h - h * 0.02 - th);
      g.lineTo(x + 18, h - h * 0.02 - th * 0.3);
      x += 18;
    }
    g.lineTo(w, h);
    g.fill();
    this.mx = w * 0.8;
    this.my = h * 0.215;
    this.mr = Math.min(w, h) * 0.055;
    const n = Math.round((w * h) / 2600);
    this.stars = Array.from({ length: Math.min(220, n) }, () => ({
      x: Math.random() * w, y: Math.random() * h * 0.82, ph: rand(0, 6.28), sp: rand(0.8, 3), sz: rand(0.5, 1.3),
    }));
  }

  draw({ ctx, w, h, t, lv, motion }: Frame, alpha: number) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.bg, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    const unit = h / 852;
    const moonGlow = this.mr * 9;
    ctx.globalAlpha = alpha * (0.5 + lv[0] * 0.2);
    ctx.drawImage(this.moon, this.mx - moonGlow / 2, this.my - moonGlow / 2, moonGlow, moonGlow);
    ctx.globalAlpha = alpha * 0.95;
    ctx.fillStyle = '#dfe8ff';
    ctx.beginPath();
    ctx.arc(this.mx, this.my, this.mr, 0, Math.PI * 2);
    ctx.fill();
    const chirp = lv[2];
    for (const s of this.stars) {
      const tw = motion ? 0.5 + 0.5 * Math.sin(t * s.sp + s.ph) : 0.7;
      const a = (0.25 + tw * 0.4) * (0.6 + chirp * 1.6 * (0.5 + 0.5 * Math.sin(t * 9 + s.ph * 3)));
      const sz = (6 + s.sz * 9) * unit * 1.5;
      ctx.globalAlpha = Math.min(1, a) * alpha;
      ctx.drawImage(this.star, s.x - sz / 2, s.y - sz / 2, sz, sz);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    void w;
  }
}

const SCENES: Record<ThemeId, () => Scene> = {
  mediterranean: () => new Mediterranean(),
  rainforest: () => new Rainforest(),
  night: () => new Night(),
};

export interface VisualizerOptions {
  canvas: HTMLCanvasElement;
  /** Current playback position in the loop (s). */
  time: () => number;
  envelope: () => Envelope | null;
  playing: () => boolean;
  /** Called every frame with the smoothed levels (drives the orb pulse). */
  onLevels?: (lv: Levels) => void;
}

export class Visualizer {
  private ctx: CanvasRenderingContext2D;
  private opts: VisualizerOptions;
  private scenes = new Map<ThemeId, Scene>();
  private from: Scene | null = null;
  private to: Scene | null = null;
  private fade = 1;
  private w = 0;
  private h = 0;
  private raf = 0;
  private last = 0;
  private t = 0;
  private dim = false;
  private lv: Levels = [0, 0, 0];
  private avg = 0;
  private lastOnset = -10;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(opts: VisualizerOptions) {
    this.opts = opts;
    this.ctx = opts.canvas.getContext('2d', { alpha: false })!;
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
    this.reduced.addEventListener?.('change', () => this.renderStill());
  }

  setTheme(id: ThemeId, instant = false) {
    let sc = this.scenes.get(id);
    if (!sc) {
      sc = SCENES[id]();
      this.scenes.set(id, sc);
      if (this.w) sc.resize(this.w, this.h);
    }
    if (sc === this.to) return;
    this.from = instant ? null : this.to;
    this.to = sc;
    this.fade = instant || !this.from ? 1 : 0;
    this.renderStill();
  }

  setDim(dim: boolean) {
    this.dim = dim;
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const { canvas } = this.opts;
    this.w = Math.round(cw * dpr);
    this.h = Math.round(ch * dpr);
    canvas.width = this.w;
    canvas.height = this.h;
    for (const s of this.scenes.values()) s.resize(this.w, this.h);
    this.renderStill();
  }

  start() {
    if (this.raf || document.hidden) return;
    this.last = performance.now();
    const loop = (ts: number) => {
      this.raf = requestAnimationFrame(loop);
      const interval = 1000 / (this.dim ? FPS_DIM : FPS);
      if (ts - this.last < interval - 2) return;
      const dt = Math.min(0.1, (ts - this.last) / 1000);
      this.last = ts;
      this.frame(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private renderStill() {
    if (!this.w || !this.to) return;
    this.frame(0);
  }

  private read(dt: number) {
    const env = this.opts.envelope();
    const playing = this.opts.playing();
    let target: Levels = [0.18, 0.12, 0.08];
    if (env && playing) {
      // linear interpolation between the 10 Hz samples so the motion is smooth
      const pos = Math.max(0, this.opts.time()) * env.rate;
      const i = envelopeIndex(env, this.opts.time());
      const j = (i + 1) % Math.max(1, env.length);
      const k = pos - Math.floor(pos);
      target = [0, 0, 0];
      for (let b = 0; b < 3; b++) {
        const a = env.bands[b]?.[i] ?? 0;
        const c = env.bands[b]?.[j] ?? a;
        target[b] = (a + (c - a) * k) / 255;
      }
    }
    const k = 1 - Math.exp(-dt * 9);
    for (let b = 0; b < 3; b++) this.lv[b] = this.lv[b]! + (target[b]! - this.lv[b]!) * k;
    return target;
  }

  private frame(dt: number) {
    const target = this.read(dt);
    this.t += dt;
    const motion = this.reduced.matches ? 0 : 1;

    // onset: mid/low band jumps well above its running average -> a call
    const energy = Math.max(target[0]!, target[1]!);
    this.avg += (energy - this.avg) * Math.min(1, dt * 0.8);
    let onset = false;
    if (this.opts.playing() && energy > 0.22 && energy > this.avg * 1.7 && this.t - this.lastOnset > 1.1) {
      onset = true;
      this.lastOnset = this.t;
    }

    this.opts.onLevels?.(this.lv);

    const ctx = this.ctx;
    const frame: Frame = { ctx, w: this.w, h: this.h, dt, t: this.t, lv: this.lv, onset, motion };
    if (this.fade < 1) this.fade = Math.min(1, this.fade + dt / 0.9);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.w, this.h);
    if (this.from && this.fade < 1) this.from.draw(frame, 1 - this.fade);
    this.to?.draw(frame, this.from && this.fade < 1 ? this.fade : 1);
    if (this.fade >= 1) this.from = null;
  }
}
