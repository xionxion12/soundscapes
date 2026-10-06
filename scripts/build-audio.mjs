#!/usr/bin/env node
// Download → trim → seamless loop → loudness-normalise → encode → envelope / sonogram /
// artwork → checks.  Reads scripts/soundscapes.config.json, writes public/audio/* and
// src/data/soundscapes.json.  Needs ffmpeg + ffprobe.
//
//   node scripts/build-audio.mjs            # everything
//   node scripts/build-audio.mjs --only scops-night
//
// Exits non-zero if any automatic check fails (loop length, seam click, loudness).
import { mkdir, writeFile, readFile, stat, access, copyFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { getRecording, download, DERIVATIVES_OK, LICENSE_NAMES } from './lib/xc.mjs';
import { decodeMono, filtered, frameRms, db, percentile } from './lib/dsp.mjs';
import { seamMetrics } from './lib/seam.mjs';
import { artSvg } from './lib/artwork.mjs';
import { buildFades, FADE_IN_SECONDS, FADE_OUT_SECONDS, OUTRO_SECONDS } from './lib/fades.mjs';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(ROOT, '.cache', 'build');
const SRC_CACHE = path.join(ROOT, '.cache', 'source');
const PUB = path.join(ROOT, 'public', 'audio');
const DATA = path.join(ROOT, 'src', 'data', 'soundscapes.json');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

const exists = (p) => access(p).then(() => true, () => false);
const ff = (a, opts = {}) => run('ffmpeg', ['-hide_banner', '-nostats', '-v', 'error', '-y', ...a], { maxBuffer: 1 << 28, ...opts });

async function probe(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate,channels,codec_name:format=duration,bit_rate', '-of', 'json', file]);
  const j = JSON.parse(stdout);
  return { sampleRate: Number(j.streams[0].sample_rate), channels: j.streams[0].channels, codec: j.streams[0].codec_name, duration: Number(j.format.duration), bitRate: Number(j.format.bit_rate) };
}

/** Integrated loudness (LUFS) and true peak (dBTP) via ebur128. */
async function loudness(file) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { maxBuffer: 1 << 28 });
  const summary = stderr.slice(stderr.lastIndexOf('Summary:'));
  return {
    lufs: Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]),
    lra: Number(summary.match(/LRA:\s+(-?[\d.]+) LU/)?.[1]),
    truePeak: Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]),
  };
}

const lastJson = (s) => JSON.parse(s.slice(s.lastIndexOf('{'), s.lastIndexOf('}') + 1));

/**
 * AAC encoding can overshoot sharp transients by several dB (a clicky recording measured +3.5 dBTP
 * after encoding even though the WAV peaked at −2.7). So the encode step runs a limiter and tightens
 * its ceiling until the *encoded* file's true peak is safe.
 */
const LIMITER_CEILINGS = [0.708, 0.5, 0.4, 0.3]; // linear: −3, −6, −8, −10.5 dBFS
const limiter = (c) => `alimiter=limit=${c}:attack=0.1:release=50:level=disabled`;
const SAFE_TRUE_PEAK = -1.5;

async function normalise(inFile, outFile, target, tp) {
  const base = `loudnorm=I=${target}:TP=${tp}:LRA=11`;
  const p1 = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', inFile, '-af', `${base}:print_format=json`, '-f', 'null', '-'], { maxBuffer: 1 << 28 });
  const m = lastJson(p1.stderr);
  const measured = `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}`;
  const p2 = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', inFile, '-af', `${base}:${measured}:linear=true:print_format=json,aresample=48000`, '-ar', '48000', '-c:a', 'pcm_f32le', '-y', outFile], { maxBuffer: 1 << 28 });
  const r = lastJson(p2.stderr);
  if (r.normalization_type === 'linear') return { mode: 'loudnorm-linear', inputI: Number(m.input_i), inputTP: Number(m.input_tp) };
  // loudnorm had to go dynamic (it would change the level across the seam): use a plain gain instead
  const gain = Math.min(target - Number(m.input_i), tp - Number(m.input_tp));
  await ff(['-i', inFile, '-af', `volume=${gain}dB`, '-c:a', 'pcm_f32le', outFile]);
  return { mode: `gain ${gain.toFixed(1)} dB (loudnorm would have gone dynamic)`, inputI: Number(m.input_i), inputTP: Number(m.input_tp) };
}

