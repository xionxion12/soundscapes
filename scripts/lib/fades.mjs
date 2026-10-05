// The short clips iOS needs, because iOS ignores audio.volume and the app swaps the one <audio>
// element's source instead. All are cut from the start of the loop and use a quadratic or cubic curve:
//   <id>-fadein.m4a   2 s, faded in. After it the app continues the loop at 2 s.   (every start)
//   <id>-fadeout.m4a  5 s, faded out. Played in place of the loop when you pause.   (every pause)
//   <id>-outro.m4a    60 s, faded out. Played for the last minute of a sleep timer.
// Other platforms get the same fades from a volume ramp (src/audio/softFade.ts, src/timer.ts).
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);
export const FADE_IN_SECONDS = 2;
export const FADE_OUT_SECONDS = 5;
export const OUTRO_SECONDS = 60;

/** Render the clips from an encoded loop. Returns their file names (relative to `dir`). */
export async function buildFades(loopFile, dir, id, bitrate = 160) {
  const enc = ['-c:a', 'aac', '-b:a', `${bitrate}k`, '-aac_coder', 'twoloop', '-ar', '48000', '-movflags', '+faststart'];
  const names = { fadeIn: `${id}-fadein.m4a`, fadeOut: `${id}-fadeout.m4a`, outro: `${id}-outro.m4a` };
  const make = (out, seconds, curve, direction) =>
    run('ffmpeg', ['-hide_banner', '-nostats', '-v', 'error', '-y', '-i', loopFile, '-t', String(seconds), '-af', `afade=t=${direction}:st=0:d=${seconds}:curve=${curve}`, ...enc, path.join(dir, out)]);
  await make(names.fadeIn, FADE_IN_SECONDS, 'qua', 'in');
  await make(names.fadeOut, FADE_OUT_SECONDS, 'qua', 'out');
  await make(names.outro, OUTRO_SECONDS, 'cub', 'out');
  return names;
}
