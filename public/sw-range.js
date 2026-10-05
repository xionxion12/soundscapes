// Range-request helpers for the service worker. Classic script (importScripts), no
// exports: it publishes `self.swRange`. Unit tests evaluate this file directly.
(function (root) {
  /**
   * Parse a `Range: bytes=…` header against a resource of `size` bytes.
   * Returns {start, end} (inclusive), 'unsatisfiable', or null if absent/unsupported.
   */
  function parseRange(header, size) {
    if (!header) return null;
    var m = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
    if (!m || (m[1] === '' && m[2] === '')) return null;
    var start;
    var end;
    if (m[1] === '') {
      var suffix = parseInt(m[2], 10);
      if (suffix === 0) return 'unsatisfiable';
      start = Math.max(0, size - suffix);
      end = size - 1;
    } else {
      start = parseInt(m[1], 10);
      end = m[2] === '' ? size - 1 : Math.min(parseInt(m[2], 10), size - 1);
    }
    if (start >= size || start > end) return 'unsatisfiable';
    return { start: start, end: end };
  }

  /** Build the 206 (or 416 / 200) response for a cached full-body response. */
  async function sliceResponse(full, rangeHeader) {
    var blob = await full.blob();
    var size = blob.size;
    var type = full.headers.get('Content-Type') || 'audio/mp4';
    var range = parseRange(rangeHeader, size);
    if (range === null) {
      return new Response(blob, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
    }
    if (range === 'unsatisfiable') {
      return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    }
    var body = blob.slice(range.start, range.end + 1);
    return new Response(body, {
      status: 206,
      headers: {
        'Content-Type': type,
        'Content-Length': String(body.size),
        'Content-Range': 'bytes ' + range.start + '-' + range.end + '/' + size,
        'Accept-Ranges': 'bytes',
      },
    });
  }

  root.swRange = { parseRange: parseRange, sliceResponse: sliceResponse };
})(self);
