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
  /** Moon-halo swells, one per call (age in s). */
  private swells: number[] = [];

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

  draw({ ctx, w, h, dt, t, lv, onset, motion }: Frame, alpha: number) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.bg, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    const unit = h / 852;
    if (onset && motion && this.swells.length < 3) this.swells.push(0);
    const moonGlow = this.mr * 9;
    ctx.globalAlpha = alpha * (0.5 + lv[0] * 0.2);
    ctx.drawImage(this.moon, this.mx - moonGlow / 2, this.my - moonGlow / 2, moonGlow, moonGlow);
    // each call swells a soft halo around the moon, then lets it fade
    this.swells = this.swells.map((a) => a + dt).filter((a) => a < SWELL_LIFE);
    for (const age of this.swells) {
      const k = age / SWELL_LIFE;
      const sz = moonGlow * (0.7 + k * 1.1);
      ctx.globalAlpha = alpha * Math.sin(Math.PI * Math.min(1, k * 1.6)) * (1 - k) * 0.6;
      ctx.drawImage(this.moon, this.mx - sz / 2, this.my - sz / 2, sz, sz);
    }
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

const SWELL_LIFE = 3.6;

// ---- Australian bush night: southern sky over eucalypts ---------------------------------
// Stars are placed for a view to the south: the Southern Cross with the Pointers beside it.
const CROSS: { x: number; y: number; m: number }[] = [
  { x: 0, y: -1, m: 1.0 }, // Gacrux
  { x: 0.05, y: 1, m: 1.3 }, // Acrux
  { x: -0.62, y: 0.15, m: 1.1 }, // Mimosa
  { x: 0.62, y: -0.3, m: 0.85 }, // Delta Crucis
  { x: 0.3, y: 0.32, m: 0.45 }, // Epsilon Crucis
];
const POINTERS: { x: number; y: number; m: number }[] = [
  { x: -2.5, y: 1.55, m: 1.35 }, // Alpha Centauri
  { x: -2.25, y: 0.3, m: 1.1 }, // Beta Centauri
];

/** A tall, sparse-crowned eucalypt: pale-edged trunk, a few limbs and drooping leaf tassels. */
function eucalypt(f: CanvasRenderingContext2D, x: number, base: number, height: number, lean: number, h: number, ink = '#020207') {
  const pts: [number, number][] = [];
  const wBase = h * 0.0055;
  for (let i = 0; i <= 14; i++) {
    const k = i / 14;
    pts.push([x + lean * k * k + Math.sin(k * 5 + x) * h * 0.004, base - height * k]);
  }
  const at = (k: number) => pts[Math.min(14, Math.round(k * 14))]!;
  const trunk = () => {
    f.beginPath();
    pts.forEach(([px, py], i) => (i ? f.lineTo(px - wBase * (1 - (i / 14) * 0.7), py) : f.moveTo(px - wBase, py)));
    for (let i = 14; i >= 0; i--) f.lineTo(pts[i]![0] + wBase * (1 - (i / 14) * 0.7), pts[i]![1]);
    f.closePath();
  };
  f.fillStyle = ink;
  trunk();
  f.fill();
  // a pale edge on the trunk, as if lit by starlight
  f.strokeStyle = 'rgba(200,205,235,0.13)';
  f.lineWidth = Math.max(1, h * 0.0016);
  f.beginPath();
  pts.forEach(([px, py], i) => {
    const xx = px + wBase * (1 - (i / 14) * 0.7) * 0.8;
    if (i) f.lineTo(xx, py);
    else f.moveTo(xx, py);
  });
  f.stroke();
  // limbs and drooping crowns
  f.strokeStyle = ink;
  f.lineCap = 'round';
  const tips: [number, number][] = [at(1)];
  for (const [k, dir, len] of [[0.55, -1, 0.1], [0.68, 1, 0.13], [0.8, -1, 0.09], [0.9, 1, 0.07]] as const) {
    const [bx, by] = at(k);
    const tx = bx + dir * h * len * rand(0.7, 1), ty = by - height * rand(0.06, 0.12);
    f.lineWidth = wBase * 0.6;
    f.beginPath();
    f.moveTo(bx, by);
    f.quadraticCurveTo(bx + dir * h * len * 0.2, by - height * 0.1, tx, ty);
    f.stroke();
    tips.push([tx, ty]);
  }
  f.lineWidth = Math.max(1.2, h * 0.0016);
  for (const [tx, ty] of tips) {
    for (let i = 0; i < 9; i++) {
      const a = rand(-0.2, Math.PI + 0.2), r = h * rand(0.018, 0.04);
      const ex = tx + Math.cos(a) * r * 1.4, ey = ty - Math.sin(a) * r * 0.25 + r * rand(0.5, 1.1);
      f.beginPath();
      f.moveTo(tx + Math.cos(a) * r * 0.2, ty);
      f.quadraticCurveTo(tx + Math.cos(a) * r, ty - r * 0.25, ex, ey);
      f.stroke();
    }
  }
}

class Bush implements Scene {
  private sky = document.createElement('canvas');
  private fg = document.createElement('canvas');
  private star = sprite([205, 215, 255], 32);
  private warm = sprite([255, 150, 90], 256);
  private halo = sprite([170, 180, 255], 256);
  private stars: { x: number; y: number; ph: number; sp: number; sz: number }[] = [];
  private cx = 0;
  private cy = 0;
  private cu = 0;
  private swells: number[] = [];
  private shimmer = 0;

