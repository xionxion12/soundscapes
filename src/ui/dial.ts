// Circular sleep-timer dial: SVG ring around the orb, pointer-driven.
import { KNEE_MINUTES, MAX_MINUTES, minutesToFraction, pointerAngle, resolveDrag, snapMinutes } from './dialMath';
import { tick } from './haptics';

const R = 132;
const C = 150;
const SVG_NS = 'http://www.w3.org/2000/svg';

export interface DialOptions {
  svg: SVGSVGElement;
  onChange(minutes: number): void;
}

export class Dial {
  private svg: SVGSVGElement;
  private arc: SVGCircleElement;
  private thumb: SVGGElement;
  private ticks: SVGLineElement[] = [];
  private tickMinutes: number[] = [];
  private dragging = false;
  private minutes = 0;
  private opts: DialOptions;

  constructor(opts: DialOptions) {
    this.opts = opts;
    this.svg = opts.svg;
    this.arc = this.svg.querySelector('#arc')!;
    this.thumb = this.svg.querySelector('#thumb')!;
    this.buildTicks();
    this.svg.addEventListener('pointerdown', (e) => this.down(e));
    this.svg.addEventListener('pointermove', (e) => this.move(e));
    this.svg.addEventListener('pointerup', (e) => this.up(e));
    this.svg.addEventListener('pointercancel', (e) => this.up(e));
    this.svg.addEventListener('keydown', (e) => this.key(e));
  }

  private buildTicks() {
    const g = this.svg.querySelector('#ticks')!;
    const mins: number[] = [];
    for (let m = 5; m <= KNEE_MINUTES; m += 5) mins.push(m);
    for (let m = KNEE_MINUTES + 15; m <= MAX_MINUTES; m += 15) mins.push(m);
    for (const m of mins) {
      const a = minutesToFraction(m) * 2 * Math.PI;
      const major = m % 30 === 0 || m === KNEE_MINUTES;
      const r1 = R - 13;
      const r2 = R - (major ? 22 : 19);
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(C + r1 * Math.sin(a)));
      line.setAttribute('y1', String(C - r1 * Math.cos(a)));
      line.setAttribute('x2', String(C + r2 * Math.sin(a)));
      line.setAttribute('y2', String(C - r2 * Math.cos(a)));
      if (major) line.classList.add('major');
      g.append(line);
      this.ticks.push(line);
      this.tickMinutes.push(m);
    }
  }

  /**
   * Draw the ring. `setMinutes` is the chosen length (sets the sweep of the arc);
   * `fraction` is how much of that arc is still filled (1 when idle, shrinking while running).
   */
  render(setMinutes: number, fraction = 1) {
    this.minutes = setMinutes;
    const full = setMinutes > 0 ? minutesToFraction(setMinutes) : 1;
    const f = full * fraction;
    this.arc.style.strokeDasharray = `${Math.max(f, 0.0005)} 1`;
    this.arc.style.opacity = setMinutes > 0 && f <= 0.0005 ? '0' : '1';
    const a = (setMinutes > 0 ? f : 0) * 2 * Math.PI;
    this.thumb.setAttribute('transform', `translate(${C + R * Math.sin(a)} ${C - R * Math.cos(a)})`);
    const shownMinutes = setMinutes > 0 ? fractionToShown(f) : 0;
    this.ticks.forEach((t, i) => t.classList.toggle('on', setMinutes > 0 && this.tickMinutes[i]! <= shownMinutes));
    this.svg.setAttribute('aria-valuenow', String(setMinutes));
    this.svg.setAttribute('aria-valuetext', setMinutes > 0 ? `${setMinutes} minutes` : 'no timer');
  }

  private pointerPos(e: PointerEvent) {
    const r = this.svg.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const scale = r.width / 300;
    return { angle: pointerAngle(dx, dy), radius: Math.hypot(dx, dy) / scale };
  }

  private down(e: PointerEvent) {
    const { radius } = this.pointerPos(e);
    // only the ring (a generous band around it) starts a drag; the middle belongs to the orb
    if (radius < R - 38 || radius > R + 30) return;
    e.stopPropagation();
    e.preventDefault();
    this.dragging = true;
    this.svg.classList.add('dragging');
    this.svg.setPointerCapture(e.pointerId);
    this.apply(e);
  }

  private move(e: PointerEvent) {
    if (!this.dragging) return;
    e.preventDefault();
    this.apply(e);
  }

  private up(e: PointerEvent) {
    if (!this.dragging) return;
    this.dragging = false;
    this.svg.classList.remove('dragging');
    try {
      this.svg.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }

  private apply(e: PointerEvent) {
    const { angle } = this.pointerPos(e);
    const next = resolveDrag(this.minutes, angle);
    if (next !== this.minutes) {
      this.minutes = next;
      tick();
      this.opts.onChange(next);
    }
  }

  private key(e: KeyboardEvent) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const grid = [0, ...this.tickMinutes];
    const i = grid.indexOf(snapMinutes(this.minutes));
    const next = grid[Math.min(grid.length - 1, Math.max(0, i + step))]!;
    if (next !== this.minutes) {
      tick();
      this.opts.onChange(next);
    }
  }
}

/** Inverse of the arc fraction for tick highlighting (works on the nonlinear scale). */
function fractionToShown(f: number): number {
  // ticks sit at minutesToFraction(m); highlight those within the arc
  let lo = 0;
  let hi = MAX_MINUTES;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (minutesToFraction(mid) < f) lo = mid;
    else hi = mid;
  }
  return hi;
}
