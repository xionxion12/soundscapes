// Lock-screen artwork: one SVG per theme, rendered with resvg. Deterministic.
function rng(seed) {
  let a = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const glow = (id, rgb) => `<radialGradient id="${id}"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".2" stop-color="rgb(${rgb})" stop-opacity=".8"/><stop offset=".55" stop-color="rgb(${rgb})" stop-opacity=".2"/><stop offset="1" stop-color="rgb(${rgb})" stop-opacity="0"/></radialGradient>`;

export function artSvg(theme, seed = theme) {
  const r = rng(seed);
  const S = 512;
  let defs = '';
  let body = '';
  if (theme === 'mediterranean') {
    defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07041a"/><stop offset=".55" stop-color="#150b2c"/><stop offset=".88" stop-color="#2f1632"/><stop offset="1" stop-color="#05030a"/></linearGradient>${glow('g', '255,190,80')}<radialGradient id="h"><stop offset="0" stop-color="#ff963c" stop-opacity=".35"/><stop offset="1" stop-color="#ff963c" stop-opacity="0"/></radialGradient>`;
    body = `<rect width="${S}" height="${S}" fill="url(#bg)"/><circle cx="256" cy="470" r="280" fill="url(#h)"/>`;
    for (let i = 0; i < 46; i++) body += `<circle cx="${r() * S}" cy="${120 + r() * 330}" r="${6 + r() * 14}" fill="url(#g)" opacity="${0.35 + r() * 0.65}"/>`;
    for (let i = 0; i < 3; i++) body += `<ellipse cx="256" cy="430" rx="${60 + i * 50}" ry="${14 + i * 11}" fill="none" stroke="#ffc878" stroke-opacity="${0.4 - i * 0.12}" stroke-width="1.6"/>`;
    body += `<path d="M0 512V452Q64 436 128 448T256 442T384 450T512 440V512Z" fill="#030208"/><path d="M62 330C74 350 73 420 66 456L58 456C51 420 50 350 62 330Z M446 300C462 330 461 420 452 456L440 456C431 420 430 330 446 300Z M104 380C112 396 111 430 107 456L101 456C97 430 96 396 104 380Z" fill="#030208"/>`;
  } else if (theme === 'rainforest') {
    defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000a07"/><stop offset=".5" stop-color="#02261d"/><stop offset="1" stop-color="#000504"/></linearGradient>${glow('a', '40,255,170')}${glow('b', '50,220,255')}${glow('c', '170,255,90')}<radialGradient id="m"><stop offset="0" stop-color="#14be8c" stop-opacity=".35"/><stop offset="1" stop-color="#14be8c" stop-opacity="0"/></radialGradient>`;
    body = `<rect width="${S}" height="${S}" fill="url(#bg)"/><circle cx="170" cy="330" r="230" fill="url(#m)"/><circle cx="380" cy="200" r="200" fill="url(#m)"/>`;
    for (let i = 0; i < 70; i++) body += `<circle cx="${r() * S}" cy="${r() * S}" r="${4 + r() * 20}" fill="url(#${'abc'[Math.floor(r() * 3.2)]})" opacity="${0.25 + r() * 0.7}"/>`;
    for (let i = 0; i < 8; i++) {
      const x = (i / 7) * S, len = 60 + r() * 120;
      body += `<path d="M${x - 26} 0Q${x} ${len * 0.8} ${x + (r() - 0.5) * 36} ${len}Q${x + 6} ${len * 0.5} ${x + 26} 0Z" fill="#000" opacity=".85"/>`;
    }
  } else {
    defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#01030a"/><stop offset=".6" stop-color="#0a1332"/><stop offset=".92" stop-color="#101a3a"/><stop offset="1" stop-color="#02040a"/></linearGradient>${glow('mo', '170,195,255')}${glow('st', '200,215,255')}`;
    body = `<rect width="${S}" height="${S}" fill="url(#bg)"/><circle cx="378" cy="118" r="130" fill="url(#mo)" opacity=".55"/><circle cx="378" cy="118" r="30" fill="#dfe8ff"/>`;
    for (let i = 0; i < 120; i++) body += `<circle cx="${r() * S}" cy="${r() * S * 0.8}" r="${1 + r() * 4.5}" fill="url(#st)" opacity="${0.3 + r() * 0.7}"/>`;
    let d = 'M0 512';
    for (let x = 0; x <= S + 20; x += 18) d += `L${x} ${512 - 14 - r() * 40}L${x + 9} ${512 - 24 - r() * 50}`;
    body += `<path d="${d}L${S} 512Z" fill="#01020a"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>${defs}</defs>${body}</svg>`;
}
