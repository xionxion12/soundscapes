// The short clips iOS needs, because iOS ignores audio.volume and the app swaps the one <audio>
// element's source instead. All are cut from the start of the loop:
//   <id>-fadein.m4a   4 s, faded in on an S-curve. After it the app continues the loop at 4 s. (every start)
//   <id>-fadeout.m4a  5 s, faded out. Played in place of the loop when you pause.   (every pause)
//   <id>-outro.m4a    60 s, faded out. Played for the last minute of a sleep timer.
// Other platforms get the same fades from a volume ramp (src/audio/softFade.ts, src/timer.ts).
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);
export const FADE_IN_SECONDS = 4;
export const FADE_OUT_SECONDS = 5;
export const OUTRO_SECONDS = 60;

/** Render the clips from an encoded loop. Returns their file names (relative to `dir`). */
export async function buildFades(loopFile, dir, id, bitrate = 160) {
  const enc = ['-c:a', 'aac', '-b:a', `${bitrate}k`, '-aac_coder', 'twoloop', '-ar', '48000', '-movflags', '+faststart'];
  const names = { fadeIn: `${id}-fadein.m4a`, fadeOut: `${id}-fadeout.m4a`, outro: `${id}-outro.m4a` };
  // stacked fades multiply: two half-cosine (hsin) fades in are the S-curve of src/audio/softFade.ts
  // ffmpeg's `twoloop` AAC coder asserts on some stereo signals (aacenc.c "diff >= 0 && diff <= 120"): retry those with the `fast` coder
  const make = async (out, seconds, curves, direction) => {
    const args = (e) => ['-hide_banner', '-nostats', '-v', 'error', '-y', '-i', loopFile, '-t', String(seconds), '-af', curves.map((c) => `afade=t=${direction}:st=0:d=${seconds}:curve=${c}`).join(','), ...e, path.join(dir, out)];
    try {
      await run('ffmpeg', args(enc));
    } catch {
      await run('ffmpeg', args(enc.map((a) => (a === 'twoloop' ? 'fast' : a))));
    }
  };
  await make(names.fadeIn, FADE_IN_SECONDS, ['hsin', 'hsin'], 'in');
  await make(names.fadeOut, FADE_OUT_SECONDS, ['qua'], 'out');
  await make(names.outro, OUTRO_SECONDS, ['cub'], 'out');
  return names;
}