  resize(w: number, h: number) {
    for (const c of [this.sky, this.fg]) {
      c.width = w;
      c.height = h;
    }
    const g = this.sky.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#04041a');
    grad.addColorStop(0.55, '#10124a');
    grad.addColorStop(0.86, '#27204a');
    grad.addColorStop(1, '#2a1a1c');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // faint Milky Way: a soft diagonal band with a stipple of dust stars
    g.save();
    g.translate(w * 0.42, h * 0.38);
    g.rotate(-0.72);
    const band = g.createLinearGradient(0, -h * 0.12, 0, h * 0.12);
    band.addColorStop(0, 'rgba(170,160,235,0)');
    band.addColorStop(0.5, 'rgba(170,160,235,0.13)');
    band.addColorStop(1, 'rgba(170,160,235,0)');
    g.fillStyle = band;
    g.fillRect(-h, -h * 0.12, h * 2, h * 0.24);
    g.fillStyle = 'rgba(225,225,255,0.5)';
    for (let i = 0; i < 260; i++) {
      const u = rand(-h * 0.7, h * 0.7), v = (rand(-1, 1) + rand(-1, 1)) * h * 0.05;
      g.globalAlpha = rand(0.08, 0.4);
      g.fillRect(u, v, 1.2, 1.2);
    }
    g.restore();
    // ochre glow low on the horizon (the breathing part is drawn per frame)
    const glow = g.createRadialGradient(w * 0.5, h * 0.95, 0, w * 0.5, h * 0.95, h * 0.42);
    glow.addColorStop(0, 'rgba(235,140,70,0.26)');
    glow.addColorStop(1, 'rgba(235,140,70,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);

    this.cx = w * 0.76;
    this.cy = h * 0.27;
    this.cu = h * 0.055;
    const n = Math.round((w * h) / 3000);
    this.stars = Array.from({ length: Math.min(200, n) }, () => ({
      x: Math.random() * w, y: Math.random() * h * 0.78, ph: rand(0, 6.28), sp: rand(0.7, 2.6), sz: rand(0.5, 1.3),
    }));

    // foreground: ground and tall, sparse-crowned eucalypts (pale trunks hinted at their edge)
    const f = this.fg.getContext('2d')!;
    f.clearRect(0, 0, w, h);
    const ground = h * 0.945;
    f.fillStyle = '#020207';
    f.beginPath();
    f.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 20) f.lineTo(x, ground + Math.sin((x / w) * 6.1) * h * 0.012);
    f.lineTo(w, h);
    f.fill();
    for (const [px, tall, lean] of [[0.035, 0.5, 0.02], [0.13, 0.3, -0.015], [0.965, 0.56, -0.025], [0.88, 0.32, 0.02]] as const) {
      eucalypt(f, w * px, ground, h * tall, h * lean, h);
    }
  }

  draw({ ctx, w, h, dt, t, lv, onset, motion }: Frame, alpha: number) {
    this.shimmer += (lv[2] - this.shimmer) * Math.min(1, dt * 6);
    if (onset && motion && this.swells.length < 3) this.swells.push(0);
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.sky, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    const unit = h / 852;

    // low band: the horizon glow breathes
    const gs = w * 1.5;
    ctx.globalAlpha = alpha * (0.14 + lv[0] * 0.4);
    ctx.drawImage(this.warm, w * 0.5 - gs / 2, h * 0.97 - gs * 0.28, gs, gs * 0.56);

    // twinkling stars; the high band makes them shimmer
    for (const s of this.stars) {
      const tw = motion ? 0.5 + 0.5 * Math.sin(t * s.sp + s.ph) : 0.7;
      const a = (0.15 + tw * 0.3) * (0.7 + this.shimmer * 1.5 * (0.5 + 0.5 * Math.sin(t * 8 + s.ph * 3)));
      const sz = (4 + s.sz * 5) * unit * 1.4;
      ctx.globalAlpha = Math.min(1, a) * alpha;
      ctx.drawImage(this.star, s.x - sz / 2, s.y - sz / 2, sz, sz);
    }

    // the Southern Cross and the Pointers: steady, slightly brighter than the field
    const bright = (list: { x: number; y: number; m: number }[]) => {
      for (const p of list) {
        const sz = (10 + p.m * 6) * unit * 1.6;
        const x = this.cx + p.x * this.cu, y = this.cy + p.y * this.cu;
        ctx.globalAlpha = Math.min(1, 0.7 + this.shimmer * 0.4) * alpha;
        ctx.drawImage(this.star, x - sz / 2, y - sz / 2, sz, sz);
      }
    };
    bright(CROSS);
    bright(POINTERS);

    // calls: a soft swell of starlight around the Cross
    this.swells = this.swells.map((a) => a + dt).filter((a) => a < SWELL_LIFE);
    for (const age of this.swells) {
      const k = age / SWELL_LIFE;
      const sz = this.cu * (3 + k * 3.5);
      ctx.globalAlpha = alpha * Math.sin(Math.PI * Math.min(1, k * 1.5)) * (1 - k) * 0.35;
      ctx.drawImage(this.halo, this.cx - sz / 2, this.cy - sz / 2, sz, sz);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.fg, 0, 0);
    ctx.globalAlpha = 1;
  }
}

// ---- Rain on leaves: broadleaf boughs dripping, streaks behind them, ripples on the ground ---
// The high band (the hiss of drops) sets how heavy the rain looks and how often the leaves drip,
// the low band lifts the mist.

