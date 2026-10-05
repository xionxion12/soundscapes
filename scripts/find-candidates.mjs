#!/usr/bin/env node
// Search xeno-canto for long, calm night recordings per theme, download the
// preview of each shortlisted candidate into .cache/, score it and write
// spectrograms + a report.
//
//   node scripts/find-candidates.mjs                 # all themes
//   node scripts/find-candidates.mjs med --top 12    # one theme, 12 candidates
//   node scripts/find-candidates.mjs --allow-b       # also accept quality B
//
// Output: .cache/candidates/report.md (+ report.json, one spectrogram PNG per
// candidate). The spectrograms are meant to be looked at: the numbers cannot tell
// a calling owl from a barking dog.
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { search, download, getRecording, DERIVATIVES_OK } from './lib/xc.mjs';
import { decodeMono, filtered, frameRms, db, median, percentile } from './lib/dsp.mjs';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '.cache', 'candidates');

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const TOP = Number(opt('top', 10));
const ALLOW_B = flag('allow-b');
const PAGES = Number(opt('pages', 3));
const MIN_LEN = 480; // 8 minutes
const MAX_LEN = Number(opt('max-len', 1800)); // longer files take ages to download and analyse
const WINDOW = Number(opt('window', 420)); // seconds of loop source we want to be calm
const IDS = opt('ids', '').split(',').filter(Boolean).map(Number);
const only = args.filter((a) => !a.startsWith('--') && !/^\d+$/.test(a) && !['top', 'pages', 'window', 'max-len', 'ids'].includes(a));

/**
 * Queries use xeno-canto's `box:lat_min,lon_min,lat_max,lon_max` filter so a whole region is
 * covered in one go. `hours` = allowed local recording hours (the range may wrap midnight).
 */
const THEMES = {
  med: {
    title: 'South European summer night',
    queries: [
      `grp:soundscape len_gt:${MIN_LEN} box:34,-10,45,30`,
      `len_gt:${MIN_LEN} box:34,-10,46,30 type:song`,
      `sp:"Otus scops" len_gt:${MIN_LEN}`,
      `also:"Otus scops" len_gt:${MIN_LEN}`,
      `sp:"Oecanthus pellucens" len_gt:${MIN_LEN}`,
      `also:"Oecanthus pellucens" len_gt:${MIN_LEN}`,
      `also:"Hyla meridionalis" len_gt:${MIN_LEN}`,
      `also:"Caprimulgus europaeus" len_gt:${MIN_LEN} box:34,-10,46,30`,
      `also:"Strix aluco" len_gt:${MIN_LEN} box:34,-10,46,30`,
      `sp:"Hyla meridionalis" len_gt:${MIN_LEN}`,
      `sp:"Hyla arborea" len_gt:${MIN_LEN}`,
      `sp:"Caprimulgus ruficollis" len_gt:${MIN_LEN}`,
      `sp:"Caprimulgus europaeus" len_gt:${MIN_LEN} box:34,-10,46,30`,
    ],
    hours: [20, 5],
    months: [5, 9],
    keywords: ['scops', 'otus', 'oecanthus', 'cricket', 'grillo', 'frog', 'hyla', 'rana', 'nightjar', 'caprimulgus', 'owl', 'night', 'noche', 'notte', 'nuit', 'garrigue', 'pond', 'katydid', 'tettigon', 'bush-cricket', 'toad'],
  },
  rainforest: {
    title: 'Tropical rainforest',
    queries: [
      `grp:soundscape len_gt:${MIN_LEN} box:-15,-80,5,-45`, // Amazon basin
      `grp:soundscape len_gt:${MIN_LEN} box:-5,108,8,120`, // Borneo
      `grp:soundscape len_gt:${MIN_LEN} box:7,-92,18,-77`, // Central America
      `grp:soundscape len_gt:${MIN_LEN} box:-6,8,6,32`, // Congo basin
      `grp:soundscape len_gt:${MIN_LEN} box:-12,95,8,108`, // Sumatra / peninsular SE Asia
      `grp:soundscape len_gt:${MIN_LEN} box:-12,130,0,155`, // New Guinea
    ],
    hours: [17, 5],
    months: [1, 12],
    keywords: ['frog', 'rana', 'insect', 'cricket', 'katydid', 'cicada', 'night', 'noche', 'dusk', 'rain', 'jungle', 'rainforest', 'forest', 'primary', 'amazon', 'borneo', 'toad'],
  },
  night: {
    title: 'Night ambience',
    queries: [
      `grp:soundscape len_gt:${MIN_LEN} box:42,-10,62,30`, // temperate Europe
      `also:"Tettigonia viridissima" len_gt:${MIN_LEN}`,
      `also:"Gryllus campestris" len_gt:${MIN_LEN}`,
      `also:"Strix aluco" len_gt:${MIN_LEN} box:42,-10,62,30`,
      `grp:soundscape len_gt:${MIN_LEN} box:30,-125,52,-65`, // temperate North America
    ],
    hours: [21, 4],
    months: [5, 9],
    keywords: ['cricket', 'katydid', 'grasshopper', 'tettigon', 'owl', 'strix', 'night', 'nacht', 'summer', 'frog', 'toad', 'nightjar', 'pond', 'meadow'],
  },
};

