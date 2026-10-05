#!/usr/bin/env node
// Home-screen icons: a glowing orb with a timer ring on black. Run: npm run icons
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const OUT = path.resolve(import.meta.dirname, '..', 'public', 'icons');

/** `pad` shrinks the artwork for the maskable variant (safe zone is the centre 80%). */
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs>
  <radialGradient id="o" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="#ffd9a0"/><stop offset=".35" stop-color="#ffb454"/><stop offset=".75" stop-color="#7a3d1c"/><stop offset="1" stop-color="#1a0d10"/></radialGradient>
  <radialGradient id="g"><stop offset="0" stop-color="#ffb454" stop-opacity=".45"/><stop offset="1" stop-color="#ffb454" stop-opacity="0"/></radialGradient>
</defs>
<rect width="512" height="512" fill="#000"/>
<g transform="translate(256 256) scale(${pad}) translate(-256 -256)">
  <circle cx="256" cy="256" r="250" fill="url(#g)"/>
  <circle cx="256" cy="256" r="196" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width="16"/>
  <path d="M256 60A196 196 0 1 1 100 374" fill="none" stroke="#ffb454" stroke-width="16" stroke-linecap="round"/>
  <circle cx="100" cy="374" r="17" fill="#fff"/>
  <circle cx="256" cy="256" r="124" fill="url(#o)"/>
</g></svg>`;

await mkdir(OUT, { recursive: true });
const png = (pad, size) => new Resvg(svg(pad), { fitTo: { mode: 'width', value: size } }).render().asPng();
await writeFile(path.join(OUT, 'icon-512.png'), png(1, 512));
await writeFile(path.join(OUT, 'icon-192.png'), png(1, 192));
await writeFile(path.join(OUT, 'icon-maskable-512.png'), png(0.78, 512));
await writeFile(path.join(OUT, 'apple-touch-icon.png'), png(1, 180));
console.log('icons written to', path.relative(process.cwd(), OUT));