/**
 * A leafy bough reaching in from the edge: a curved twig with alternating, drooping ovate leaves.
 * Returns the leaf tips (where the drips form).
 */
function bough(f: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, sag: number, leaves: number, size: number, ink: string) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag;
  const at = (k: number): [number, number] => [
    (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * x1,
    (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * my + k * k * y1,
  ];
  f.strokeStyle = ink;
  f.fillStyle = ink;
  f.lineCap = 'round';
  f.lineWidth = size * 0.07;
  f.beginPath();
  f.moveTo(x0, y0);
  f.quadraticCurveTo(mx, my, x1, y1);
  f.stroke();
  const tips: [number, number][] = [];
  for (let i = 0; i < leaves; i++) {
    const k = 0.12 + (i / Math.max(1, leaves - 1)) * 0.86;
    const [bx, by] = at(k);
    const side = i % 2 ? 1 : -1;
    // leaves hang down and out, smaller towards the tip of the twig
    const ang = Math.PI / 2 + side * rand(0.35, 0.8) + (x1 > x0 ? -0.25 : 0.25);
    const len = size * rand(0.8, 1.15) * (1.1 - k * 0.45), wid = len * 0.42;
    const tx = bx + Math.cos(ang) * len, ty = by + Math.sin(ang) * len;
    const nx = -Math.sin(ang) * wid, ny = Math.cos(ang) * wid;
    const sx = bx + Math.cos(ang) * len * 0.12, sy = by + Math.sin(ang) * len * 0.12;
    f.lineWidth = size * 0.03;
    f.beginPath();
    f.moveTo(bx, by);
    f.lineTo(sx, sy);
    f.stroke();
    f.beginPath();
    f.moveTo(sx, sy);
    f.bezierCurveTo(sx + nx, sy + ny, tx + nx * 0.5 - Math.cos(ang) * len * 0.25, ty + ny * 0.5 - Math.sin(ang) * len * 0.25, tx, ty);
    f.bezierCurveTo(tx - nx * 0.5 - Math.cos(ang) * len * 0.25, ty - ny * 0.5 - Math.sin(ang) * len * 0.25, sx - nx, sy - ny, sx, sy);
    f.fill();
    tips.push([tx, ty]);
  }
  return tips;
}

class Rain implements Scene {
  private sky = document.createElement('canvas');
  private fg = document.createElement('canvas');
  private mist = sprite([120, 175, 160], 128);
  private bead = sprite([200, 235, 230], 32);
  private drops: { x: number; y: number; z: number; len: number }[] = [];
  private mists: { x: number; y: number; s: number; ph: number }[] = [];
  private ripples: { x: number; y: number; age: number; life: number; max: number }[] = [];
  /** Leaf tips; each grows a bead of water that lets go and falls. */
  private tips: { x: number; y: number; grow: number; fall: number; fy: number; rate: number }[] = [];
  private heavy = 0;
  private ground = 0;

  resize(w: number, h: number) {
    for (const c of [this.sky, this.fg]) {
      c.width = w;
      c.height = h;
    }
    const g = this.sky.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#030a0a');
    grad.addColorStop(0.5, '#0b1d1c');
    grad.addColorStop(0.9, '#16302b');
    grad.addColorStop(1, '#060d0b');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.55, h * 0.55);
    glow.addColorStop(0, 'rgba(120,180,165,0.14)');
    glow.addColorStop(1, 'rgba(120,180,165,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    // far trunks in the haze
    g.fillStyle = 'rgba(3,10,9,0.55)';
    for (const px of [0.22, 0.38, 0.63, 0.78]) {
      const x = w * px, tw = h * rand(0.008, 0.014);
      g.fillRect(x - tw / 2, h * 0.3, tw, h);
    }

    this.ground = h * 0.945;
    const f = this.fg.getContext('2d')!;
    f.clearRect(0, 0, w, h);
    const ink = '#020706';
    f.fillStyle = ink;
    f.beginPath();
    f.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 20) f.lineTo(x, this.ground + Math.sin((x / w) * 5.3) * h * 0.012);
    f.lineTo(w, h);
    f.fill();
    // boughs reaching in from both top corners and low on the sides
    const leaf = h * 0.05;
    const tips = [
      ...bough(f, -w * 0.05, h * 0.02, w * 0.55, h * 0.13, h * 0.06, 9, leaf, ink),
      ...bough(f, -w * 0.05, h * 0.2, w * 0.3, h * 0.3, h * 0.04, 6, leaf * 0.85, ink),
      ...bough(f, w * 1.05, h * 0.05, w * 0.5, h * 0.24, h * 0.05, 8, leaf, ink),
      ...bough(f, w * 1.05, h * 0.62, w * 0.72, h * 0.74, h * 0.03, 5, leaf * 0.9, ink),
      ...bough(f, -w * 0.05, h * 0.78, w * 0.2, h * 0.84, h * 0.02, 4, leaf * 0.8, ink),
    ];
    this.tips = tips.map(([x, y]) => ({ x, y, grow: Math.random(), fall: -1, fy: y, rate: rand(0.15, 0.45) }));

    const n = Math.min(150, Math.max(70, Math.round((w * h) / 5000)));
    this.drops = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, z: rand(0.3, 1), len: rand(0.5, 1) }));
    this.mists = Array.from({ length: 6 }, () => ({ x: Math.random() * w, y: rand(h * 0.45, h * 0.92), s: rand(0.6, 1) * w, ph: rand(0, 6.28) }));
  }

  draw({ ctx, w, h, dt, t, lv, onset, motion }: Frame, alpha: number) {
    this.heavy += (lv[2] - this.heavy) * Math.min(1, dt * 3);
    const unit = h / 852;
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.sky, 0, 0);

    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.mists) {
      const dx = motion ? Math.sin(t * 0.06 + m.ph) * 50 : 0;
      ctx.globalAlpha = alpha * (0.06 + lv[0] * 0.16 + this.heavy * 0.05);
      ctx.drawImage(this.mist, m.x + dx - m.s / 2, m.y - m.s / 2, m.s, m.s);
    }

    // streaks behind the leaves: nearer drops are longer, faster and brighter; the high band thickens the rain
    const density = 0.45 + this.heavy * 0.55;
    ctx.lineCap = 'round';
    for (const d of this.drops) {
      const speed = (480 + d.z * 640) * unit;
      if (motion) {
        d.y += speed * dt;
        d.x += speed * 0.08 * dt;
        if (d.y > this.ground + h * 0.02) {
          d.y = -h * 0.05;
          d.x = Math.random() * w;
        }
        if (d.x > w + 20) d.x -= w + 40;
      }
      if (d.z > density) continue;
      const len = (12 + d.z * 32) * d.len * unit;
      ctx.lineWidth = (0.8 + d.z * 1.3) * unit * 1.3;
      ctx.strokeStyle = `rgba(185,225,220,${(0.16 + d.z * 0.4) * alpha})`;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - len * 0.08, d.y - len);
      ctx.stroke();
    }

    // ripples where drops land; a call sends out a big one
    const spawn = motion ? dt * (5 + this.heavy * 22) : 0;
    for (let n = spawn + Math.random(); n >= 1 && this.ripples.length < 40; n -= 1) {
      this.ripples.push({ x: rand(w * 0.05, w * 0.95), y: rand(this.ground + h * 0.004, h * 0.985), age: 0, life: rand(0.7, 1.3), max: rand(w * 0.015, w * 0.05) });
    }
    if (onset && motion && this.ripples.length < 40) {
      this.ripples.push({ x: rand(w * 0.3, w * 0.7), y: rand(this.ground + h * 0.01, h * 0.97), age: 0, life: 3, max: w * 0.22 });
    }
    this.ripples = this.ripples.filter((r) => (r.age += dt) < r.life);
    ctx.lineWidth = Math.max(1, 1.1 * unit);
    for (const r of this.ripples) {
      const k = r.age / r.life;
      ctx.strokeStyle = `rgba(170,215,205,${(1 - k) * 0.4 * alpha})`;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.max * k, r.max * k * 0.25, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.fg, 0, 0);

    // beads swelling on the leaf tips, then letting go (more often when the rain is heavier)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.tips) {
      if (motion) {
        if (p.fall < 0) {
          p.grow += dt * p.rate * (0.5 + this.heavy * 1.6);
          if (p.grow >= 1) {
            p.fall = 0;
            p.fy = p.y;
            p.grow = 0;
          }
        } else {
          p.fall += dt;
          p.fy = p.y + 0.5 * 2600 * unit * p.fall * p.fall;
          if (p.fy > this.ground) {
            if (this.ripples.length < 40) this.ripples.push({ x: p.x, y: rand(this.ground + h * 0.006, h * 0.975), age: 0, life: 1.2, max: w * 0.04 });
            p.fall = -1;
          }
        }
      }
      if (p.fall < 0) {
        const s = (4 + p.grow * 10) * unit;
        ctx.globalAlpha = alpha * (0.25 + p.grow * 0.5);
        ctx.drawImage(this.bead, p.x - s / 2, p.y - s * 0.3, s, s);
      } else {
        const s = 9 * unit;
        ctx.globalAlpha = alpha * 0.6;
        ctx.drawImage(this.bead, p.x - s / 2, p.fy - s / 2, s, s);
        ctx.strokeStyle = `rgba(200,235,230,${0.25 * alpha})`;
        ctx.lineWidth = 1.2 * unit;
        ctx.beginPath();
        ctx.moveTo(p.x, p.fy);
        ctx.lineTo(p.x, p.fy - Math.min(40 * unit, p.fall * 300 * unit));
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}

