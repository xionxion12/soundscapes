// Pre-computed loudness envelope (3 bands @ 10 Hz) used to drive the visuals without
// touching Web Audio. Stored base64, planar: [low…][mid…][high…], one byte per sample.

export interface EnvelopeData {
  rate: number;
  bands: number;
  data: string;
}

export interface Envelope {
  rate: number;
  length: number;
  bands: Uint8Array[];
}

export type Levels = [low: number, mid: number, high: number];

export function decodeEnvelope(e: EnvelopeData): Envelope {
  const bin = atob(e.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const length = Math.floor(bytes.length / e.bands);
  const bands: Uint8Array[] = [];
  for (let b = 0; b < e.bands; b++) bands.push(bytes.subarray(b * length, (b + 1) * length));
  return { rate: e.rate, length, bands };
}

/** Sample index for a playback time, wrapping around the loop. */
export function envelopeIndex(env: Pick<Envelope, 'rate' | 'length'>, t: number): number {
  if (env.length <= 0) return 0;
  const i = Math.floor(Math.max(0, t) * env.rate) % env.length;
  return i;
}

/** Levels 0..1 per band at playback time `t`. */
export function sampleEnvelope(env: Envelope, t: number, out: Levels = [0, 0, 0]): Levels {
  const i = envelopeIndex(env, t);
  out[0] = (env.bands[0]?.[i] ?? 0) / 255;
  out[1] = (env.bands[1]?.[i] ?? 0) / 255;
  out[2] = (env.bands[2]?.[i] ?? 0) / 255;
  return out;
}
