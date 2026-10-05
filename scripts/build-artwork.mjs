#!/usr/bin/env node
// Re-render the lock-screen artwork (public/audio/<id>-art-512.png) without rebuilding the audio.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { artSvg } from './lib/artwork.mjs';

const root = path.resolve(import.meta.dirname, '..');
const cfg = JSON.parse(await readFile(path.join(import.meta.dirname, 'soundscapes.config.json'), 'utf8'));
for (const item of cfg.items) {
  const out = path.join(root, 'public', 'audio', `${item.id}-art-512.png`);
  await writeFile(out, new Resvg(artSvg(item.theme, item.id), { fitTo: { mode: 'width', value: 512 } }).render().asPng());
  console.log('wrote', path.relative(root, out));
}