// ---- Frog pond: moonlit water, the chorus shimmers in the moon's path, calls ripple from the pads ----
interface Pad { x: number; y: number; r: number }

class Pond implements Scene {
  private bg = document.createElement('canvas');
  private fg = document.createElement('canvas');
  private star = sprite([200, 215, 255], 32);
  private moon = sprite([215, 235, 200], 256);
  private mist = sprite([110, 160, 140], 128);
  private stars: { x: number; y: number; ph: number; sp: number; sz: number }[] = [];
  private pads: Pad[] = [];
  private glints: { k: number; off: number; len: number; sp: number; ph: number }[] = [];
  private rings: { x: number; y: number; age: number; life: number; max: number; a: number }[] = [];
  private mx = 0;
  private my = 0;
  private horizon = 0;
  private shimmer = 0;
  private hum = 0;

  resize(w: number, h: number) {
    for (const c of [this.bg, this.fg]) {
      c.width = w;
      c.height = h;
    }
    this.horizon = h * 0.56;
    this.mx = w * 0.8;
    this.my = h * 0.235;
    const g = this.bg.getContext('2d')!;
    const sky = g.createLinearGradient(0, 0, 0, this.horizon);
    sky.addColorStop(0, '#02060c');
    sky.addColorStop(1, '#0c1d26');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, this.horizon);
    const water = g.createLinearGradient(0, this.horizon, 0, h);
    water.addColorStop(0, '#0d2226');
    water.addColorStop(0.5, '#071518');
    water.addColorStop(1, '#03090a');
    g.fillStyle = water;
    g.fillRect(0, this.horizon, w, h - this.horizon);
    // far bank: a low line of scrub and a few trees
    g.fillStyle = '#020607';
    g.beginPath();
    g.moveTo(0, this.horizon + h * 0.012);
    for (let x = 0; x <= w; x += w / 40) g.lineTo(x, this.horizon - h * (0.008 + Math.abs(Math.sin(x / w * 17)) * 0.012 + (Math.sin(x / w * 4.3) > 0.6 ? 0.02 : 0)));
    g.lineTo(w, this.horizon + h * 0.012);
    g.fill();
    this.glints = Array.from({ length: 46 }, () => {
      const k = Math.pow(Math.random(), 1.3);
      return { k, off: rand(-1, 1), len: rand(0.3, 1), sp: rand(0.5, 1.6), ph: rand(0, 6.28) };
    });
    const n = Math.round((w * h) / 5000);
    this.stars = Array.from({ length: Math.min(110, n) }, () => ({ x: Math.random() * w, y: Math.random() * this.horizon * 0.9, ph: rand(0, 6.28), sp: rand(0.6, 2), sz: rand(0.5, 1.2) }));

