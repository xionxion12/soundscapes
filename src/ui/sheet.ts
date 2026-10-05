// "About this recording" bottom sheet.
import type { Soundscape } from '../data/soundscapes';
import { asset } from '../data/soundscapes';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function when(sc: Soundscape): string {
  const { date, time } = sc.xc;
  if (!date) return 'Unknown';
  try {
    const d = new Date(`${date}T12:00:00`);
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return time ? `${label}, ${time}` : label;
  } catch {
    return date;
  }
}

export function sheetHtml(sc: Soundscape): string {
  const { xc } = sc;
  const species = [xc.scientific ? `<em>${esc(xc.scientific)}</em>` : '', xc.also.length ? `with ${esc(xc.also.slice(0, 4).join(', '))}` : '']
    .filter(Boolean)
    .join(' · ');
  return `
    <h2 id="sheet-title">${esc(sc.name)}</h2>
    <p class="sci">${esc(xc.species)}${species ? ` — ${species}` : ''}</p>
    <img class="sono" src="${asset(sc.sonogram)}" alt="Sonogram of the loop" width="640" height="92" />
    <p class="sono-cap">Sonogram of the loop · ${Math.round(sc.duration / 60)} min, 0–11 kHz</p>
    <dl>
      <dt>Recordist</dt><dd>${esc(xc.recordist)}</dd>
      <dt>Place</dt><dd>${esc([xc.location, xc.country].filter(Boolean).join(', '))}</dd>
      <dt>Recorded</dt><dd>${esc(when(sc))}</dd>
      <dt>Recording</dt><dd>XC${xc.id}</dd>
      <dt>License</dt><dd><a href="${esc(xc.licenseUrl)}" target="_blank" rel="noopener">${esc(xc.licenseName)}</a></dd>
    </dl>
    <a class="cta" href="${esc(xc.url)}" target="_blank" rel="noopener">Open on xeno-canto ↗</a>
    <p class="fine">${esc(sc.processing)}</p>`;
}

export function setupSheet(onClose?: () => void) {
  const root = document.getElementById('sheet')!;
  const panel = document.getElementById('sheet-panel')!;
  const body = document.getElementById('sheet-body')!;
  const grab = document.getElementById('sheet-grab')!;
  let isOpen = false;

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    root.classList.remove('open');
    panel.style.transform = '';
    setTimeout(() => {
      if (!isOpen) root.hidden = true;
    }, 400);
    onClose?.();
  };
  const open = (sc: Soundscape) => {
    body.innerHTML = sheetHtml(sc);
    root.hidden = false;
    void root.offsetHeight; // commit the hidden→visible state so the transition runs
    root.classList.add('open');
    isOpen = true;
  };

  document.getElementById('sheet-backdrop')!.addEventListener('click', close);
  window.addEventListener('keydown', (e) => e.key === 'Escape' && close());

  // drag the grab handle down to dismiss
  let startY = 0;
  let dy = 0;
  let dragging = false;
  grab.addEventListener('pointerdown', (e) => {
    dragging = true;
    startY = e.clientY;
    dy = 0;
    grab.setPointerCapture(e.pointerId);
    panel.style.transition = 'none';
  });
  grab.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - startY);
    panel.style.transform = `translateY(${dy}px)`;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = '';
    if (dy > 90) close();
    else panel.style.transform = '';
  };
  grab.addEventListener('pointerup', release);
  grab.addEventListener('pointercancel', release);

  return { open, close, get isOpen() { return isOpen; }, contains: (t: EventTarget | null) => t instanceof Node && root.contains(t) };
}
