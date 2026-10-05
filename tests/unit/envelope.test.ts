import { describe, expect, it } from 'vitest';
import { decodeEnvelope, envelopeIndex, sampleEnvelope } from '../../src/data/envelope';

const bytes = Uint8Array.from([0, 51, 102, 153, /*mid*/ 255, 0, 255, 0, /*high*/ 10, 20, 30, 40]);
const b64 = Buffer.from(bytes).toString('base64');
const env = decodeEnvelope({ rate: 10, bands: 3, data: b64 });

describe('envelope', () => {
  it('splits planar bands', () => {
    expect(env.length).toBe(4);
    expect(Array.from(env.bands[0]!)).toEqual([0, 51, 102, 153]);
    expect(Array.from(env.bands[2]!)).toEqual([10, 20, 30, 40]);
  });

  it('indexes at 10 Hz', () => {
    expect(envelopeIndex(env, 0)).toBe(0);
    expect(envelopeIndex(env, 0.09)).toBe(0);
    expect(envelopeIndex(env, 0.1)).toBe(1);
    expect(envelopeIndex(env, 0.35)).toBe(3);
  });

  it('wraps around the loop', () => {
    expect(envelopeIndex(env, 0.4)).toBe(0);
    expect(envelopeIndex(env, 1.05)).toBe(2);
    expect(envelopeIndex(env, 400.0)).toBe(0);
  });

  it('is safe for negative or empty input', () => {
    expect(envelopeIndex(env, -3)).toBe(0);
    expect(envelopeIndex({ rate: 10, length: 0 }, 5)).toBe(0);
  });

  it('returns 0..1 levels', () => {
    expect(sampleEnvelope(env, 0.1)).toEqual([0.2, 0, 20 / 255]);
    expect(sampleEnvelope(env, 0.2)[1]).toBe(1);
  });
});