    // foreground: lily pads (nearer ones bigger), then reeds and bulrushes at both sides
    const f = this.fg.getContext('2d')!;
    f.clearRect(0, 0, w, h);
    this.pads = [];
    for (let i = 0; i < 11; i++) {
      const y = rand(this.horizon + h * 0.08, h * 0.97), depth = (y - this.horizon) / (h - this.horizon);
      const pad = { x: rand(w * 0.08, w * 0.92), y, r: w * (0.025 + depth * 0.06) };
      if (Math.abs(pad.x - this.mx) < w * 0.06) pad.x += w * 0.15;
      this.pads.push(pad);
      const notch = rand(0, 6.28);
      f.fillStyle = '#0a2119';
      f.strokeStyle = 'rgba(127,184,154,0.22)';
      f.lineWidth = Math.max(1, h * 0.0013);
      f.beginPath();
      f.ellipse(pad.x, pad.y, pad.r, pad.r * 0.3, 0, notch + 0.35, notch + Math.PI * 2 - 0.05);
      f.lineTo(pad.x, pad.y);
      f.closePath();
      f.fill();
      f.stroke();
    }
    f.strokeStyle = '#020605';
    f.fillStyle = '#020605';
    f.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      const left = i % 2 === 0;
      const x = left ? rand(-w * 0.02, w * 0.24) : rand(w * 0.78, w * 1.02);
      const top = rand(h * 0.42, h * 0.7), bend = rand(-0.05, 0.05) * w;
      f.lineWidth = rand(0.003, 0.006) * h;
      f.beginPath();
      f.moveTo(x, h);
      f.quadraticCurveTo(x + bend * 0.3, (h + top) / 2, x + bend, top);
      f.stroke();
      if (Math.random() < 0.3) {
        const bw = h * 0.007, bh = h * 0.045;
        f.beginPath();
        f.roundRect(x + bend - bw, top - bh * 0.1, bw * 2, bh, bw);
        f.fill();
      }
    }
  }

  draw({ ctx, w, h, dt, t, lv, onset, motion }: Frame, alpha: number) {
    this.shimmer += (lv[2] - this.shimmer) * Math.min(1, dt * 5);
    this.hum += (lv[1] - this.hum) * Math.min(1, dt * 2);
    const unit = h / 852;
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.bg, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.stars) {
      const tw = motion ? 0.5 + 0.5 * Math.sin(t * s.sp + s.ph) : 0.7;
      const sz = (5 + s.sz * 7) * unit * 1.3;
      ctx.globalAlpha = (0.15 + tw * 0.35) * alpha;
      ctx.drawImage(this.star, s.x - sz / 2, s.y - sz / 2, sz, sz);
    }
    const mr = Math.min(w, h) * 0.04, mg = mr * 9;
    ctx.globalAlpha = alpha * (0.45 + lv[0] * 0.2);
    ctx.drawImage(this.moon, this.mx - mg / 2, this.my - mg / 2, mg, mg);
    ctx.globalAlpha = alpha * 0.95;
    ctx.fillStyle = '#e6f0dc';
    ctx.beginPath();
    ctx.arc(this.mx, this.my, mr, 0, Math.PI * 2);
    ctx.fill();

    // the moon's path on the water: broken glints that dance with the chorus
    ctx.fillStyle = '#d7ebc8';
    for (const g of this.glints) {
      const y = this.horizon + h * 0.012 + g.k * (h - this.horizon) * 0.95;
      const spread = w * (0.012 + g.k * 0.07);
      const x = this.mx + g.off * spread + (motion ? Math.sin(t * g.sp + g.ph) * spread * 0.35 : 0);
      const on = motion ? Math.max(0, Math.sin(t * g.sp * 1.7 + g.ph * 2)) : 0.6;
      const wd = spread * g.len * (0.4 + on * 0.8) * (0.8 + this.shimmer * 0.5);
      ctx.globalAlpha = alpha * (0.34 - g.k * 0.22) * (0.35 + on * 0.65) * (0.6 + this.shimmer * 0.9);
      ctx.fillRect(x - wd / 2, y, wd, Math.max(1, (1.2 + g.k * 2.2) * unit));
    }
    // mist breathing low over the water
    ctx.globalAlpha = alpha * (0.05 + lv[0] * 0.12);
    const ms = w * 1.3;
    ctx.drawImage(this.mist, w * 0.5 - ms / 2 + (motion ? Math.sin(t * 0.05) * w * 0.05 : 0), this.horizon - ms * 0.18, ms, ms * 0.36);

    // a call sends rings out from a pad; the chorus keeps a few soft rings going
    if (motion && this.rings.length < 14) {
      if (onset) {
        const p = this.pads[Math.floor(Math.random() * this.pads.length)]!;
        this.rings.push({ x: p.x, y: p.y, age: 0, life: 3.2, max: p.r * 4, a: 0.45 });
      } else if (Math.random() < dt * (0.25 + this.hum * 1.2)) {
        const p = this.pads[Math.floor(Math.random() * this.pads.length)]!;
        this.rings.push({ x: p.x + rand(-1, 1) * p.r, y: p.y, age: 0, life: 2.4, max: p.r * 2, a: 0.25 });
      }
    }
    this.rings = this.rings.filter((r) => (r.age += dt) < r.life);
    ctx.lineWidth = Math.max(1, 1.3 * unit);
    for (const r of this.rings) {
      const k = r.age / r.life;
      for (let i = 0; i < 3; i++) {
        const kk = Math.max(0, k - i * 0.14);
        if (kk <= 0) continue;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = `rgba(168,220,180,${(1 - kk) * r.a * (1 - i * 0.3)})`;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.max * kk, r.max * kk * 0.26, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.fg, 0, 0);
    ctx.globalAlpha = 1;
  }
}

