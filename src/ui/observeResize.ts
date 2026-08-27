/** Defer ResizeObserver work to the next frame (avoids WebKit loop warnings). */
export function observeResize(
  target: Element,
  onResize: () => void,
): () => void {
  let raf = 0;
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(onResize);
  };
  const ro = new ResizeObserver(schedule);
  ro.observe(target);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}

export function observeResizeMany(
  targets: readonly (Element | null | undefined)[],
  onResize: () => void,
): () => void {
  let raf = 0;
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(onResize);
  };
  const ro = new ResizeObserver(schedule);
  for (const el of targets) {
    if (el) ro.observe(el);
  }
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}

/** Known-benign WebKit/Chromium noise from nested layout in ResizeObserver. */
export function suppressBenignResizeObserverError(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (event) => {
    if (
      event.message?.includes(
        "ResizeObserver loop completed with undelivered notifications",
      )
    ) {
      event.stopImmediatePropagation();
    }
  });
}
