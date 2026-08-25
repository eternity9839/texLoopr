import { useEffect, useLayoutEffect, useState } from "preact/hooks";
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

  const cardStyle = spot
    ? {
        top: Math.min(
          window.innerHeight - 220,
          Math.max(12, spot.top + spot.height + 12),
        ),
        left: Math.min(window.innerWidth - 360, Math.max(12, spot.left)),
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
