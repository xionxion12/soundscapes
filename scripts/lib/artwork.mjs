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

/** A leafy twig reaching in from the edge with alternating, drooping leaves (rain theme). */
function boughSvg(r, x0, y0, x1, y1, sag, leaves, size, fill) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag;
  const at = (k) => [(1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * x1, (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * my + k * k * y1];
  let t = `<path d="M${x0} ${y0}Q${mx} ${my} ${x1} ${y1}" fill="none" stroke="${fill}" stroke-width="${size * 0.08}" stroke-linecap="round"/>`;
  for (let i = 0; i < leaves; i++) {
    const k = 0.12 + (i / Math.max(1, leaves - 1)) * 0.86, [bx, by] = at(k), side = i % 2 ? 1 : -1;
    const ang = Math.PI / 2 + side * (0.35 + r() * 0.45) + (x1 > x0 ? -0.25 : 0.25), len = size * (0.8 + r() * 0.35) * (1.1 - k * 0.45), wid = len * 0.42;
    const c = Math.cos(ang), s = Math.sin(ang), tx = bx + c * len, ty = by + s * len, nx = -s * wid, ny = c * wid;
    t += `<path d="M${bx} ${by}C${bx + nx} ${by + ny} ${tx + nx * 0.5 - c * len * 0.25} ${ty + ny * 0.5 - s * len * 0.25} ${tx} ${ty}C${tx - nx * 0.5 - c * len * 0.25} ${ty - ny * 0.5 - s * len * 0.25} ${bx - nx} ${by - ny} ${bx} ${by}Z" fill="${fill}"/>`;
    if (r() < 0.5) t += `<circle cx="${tx}" cy="${ty + 3}" r="2.6" fill="url(#bd)"/>`;
  }
  return t;
}

/** A tree fern: a slim trunk topped by a crown of long arching, feathered fronds (ferns theme). */
function treeFernSvg(r, x, base, height, span, fill) {
  const top = base - height;
  let t = `<path d="M${x - 6} ${base}L${x - 4} ${top}L${x + 4} ${top}L${x + 6} ${base}Z" fill="${fill}"/>`;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.05 + (i / 8) * 0.9), dir = Math.cos(a), len = span * (0.75 + r() * 0.35);
    const ex = x + Math.cos(a) * len * 1.1, ey = top - Math.sin(a) * len * 0.35 + len * 0.35;
    const cx = x + Math.cos(a) * len * 0.5, cy = top - Math.sin(a) * len * 0.5;
    t += `<path d="M${x} ${top}Q${cx} ${cy} ${ex} ${ey}" fill="none" stroke="${fill}" stroke-width="2.4" stroke-linecap="round"/>`;
    for (let k = 0.15; k < 0.95; k += 0.08) {
      const px = (1 - k) * (1 - k) * x + 2 * (1 - k) * k * cx + k * k * ex, py = (1 - k) * (1 - k) * top + 2 * (1 - k) * k * cy + k * k * ey, pl = 14 * (1 - k * 0.7);
      t += `<path d="M${px} ${py}l${-dir * pl * 0.2} ${pl}M${px} ${py}l${dir * pl * 0.5} ${pl * 0.7}" stroke="${fill}" stroke-width="1.6" stroke-linecap="round"/>`;
    }
  }
  return t;
}