// ---- Tree ferns: a misty mountain-ash gully, shafts of morning light that swell with the song ----

/** A tree fern: slim trunk, a crown of long arching fronds with fine pinnae. */
function treeFern(f: CanvasRenderingContext2D, x: number, base: number, height: number, span: number, ink: string) {
  const top = base - height;
  f.fillStyle = ink;
  f.strokeStyle = ink;
  f.lineCap = 'round';
  const tw = span * 0.05;
  f.beginPath();
  f.moveTo(x - tw * 1.2, base);
  f.lineTo(x - tw * 0.8, top);
  f.lineTo(x + tw * 0.8, top);
  f.lineTo(x + tw * 1.2, base);
  f.fill();
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (0.04 + (i / 10) * 0.92) + rand(-0.05, 0.05), dir = Math.cos(a), len = span * rand(0.75, 1.1);
    const ex = x + dir * len * 1.1, ey = top - Math.sin(a) * len * 0.3 + len * 0.4;
    const cx = x + dir * len * 0.5, cy = top - Math.sin(a) * len * 0.5;
    f.lineWidth = span * 0.018;
    f.beginPath();
    f.moveTo(x, top);
    f.quadraticCurveTo(cx, cy, ex, ey);
    f.stroke();
    f.lineWidth = span * 0.011;
    for (let k = 0.12; k < 0.96; k += 0.055) {
      const px = (1 - k) * (1 - k) * x + 2 * (1 - k) * k * cx + k * k * ex;
      const py = (1 - k) * (1 - k) * top + 2 * (1 - k) * k * cy + k * k * ey;
      const pl = span * 0.11 * (1 - k * 0.75);
      f.beginPath();
      f.moveTo(px - dir * pl * 0.25, py + pl);
      f.lineTo(px, py);
      f.lineTo(px + dir * pl * 0.6, py + pl * 0.75);
      f.stroke();
    }
  }
}

class Ferns implements Scene {
  private bg = document.createElement('canvas');
  private fg = document.createElement('canvas');
  private mote = sprite([235, 240, 205], 32);
  private mist = sprite([150, 185, 165], 128);
  private shafts: { x: number; spread: number; ph: number; boost: number }[] = [];
  private motes: { x: number; y: number; z: number; ph: number }[] = [];
  private mists: { x: number; y: number; s: number; ph: number }[] = [];
  private glow = 0;

