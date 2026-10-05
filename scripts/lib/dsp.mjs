// Small DSP helpers shared by the candidate finder and the audio build.
import { spawn } from 'node:child_process';

/** Decode any audio file to mono float32 PCM at `rate` via ffmpeg. */
export function decodeMono(file, rate = 22050, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', file, ...extraArgs, '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-'], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const chunks = [];
    p.stdout.on('data', (c) => chunks.push(c));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg decode failed (${code}) for ${file}`));
      const b = Buffer.concat(chunks);
      resolve(new Float32Array(b.buffer, b.byteOffset, Math.floor(b.byteLength / 4)));
    });
  });
}

/** RBJ biquad, returns a stateful per-sample function. */
export function biquad(type, fc, fs, q = Math.SQRT1_2) {
  const w = (2 * Math.PI * fc) / fs;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lowpass') {
    b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
  } else {
    b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
  }
  const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
  const [nb0, nb1, nb2, na1, na2] = [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = nb0 * x + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

export function filtered(samples, type, fc, fs, order = 2) {
  const out = Float32Array.from(samples);
  for (let k = 0; k < order; k++) {
    const f = biquad(type, fc, fs);
    for (let i = 0; i < out.length; i++) out[i] = f(out[i]);
  }
  return out;
}

/** RMS of non-overlapping frames of `frame` samples. */
export function frameRms(samples, frame) {
  const n = Math.floor(samples.length / frame);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * frame; j < (i + 1) * frame; j++) s += samples[j] * samples[j];
    out[i] = Math.sqrt(s / frame);
  }
  return out;
}

export const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));

export function median(a) {
  const s = Array.from(a).sort((x, y) => x - y);
  return s.length ? s[s.length >> 1] : 0;
}
export function percentile(a, p) {
  const s = Array.from(a).sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
}

/** In-place iterative radix-2 FFT on separate re/im arrays (length must be a power of two). */
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}
