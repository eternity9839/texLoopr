import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { PageMargins } from "../../model/document";
import { px } from "../../model/geometry";
import { observeResizeMany } from "../../ui/observeResize";
import {
  formatRulerHover,
  type RulerUnit,
} from "../../model/rulerUnits";

type MarginSide = keyof PageMargins;

interface PageOrigin {
  x: number;
  y: number;
}

interface HoverState {
  axis: "x" | "y";
  along: number;
  pagePx: number;
}

export interface EditorRulersProps {
  scrollRef: { current: HTMLDivElement | null };
  pageW: number;
  pageH: number;
  scale: number;
  margins: PageMargins;
  unit: RulerUnit;
  onMarginsChange: (patch: Partial<PageMargins>) => void;
}

function measureOrigin(scroll: HTMLElement, page: Element): PageOrigin {
  const sr = scroll.getBoundingClientRect();
  const pr = page.getBoundingClientRect();
  return { x: pr.left - sr.left, y: pr.top - sr.top };
}

/** Tick spacing in CSS px so marks track canvas zoom. */
export function rulerTickPeriod(scale: number): number {
  return Math.max(4, 8 * scale);
}

function clampSide(
  side: MarginSide,
  value: number,
  pageW: number,
  pageH: number,
  margins: PageMargins,
): number {
  const v = px(Math.max(0, value));
  if (side === "left") return Math.min(v, pageW - margins.right - 1);
  if (side === "right") return Math.min(v, pageW - margins.left - 1);
  if (side === "top") return Math.min(v, pageH - margins.bottom - 1);
  return Math.min(v, pageH - margins.top - 1);
}

