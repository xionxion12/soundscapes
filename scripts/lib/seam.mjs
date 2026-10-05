import { fft, percentile } from './dsp.mjs';

/**
 * Click check at the loop seam, on the loop played twice in a row. Two measures, each compared
 * with what happens naturally elsewhere in the same recording (so loud bird calls don't trip it):
 *  - largest sample-to-sample jump / local RMS of jumps in ±100 ms
 *  - spectral flux (frames of 1024, hop 512) maximum in ±100 ms
 * Ratios above ~1.5 mean the seam is more abrupt than 99% of the rest of the recording.
 *
 * @param {Float32Array} pcm mono samples of one loop (or slightly more)
 * @param {number} rate sample rate
 * @param {number} loopSeconds loop length in seconds
 */
export function seamMetrics(pcm, rate, loopSeconds) {
  const n = Math.min(pcm.length, Math.round(loopSeconds * rate));
  const two = new Float32Array(2 * n);
  two.set(pcm.subarray(0, n));
  two.set(pcm.subarray(0, n), n);
  const half = Math.round(0.1 * rate);

  // 1) jump ratio
  const jump = (centre) => {
    let sum = 0, max = 0;
    for (let i = centre - half; i < centre + half; i++) {
      const d = Math.abs(two[i] - two[i - 1]);
      sum += d * d;
      if (d > max) max = d;
    }
    return max / Math.sqrt(sum / (2 * half) + 1e-20);
  };
  const jumpSeam = jump(n);
  const jumpElse = [];
  for (let c = half + 1; c < 2 * n - half; c += half * 4) if (Math.abs(c - n) > 2 * half) jumpElse.push(jump(c));
  const jumpRef = percentile(jumpElse, 0.99);

  // 2) spectral flux, on a few seconds around the seam plus the whole first loop for reference
  const N = 1024, hop = 512;
  const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const re = new Float64Array(N), im = new Float64Array(N);
  let prev = new Float64Array(N / 2);
  const flux = [];
  const startFrame = Math.max(0, n - 4 * rate);
  for (let s = startFrame - (startFrame % hop); s + N <= 2 * n && s < n + 4 * rate; s += hop) {
    for (let i = 0; i < N; i++) { re[i] = two[s + i] * win[i]; im[i] = 0; }
    fft(re, im);
    const mag = new Float64Array(N / 2);
    let tot = 0, f = 0;
    for (let k = 0; k < N / 2; k++) {
      mag[k] = Math.hypot(re[k], im[k]);
      tot += mag[k];
      f += Math.max(0, mag[k] - prev[k]);
    }
    flux.push({ s, v: f / (tot + 1e-12) });
    prev = mag;
  }
  const frames = Math.round((2 * half) / hop) + 2;
  const windowMax = (from) => Math.max(...flux.slice(from, from + frames).map((x) => x.v));
  const seamIdx = flux.findIndex((x) => x.s + N > n - half);
  const fluxSeam = windowMax(Math.max(0, seamIdx));
  const fluxElse = [];
  for (let i = 0; i + frames < flux.length; i += 2) if (Math.abs(i - seamIdx) > frames * 2) fluxElse.push(windowMax(i));
  const fluxRef = percentile(fluxElse, 0.99);

  return { jumpSeam, jumpRef, jumpRatio: jumpSeam / jumpRef, fluxSeam, fluxRef, fluxRatio: fluxSeam / fluxRef };
}
