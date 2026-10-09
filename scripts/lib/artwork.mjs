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
  } else if (theme === 'drizzle') {
    defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0f15"/><stop offset=".45" stop-color="#1b2430"/><stop offset=".75" stop-color="#141b24"/><stop offset="1" stop-color="#06080b"/></linearGradient><radialGradient id="li"><stop offset="0" stop-color="#e1e8f0" stop-opacity=".22"/><stop offset="1" stop-color="#e1e8f0" stop-opacity="0"/></radialGradient><radialGradient id="mi"><stop offset="0" stop-color="#aabed2" stop-opacity=".2"/><stop offset="1" stop-color="#aabed2" stop-opacity="0"/></radialGradient>`;
    body = `<rect width="${S}" height="${S}" fill="url(#bg)"/><ellipse cx="320" cy="150" rx="260" ry="120" fill="url(#li)"/>`;
    const ridgeD = (y, amp, seed) => {
      let d = `M0 512`;
      for (let x = 0; x <= S + 8; x += 8) { const u = x / S; d += `L${x} ${y - amp * (0.55 * Math.sin(u * 3.1 + seed) + 0.3 * Math.sin(u * 7.7 + seed * 2.3) + 0.15 * Math.abs(Math.sin(u * 19 + seed)))}`; }
      return d + `L${S} 512Z`;
    };
    body += `<path d="${ridgeD(215, 36, 1.3)}" fill="#202a36"/><ellipse cx="200" cy="250" rx="300" ry="40" fill="url(#mi)"/><path d="${ridgeD(266, 40, 4.1)}" fill="#18202a"/><ellipse cx="330" cy="300" rx="280" ry="36" fill="url(#mi)"/><path d="${ridgeD(322, 36, 2.2)}" fill="#10161d"/>`;
    for (let i = 0; i < 170; i++) { const x = r() * 560, y = r() * 512, z = 0.2 + r() * 0.8, len = 6 + z * 14; body += `<line x1="${x}" y1="${y}" x2="${x + len * 0.18}" y2="${y - len}" stroke="#c8d7e6" stroke-opacity="${0.08 + z * 0.22}" stroke-width="${0.6 + z * 0.9}" stroke-linecap="round"/>`; }
    const fill = '#07090c';
    body += `<path d="${ridgeD(410, 30, 5.4)}" fill="${fill}"/>`;
    const firSvg = (x, base, ht) => {
      let d = `M${x} ${base - ht}`, back = '';
      for (let i = 1; i <= 6; i++) { const k = i / 6, y = base - ht * (1 - k) - ht * 0.04, hf = ht * 0.2 * k; d += `L${x + hf} ${y}L${x + hf * 0.55} ${y - ht * 0.03}`; back = `L${x - hf * 0.55} ${y - ht * 0.03}L${x - hf} ${y}` + back; }
      return `<path d="${d}L${x + ht * 0.03} ${base}L${x - ht * 0.03} ${base}${back}Z" fill="${fill}"/>`;
    };
    for (const [x, ht] of [[30, 150], [66, 110], [102, 76], [400, 92], [440, 136], [482, 170]]) body += firSvg(x, 430, ht);
  } else if (theme === 'creek') {
    defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060818"/><stop offset=".35" stop-color="#151a3c"/><stop offset=".55" stop-color="#2b2a52"/><stop offset=".62" stop-color="#3a3358"/><stop offset="1" stop-color="#05060c"/></linearGradient>${glow('ve', '235,225,255')}${glow('st', '210,210,255')}${glow('ey', '255,200,110')}`;
    body = `<rect width="${S}" height="${S}" fill="url(#bg)"/>`;
    for (let i = 0; i < 50; i++) body += `<circle cx="${r() * S}" cy="${r() * 200}" r="${1 + r() * 3}" fill="url(#st)" opacity="${0.3 + r() * 0.5}"/>`;
    body += `<circle cx="150" cy="100" r="26" fill="url(#ve)"/>`;
    const fill = '#04050b';
    body += `<path d="M0 205L215 338L318 318L512 174V512H0Z" fill="#121430"/>`;
    body += `<path d="M0 256Q128 307 215 379L184 512H0Z M512 236Q400 307 307 369L369 512H512Z" fill="${fill}"/>`;
    const spruceSvg = (x, base, ht) => {
      let d = `M${x} ${base - ht}`, back = '';
      for (let i = 1; i <= 9; i++) { const k = i / 9, y = base - ht * (1 - k) * 0.94, hf = ht * 0.13 * k; d += `L${x + hf} ${y + ht * 0.012}L${x + hf * 0.4} ${y - ht * 0.02}`; back = `L${x - hf * 0.4} ${y - ht * 0.02}L${x - hf} ${y + ht * 0.012}` + back; }
      return `<path d="${d}L${x} ${base}${back}Z" fill="${fill}"/>`;
    };
    for (const [x, b, ht] of [[20, 270, 100], [70, 290, 90], [130, 320, 70], [180, 350, 50], [490, 250, 110], [440, 280, 90], [390, 310, 66], [345, 340, 48]]) body += spruceSvg(x, b, ht);
    // the creek winding towards us, with glints
    let L = '', R = '';
    const pts = [];
    for (let i = 0; i <= 23; i++) { const k = i / 23; pts.push([S * (0.52 + Math.sin(k * 3.4) * 0.08 * (0.3 + k)), S * (0.68 + k * 0.34), S * (0.015 + k * k * 0.16)]); }
    pts.forEach(([x, y, wd], i) => { L += `${i ? 'L' : 'M'}${x - wd} ${y}`; });
    for (let i = pts.length - 1; i >= 0; i--) R += `L${pts[i][0] + pts[i][2]} ${pts[i][1]}`;
    body += `<path d="${L}${R}Z" fill="#0d1230"/>`;
    for (let i = 0; i < 40; i++) { const k = r(), j = Math.min(22, Math.floor(k * 23)), [x, y, wd] = pts[j]; const len = wd * 0.5 * (0.4 + r() * 0.6); body += `<rect x="${x + (r() - 0.5) * 1.6 * wd - len / 2}" y="${y}" width="${len}" height="${1 + k * 2}" fill="#c8d2ff" opacity="${0.12 + k * 0.35}"/>`; }
    // the branch and the owl with its eyes open
    body += `<path d="M522 154Q440 169 358 161" fill="none" stroke="${fill}" stroke-width="6" stroke-linecap="round"/><path d="M410 165L379 138M461 161L440 184" stroke="${fill}" stroke-width="2.6" stroke-linecap="round"/>`;
    body += `<ellipse cx="404" cy="144" rx="11" ry="17.5" fill="${fill}"/><ellipse cx="404" cy="127" rx="9.6" ry="8.4" fill="${fill}"/><circle cx="400.5" cy="127" r="5" fill="url(#ey)"/><circle cx="407.5" cy="127" r="5" fill="url(#ey)"/>`;
  } else if (theme === 'valley') {
    defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120a22"/><stop offset=".28" stop-color="#3a1f3e"/><stop offset=".5" stop-color="#8a4552"/><stop offset=".62" stop-color="#c07060"/><stop offset="1" stop-color="#0b0610"/></linearGradient><radialGradient id="sun"><stop offset="0" stop-color="#ffcfa0" stop-opacity=".6"/><stop offset=".35" stop-color="#ff9a8c" stop-opacity=".25"/><stop offset="1" stop-color="#ff9a8c" stop-opacity="0"/></radialGradient><linearGradient id="sw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a3c48"/><stop offset="1" stop-color="#2a1424"/></linearGradient>${glow('la', '255,190,110')}${glow('sp', '255,215,190')}`;
    body = `<rect width="${S}" height="${S}" fill="url(#bg)"/><circle cx="195" cy="317" r="230" fill="url(#sun)"/>`;
    for (let i = 0; i < 5; i++) body += `<rect x="${r() * 300}" y="${150 + i * 26}" width="${150 + r() * 200}" height="${2 + r() * 3}" rx="2" fill="#ffbeaa" opacity="${0.08 + r() * 0.1}"/>`;
    // the hill with the chapel on its shoulder, cypresses beside it
    let d = 'M0 512';
    for (let x = 0; x <= S + 8; x += 8) d += `L${x} ${317 - 56 * Math.exp(-Math.pow((x / S - 0.68) / 0.22, 2)) - 10 * Math.sin((x / S) * 6)}`;
    body += `<path d="${d}L${S} 512Z" fill="#2a1424"/>`;
    const cx = 348, cy = 261, u = 11, ch = '#1a0c17';
    body += `<rect x="${cx - u * 1.6}" y="${cy - u * 1.6}" width="${u * 3.2}" height="${u * 1.7}" fill="${ch}"/><path d="M${cx - u * 1.8} ${cy - u * 1.55}L${cx} ${cy - u * 2.5}L${cx + u * 1.8} ${cy - u * 1.55}Z" fill="${ch}"/><rect x="${cx - u * 2.3}" y="${cy - u * 3.6}" width="${u * 0.8}" height="${u * 3.7}" fill="${ch}"/><path d="M${cx - u * 2.45} ${cy - u * 3.55}L${cx - u * 1.9} ${cy - u * 4.2}L${cx - u * 1.35} ${cy - u * 3.55}Z" fill="${ch}"/>`;
    body += `<circle cx="${cx + u * 0.5}" cy="${cy - u * 0.75}" r="9" fill="url(#la)"/>`;
    for (const [x, ht] of [[307, 36], [322, 25], [404, 30]]) body += `<path d="M${x} ${268 - ht}Q${x + ht * 0.16} ${268 - ht * 0.5} ${x + ht * 0.06} 270L${x - ht * 0.06} 270Q${x - ht * 0.16} ${268 - ht * 0.5} ${x} ${268 - ht}Z" fill="${ch}"/>`;
    const fill = '#0b0610';
    body += `<path d="M0 512V345Q128 336 256 342T512 340V512Z" fill="${fill}"/>`;
    let L = '', R = '';
    const pts = [];
    for (let i = 0; i <= 21; i++) { const k = i / 21; pts.push([S * (0.4 + Math.sin(k * 4.2 + 0.5) * 0.14 * (0.4 + k)), 317 + 31 + k * 205, S * (0.008 + k * k * 0.07)]); }
    pts.forEach(([x, y, wd], i) => { L += `${i ? 'L' : 'M'}${x - wd} ${y}`; });
    for (let i = pts.length - 1; i >= 0; i--) R += `L${pts[i][0] + pts[i][2]} ${pts[i][1]}`;
    body += `<path d="${L}${R}Z" fill="url(#sw)"/>`;
    for (let i = 0; i < 26; i++) { const k = r(), j = Math.min(20, Math.floor(k * 21)), [x, y, wd] = pts[j]; body += `<circle cx="${x + (r() - 0.5) * 1.8 * wd}" cy="${y}" r="${2 + k * 5}" fill="url(#sp)" opacity="${0.3 + r() * 0.5}"/>`; }
    for (let i = 0; i < 50; i++) { const x = r() * S, base = 478 + r() * 40, ht = 15 + r() * 32, bend = (r() - 0.5) * ht * 0.6; body += `<path d="M${x} ${base}Q${x + bend * 0.3} ${base - ht * 0.6} ${x + bend} ${base - ht}" fill="none" stroke="${fill}" stroke-width="${0.8 + r() * 0.8}" stroke-linecap="round"/>`; }
  } else if (theme === 'marsh') {
    defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0c1e"/><stop offset=".35" stop-color="#262c3e"/><stop offset=".58" stop-color="#4a5040"/><stop offset=".6" stop-color="#3a4034"/><stop offset=".8" stop-color="#1a1e22"/><stop offset="1" stop-color="#06070a"/></linearGradient>${glow('fr', '215,235,140')}<radialGradient id="mi"><stop offset="0" stop-color="#a0be96" stop-opacity=".22"/><stop offset="1" stop-color="#a0be96" stop-opacity="0"/></radialGradient>`;
    body = `<rect width="${S}" height="${S}" fill="url(#bg)"/>`;
    for (let i = 0; i < 20; i++) body += `<circle cx="${r() * S}" cy="${r() * 130}" r="${0.6 + r() * 1.2}" fill="#e2e6ff" opacity="${0.2 + r() * 0.3}"/>`;
    let bank = `M0 300`;
    for (let x = 0; x <= S + 8; x += 8) { const u = x / S, tree = Math.max(0, Math.sin(u * 23)) * 0.02 + (Math.abs(u - 0.3) < 0.015 || Math.abs(u - 0.72) < 0.012 ? 0.07 : 0); bank += `L${x} ${297 - S * (0.012 + tree + Math.abs(Math.sin(u * 61)) * 0.006)}`; }
    body += `<path d="${bank}L${S} 300Z" fill="#0a0c0c"/><ellipse cx="256" cy="300" rx="320" ry="40" fill="url(#mi)"/>`;
    for (let i = 0; i < 46; i++) { const x = r() * S, y = 299 + r() * 8, s = 4 + r() * 8; body += `<circle cx="${x}" cy="${y}" r="${s}" fill="url(#fr)" opacity="${0.3 + r() * 0.6}"/><ellipse cx="${x}" cy="${y + 12}" rx="${s * 0.7}" ry="${s * 1.2}" fill="url(#fr)" opacity="${0.12 + r() * 0.15}"/>`; }
    for (let i = 0; i < 2; i++) body += `<ellipse cx="290" cy="410" rx="${50 + i * 46}" ry="${11 + i * 10}" fill="none" stroke="#d2e08c" stroke-opacity="${0.3 - i * 0.12}" stroke-width="1.3"/>`;
    const fill = '#040506';
    for (let i = 0; i < 28; i++) {
      const left = i % 2 === 0, x = left ? r() * 140 : 372 + r() * 140, top = 256 + r() * 140, bend = (r() - 0.5) * 50;
      body += `<path d="M${x} 512Q${x + bend * 0.3} ${(512 + top) / 2} ${x + bend} ${top}" fill="none" stroke="${fill}" stroke-width="${1.6 + r() * 2}" stroke-linecap="round"/>`;
    }
    // the heron in the shallows
    const hx = 160, hy = 400, u = 40;
    body += `<path d="M${hx} ${hy}L${hx + u * 0.05} ${hy - u * 0.75}" stroke="${fill}" stroke-width="${u * 0.04}"/><ellipse cx="${hx + u * 0.05}" cy="${hy - u * 0.95}" rx="${u * 0.32}" ry="${u * 0.18}" transform="rotate(-20 ${hx + u * 0.05} ${hy - u * 0.95})" fill="${fill}"/><path d="M${hx + u * 0.3} ${hy - u * 1.05}Q${hx + u * 0.45} ${hy - u * 1.3} ${hx + u * 0.32} ${hy - u * 1.5}" fill="none" stroke="${fill}" stroke-width="${u * 0.07}" stroke-linecap="round"/><ellipse cx="${hx + u * 0.34}" cy="${hy - u * 1.55}" rx="${u * 0.08}" ry="${u * 0.06}" fill="${fill}"/><path d="M${hx + u * 0.4} ${hy - u * 1.55}L${hx + u * 0.62} ${hy - u * 1.5}" stroke="${fill}" stroke-width="${u * 0.03}" stroke-linecap="round"/>`;
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
