// Horizontal swipe between soundscapes. Listens on the whole app.

export interface CarouselOptions {
  root: HTMLElement;
  /** Elements in which a swipe must not start (e.g. the sheet). */
  ignore?: (target: EventTarget | null) => boolean;
  onSwipe(direction: 1 | -1): void;
}

const MIN_DISTANCE = 56;

export function setupCarousel({ root, ignore, onSwipe }: CarouselOptions): void {
  let start: { x: number; y: number; t: number; id: number } | null = null;
  let swallowClick = false;

  // a new touch means any click that follows belongs to it, not to the swipe that just ended
  window.addEventListener('pointerdown', () => (swallowClick = false), true);
  root.addEventListener('pointerdown', (e) => {
    if (ignore?.(e.target)) return;
    start = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId };
  });

  const end = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = e.timeStamp - start.t;
    start = null;
    if (e.type === 'pointerup' && Math.abs(dx) >= MIN_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 900) {
      swallowClick = true; // the browser still fires a click on the element we started on
      onSwipe(dx < 0 ? 1 : -1);
    }
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);

  root.addEventListener(
    'click',
    (e) => {
      if (swallowClick) {
        e.stopPropagation();
        e.preventDefault();
        swallowClick = false;
      }
    },
    true,
  );

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') onSwipe(-1);
    else if (e.key === 'ArrowRight') onSwipe(1);
  });
}