/** A hoop pine: tall straight trunk with tufted, tiered clumps of foliage (sunrise theme). */
function hoopPineSvg(r, x, base, height, fill) {
  let t = `<path d="M${x - 4} ${base}L${x - 1.5} ${base - height}L${x + 1.5} ${base - height}L${x + 4} ${base}Z" fill="${fill}"/>`;
  for (let k = 0.35; k <= 1.001; k += 0.11) {
    const y = base - height * k, reach = height * 0.16 * (1.15 - k * 0.6);
    for (const dir of [-1, 1]) {
      const ex = x + dir * reach * (0.7 + r() * 0.5), ey = y - 6 - r() * 8;
      t += `<path d="M${x} ${y}Q${(x + ex) / 2} ${y - 2} ${ex} ${ey}" fill="none" stroke="${fill}" stroke-width="2" stroke-linecap="round"/><ellipse cx="${ex}" cy="${ey - 2}" rx="${reach * 0.32}" ry="${reach * 0.17}" fill="${fill}"/>`;
    }
  }
  return t + `<ellipse cx="${x}" cy="${base - height - 4}" rx="${height * 0.04}" ry="${height * 0.05}" fill="${fill}"/>`;
}

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
  } else if (theme === 'bush') {
    defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04041a"/><stop offset=".55" stop-color="#10124a"/><stop offset=".86" stop-color="#27204a"/><stop offset="1" stop-color="#2a1a1c"/></linearGradient>${glow('st', '205,215,255')}<radialGradient id="h"><stop offset="0" stop-color="#eb8c46" stop-opacity=".4"/><stop offset="1" stop-color="#eb8c46" stop-opacity="0"/></radialGradient><linearGradient id="mw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#aaa0eb" stop-opacity="0"/><stop offset=".5" stop-color="#aaa0eb" stop-opacity=".16"/><stop offset="1" stop-color="#aaa0eb" stop-opacity="0"/></linearGradient>`;
    body = `<rect width="${S}" height="${S}" fill="url(#bg)"/><rect x="-200" y="150" width="900" height="120" fill="url(#mw)" transform="rotate(-41 256 210)"/><circle cx="256" cy="500" r="260" fill="url(#h)"/>`;
    for (let i = 0; i < 90; i++) body += `<circle cx="${r() * S}" cy="${r() * S * 0.78}" r="${0.8 + r() * 3.2}" fill="url(#st)" opacity="${0.25 + r() * 0.6}"/>`;
    // the Southern Cross (Gacrux, Acrux, Mimosa, Delta, Epsilon) and the Pointers, placed as in the app
    const cx = 392, cy = 140, u = 34;
    const cross = [[0, -1, 9], [0.05, 1, 11], [-0.62, 0.15, 9.5], [0.62, -0.3, 8], [0.3, 0.32, 5], [-2.5, 1.55, 11], [-2.25, 0.3, 9.5]];
    for (const [x, y, m] of cross) body += `<circle cx="${cx + x * u}" cy="${cy + y * u}" r="${m * 1.25}" fill="url(#st)"/>`;
    const fill = '#020207';
    const tree = (x, base, height, lean) => {
      const tipX = x + lean, tipY = base - height;
      let t = `<path d="M${x - 7} ${base}Q${x - 2 + lean * 0.2} ${base - height * 0.5} ${tipX - 2} ${tipY}L${tipX + 2} ${tipY}Q${x + 2 + lean * 0.2} ${base - height * 0.5} ${x + 7} ${base}Z" fill="${fill}"/>`;
      t += `<path d="M${x + 6} ${base}Q${x + 1 + lean * 0.2} ${base - height * 0.5} ${tipX + 2} ${tipY}" fill="none" stroke="#c8cdeb" stroke-opacity=".14" stroke-width="1.4"/>`;
      for (const [k, dir, len] of [[0.6, -1, 70], [0.74, 1, 80], [0.86, -1, 50]]) {
        const bx = x + lean * k * k, by = base - height * k, ex = bx + dir * len * (0.8 + r() * 0.3), ey = by - 45 - r() * 30;
        t += `<path d="M${bx} ${by}Q${bx + dir * len * 0.2} ${by - 28} ${ex} ${ey}" fill="none" stroke="${fill}" stroke-width="3.2" stroke-linecap="round"/>`;
        for (let i = 0; i < 11; i++) {
          const dx = (r() - 0.5) * 56, len = 14 + r() * 34;
          t += `<path d="M${ex + (r() - 0.5) * 10} ${ey}Q${ex + dx * 0.7} ${ey - 5} ${ex + dx} ${ey + len}" fill="none" stroke="${fill}" stroke-width="2" stroke-linecap="round"/>`;
        }
      }
      return t;
    };
    body += `<path d="M0 512V484Q64 476 128 482T256 478T384 484T512 476V512Z" fill="${fill}"/>`;
    body += tree(48, 486, 330, 14) + tree(132, 486, 190, -10) + tree(468, 486, 360, -20) + tree(392, 486, 170, 12);
  } else if (theme === 'rain') {
    defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030a0a"/><stop offset=".5" stop-color="#0b1d1c"/><stop offset=".9" stop-color="#16302b"/><stop offset="1" stop-color="#060d0b"/></linearGradient><radialGradient id="gl"><stop offset="0" stop-color="#78b4a5" stop-opacity=".22"/><stop offset="1" stop-color="#78b4a5" stop-opacity="0"/></radialGradient>${glow('bd', '200,235,230')}`;
    body = `<rect width="${S}" height="${S}" fill="url(#bg)"/><circle cx="256" cy="280" r="280" fill="url(#gl)"/>`;
    for (const x of [110, 200, 330, 400]) body += `<rect x="${x}" y="150" width="${5 + r() * 4}" height="362" fill="#030a09" opacity=".55"/>`;
    for (let i = 0; i < 130; i++) {
      const x = r() * S, y = r() * 470, z = 0.3 + r() * 0.7, len = 12 + z * 34;
      body += `<line x1="${x}" y1="${y}" x2="${x - len * 0.08}" y2="${y - len}" stroke="#b9e1dc" stroke-opacity="${0.08 + z * 0.26}" stroke-width="${0.8 + z * 1.2}" stroke-linecap="round"/>`;
    }
    const fill = '#020706';
    for (let i = 0; i < 6; i++) body += `<ellipse cx="${60 + r() * 390}" cy="${486 + r() * 20}" rx="${14 + r() * 26}" ry="${4 + r() * 5}" fill="none" stroke="#aad7cd" stroke-opacity="${0.15 + r() * 0.25}" stroke-width="1.3"/>`;
    body += `<path d="M0 512V484Q64 476 128 482T256 478T384 484T512 476V512Z" fill="${fill}"/>`;
    body += boughSvg(r, -20, 6, 300, 70, 40, 9, 50, fill) + boughSvg(r, 532, 30, 250, 150, 34, 8, 48, fill) + boughSvg(r, -20, 330, 130, 380, 14, 4, 40, fill) + boughSvg(r, 532, 300, 380, 360, 16, 5, 42, fill);
  } else if (theme === 'pond') {
    defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#02060c"/><stop offset=".55" stop-color="#0a1a24"/><stop offset=".62" stop-color="#0d2226"/><stop offset="1" stop-color="#03090a"/></linearGradient>${glow('mo', '215,235,200')}<linearGradient id="col" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7ebc8" stop-opacity=".35"/><stop offset="1" stop-color="#d7ebc8" stop-opacity="0"/></linearGradient>`;
    body = `<rect width="${S}" height="${S}" fill="url(#bg)"/><circle cx="330" cy="120" r="110" fill="url(#mo)" opacity=".45"/><circle cx="330" cy="120" r="22" fill="#e6f0dc"/>`;
    for (let i = 0; i < 50; i++) body += `<circle cx="${r() * S}" cy="${r() * 260}" r="${0.6 + r() * 1.6}" fill="#dfe8ff" opacity="${0.2 + r() * 0.5}"/>`;
    // far bank, the moon's broken path on the water
    body += `<path d="M0 300Q90 286 190 296T380 290T512 296V312H0Z" fill="#020607"/>`;
    for (let i = 0; i < 14; i++) { const y = 318 + i * 13, wd = 10 + r() * 34 - i * 0.5; body += `<rect x="${330 - wd / 2 + (r() - 0.5) * 14}" y="${y}" width="${wd}" height="2.4" rx="1.2" fill="#d7ebc8" opacity="${0.45 - i * 0.026}"/>`; }
    for (let i = 0; i < 3; i++) body += `<ellipse cx="170" cy="400" rx="${40 + i * 38}" ry="${9 + i * 8}" fill="none" stroke="#a8dcb4" stroke-opacity="${0.35 - i * 0.1}" stroke-width="1.4"/>`;
    // lily pads, then reeds and bulrushes in the foreground
    for (const [x, y, s] of [[90, 440, 34], [160, 470, 26], [380, 430, 30], [430, 470, 40], [250, 492, 30]]) body += `<path d="M${x} ${y}L${x + s} ${y - s * 0.08}A${s} ${s * 0.3} 0 1 1 ${x + s * 0.92} ${y + s * 0.12}Z" fill="#0a2119"/><path d="M${x} ${y}L${x + s} ${y - s * 0.08}A${s} ${s * 0.3} 0 1 1 ${x + s * 0.92} ${y + s * 0.12}Z" fill="none" stroke="#7fb89a" stroke-opacity=".22" stroke-width="1.2"/>`;
    const fill = '#020605';
    for (let i = 0; i < 22; i++) {
      const left = i < 12, x = left ? r() * 120 : 400 + r() * 112, top = 230 + r() * 140, bend = (r() - 0.5) * 30;
      body += `<path d="M${x} 512Q${x + bend * 0.3} ${(512 + top) / 2} ${x + bend} ${top}" fill="none" stroke="${fill}" stroke-width="${2 + r() * 2.5}" stroke-linecap="round"/>`;
      if (r() < 0.35) body += `<rect x="${x + bend - 4}" y="${top - 2}" width="8" height="34" rx="4" fill="${fill}"/>`;
    }
  } else if (theme === 'ferns') {
    defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1414"/><stop offset=".45" stop-color="#14231f"/><stop offset=".8" stop-color="#0c1714"/><stop offset="1" stop-color="#040807"/></linearGradient><linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6eccb" stop-opacity=".13"/><stop offset="1" stop-color="#e6eccb" stop-opacity="0"/></linearGradient><radialGradient id="mi"><stop offset="0" stop-color="#9fbfae" stop-opacity=".25"/><stop offset="1" stop-color="#9fbfae" stop-opacity="0"/></radialGradient>${glow('mt', '235,240,205')}`;
    body = `<rect width="${S}" height="${S}" fill="url(#bg)"/>`;
    // tall, straight mountain-ash trunks fading into the mist
    for (const [x, wd, o] of [[70, 16, 0.5], [180, 10, 0.35], [300, 22, 0.55], [420, 12, 0.4], [470, 18, 0.5]]) body += `<rect x="${x}" y="0" width="${wd}" height="512" fill="#08100e" opacity="${o}"/>`;
    for (const [x, sp] of [[150, 70], [260, 110], [350, 60]]) body += `<path d="M${x - 14} 0L${x + 14} 0L${x + sp} 512L${x - sp * 0.6} 512Z" fill="url(#ray)"/>`;
    body += `<circle cx="256" cy="400" r="260" fill="url(#mi)"/>`;
    for (let i = 0; i < 40; i++) body += `<circle cx="${r() * S}" cy="${80 + r() * 380}" r="${2 + r() * 6}" fill="url(#mt)" opacity="${0.2 + r() * 0.4}"/>`;
    const fill = '#030706';
    body += `<path d="M0 512V470Q80 462 170 470T340 466T512 472V512Z" fill="${fill}"/>`;
    body += treeFernSvg(r, 90, 470, 200, 120, fill) + treeFernSvg(r, 420, 470, 150, 105, fill) + treeFernSvg(r, 270, 480, 70, 80, fill);
  } else if (theme === 'sunrise') {
    defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060716"/><stop offset=".45" stop-color="#1a1534"/><stop offset=".72" stop-color="#4a2a3c"/><stop offset=".86" stop-color="#7a4636"/><stop offset="1" stop-color="#140a08"/></linearGradient><radialGradient id="sun"><stop offset="0" stop-color="#ffd59a" stop-opacity=".7"/><stop offset=".3" stop-color="#ff9a5a" stop-opacity=".3"/><stop offset="1" stop-color="#ff9a5a" stop-opacity="0"/></radialGradient>`;
    body = `<rect width="${S}" height="${S}" fill="url(#bg)"/><circle cx="300" cy="440" r="260" fill="url(#sun)"/>`;
    for (let i = 0; i < 40; i++) body += `<circle cx="${r() * S}" cy="${r() * 160}" r="${0.6 + r() * 1.4}" fill="#e8e4ff" opacity="${0.15 + r() * 0.45}"/>`;
    for (let i = 0; i < 4; i++) body += `<rect x="${40 + r() * 300}" y="${250 + i * 34}" width="${120 + r() * 160}" height="${4 + r() * 4}" rx="3" fill="#ffb98a" opacity="${0.08 + r() * 0.1}"/>`;
    const fill = '#0a0507';
    body += `<path d="M0 512V430Q60 404 130 420T260 410T400 424T512 404V512Z" fill="#160c10"/><path d="M0 512V462Q90 452 190 460T380 456T512 462V512Z" fill="${fill}"/>`;
    body += hoopPineSvg(r, 70, 462, 290, fill) + hoopPineSvg(r, 450, 462, 240, fill) + hoopPineSvg(r, 140, 462, 150, fill);
    for (const [x, y, s] of [[230, 210, 9], [262, 196, 7], [290, 222, 6]]) body += `<path d="M${x - s} ${y - s * 0.3}Q${x - s * 0.4} ${y - s * 0.5} ${x} ${y}Q${x + s * 0.4} ${y - s * 0.5} ${x + s} ${y - s * 0.3}" fill="none" stroke="${fill}" stroke-width="2" stroke-linecap="round"/>`;
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