/** 3-band RMS envelope @10 Hz, each band stretched to 0..255 between its 5th and 99.5th percentile. */
async function envelope(file) {
  const rate = 22050;
  const pcm = await decodeMono(file, rate);
  const bands = [
    filtered(pcm, 'lowpass', 500, rate, 2), // low
    filtered(filtered(pcm, 'highpass', 500, rate, 2), 'lowpass', 3000, rate, 2), // mid
    filtered(pcm, 'highpass', 3000, rate, 2), // high (insects)
  ];
  const frame = rate / 10;
  const out = [];
  for (const b of bands) {
    const d = Array.from(frameRms(b, frame), db);
    const lo = percentile(d, 0.05);
    const hi = Math.max(percentile(d, 0.995), lo + 15);
    out.push(Uint8Array.from(d, (v) => Math.round(255 * Math.min(1, Math.max(0, (v - lo) / (hi - lo))))));
  }
  const n = Math.min(...out.map((o) => o.length));
  const buf = Buffer.concat(out.map((o) => Buffer.from(o.subarray(0, n))));
  return { rate: 10, bands: 3, length: n, data: buf.toString('base64') };
}

async function seamCheck(file, loopSeconds) {
  const rate = 48000;
  return seamMetrics(await decodeMono(file, rate), rate, loopSeconds);
}

