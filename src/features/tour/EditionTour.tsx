import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { getTourSteps } from "../../model/tour";
import {
  nextTourStep,
  prefs,
  prevTourStep,
  skipTour,
  tourActive,
  tourStepIndex,
} from "../../state/store";
import { t } from "../../i18n";
import { clampToViewport } from "../../ui/viewportClamp";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function EditionTour() {
  const active = tourActive.value;
  const index = tourStepIndex.value;
  const locale = prefs.value.locale === "en" ? "en" : "fr";
  const steps = getTourSteps(locale);
  const step = steps[index];
  const [spot, setSpot] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!active || !step?.target) {
      setSpot(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setSpot(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setSpot({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
  }, [active, index, step?.target, step?.view, step?.preview, step?.overlay]);

  useLayoutEffect(() => {
    if (!active || !spot) {
      setCardPos(null);
      return;
    }
    const card = cardRef.current;
    const pad = 12;
    const w = card?.offsetWidth ?? 352;
    const h = card?.offsetHeight ?? 220;
    const preferredTop = spot.top + spot.height + pad;
    const preferredLeft = spot.left;
    const { left, top } = clampToViewport(preferredLeft, preferredTop, w, h, pad);
    // If clamped onto the spotlight, prefer above the target when there is room.
    if (top < spot.top + spot.height && spot.top - h - pad >= pad) {
      setCardPos(
        clampToViewport(preferredLeft, spot.top - h - pad, w, h, pad),
      );
      return;
    }
    setCardPos({ left, top });
  }, [active, spot, index, step?.title, step?.body]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        skipTour();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        nextTourStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevTourStep();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (!active || !step) return null;

  const cardStyle = cardPos
    ? { top: cardPos.top, left: cardPos.left }
    : spot
      ? {
          top: Math.max(12, spot.top + spot.height + 12),
          left: Math.max(12, spot.left),
        }
      : { top: "30%", left: "50%", transform: "translateX(-50%)" };

  return (
    <div
      class="tour-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div class="tour-scrim" />
      {spot && (
        <div
          class="tour-spotlight"
          style={{
            top: spot.top - 6,
            left: spot.left - 6,
            width: spot.width + 12,
            height: spot.height + 12,
          }}
        />
      )}
      <div
        class="tour-card"
        ref={cardRef}
        style={cardStyle as Record<string, string | number>}
      >
        <p class="tour-card__step">
          {t("tourStepOf", { current: index + 1, total: steps.length })}
        </p>
        <h2 id="tour-title">{step.title}</h2>
        <p>{step.body}</p>
        <div class="tour-card__actions">
          <button
            type="button"
            class="btn btn--ghost btn--small"
            onClick={skipTour}
          >
            {t("tourSkip")}
          </button>
          <div class="field-row">
            <button
              type="button"
              class="btn btn--ghost btn--small"
              disabled={index === 0}
              onClick={prevTourStep}
            >
              {t("tourBack")}
            </button>
            <button
              type="button"
              class="btn btn--small"
              onClick={nextTourStep}
            >
              {index === steps.length - 1 ? t("tourFinish") : t("tourNext")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
