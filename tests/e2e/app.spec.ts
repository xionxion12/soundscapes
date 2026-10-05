import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { audioState, errors, items, open, ringPoint, swipe, touchPath } from './helpers';

const SHOTS = 'test-results/screens';
mkdirSync(SHOTS, { recursive: true });
const NIGHT = new Date(2026, 5, 1, 22, 56, 0); // 22:56, so 45 min ends at 23:41

test.describe('soundscapes', () => {
  test('starts on the first soundscape with a 30 min timer', async ({ page }) => {
    await open(page, { time: NIGHT });
    await expect(page.locator('#subtitle')).toHaveText(items[0]!.subtitle);
    await expect(page.locator('.dot')).toHaveCount(items.length);
    await expect(page.locator('#readout-main')).toHaveText('30 min');
    await expect(page.locator('#readout-end')).toHaveText('ends at 23:26');
    await expect(page.locator('.chip[aria-pressed="true"]')).toHaveText('30');
    await expect(page.locator('#airplay')).toBeHidden(); // no AirPlay target in Chromium
    await page.screenshot({ path: `${SHOTS}/01-idle.png` });
    expect(errors).toEqual([]);
  });

  test('swiping changes soundscape, wraps around and is remembered', async ({ page }) => {
    await open(page);
    await swipe(page, 'left');
    await expect(page.locator('#title')).toHaveText(items[1]!.name);
    await expect(page.locator('.dot[aria-selected="true"]')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(items[1]!.theme);
    await swipe(page, 'right');
    await expect(page.locator('#title')).toHaveText(items[0]!.name);
    await swipe(page, 'right'); // wraps to the last one
    await expect(page.locator('#title')).toHaveText(items.at(-1)!.name);
    await page.locator('.chip[data-minutes="60"]').click();
    await page.reload();
    await expect(page.locator('#title')).toHaveText(items.at(-1)!.name);
    await expect(page.locator('#readout-main')).toHaveText('1 h');
  });

  test('tapping the orb plays and pauses', async ({ page }) => {
    await open(page);
    const orb = page.locator('#orb');
    await expect(orb).toHaveAttribute('aria-label', 'Play');
    await orb.click();
    await expect(orb).toHaveAttribute('aria-label', 'Pause');
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);
    await page.screenshot({ path: `${SHOTS}/02-playing.png` });
    await orb.click();
    await expect(orb).toHaveAttribute('aria-label', 'Play');
    expect((await audioState(page)).paused).toBe(true);
  });

  test('switching while playing keeps playing', async ({ page }) => {
    await open(page);
    await page.locator('#orb').click();
    await expect(page.locator('#orb')).toHaveAttribute('aria-label', 'Pause');
    await swipe(page, 'left');
    await expect(page.locator('#title')).toHaveText(items[1]!.name);
    await expect(page.locator('#orb')).toHaveAttribute('aria-label', 'Pause');
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);
    await expect.poll(() => page.evaluate(() => navigator.mediaSession.metadata?.title)).toBe(items[1]!.name);
  });

  test('dragging the dial sets the timer and shows the "ends at" time live', async ({ page }) => {
    await open(page, { time: NIGHT });
    const dial = page.locator('#dial');
    const path: [number, number][] = [];
    for (let m = 30; m <= 45; m += 5) path.push(await ringPoint(dial, m));
    await touchPath(page, path, 30);
    await expect(page.locator('#readout-main')).toHaveText('45 min');
    await expect(page.locator('#readout-end')).toHaveText('ends at 23:41');
    await expect(page.locator('#dial')).toHaveAttribute('aria-valuenow', '45');
    await page.screenshot({ path: `${SHOTS}/03-dial-45.png` });

    // beyond one hour the scale is coarser: 3 h
    const toMax: [number, number][] = [];
    for (const m of [45, 60, 75, 90, 120, 150, 165, 180]) toMax.push(await ringPoint(dial, m));
    await touchPath(page, toMax, 30); // ends exactly at 12 o'clock: must stay at the maximum, not wrap to ∞
    await expect(page.locator('#readout-main')).toHaveText('3 h');
    await expect(page.locator('#readout-end')).toHaveText('ends at 01:56');

    // dragging back through 12 o'clock to the start gives ∞
    const box = (await dial.boundingBox())!;
    await touchPath(page, [await ringPoint(dial, 180), [box.x + box.width / 2 + 5, box.y + 5], [box.x + box.width / 2 - 20, box.y + 4]], 30);
    await expect(page.locator('#readout-main')).toHaveText('3 h'); // stuck at the max, it did not wrap
    await page.locator('.chip[data-minutes="0"]').click();
    await expect(page.locator('#readout-main')).toHaveText('∞');
    await expect(page.locator('#readout-end')).toHaveText('until you stop it');
  });

  test('timer runs out: ends at the set time, fades, then stops', async ({ page }) => {
    await open(page, { time: NIGHT });
    await page.locator('.chip[data-minutes="15"]').click();
    await expect(page.locator('#readout-end')).toHaveText('ends at 23:11');
    await page.locator('#orb').click();
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);
    await page.screenshot({ path: `${SHOTS}/04-timer-running.png` });

    await page.clock.fastForward(10 * 60_000); // 23:06
    await expect(page.locator('#readout-main')).toHaveText('5 min');
    expect((await audioState(page)).volume).toBe(1);

    await page.clock.fastForward(4 * 60_000 + 30_000); // 23:10:30, halfway through the fade
    const mid = (await audioState(page)).volume;
    expect(mid).toBeGreaterThan(0.05);
    expect(mid).toBeLessThan(0.3); // cubic ramp: 0.5³ = 0.125

    await page.clock.fastForward(31_000); // past 23:11
    await expect(page.locator('#orb')).toHaveAttribute('aria-label', 'Play');
    const end = await audioState(page);
    expect(end.paused).toBe(true);
    expect(end.volume).toBe(1); // restored for the next play
    await expect(page.locator('#readout-main')).toHaveText('15 min');
  });

  test('iOS: swaps to the pre-faded outro 60 s before the end', async ({ page }) => {
    await open(page, { time: NIGHT, ios: true });
    await page.locator('.chip[data-minutes="15"]').click();
    await page.locator('#orb').click();
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);

    await page.clock.fastForward(14 * 60_000 - 5_000); // 5 s before the fade
    let s = await audioState(page);
    expect(s.src).toContain(items[0]!.file.replace('audio/', ''));
    expect(s.loop).toBe(true);

    await page.clock.fastForward(10_000); // fade started
    await expect.poll(async () => (await audioState(page)).src).toContain('-outro');
    s = await audioState(page);
    expect(s.loop).toBe(false);
    expect(s.paused).toBe(false);
    await expect(page.locator('#orb')).toHaveAttribute('aria-label', 'Pause'); // the swap must not look like a pause

    await page.clock.fastForward(60_000 + 5_000); // endsAt + grace
    await expect(page.locator('#orb')).toHaveAttribute('aria-label', 'Play');
    expect((await audioState(page)).paused).toBe(true);
    expect((await audioState(page)).src).not.toContain('-outro'); // back on the loop for next time
  });

  test('changing the timer while playing restarts it', async ({ page }) => {
    await open(page, { time: NIGHT });
    await page.locator('.chip[data-minutes="15"]').click();
    await page.locator('#orb').click();
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);
    await page.clock.fastForward(5 * 60_000);
    await expect(page.locator('body')).toHaveClass(/dim/); // five minutes in, the screen has dimmed
    await page.mouse.click(196, 600); // first tap only wakes it
    await expect(page.locator('body')).not.toHaveClass(/dim/);
    await page.locator('.chip[data-minutes="60"]').click();
    await expect(page.locator('#readout-end')).toHaveText('ends at 00:01'); // 23:01 + 60 min
    await expect(page.locator('#readout-main')).toHaveText('1 h');
  });

  test('dims after 15 s of play and wakes on tap without pausing', async ({ page }) => {
    await open(page, { time: NIGHT });
    await page.locator('#orb').click();
    await expect.poll(async () => (await audioState(page)).paused).toBe(false);
    await page.clock.fastForward(5_000);
    await expect(page.locator('body')).not.toHaveClass(/dim/);
    await page.clock.fastForward(12_000);
    await expect(page.locator('body')).toHaveClass(/dim/);
    await page.waitForTimeout(3200); // let the 3 s CSS transition finish
    await page.screenshot({ path: `${SHOTS}/05-dim.png` });
    await page.mouse.click(196, 426); // tap the orb: wakes, does not toggle
    await expect(page.locator('body')).not.toHaveClass(/dim/);
    await expect(page.locator('#orb')).toHaveAttribute('aria-label', 'Pause');
    expect((await audioState(page)).paused).toBe(false);
  });

  test('credits sheet shows the recording details', async ({ page }) => {
    await open(page);
    await page.locator('#info').click();
    const sheet = page.locator('#sheet');
    await expect(sheet).toHaveClass(/open/);
    const x = items[0]!.xc;
    await expect(sheet).toContainText(x.recordist);
    await expect(sheet).toContainText(`XC${x.id}`);
    await expect(sheet.locator('a.cta')).toHaveAttribute('href', x.url);
    await expect(sheet.getByRole('link', { name: x.licenseName })).toHaveAttribute('href', x.licenseUrl);
    await expect(sheet.locator('img.sono')).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/06-sheet.png` });
    await page.locator('#sheet-backdrop').click({ position: { x: 100, y: 60 } });
    await expect(sheet).not.toHaveClass(/open/);
    await expect(sheet).toBeHidden();
  });

  test('AirPlay button and badge follow WebKit events', async ({ page }) => {
    await open(page);
    await expect(page.locator('#airplay')).toBeHidden();
    await page.evaluate(() => {
      const a = document.querySelector('audio') as HTMLAudioElement & Record<string, unknown>;
      a.webkitShowPlaybackTargetPicker = () => ((window as unknown as Record<string, boolean>).__picker = true);
      a.dispatchEvent(Object.assign(new Event('webkitplaybacktargetavailabilitychanged'), { availability: 'available' }));
    });
    await expect(page.locator('#airplay')).toBeVisible();
    await expect(page.locator('#badge')).toBeHidden();
    await page.locator('#airplay').click();
    expect(await page.evaluate(() => (window as unknown as Record<string, boolean>).__picker)).toBe(true);
    await page.evaluate(() => {
      const a = document.querySelector('audio') as HTMLAudioElement & Record<string, unknown>;
      a.webkitCurrentPlaybackTargetIsWireless = true;
      a.dispatchEvent(new Event('webkitcurrentplaybacktargetiswirelesschanged'));
    });
    await expect(page.locator('#badge')).toBeVisible();
    await expect(page.locator('#badge')).toHaveText('Playing on AirPlay');
    await page.screenshot({ path: `${SHOTS}/07-airplay.png` });
  });

  test('every soundscape renders its own scene', async ({ page }) => {
    await open(page);
    await page.locator('#orb').click();
    for (let i = 0; i < items.length; i++) {
      await page.evaluate((n) => (window as unknown as { __soundscapes: { select(i: number): void } }).__soundscapes.select(n), i);
      await expect(page.locator('#title')).toHaveText(items[i]!.name);
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${SHOTS}/10-scape-${i}-${items[i]!.theme}.png` });
    }
    expect(errors).toEqual([]);
  });
});
