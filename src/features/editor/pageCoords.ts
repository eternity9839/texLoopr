/** Map pointer events to logical page coordinates (CSS px). */

export function pageCoordsFromEvent(
  pageEl: Element,
  e: MouseEvent,
  step: number | null,
  scale: number,
): { x: number; y: number } {
  const rect = pageEl.getBoundingClientRect();
  const k = scale || 1;
  let x = Math.max(0, (e.clientX - rect.left) / k);
  let y = Math.max(0, (e.clientY - rect.top) / k);
  if (step != null && step > 1) {
    x = Math.round(x / step) * step;
    y = Math.round(y / step) * step;
  }
  return { x, y };
}
