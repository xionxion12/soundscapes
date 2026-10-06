#!/usr/bin/env node
// Render the fade clips (4 s in, 5 s out, 60 s timer outro) for every soundscape from the committed
// loops (public/audio/<id>.m4a) and record them in src/data/soundscapes.json. No xeno-canto needed.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildFades } from './lib/fades.mjs';

const root = path.resolve(import.meta.dirname, '..');
const pub = path.join(root, 'public', 'audio');
const dataFile = path.join(root, 'src', 'data', 'soundscapes.json');
const data = JSON.parse(await readFile(dataFile, 'utf8'));
const cfg = JSON.parse(await readFile(path.join(import.meta.dirname, 'soundscapes.config.json'), 'utf8'));

for (const entry of data.items) {
  const names = await buildFades(path.join(pub, `${entry.id}.m4a`), pub, entry.id, cfg.bitrate);
  entry.fadeIn = `audio/${names.fadeIn}`;
  entry.fadeOut = `audio/${names.fadeOut}`;
  entry.outro = `audio/${names.outro}`;
  console.log('wrote', names.fadeIn, names.fadeOut, names.outro);
}
await writeFile(dataFile, JSON.stringify(data) + '\n');
