import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Writes the precache list and cache versions into dist/sw.js once the build output exists. */
function swInject(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sw-inject',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const root = resolve(outDir);
      const files = walk(root).map((f) => relative(root, f).split('\\').join('/'));
      const shell = files.filter((f) => !f.startsWith('audio/') && f !== 'sw.js' && f !== 'sw-range.js' && !f.endsWith('.map') && !f.endsWith('.woff'));
      const audio = files.filter((f) => f.endsWith('.m4a')).sort();
      const hash = (list: string[]) => {
        const h = createHash('sha1');
        for (const f of list.sort()) h.update(f).update(readFileSync(join(root, f)));
        return h.digest('hex').slice(0, 10);
      };
      const audioHash = createHash('sha1');
      for (const f of audio) audioHash.update(f).update(String(statSync(join(root, f)).size));
      const sw = join(root, 'sw.js');
      const src = readFileSync(sw, 'utf8')
        .replace("const BUILD_ID = 'dev';", `const BUILD_ID = '${hash([...shell])}';`)
        .replace("const AUDIO_ID = 'dev';", `const AUDIO_ID = '${audioHash.digest('hex').slice(0, 10)}';`)
        .replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(['./', ...shell])};`);
      writeFileSync(sw, src);
    },
  };
}

export default defineConfig({
  base: '/soundcapes/',
  build: { target: 'es2022', sourcemap: false },
  plugins: [swInject()],
  test: { include: ['tests/unit/**/*.test.ts'] },
});