const inHours = (hhmm, [from, to]) => {
  if (!hhmm) return null; // unknown
  const h = Number(hhmm.slice(0, 2)) + Number(hhmm.slice(3)) / 60;
  return from <= to ? h >= from && h <= to : h >= from || h <= to + 0.99;
};
const inMonths = (date, [a, b]) => {
  const m = Number(date?.slice(5, 7));
  return !m || (m >= a && m <= b);
};

function keywordScore(c, theme) {
  const hay = [c.en, c.sci, c.type, c.remarks, c.location, ...c.also.flatMap((a) => [a.en, a.sci])].join(' ').toLowerCase();
  return theme.keywords.reduce((n, k) => n + (hay.includes(k) ? 1 : 0), 0);
}

async function pool(items, size, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: size }, async () => { for (let it; (it = queue.shift()); ) await fn(it); }));
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function findCandidates(key, theme) {
  const seen = new Map();
  for (const [q, quality] of theme.queries.flatMap((q) => (ALLOW_B ? [[q, 'A'], [q, 'B']] : [[q, 'A']]))) {
    for (let page = 1; page <= PAGES; page++) {
      let res;
      try {
        res = await search(`${q} q:${quality}`, page);
      } catch (e) {
        console.warn(`  ! ${q} p${page}: ${e.message.split('\n')[0]}`);
        break;
      }
      for (const r of res.rows) seen.set(r.id, r);
      if (page >= res.pages) break;
    }
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  const all = [...seen.values()];
  const kept = all.filter(
    (r) =>
      r.length >= MIN_LEN &&
      r.length <= MAX_LEN &&
      (r.quality === 'A' || (ALLOW_B && r.quality === 'B')) &&
      DERIVATIVES_OK.has(r.license) &&
      inMonths(r.date, theme.months) &&
      inHours(r.time, theme.hours) !== false &&
      r.previewUrl,
  );
  for (const r of kept) {
    r.timeKnown = Boolean(r.time);
    r.pre = keywordScore(r, theme) * 2 + (r.timeKnown ? 3 : 0) + (r.quality === 'A' ? 1 : 0);
  }
  kept.sort((a, b) => b.pre - a.pre || b.id - a.id);
  console.log(`[${key}] ${all.length} found, ${kept.length} pass filters (A/B, >=8 min, derivative-friendly license, night/season)`);
  return kept;
}

/** Per-second feature series + calmest-window search on a decoded preview. */
async function analyse(file) {
  const rate = 22050;
  const pcm = await decodeMono(file, rate);
  const hp = filtered(pcm, 'highpass', 150, rate);
  const lp = filtered(pcm, 'lowpass', 100, rate, 4);
  const secs = Math.floor(pcm.length / rate);

  const L = new Float64Array(secs); // dBFS per second (full band)
  const lowE = new Float64Array(secs);
  const totE = new Float64Array(secs);
  const clip = new Float64Array(secs);
  for (let s = 0; s < secs; s++) {
    let e = 0, l = 0, c = 0;
    for (let i = s * rate; i < (s + 1) * rate; i++) {
      e += pcm[i] * pcm[i];
      l += lp[i] * lp[i];
      if (Math.abs(pcm[i]) > 0.98) c++;
    }
    totE[s] = e; lowE[s] = l; clip[s] = c;
    L[s] = db(Math.sqrt(e / rate));
  }

  // transient spikes: 100 ms frames of the high-passed signal vs a +-2.5 s median
  const fr = frameRms(hp, Math.round(rate / 10));
  const frDb = Array.from(fr, db);
  const spikePerSec = new Float64Array(secs);
  for (let i = 0; i < frDb.length; i++) {
    const lo = Math.max(0, i - 25), hi = Math.min(frDb.length, i + 26);
    const base = median(frDb.slice(lo, hi));
    if (frDb[i] - base > 15 && frDb[i] > -75) {
      const s = Math.floor(i / 10);
      if (s < secs) spikePerSec[s]++;
    }
  }

  const prefix = (a) => { const p = new Float64Array(a.length + 1); for (let i = 0; i < a.length; i++) p[i + 1] = p[i] + a[i]; return p; };
  const [pL, pL2, pLow, pTot, pClip, pSpike] = [prefix(L), prefix(L.map((x) => x * x)), prefix(lowE), prefix(totE), prefix(clip), prefix(spikePerSec)];

  const win = Math.min(WINDOW, secs);
  let best = null;
  for (let s = 0; s + win <= secs; s += 5) {
    const e = s + win;
    const mean = (pL[e] - pL[s]) / win;
    const std = Math.sqrt(Math.max(0, (pL2[e] - pL2[s]) / win - mean * mean));
    const seg = Array.from(L.subarray(s, e));
    const spread = percentile(seg, 0.95) - percentile(seg, 0.1);
    const rumble = (pLow[e] - pLow[s]) / Math.max(1e-12, pTot[e] - pTot[s]);
    const clips = pClip[e] - pClip[s];
    const spikes = ((pSpike[e] - pSpike[s]) / win) * 60;
    const cost = std * 1.0 + spread * 0.4 + spikes * 0.8 + Math.max(0, rumble - 0.15) * 40 + Math.min(clips, 500) * 0.02;
    if (!best || cost < best.cost) {
      best = { start: s, length: win, cost: +cost.toFixed(2), std: +std.toFixed(2), spread: +spread.toFixed(2), spikesPerMin: +spikes.toFixed(2), rumble: +rumble.toFixed(3), clips, meanDb: +mean.toFixed(1) };
    }
  }
  return { seconds: secs, floorDb: +percentile(Array.from(L), 0.1).toFixed(1), medianDb: +median(Array.from(L)).toFixed(1), best };
}

async function probe(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate,channels', '-of', 'json', file]);
  const s = JSON.parse(stdout).streams?.[0] ?? {};
  return { sampleRate: Number(s.sample_rate), channels: s.channels };
}

async function spectrogram(file, out) {
  // 0-11 kHz, linear frequency axis (like xeno-canto's own sonograms); the whole recording in one strip
  await run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-lavfi', 'aformat=channel_layouts=mono,showspectrumpic=s=1400x380:legend=1:fscale=lin:stop=11000:scale=log:drange=70:gain=4:color=magma', out], { maxBuffer: 1 << 26 });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = {};
  if (IDS.length) {
    // analyse specific recordings, whatever the filters say
    report.manual = [];
    await pool(IDS, 4, async (id) => {
      const c = await getRecording(id);
      const base = path.join(OUT, `XC${id}`);
      if (!(await exists(`${base}.mp3`))) await download(c.previewUrl, `${base}.mp3`);
      const a = (await exists(`${base}.json`)) ? JSON.parse(await readFile(`${base}.json`, 'utf8')) : { ...(await analyse(`${base}.mp3`)), ...(await probe(`${base}.mp3`)) };
      await writeFile(`${base}.json`, JSON.stringify(a));
      if (!(await exists(`${base}.png`))) await spectrogram(`${base}.mp3`, `${base}.png`);
      report.manual.push({ ...c, analysis: a });
      console.log(`  XC${id} ${c.en} | ${c.country} | ${c.date} ${c.time ?? '?'} | ${Math.round(c.length / 60)} min | cost ${a.best.cost} (std ${a.best.std}, spikes/min ${a.best.spikesPerMin}, rumble ${a.best.rumble}) | ${a.sampleRate} Hz x${a.channels}`);
    });
  }
  for (const [key, theme] of IDS.length ? [] : Object.entries(THEMES)) {
    if (only.length && !only.includes(key)) continue;
    console.log(`\n== ${theme.title} ==`);
    const kept = IDS.length ? [] : await findCandidates(key, theme);
    const picks = kept.slice(0, TOP);
    report[key] = [];
    await pool(picks, 4, async (c) => {
      const base = path.join(OUT, `XC${c.id}`);
      const mp3 = `${base}.mp3`;
      const cacheJson = `${base}.json`;
      try {
        if (!(await exists(mp3))) await download(c.previewUrl, mp3);
        let a;
        if (await exists(cacheJson)) a = JSON.parse(await readFile(cacheJson, 'utf8'));
        else {
          a = { ...(await analyse(mp3)), ...(await probe(mp3)) };
          await writeFile(cacheJson, JSON.stringify(a));
        }
        if (!(await exists(`${base}.png`))) await spectrogram(mp3, `${base}.png`);
        report[key].push({ ...c, analysis: a });
        console.log(`  XC${c.id} ${c.en} | ${c.country} | ${c.date} ${c.time ?? '?'} | ${Math.round(c.length / 60)} min | cost ${a.best.cost} (std ${a.best.std}, spikes/min ${a.best.spikesPerMin}, rumble ${a.best.rumble}) | ${a.sampleRate} Hz x${a.channels}`);
      } catch (e) {
        console.warn(`  ! XC${c.id}: ${e.message.split('\n')[0]}`);
      }
    });
    report[key].sort((a, b) => a.analysis.best.cost - b.analysis.best.cost);
  }

  if (IDS.length) return console.log('done');
  const md = [`# Candidate report\n`, `Generated ${new Date().toISOString()}. Lower cost = calmer. Spectrograms: \`.cache/candidates/XC<id>.png\`.\n`];
  for (const [key, list] of Object.entries(report)) {
    md.push(`\n## ${THEMES[key].title}\n`, '| XC | name | place | when | len | cost | std | spikes/min | rumble | clip | best window | sr |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const c of list) {
      const b = c.analysis.best;
      md.push(`| [XC${c.id}](${c.url}) | ${c.en}${c.also.length ? ` (+${c.also.slice(0, 3).map((x) => x.en).join(', ')})` : ''} | ${c.country}: ${c.location.slice(0, 40)} | ${c.date} ${c.time ?? '?'} | ${Math.round(c.length / 60)}m | ${b.cost} | ${b.std} | ${b.spikesPerMin} | ${b.rumble} | ${b.clips} | ${b.start}s+${b.length}s | ${c.analysis.sampleRate}/${c.analysis.channels}ch |`);
    }
  }
  await writeFile(path.join(OUT, 'report.md'), md.join('\n') + '\n');
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  console.log(`\nReport: ${path.relative(ROOT, path.join(OUT, 'report.md'))}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
