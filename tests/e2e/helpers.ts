import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';

type Item = {
  id: string; name: string; subtitle: string; theme: string; file: string; outro: string;
  xc: { id: number; url: string; recordist: string; licenseName: string; licenseUrl: string };
};
export const items: Item[] = JSON.parse(readFileSync(fileURLToPath(new URL('../../src/data/soundscapes.json', import.meta.url)), 'utf8')).items;
const fixture = (n: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${n}`, import.meta.url)));
const LOOP = fixture('loop.ogg');
const OUTRO = fixture('outro.ogg');

export interface OpenOptions {
  /** Fake clock start (the clock is installed before the app loads). */
  time?: Date;
  /** Pretend to be iOS: `audio.volume` has no effect. */
  ios?: boolean;
}

export const errors: string[] = [];

/** Chromium here cannot decode AAC, so every .m4a request gets an Opus fixture instead. */
export async function open(page: Page, opts: OpenOptions = {}) {
  errors.length = 0;
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.route('**/*.m4a', (route) =>
    route.fulfill({ status: 200, contentType: 'audio/ogg', body: route.request().url().includes('-outro') ? OUTRO : LOOP }),
  );
  if (opts.ios) {
    await page.addInitScript(() => {
      Object.defineProperty(HTMLMediaElement.prototype, 'volume', { get: () => 1, set: () => {}, configurable: true });
    });
  }
  if (opts.time) await page.clock.install({ time: opts.time });
  await page.goto('/soundscapes/');
  await expect(page.locator('#title')).toHaveText(items[0]!.name);
}

/** Dispatch a real touch gesture through CDP (so the app sees touch pointer events). */
export async function touchPath(page: Page, points: [number, number][], stepDelay = 8) {
  const cdp = await page.context().newCDPSession(page);
  const [first, ...rest] = points;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: first![0], y: first![1] }] });
  for (const [x, y] of rest) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    await page.waitForTimeout(stepDelay);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

export async function swipe(page: Page, dir: 'left' | 'right') {
  const y = 160; // over the title area
  const [a, b] = dir === 'left' ? [330, 60] : [60, 330];
  const pts: [number, number][] = Array.from({ length: 12 }, (_, i) => [a + ((b - a) * i) / 11, y]);
  await touchPath(page, pts);
}

export async function audioState(page: Page) {
  return page.evaluate(() => {
    const a = document.querySelector('audio')!;
    return { paused: a.paused, volume: a.volume, loop: a.loop, src: a.src };
  });
}
