import { expect, test } from '@playwright/test';
import { items } from './helpers';

test.use({ serviceWorkers: 'allow' });

test('service worker caches audio and serves Range requests offline', async ({ page, context }) => {
  await page.goto('/soundscapes/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  const url = `/soundscapes/${items[0]!.file}`;
  const outro = `/soundscapes/${items[0]!.outro}`;
  const range = (u: string, r: string) =>
    page.evaluate(
      async ([u, r]) => {
        const res = await fetch(u!, { headers: { Range: r! } });
        return { status: res.status, cr: res.headers.get('content-range'), len: (await res.arrayBuffer()).byteLength };
      },
      [u, r] as const,
    );

  // first request goes to the network; the worker then caches the whole file
  const first = await range(url, 'bytes=0-99');
  expect(first.status).toBe(206);
  expect(first.len).toBe(100);
  const size = Number(first.cr!.split('/')[1]);

  const cached = (u: string) =>
    page.evaluate(async (u) => {
      for (const k of await caches.keys()) if (k.startsWith('audio-') && (await (await caches.open(k)).match(u))) return true;
      return false;
    }, u);
  await expect.poll(() => cached(url), { timeout: 60_000 }).toBe(true);
  // its outro is fetched with it, so the iOS fade also works offline
  await expect.poll(() => cached(outro), { timeout: 60_000 }).toBe(true);

  await context.setOffline(true);
  const slice = await range(url, 'bytes=10-19');
  expect(slice).toEqual({ status: 206, cr: `bytes 10-19/${size}`, len: 10 });
  const tail = await range(url, `bytes=${size - 5}-`);
  expect(tail).toEqual({ status: 206, cr: `bytes ${size - 5}-${size - 1}/${size}`, len: 5 });

  const outroRes = await range(outro, 'bytes=0-9');
  expect(outroRes.status).toBe(206);

  // the app shell also loads offline
  await page.reload();
  await expect(page.locator('#title')).toHaveText(items[0]!.name);
});