async function sourceFile(rec) {
  await mkdir(SRC_CACHE, { recursive: true });
  const f = path.join(SRC_CACHE, `XC${rec.id}.audio`);
  if (!(await exists(f))) {
    console.log(`  downloading ${rec.downloadUrl}`);
    await download(rec.downloadUrl, f);
  }
  return f;
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

async function buildItem(cfg, item) {
  const id = item.id;
  const D = item.loop;
  const X = item.crossfade ?? 9;
  const t = path.join(CACHE, id);
  await mkdir(t, { recursive: true });
  console.log(`\n▶ ${id}  (XC${item.xcId})`);

  const rec = await getRecording(item.xcId);
  if (!DERIVATIVES_OK.has(rec.license)) throw new Error(`XC${rec.id} is licensed ${rec.license} — a loop is a derivative work, which this license forbids`);
  const src = await sourceFile(rec);
  const info = await probe(src);
  if (info.sampleRate < 44100) throw new Error(`XC${rec.id}: sample rate ${info.sampleRate} Hz < 44.1 kHz`);
  if (item.start + D + X > info.duration + 0.5) throw new Error(`XC${rec.id}: needs ${item.start + D + X}s but the file is ${info.duration.toFixed(1)}s`);
  console.log(`  source: ${info.codec} ${info.sampleRate} Hz ${info.channels}ch ${fmtTime(info.duration)} · ${rec.recordist} · ${rec.license}`);

  // 1. trim (+40 Hz high-pass) into a 48 kHz segment of length D + X …
  const ch = Math.min(2, info.channels);
  const seg = path.join(t, 'segment.wav');
  await ff(['-ss', String(item.start), '-t', String(D + X), '-i', src, '-af', 'highpass=f=40,aresample=48000', '-ac', String(ch), '-c:a', 'pcm_f32le', seg]);
  // … then the seamless loop: s[X..D+X] crossfaded into s[0..X]. The result is D long and ends exactly
  // where it begins (at s[X]); the equal-power (quarter-sine) fade keeps the level steady at the join.
  const raw = path.join(t, 'loop-raw.wav');
  await ff([
    '-ss', String(X), '-t', String(D), '-i', seg,
    '-t', String(X), '-i', seg,
    '-filter_complex', `[0:a][1:a]acrossfade=d=${X}:c1=qsin:c2=qsin[out]`,
    '-map', '[out]', '-c:a', 'pcm_f32le', raw,
  ]);

  // 2. loudness. A source whose loud transients (bird calls, clicks) sit far above its steady sound can set
  // `prelimit` (dBFS): a limiter at that level runs first, so normalising does not leave the loop too quiet.
  let toNormalise = raw;
  if (item.prelimit != null) {
    toNormalise = path.join(t, 'loop-limited.wav');
    const lin = Math.pow(10, item.prelimit / 20);
    await ff(['-i', raw, '-af', `alimiter=limit=${lin.toFixed(4)}:attack=5:release=120:level=disabled`, '-c:a', 'pcm_f32le', toNormalise]);
  }
  const norm = path.join(t, 'loop-norm.wav');
  const nres = await normalise(toNormalise, norm, cfg.loudness.target, cfg.loudness.truePeak);
  console.log(`  loudness: ${nres.inputI.toFixed(1)} LUFS → ${cfg.loudness.target} (${nres.mode})`);

  // 3. encode the loop
  await mkdir(PUB, { recursive: true });
  const loopOut = path.join(PUB, `${id}.m4a`);
  const enc = ['-c:a', 'aac', '-b:a', `${cfg.bitrate ?? 160}k`, '-aac_coder', 'twoloop', '-ar', '48000', '-movflags', '+faststart'];
  let ceiling = LIMITER_CEILINGS[0];
  let loud;
  for (const c of LIMITER_CEILINGS) {
    ceiling = c;
    await ff(['-i', norm, '-af', limiter(c), ...enc, loopOut]);
    loud = await loudness(loopOut);
    if (loud.truePeak <= SAFE_TRUE_PEAK) break;
    console.log(`  true peak ${loud.truePeak} dBTP after encoding, tightening the limiter`);
  }

  // the clips iOS uses for its fades: start (4 s), pause (5 s) and the end of a timer (60 s outro)
  const fades = await buildFades(loopOut, PUB, id, cfg.bitrate);
  const clipInfo = await Promise.all([fades.fadeIn, fades.fadeOut, fades.outro].map((f) => probe(path.join(PUB, f))));

  // 4. visuals: envelope, sonogram, artwork
  const env = await envelope(loopOut);
  const sono = path.join(PUB, `${id}-sonogram.webp`);
  await ff(['-i', norm, '-lavfi', 'aformat=channel_layouts=mono,showspectrumpic=s=1280x184:legend=0:fscale=lin:stop=11000:scale=log:drange=70:gain=1:color=magma', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', sono]);
  const artOut = path.join(PUB, `${id}-art-512.png`);
  await writeFile(artOut, new Resvg(artSvg(item.theme, item.id), { fitTo: { mode: 'width', value: 512 } }).render().asPng());

  // 5. checks
  const outInfo = await probe(loopOut);
  const seam = await seamCheck(loopOut, D);
  const bytes = (await stat(loopOut)).size;
  const checks = [
    ['loop length', Math.abs(outInfo.duration - D) < 0.15, `${outInfo.duration.toFixed(3)} s vs ${D} s`],
    ['seam: sample jump', seam.jumpRatio < 1.5, `${seam.jumpSeam.toFixed(2)} vs p99 ${seam.jumpRef.toFixed(2)} (×${seam.jumpRatio.toFixed(2)})`],
    ['seam: spectral flux', seam.fluxRatio < 1.5, `${seam.fluxSeam.toFixed(3)} vs p99 ${seam.fluxRef.toFixed(3)} (×${seam.fluxRatio.toFixed(2)})`],
    ['loudness ±1 LU', Math.abs(loud.lufs - cfg.loudness.target) <= 1, `${loud.lufs} LUFS`],
    ['true peak ≤ −1 dBTP', loud.truePeak <= -1, `${loud.truePeak} dBTP`],
    ['fade clips 4 s / 5 s / 60 s', [FADE_IN_SECONDS, FADE_OUT_SECONDS, OUTRO_SECONDS].every((n, i) => Math.abs(clipInfo[i].duration - n) < 0.3), clipInfo.map((f) => `${f.duration.toFixed(2)} s`).join(', ')],
    ['file size ≤ 12 MB', bytes <= 12 * 1024 * 1024, `${(bytes / 1048576).toFixed(1)} MB`],
    ['envelope length', Math.abs(env.length - D * 10) <= 3, `${env.length} samples`],
  ];
  let ok = true;
  for (const [name, pass, detail] of checks) {
    console.log(`  ${pass ? '✓' : '✗'} ${name}: ${detail}`);
    if (!pass) ok = false;
  }

  const licenseName = LICENSE_NAMES[rec.license] ?? rec.license;
  const processing = `Trimmed to ${fmtTime(D + X)} of the original recording (from ${fmtTime(item.start)}), joined end-to-start with a ${X} s equal-power crossfade into a seamless ${fmtTime(D)} loop, high-passed at 40 Hz,${item.prelimit != null ? ' with loud peaks (bird calls, clicks) limited,' : ''} loudness-normalised to ${cfg.loudness.target} LUFS and re-encoded as AAC. Shared under the same license (${licenseName}).`;
  const species = item.species ?? (rec.en === 'Soundscape' ? 'Soundscape' : rec.en);
  return {
    ok,
    entry: {
      id,
      name: item.name,
      subtitle: item.subtitle,
      theme: item.theme,
      file: `audio/${id}.m4a`,
      outro: `audio/${fades.outro}`,
      fadeIn: `audio/${fades.fadeIn}`,
      fadeOut: `audio/${fades.fadeOut}`,
      sonogram: `audio/${id}-sonogram.webp`,
      art: `audio/${id}-art-512.png`,
      duration: Number(outInfo.duration.toFixed(2)),
      bytes,
      envelope: { rate: env.rate, bands: env.bands, data: env.data },
      xc: {
        id: rec.id,
        url: rec.url,
        recordist: rec.recordist,
        species,
        scientific: item.scientific ?? rec.sci,
        also: rec.also.map((a) => a.en),
        country: rec.country,
        location: item.place ?? rec.location,
        lat: rec.lat,
        lon: rec.lon,
        date: rec.date,
        time: rec.time,
        licenseName,
        licenseUrl: rec.licenseUrl,
        remarks: rec.remarks,
      },
      processing,
    },
  };
}

function creditsMarkdown(entries) {
  const rows = entries.map((e) => `| ${e.name} | [XC${e.xc.id}](${e.xc.url}) | ${e.xc.recordist} | ${[e.xc.location, e.xc.country].filter(Boolean).join(', ')} | ${e.xc.date ?? ''} | [${e.xc.licenseName}](${e.xc.licenseUrl}) |`);
  return [
    '| Soundscape | Recording | Recordist | Place | Date | License |',
    '|---|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}

async function main() {
  const cfg = JSON.parse(await readFile(path.join(import.meta.dirname, 'soundscapes.config.json'), 'utf8'));
  const prev = (await exists(DATA)) ? JSON.parse(await readFile(DATA, 'utf8')).items : [];
  const entries = [];
  let allOk = true;
  for (const item of cfg.items) {
    if (only && item.id !== only) {
      const old = prev.find((p) => p.id === item.id);
      if (old) entries.push(old);
      continue;
    }
    try {
      const { ok, entry } = await buildItem(cfg, item);
      entries.push(entry);
      allOk &&= ok;
    } catch (e) {
      console.error(`  ✗ ${item.id}: ${e.message}`);
      allOk = false;
    }
  }
  await mkdir(PUB, { recursive: true });
  await writeFile(DATA, JSON.stringify({ items: entries }) + '\n');

  const note = [
    '# Credits',
    '',
    'All sounds are recordings from [xeno-canto](https://xeno-canto.org), made by the recordists named below and shared by them under Creative Commons licenses.',
    'The audio here has been **modified**: trimmed, joined into a seamless loop with a crossfade, high-passed at 40 Hz, loudness-normalised and re-encoded as AAC (for some, loud peaks were limited first).',
    'Because the licenses include ShareAlike (or NonCommercial), the processed audio in this folder is shared under the same license as each original, see the table.',
    '',
    creditsMarkdown(entries),
    '',
    'Please do not use these files commercially.',
    '',
  ].join('\n');
  await writeFile(path.join(PUB, 'CREDITS.md'), note);

  // keep the credits table in the README in sync
  const readmePath = path.join(ROOT, 'README.md');
  if (await exists(readmePath)) {
    const readme = await readFile(readmePath, 'utf8');
    const next = readme.replace(/<!-- credits:start -->[\s\S]*<!-- credits:end -->/, `<!-- credits:start -->\n${creditsMarkdown(entries)}\n<!-- credits:end -->`);
    if (next !== readme) await writeFile(readmePath, next);
  }
  console.log(`\n${allOk ? '✓ all checks passed' : '✗ some checks failed'}; wrote ${path.relative(ROOT, DATA)}`);
  const total = entries.reduce((s, e) => s + e.bytes, 0);
  console.log(`  total loop audio: ${(total / 1048576).toFixed(1)} MB`);
  if (!allOk) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