  resize(w: number, h: number) {
    for (const c of [this.bg, this.fg]) {
      c.width = w;
      c.height = h;
    }
    const g = this.bg.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0b1414');
    grad.addColorStop(0.45, '#14231f');
    grad.addColorStop(0.8, '#0c1714');
    grad.addColorStop(1, '#040807');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // tall, straight mountain-ash trunks, paler the further back they stand
    for (const [px, tw, o] of [[0.12, 0.03, 0.5], [0.33, 0.02, 0.32], [0.58, 0.045, 0.55], [0.8, 0.022, 0.38], [0.93, 0.035, 0.5]] as const) {
      g.fillStyle = `rgba(8,16,14,${o})`;
      g.fillRect(w * px - (w * tw) / 2, 0, w * tw, h);
    }
    this.shafts = [0.28, 0.5, 0.7].map((x) => ({ x, spread: rand(0.1, 0.2), ph: rand(0, 6.28), boost: 0 }));
    this.motes = Array.from({ length: 60 }, () => ({ x: Math.random() * w, y: Math.random() * h, z: rand(0.3, 1), ph: rand(0, 6.28) }));
    this.mists = Array.from({ length: 5 }, () => ({ x: Math.random() * w, y: rand(h * 0.5, h * 0.9), s: rand(0.7, 1.1) * w, ph: rand(0, 6.28) }));

    const f = this.fg.getContext('2d')!;
    f.clearRect(0, 0, w, h);
    const ink = '#030706';
    const ground = h * 0.93;
    f.fillStyle = ink;
    f.beginPath();
    f.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 20) f.lineTo(x, ground + Math.sin((x / w) * 4.7) * h * 0.012);
    f.lineTo(w, h);
    f.fill();
    treeFern(f, w * 0.14, ground, h * 0.36, w * 0.36, ink);
    treeFern(f, w * 0.86, ground, h * 0.27, w * 0.32, ink);
    treeFern(f, w * 0.52, ground + h * 0.01, h * 0.12, w * 0.22, ink);
  }

  draw({ ctx, w, h, dt, t, lv, onset, motion }: Frame, alpha: number) {
    this.glow += (lv[1] - this.glow) * Math.min(1, dt * 2.5);
    const unit = h / 852;
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.bg, 0, 0);
    ctx.globalCompositeOperation = 'lighter';

    // shafts of light slanting through the canopy; the birdsong (mid band) brightens them, a call flares one
    if (onset && motion) this.shafts[Math.floor(Math.random() * this.shafts.length)]!.boost = 1;
    for (const s of this.shafts) {
      s.boost = Math.max(0, s.boost - dt * 0.5);
      const drift = motion ? Math.sin(t * 0.03 + s.ph) * w * 0.02 : 0;
      const x0 = w * s.x + drift, x1 = x0 + w * 0.12;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      const a = (0.05 + this.glow * 0.09 + s.boost * 0.07) * (motion ? 0.85 + 0.15 * Math.sin(t * 0.2 + s.ph) : 1);
      grad.addColorStop(0, `rgba(230,236,203,${a})`);
      grad.addColorStop(1, 'rgba(230,236,203,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x0 - w * 0.025, 0);
      ctx.lineTo(x0 + w * 0.025, 0);
      ctx.lineTo(x1 + w * s.spread, h);
      ctx.lineTo(x1 - w * s.spread * 0.6, h);
      ctx.fill();
    }
    for (const m of this.mists) {
      const dx = motion ? Math.sin(t * 0.04 + m.ph) * 40 : 0;
      ctx.globalAlpha = alpha * (0.06 + lv[0] * 0.12);
      ctx.drawImage(this.mist, m.x + dx - m.s / 2, m.y - m.s / 2, m.s, m.s * 0.5);
    }
    // motes drifting down through the light; the high band makes them glint
    for (const p of this.motes) {
      if (motion) {
        p.y += (4 + p.z * 8) * dt;
        p.x += Math.sin(t * 0.3 + p.ph) * 6 * p.z * dt;
        if (p.y > h + 20) {
          p.y = -20;
          p.x = Math.random() * w;
        }
      }
      const tw = motion ? 0.5 + 0.5 * Math.sin(t * (0.8 + p.z * 2) + p.ph) : 0.7;
      const s = (6 + p.z * 12) * unit;
      ctx.globalAlpha = Math.min(1, (0.1 + p.z * 0.25) * (0.4 + tw * (0.6 + lv[2] * 1.4))) * alpha;
      ctx.drawImage(this.mote, p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.fg, 0, 0);
    ctx.globalAlpha = 1;
  }
}

// ---- Subtropical sunrise: a low glow behind hoop pines, birds crossing on the calls --------------

/** A hoop pine: tall straight trunk with tiered, tufted clumps of foliage. */
function hoopPine(f: CanvasRenderingContext2D, x: number, base: number, height: number, ink: string) {
  f.fillStyle = ink;
  f.strokeStyle = ink;
  f.lineCap = 'round';
  const tw = height * 0.014;
  f.beginPath();
  f.moveTo(x - tw, base);
  f.lineTo(x - tw * 0.35, base - height);
  f.lineTo(x + tw * 0.35, base - height);
  f.lineTo(x + tw, base);
  f.fill();
  f.lineWidth = Math.max(1, tw * 0.5);
  for (let k = 0.36; k <= 1.001; k += 0.08) {
    const y = base - height * k, reach = height * 0.15 * (1.15 - k * 0.6);
    for (const dir of [-1, 1]) {
      const ex = x + dir * reach * rand(0.7, 1.2), ey = y - height * rand(0.012, 0.03);
      f.beginPath();
      f.moveTo(x, y);
      f.quadraticCurveTo((x + ex) / 2, y - height * 0.005, ex, ey);
      f.stroke();
      for (let i = 0; i < 4; i++) {
        f.beginPath();
        f.ellipse(ex + rand(-0.4, 0.4) * reach * 0.4, ey - height * 0.006 + rand(-0.3, 0.3) * reach * 0.15, reach * rand(0.16, 0.26), reach * rand(0.08, 0.13), 0, 0, Math.PI * 2);
        f.fill();
      }
    }
  }
  f.beginPath();
  f.ellipse(x, base - height - height * 0.02, height * 0.025, height * 0.04, 0, 0, Math.PI * 2);
  f.fill();
}

class Sunrise implements Scene {
  private bg = document.createElement('canvas');
  private fg = document.createElement('canvas');
  private sun = sprite([255, 170, 110], 256);
  private star = sprite([230, 225, 255], 32);
  private stars: { x: number; y: number; ph: number; sz: number }[] = [];
  private clouds: { x: number; y: number; w: number; th: number; sp: number }[] = [];
  private birds: { x: number; y: number; vx: number; s: number; ph: number }[] = [];
  private horizon = 0;
  private warm = 0;

