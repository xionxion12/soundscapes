// Minimal xeno-canto client.
//
// With XC_API_KEY set we use the API v3. Without it we fall back to the site's own
// HTML search pages (the same data a browser sees). HTTP goes through curl so the
// scripts also work behind an HTTPS proxy.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const BASE = 'https://xeno-canto.org';

export async function curl(url, args = []) {
  const { stdout } = await run('curl', ['-sSL', '--fail', '-m', '600', ...args, url], {
    maxBuffer: 256 * 1024 * 1024,
    encoding: 'utf8',
  });
  return stdout;
}

export async function download(url, dest) {
  await run('curl', ['-sSL', '--fail', '--retry', '3', '-m', '1800', '-o', dest, url]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastHit = 0;
async function polite() {
  const wait = lastHit + 700 - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit = Date.now();
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function decode(s = '') {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, n) => ENTITIES[n] ?? m);
}
const strip = (s = '') => decode(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

export function parseLength(s) {
  const p = String(s).trim().split(':').map(Number);
  if (p.some(Number.isNaN)) return 0;
  return p.reduce((a, b) => a * 60 + b, 0);
}

export const LICENSE_NAMES = {
  by: 'CC BY 4.0',
  'by-sa': 'CC BY-SA 4.0',
  'by-nc': 'CC BY-NC 4.0',
  'by-nc-sa': 'CC BY-NC-SA 4.0',
  'by-nd': 'CC BY-ND 4.0',
  'by-nc-nd': 'CC BY-NC-ND 4.0',
  cc0: 'CC0 1.0',
};

/** Parse one <tr> of the HTML results table. */
export function parseRow(r) {
  const id = r.match(/xeno-canto\.org\/(\d+)">XC/)?.[1];
  if (!id) return null;
  const cells = [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
  const common = r.match(/class="common-name"><a[^>]*>([^<]*)/)?.[1];
  const sci = r.match(/class='sci-name'>([^<]*)/)?.[1];
  const loc = r.match(/location\/map\?lat=([-\d.]+)&long=([-\d.]+)&loc=([^"]*)"/);
  const lic = r.match(/creativecommons\.org\/licenses\/([\w-]+)\/(\d\.\d)?/);
  const [, elev, type] = r.match(/<\/a><\/td><td>(-?\d*)<\/td><td>([^<]*)<\/td>/) ?? [];
  const remarks = r.match(/class='remarks readmore'>([\s\S]*?)<\/div>/)?.[1];
  const alsoHtml = decode(r.match(/data-qtip-content='([^']*)'/)?.[1] ?? '');
  const also = [...alsoHtml.matchAll(/class="common-name"><a[^>]*>([^<]*)<\/a><\/span>\s*<span class='sci-name'>([^<]*)/g)].map(
    (m) => ({ en: decode(m[1]), sci: decode(m[2]) }),
  );
  // columns: player, name, length, recordist, date, time, country, location, elevation, type, …
  const time = /^\d\d:\d\d$/.test((cells[5] ?? '').trim()) ? cells[5].trim() : null;
  return {
    id: Number(id),
    en: common ? decode(common) : 'Soundscape',
    sci: sci ? decode(sci) : null,
    length: parseLength(cells[2] ?? '0'),
    recordist: decode(r.match(/contributor\/\w+'>([^<]*)/)?.[1] ?? ''),
    date: /^\d{4}-\d\d-\d\d$/.test((cells[4] ?? '').trim()) ? cells[4].trim() : null,
    time,
    country: strip(cells[6] ?? ''),
    location: loc ? decode(decodeURIComponent(loc[3].replace(/\+/g, ' '))).replace(/\s+/g, ' ') : '',
    lat: loc ? Number(loc[1]) : null,
    lon: loc ? Number(loc[2]) : null,
    elevation: elev ? Number(elev) : null,
    type: decode(type ?? '').trim(),
    remarks: remarks ? strip(remarks) : '',
    also,
    quality: r.match(/class='selected'><span>(\w)<\/span>/)?.[1] ?? null,
    license: lic?.[1] ?? null,
    licenseUrl: lic ? `https://creativecommons.org/licenses/${lic[1]}/${lic[2] ?? '4.0'}/` : null,
    previewUrl: r.match(/class='xc-mini-player'[^>]*src='([^']+)'/)?.[1] ?? null,
    sonoUrl: r.match(/class='fancybox'[^>]*href='([^']+)'/)?.[1] ?? null,
    downloadUrl: `${BASE}/${id}/download`,
    url: `${BASE}/${id}`,
  };
}

async function searchHtml(query, page) {
  await polite();
  const qs = new URLSearchParams({ query, pg: String(page), order: 'xc', dir: '1' });
  const html = await curl(`${BASE}/explore?${qs}`);
  const total = Number(html.match(/([\d,]+) results? from/)?.[1]?.replace(/,/g, '') ?? 0);
  const pages = Number(html.match(/results-pages[\s\S]*?pg=(\d+)[^<]*<\/a>\s*<\/li>\s*<\/ul>/)?.[1] ?? 1);
  const rows = [...html.matchAll(/<tr >([\s\S]*?)<\/tr>/g)].map((m) => parseRow(m[1])).filter(Boolean);
  return { total, pages, rows };
}

// API v3 (needs XC_API_KEY). Field names follow the v3 docs; not exercised without a key.
async function searchApi(query, page, key) {
  await polite();
  const qs = new URLSearchParams({ query, page: String(page), key });
  const j = JSON.parse(await curl(`${BASE}/api/3/recordings?${qs}`));
  const rows = (j.recordings ?? []).map((x) => {
    const licKey = /licenses\/([\w-]+)\//.exec(x.lic ?? '')?.[1] ?? null;
    return {
      id: Number(x.id),
      en: x.en || 'Soundscape',
      sci: x.gen ? `${x.gen} ${x.sp}` : null,
      length: parseLength(x.length),
      recordist: x.rec,
      date: x.date,
      time: /^\d\d:\d\d/.test(x.time ?? '') ? x.time.slice(0, 5) : null,
      country: x.cnt,
      location: x.loc,
      lat: x.lat ? Number(x.lat) : null,
      lon: x.lon ? Number(x.lon) : null,
      elevation: x.alt ? Number(x.alt) : null,
      type: x.type ?? '',
      remarks: x.rmk ?? '',
      also: (x.also ?? []).filter(Boolean).map((s) => ({ en: s, sci: null })),
      quality: x.q,
      license: licKey,
      licenseUrl: x.lic ? (x.lic.startsWith('//') ? `https:${x.lic}` : x.lic) : null,
      previewUrl: x.file,
      sonoUrl: x.sono?.med ?? null,
      downloadUrl: `${BASE}/${x.id}/download`,
      url: `${BASE}/${x.id}`,
    };
  });
  return { total: Number(j.numRecordings ?? rows.length), pages: Number(j.numPages ?? 1), rows };
}

export async function search(query, page = 1) {
  const key = process.env.XC_API_KEY;
  return key ? searchApi(query, page, key) : searchHtml(query, page);
}

export async function getRecording(id) {
  const { rows } = await search(`nr:${id}`);
  const rec = rows.find((r) => r.id === Number(id));
  if (!rec) throw new Error(`XC${id} not found on xeno-canto`);
  return rec;
}

/** Licenses that allow derivative works (a seamless loop is one). */
export const DERIVATIVES_OK = new Set(['by', 'by-sa', 'by-nc', 'by-nc-sa', 'cc0']);
