// Angle <-> minutes mapping for the timer dial. Pure, unit-tested.
//
// The dial runs clockwise from 12 o'clock. The first 60% of the sweep covers
// 0–60 min (snapping to 5 min), the remaining 40% covers 60–180 min (snapping to 15).

export const MAX_MINUTES = 180;
export const KNEE_ANGLE = 0.6; // fraction of the sweep used for the first hour
export const KNEE_MINUTES = 60;
export const PRESETS = [0, 15, 30, 45, 60, 90] as const;

/** Raw (unsnapped) minutes for a fraction 0..1 of the full circle. */
export function fractionToMinutes(f: number): number {
  const c = Math.min(1, Math.max(0, f));
  return c <= KNEE_ANGLE
    ? (c / KNEE_ANGLE) * KNEE_MINUTES
    : KNEE_MINUTES + ((c - KNEE_ANGLE) / (1 - KNEE_ANGLE)) * (MAX_MINUTES - KNEE_MINUTES);
}

export function minutesToFraction(minutes: number): number {
  const m = Math.min(MAX_MINUTES, Math.max(0, minutes));
  return m <= KNEE_MINUTES
    ? (m / KNEE_MINUTES) * KNEE_ANGLE
    : KNEE_ANGLE + ((m - KNEE_MINUTES) / (MAX_MINUTES - KNEE_MINUTES)) * (1 - KNEE_ANGLE);
}

export function snapMinutes(m: number): number {
  if (m < 2.5) return 0; // ∞
  if (m < KNEE_MINUTES) return Math.max(5, Math.round(m / 5) * 5);
  return Math.min(MAX_MINUTES, Math.round(m / 15) * 15);
}

/** Pointer position relative to the dial centre → clockwise angle from 12 o'clock, 0..360. */
export function pointerAngle(dx: number, dy: number): number {
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Resolve a drag to minutes. When the pointer crosses 12 o'clock the value must not
 * wrap from 3 h straight to ∞ (or back): it sticks to the nearer end instead.
 */
export function resolveDrag(prevMinutes: number, angleDeg: number): number {
  const f = angleDeg / 360;
  const prevF = minutesToFraction(prevMinutes);
  // right at 12 o'clock "3 h" and "∞" are the same spot: keep whichever end we came from
  if (f < 0.004 || f > 0.996) return prevF > 0.5 ? MAX_MINUTES : 0;
  if (prevF > 0.75 && f < 0.25) return MAX_MINUTES;
  if (prevF < 0.25 && f > 0.75) return 0;
  return snapMinutes(fractionToMinutes(f));
}
