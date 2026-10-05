import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface SwRange {
  parseRange(h: string | null, size: number): { start: number; end: number } | 'unsatisfiable' | null;
  sliceResponse(full: Response, range: string | null): Promise<Response>;
}
const src = readFileSync(new URL('../../public/sw-range.js', import.meta.url), 'utf8');
const scope: { swRange?: SwRange } = {};
new Function('self', src)(scope);
const { parseRange, sliceResponse } = scope.swRange!;

describe('sw range helpers', () => {
  it('parses byte ranges', () => {
    expect(parseRange('bytes=0-99', 1000)).toEqual({ start: 0, end: 99 });
    expect(parseRange('bytes=500-', 1000)).toEqual({ start: 500, end: 999 });
    expect(parseRange('bytes=-100', 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange('bytes=900-5000', 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange('bytes=0-', 1000)).toEqual({ start: 0, end: 999 });
  });

  it('flags unsatisfiable and ignores unsupported ranges', () => {
    expect(parseRange('bytes=1000-', 1000)).toBe('unsatisfiable');
    expect(parseRange('bytes=-0', 1000)).toBe('unsatisfiable');
    expect(parseRange(null, 1000)).toBeNull();
    expect(parseRange('bytes=0-1,5-9', 1000)).toBeNull();
    expect(parseRange('items=0-1', 1000)).toBeNull();
  });

  const full = () => new Response(new Uint8Array(Array.from({ length: 256 }, (_, i) => i)), { headers: { 'Content-Type': 'audio/mp4' } });

  it('answers a range with a 206 slice of the cached blob', async () => {
    const res = await sliceResponse(full(), 'bytes=10-19');
    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe('bytes 10-19/256');
    expect(res.headers.get('Content-Length')).toBe('10');
    expect(res.headers.get('Content-Type')).toBe('audio/mp4');
    expect(Array.from(new Uint8Array(await res.arrayBuffer()))).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  });

  it('answers the Safari probe bytes=0-1', async () => {
    const res = await sliceResponse(full(), 'bytes=0-1');
    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe('bytes 0-1/256');
  });

  it('returns 200 without a Range header and 416 when out of bounds', async () => {
    const ok = await sliceResponse(full(), null);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Accept-Ranges')).toBe('bytes');
    const bad = await sliceResponse(full(), 'bytes=300-');
    expect(bad.status).toBe(416);
    expect(bad.headers.get('Content-Range')).toBe('bytes */256');
  });
});
