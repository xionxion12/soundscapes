/* Soundscapes service worker. Hand-written (no Workbox) so it can answer the Range requests
 * Safari makes for <audio>: audio is cached whole on first play and sliced into 206 responses. */
importScripts('sw-range.js');

// Replaced at build time by the sw-inject plugin in vite.config.ts.
const BUILD_ID = 'dev';
const AUDIO_ID = 'dev';
const PRECACHE = []; // __PRECACHE__

const SHELL_CACHE = 'shell-' + BUILD_ID;
const AUDIO_CACHE = 'audio-' + AUDIO_ID;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        const current = name === SHELL_CACHE || name === AUDIO_CACHE;
        if (!current && (name.startsWith('shell-') || name.startsWith('audio-'))) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

const warming = new Map();

/** Fetch the whole file (no Range) and keep it. */
function warm(url) {
  if (!warming.has(url)) {
    const p = (async () => {
      const res = await fetch(url);
      if (res.ok && res.status === 200) await (await caches.open(AUDIO_CACHE)).put(url, res);
    })()
      .catch(() => {})
      .finally(() => warming.delete(url));
    warming.set(url, p);
  }
  return warming.get(url);
}

async function handleAudio(event) {
  const request = event.request;
  const cache = await caches.open(AUDIO_CACHE);
  const hit = await cache.match(request.url);
  if (hit) return self.swRange.sliceResponse(hit, request.headers.get('range'));
  // First play: stream from the network right away and cache the full file in the background.
  event.waitUntil(warm(request.url));
  return fetch(request);
}

async function handleNavigation(request) {
  try {
    const res = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, res.clone()).catch(() => {});
    return res;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match('./')) || (await cache.match('index.html')) || Response.error();
  }
}

async function handleAsset(request) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === 'basic') cache.put(request, res.clone()).catch(() => {});
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('.m4a')) event.respondWith(handleAudio(event));
  else if (request.mode === 'navigate') event.respondWith(handleNavigation(request));
  else event.respondWith(handleAsset(request));
});