  resize(w: number, h: number) {
    for (const c of [this.bg, this.fg]) {
      c.width = w;
      c.height = h;
    }
    this.horizon = h * 0.86;
    const g = this.bg.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#060716');
    grad.addColorStop(0.45, '#17132f');
    grad.addColorStop(0.7, '#3d2436');
    grad.addColorStop(0.84, '#6a3c32');
    grad.addColorStop(1, '#140a08');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    this.stars = Array.from({ length: 45 }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.35, ph: rand(0, 6.28), sz: rand(0.5, 1.2) }));
    this.clouds = Array.from({ length: 6 }, (_, i) => ({ x: Math.random() * w, y: h * (0.5 + i * 0.05) + rand(-1, 1) * h * 0.01, w: w * rand(0.3, 0.6), th: h * rand(0.005, 0.01), sp: rand(2, 6) }));

    const f = this.fg.getContext('2d')!;
    f.clearRect(0, 0, w, h);
    // a far ridge, then the near ground
    f.fillStyle = '#160c10';
    f.beginPath();
    f.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 24) f.lineTo(x, this.horizon - h * 0.05 + Math.sin((x / w) * 4.1) * h * 0.02 + Math.sin((x / w) * 11) * h * 0.006);
    f.lineTo(w, h);
    f.fill();
    const ink = '#0a0507';
    f.fillStyle = ink;
    f.beginPath();
    f.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 20) f.lineTo(x, this.horizon + h * 0.03 + Math.sin((x / w) * 5.5) * h * 0.01);
    f.lineTo(w, h);
    f.fill();
    hoopPine(f, w * 0.12, this.horizon + h * 0.035, h * 0.5, ink);
    hoopPine(f, w * 0.27, this.horizon + h * 0.035, h * 0.26, ink);
    hoopPine(f, w * 0.88, this.horizon + h * 0.035, h * 0.42, ink);
  }

  draw({ ctx, w, h, dt, t, lv, onset, motion }: Frame, alpha: number) {
    this.warm += (lv[0] - this.warm) * Math.min(1, dt * 1.5);
    const unit = h / 852;
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.bg, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    // the last stars, fading as the song builds
    for (const s of this.stars) {
      const tw = motion ? 0.5 + 0.5 * Math.sin(t * 0.9 + s.ph) : 0.7;
      const sz = (5 + s.sz * 6) * unit * 1.3;
      ctx.globalAlpha = (0.1 + tw * 0.3) * (1 - lv[1] * 0.5) * alpha;
      ctx.drawImage(this.star, s.x - sz / 2, s.y - sz / 2, sz, sz);
    }
    // the sun still below the ridge: its glow breathes with the low band
    const gs = w * 1.6;
    ctx.globalAlpha = alpha * (0.32 + this.warm * 0.3);
    ctx.drawImage(this.sun, w * 0.6 - gs / 2, this.horizon - gs * 0.32, gs, gs * 0.64);
    // thin lit cloud bands drifting
    for (const c of this.clouds) {
      if (motion) {
        c.x += c.sp * unit * dt;
        if (c.x - c.w / 2 > w) c.x = -c.w / 2;
      }
      const g = ctx.createLinearGradient(c.x - c.w / 2, 0, c.x + c.w / 2, 0);
      const a = 0.08 + lv[1] * 0.08;
      g.addColorStop(0, 'rgba(255,185,138,0)');
      g.addColorStop(0.5, `rgba(255,185,138,${a})`);
      g.addColorStop(1, 'rgba(255,185,138,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.fillRect(c.x - c.w / 2, c.y, c.w, c.th);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.fg, 0, 0);

    // a call sends a few birds across the sky; now and then one crosses on its own
    if (motion && this.birds.length < 12) {
      const flock = onset ? 2 + Math.floor(Math.random() * 3) : Math.random() < dt * 0.04 ? 1 : 0;
      const fromLeft = Math.random() < 0.5, y0 = rand(h * 0.25, h * 0.55);
      for (let i = 0; i < flock; i++) {
        const v = rand(50, 80) * unit;
        this.birds.push({ x: fromLeft ? -20 - i * 30 * unit : w + 20 + i * 30 * unit, y: y0 + rand(-1, 1) * 20 * unit, vx: fromLeft ? v : -v, s: rand(6, 10) * unit, ph: rand(0, 6.28) });
      }
    }
    this.birds = this.birds.filter((b) => b.x > -60 && b.x < w + 60);
    ctx.strokeStyle = '#0a0507';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.2, 1.8 * unit);
    for (const b of this.birds) {
      if (motion) {
        b.x += b.vx * dt;
        b.y += Math.sin(t * 1.3 + b.ph) * 4 * unit * dt;
      }
      const flap = Math.sin(t * 9 + b.ph) * 0.45;
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      ctx.moveTo(b.x - b.s, b.y - b.s * (0.25 + flap));
      ctx.quadraticCurveTo(b.x - b.s * 0.4, b.y - b.s * (0.45 + flap * 0.5), b.x, b.y);
      ctx.quadraticCurveTo(b.x + b.s * 0.4, b.y - b.s * (0.45 + flap * 0.5), b.x + b.s, b.y - b.s * (0.25 + flap));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

const SCENES: Record<ThemeId, () => Scene> = {
  mediterranean: () => new Mediterranean(),
  rainforest: () => new Rainforest(),
  night: () => new Night(),
  bush: () => new Bush(),
  rain: () => new Rain(),
  pond: () => new Pond(),
  ferns: () => new Ferns(),
  sunrise: () => new Sunrise(),
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
