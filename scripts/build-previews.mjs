#!/usr/bin/env node
// Listening previews for a curation round: for each candidate in scripts/shortlist.json, cut a
// short clip from the middle of the window the loop would use, process it the way the app's loops
// are processed (high-pass, optional peak limiting, loudness-normalised to the app's target), fade
// it in and out, and write it with a sonogram of the whole window. The point is to hear each
// candidate as it would sound in the app before building it.
//
//   node scripts/build-previews.mjs                 # every candidate
//   node scripts/build-previews.mjs --only <key>
//
// Output: .cache/previews/<key>.mp3 and <key>-sonogram.webp. Needs ffmpeg + ffprobe.
// MP3 rather than the app's AAC so the previews play in any browser or web page, Chromium included.
// Sources: `{ "xc": <id> }` (xeno-canto, the original upload, cached with the build's downloads).
// The Australian Acoustic Observatory is no longer used: its recordings are mono at 22.05 kHz and
// were rejected by ear in round 2 (docs/curation.md).
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { download } from './lib/xc.mjs';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const SRC_CACHE = path.join(ROOT, '.cache', 'source');
const OUT = path.join(ROOT, '.cache', 'previews');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

const exists = (p) => access(p).then(() => true, () => false);
const ff = (a) => run('ffmpeg', ['-hide_banner', '-nostats', '-v', 'error', '-y', ...a], { maxBuffer: 1 << 28 });

async function measure(file) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { maxBuffer: 1 << 28 });
  const s = stderr.slice(stderr.lastIndexOf('Summary:'));
  return { lufs: Number(s.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]), truePeak: Number(s.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]) };
}

/**
 * Is it really stereo? The channel count alone can't say: many uploads are mono copied to both
 * channels. Measured on the source (before processing) from the L/R correlation and how loud the
 * side signal (L − R) is next to the mid (L + R).
 */
async function stereoImage(file, offset, seconds, channels) {
  if (channels < 2) return { kind: 'mono', label: 'Mono', detail: 'A one-channel recording.' };
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-ss', String(offset), '-t', String(Math.min(seconds, 60)), '-i', file, '-ac', '2', '-ar', '22050', '-f', 'f32le', '-'], { encoding: 'buffer', maxBuffer: 1 << 28 });
  const x = new Float32Array(stdout.buffer, stdout.byteOffset, stdout.byteLength / 4);
  let ll = 0, rr = 0, lr = 0, mid = 0, side = 0;
  for (let i = 0; i + 1 < x.length; i += 2) {
    const l = x[i], r = x[i + 1];
    ll += l * l; rr += r * r; lr += l * r;
    mid += (l + r) ** 2; side += (l - r) ** 2;
  }
  const corr = lr / Math.sqrt(ll * rr || 1);
  const sideDb = 10 * Math.log10(side / (mid || 1) || 1e-12);
  const detail = `L/R correlation ${corr.toFixed(3)}; the side signal is ${Math.abs(sideDb).toFixed(0)} dB ${sideDb < 0 ? 'below' : 'above'} the mid.`;
  if (corr > 0.995 || sideDb < -35) return { kind: 'mono', label: 'Mono in a stereo file', detail: `Both channels carry the same sound. ${detail}`, corr, sideDb };
  // strongly anti-correlated channels partly cancel when summed to mono (one speaker, some AirPlay targets)
  if (corr < -0.3) return { kind: 'stereo', label: 'Stereo, partly out of phase', detail: `Very wide; may sound thin on a single speaker. ${detail}`, corr, sideDb };
  if (corr > 0.9) return { kind: 'stereo', label: 'Narrow stereo', detail: `Stereo, but the channels are nearly alike. ${detail}`, corr, sideDb };
  return { kind: 'stereo', label: 'Stereo', detail, corr, sideDb };
}

async function channelCount(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels', '-of', 'csv=p=0', file]);
  return Number(stdout.trim());
}

/** The audio for [from, from + seconds) of a candidate's source, as a local file plus the offset into it. */
async function source(item, from, seconds) {
  await mkdir(SRC_CACHE, { recursive: true });
  if (item.source.xc) {
    const f = path.join(SRC_CACHE, `XC${item.source.xc}.audio`);
    if (!(await exists(f))) await download(`https://xeno-canto.org/${item.source.xc}/download`, f);
    return { file: f, offset: from };
  }
  throw new Error(`${item.key}: unknown source`);
}

async function buildPreview(cfg, item) {
  const P = cfg.previewSeconds;
  const window = (item.loop ?? 420) + (item.crossfade ?? 9);
  const from = item.start + Math.max(0, (window - P) / 2);
  const tmp = path.join(OUT, `${item.key}.tmp.wav`);
  const out = path.join(OUT, `${item.key}.mp3`);

  const src = await source(item, from, P);
  const stereo = await stereoImage(src.file, src.offset, P, await channelCount(src.file));
  const pre = [
    `highpass=f=${item.highpass ?? 40},`.repeat(item.highpassPasses ?? 1),
    item.pregain ? `volume=${item.pregain}dB,` : '',
    item.prelimit != null ? `alimiter=limit=${Math.pow(10, item.prelimit / 20).toFixed(4)}:attack=5:release=120:level=disabled,` : '',
  ].join('');
  await ff(['-ss', String(src.offset), '-t', String(P), '-i', src.file, '-af', `${pre}aresample=48000`, '-ac', '2', '-c:a', 'pcm_f32le', tmp]);
  const m = await measure(tmp);
  const gain = cfg.loudness.target - m.lufs;
  await ff([
    '-i', tmp,
    '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=0.708:attack=0.1:release=50:level=disabled,afade=t=in:d=2:curve=hsin,afade=t=out:st=${P - 3}:d=3:curve=hsin`,
    '-c:a', 'libmp3lame', '-b:a', `${cfg.bitrate}k`, '-ar', '48000', out,
  ]);

  // sonogram of the whole loop window
  const sono = path.join(OUT, `${item.key}-sonogram.webp`);
  await ff(['-ss', String(item.start), '-t', String(window), '-i', src.file, '-lavfi', 'aformat=channel_layouts=mono,showspectrumpic=s=1280x184:legend=0:fscale=lin:stop=11000:scale=log:drange=70:gain=1:color=magma', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '80', sono]);
  await run('rm', ['-f', tmp]);
  const done = await measure(out);
  console.log(`  ✓ ${item.key}: ${m.lufs.toFixed(1)} LUFS → ${done.lufs} LUFS (gain ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB), true peak ${done.truePeak} dBTP, ${stereo.label.toLowerCase()}`);
  return { key: item.key, sourceLufs: m.lufs, gain: Number(gain.toFixed(1)), stereo };
}

async function main() {
  const cfg = JSON.parse(await readFile(path.join(import.meta.dirname, 'shortlist.json'), 'utf8'));
  await mkdir(OUT, { recursive: true });
  const results = [];
  for (const item of cfg.items) {
    if (only && item.key !== only) continue;
    try {
      results.push(await buildPreview(cfg, item));
    } catch (e) {
      console.error(`  ✗ ${item.key}: ${e.message.split('\n')[0]}`);
    }
  }
  await writeFile(path.join(OUT, 'previews.json'), JSON.stringify(results, null, 1));
}

main().catch((e) => { console.error(e); process.exit(1); });