export function EditorRulers({
  scrollRef,
  pageW,
  pageH,
  scale,
  margins,
  unit,
  onMarginsChange,
}: EditorRulersProps) {
  const [origin, setOrigin] = useState<PageOrigin>({ x: 0, y: 0 });
  const [hover, setHover] = useState<HoverState | null>(null);
  const dragRef = useRef<{
    side: MarginSide;
    pointerId: number;
  } | null>(null);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    let raf = 0;
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const page = scroll.querySelector(
          ".editor-page--active, .editor-page",
        );
        if (!page) return;
        setOrigin(measureOrigin(scroll, page));
      });
    };

    sync();
    scroll.addEventListener("scroll", sync, { passive: true });
    const fit = scroll.querySelector(".editor-fit");
    const page = scroll.querySelector(".editor-page--active, .editor-page");
    const stopResize = observeResizeMany([scroll, fit, page], sync);
    window.addEventListener("resize", sync);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);

    return () => {
      cancelAnimationFrame(raf);
      scroll.removeEventListener("scroll", sync);
      stopResize();
      window.removeEventListener("resize", sync);
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
    };
  }, [scrollRef, pageW, pageH, scale, margins]);

  const readOrigin = (): PageOrigin => {
    const scroll = scrollRef.current;
    if (!scroll) return origin;
    const page = scroll.querySelector(".editor-page--active, .editor-page");
    if (!page) return origin;
    return measureOrigin(scroll, page);
  };

  const pagePxFromClient = (
    axis: "x" | "y",
    client: number,
    o: PageOrigin,
  ): number => {
    const scroll = scrollRef.current;
    if (!scroll) return 0;
    const sr = scroll.getBoundingClientRect();
    if (axis === "x") return (client - sr.left - o.x) / scale;
    return (client - sr.top - o.y) / scale;
  };

  const onRulerMove = (
    axis: "x" | "y",
    e: JSX.TargetedPointerEvent<HTMLDivElement>,
  ) => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const o = readOrigin();
    const sr = scroll.getBoundingClientRect();
    const along = axis === "x" ? e.clientX - sr.left : e.clientY - sr.top;
    const pagePx = pagePxFromClient(
      axis,
      axis === "x" ? e.clientX : e.clientY,
      o,
    );
    setHover({ axis, along, pagePx });
  };

  const onFlagDown = (
    side: MarginSide,
    e: JSX.TargetedPointerEvent<HTMLSpanElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { side, pointerId: e.pointerId };
  };

  const onFlagMove = (e: JSX.TargetedPointerEvent<HTMLSpanElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const axis = drag.side === "left" || drag.side === "right" ? "x" : "y";
    const o = readOrigin();
    const pagePx = pagePxFromClient(
      axis,
      axis === "x" ? e.clientX : e.clientY,
      o,
    );
    let next = 0;
    if (drag.side === "left") next = pagePx;
    else if (drag.side === "right") next = pageW - pagePx;
    else if (drag.side === "top") next = pagePx;
    else next = pageH - pagePx;
    onMarginsChange({
      [drag.side]: clampSide(drag.side, next, pageW, pageH, margins),
    });
  };

  const onFlagUp = (e: JSX.TargetedPointerEvent<HTMLSpanElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
    }
  };

  const leftFlag = origin.x + margins.left * scale;
  const rightFlag = origin.x + (pageW - margins.right) * scale;
  const topFlag = origin.y + margins.top * scale;
  const bottomFlag = origin.y + (pageH - margins.bottom) * scale;
  const tickPeriod = rulerTickPeriod(scale);
  const tickStyle = {
    "--ruler-tick-period": `${tickPeriod}px`,
    "--ruler-origin-x": `${origin.x}px`,
    "--ruler-origin-y": `${origin.y}px`,
  } as JSX.CSSProperties;

  return (
    <>
      <div class="editor-ruler editor-ruler--corner" aria-hidden="true">
        <span class="editor-ruler__unit">{unit}</span>
      </div>
      <div
        class="editor-ruler editor-ruler--x"
        style={tickStyle}
        onPointerMove={(e) => onRulerMove("x", e)}
        onPointerLeave={() => setHover(null)}
      >
        <span
          class="editor-ruler__flag editor-ruler__flag--x"
          style={{ left: `${leftFlag}px` }}
          title={`Left margin · ${formatRulerHover(margins.left, unit)}`}
          onPointerDown={(e) => onFlagDown("left", e)}
          onPointerMove={onFlagMove}
          onPointerUp={onFlagUp}
        />
        <span
          class="editor-ruler__flag editor-ruler__flag--x"
          style={{ left: `${rightFlag}px` }}
          title={`Right margin · ${formatRulerHover(margins.right, unit)}`}
          onPointerDown={(e) => onFlagDown("right", e)}
          onPointerMove={onFlagMove}
          onPointerUp={onFlagUp}
        />
        {hover?.axis === "x" && (
          <span
            class="editor-ruler__readout"
            style={{ left: `${hover.along}px` }}
          >
            {formatRulerHover(hover.pagePx, unit)}
          </span>
        )}
      </div>
      <div
        class="editor-ruler editor-ruler--y"
        style={tickStyle}
        onPointerMove={(e) => onRulerMove("y", e)}
        onPointerLeave={() => setHover(null)}
      >
        <span
          class="editor-ruler__flag editor-ruler__flag--y"
          style={{ top: `${topFlag}px` }}
          title={`Top margin · ${formatRulerHover(margins.top, unit)}`}
          onPointerDown={(e) => onFlagDown("top", e)}
          onPointerMove={onFlagMove}
          onPointerUp={onFlagUp}
        />
        <span
          class="editor-ruler__flag editor-ruler__flag--y"
          style={{ top: `${bottomFlag}px` }}
          title={`Bottom margin · ${formatRulerHover(margins.bottom, unit)}`}
          onPointerDown={(e) => onFlagDown("bottom", e)}
          onPointerMove={onFlagMove}
          onPointerUp={onFlagUp}
        />
        {hover?.axis === "y" && (
          <span
            class="editor-ruler__readout editor-ruler__readout--y"
            style={{ top: `${hover.along}px` }}
          >
            {formatRulerHover(hover.pagePx, unit)}
          </span>
        )}
      </div>
    </>
  );
}
