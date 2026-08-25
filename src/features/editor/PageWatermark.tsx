import type { Watermark } from "../../model/document";

/** Renders page watermark (text or image) with layout/layer modes. */
export function PageWatermark({
  watermark,
  pageW,
  pageH,
}: {
  watermark: Watermark;
  pageW: number;
  pageH: number;
}) {
  const layout = watermark.layout ?? "centered";
  const layer = watermark.layer ?? "behind";
  const opacity = watermark.opacity ?? 0.12;
  const angle = watermark.angle ?? -30;
  const color = watermark.color ?? "#334155";
  const src = String(watermark.src ?? "").trim();
  const text =
    watermark.kind && watermark.kind !== "text"
      ? watermark.kind.toUpperCase()
      : watermark.text || "";

  const zClass =
    layer === "front" ? "page-watermark page-watermark--front" : "page-watermark";

  if (layout === "repeated") {
    const tile = src
      ? `url("${src.replace(/"/g, '\\"')}")`
      : undefined;
    return (
      <div
        class={`${zClass} page-watermark--repeated`}
        aria-hidden="true"
        style={{
          opacity: String(opacity),
          backgroundImage: tile,
          backgroundSize: `${Math.round((watermark.scale ?? 0.35) * pageW)}px`,
          transform: `rotate(${angle}deg) scale(1.35)`,
          color,
          fontSize: `${watermark.fontSize ?? 48}px`,
        }}
      >
        {!src && (
          <div class="page-watermark__tile-text">
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i}>{text || "DRAFT"}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (layout === "diffuse") {
    const spots = [
      { x: 18, y: 22 },
      { x: 62, y: 38 },
      { x: 30, y: 68 },
      { x: 72, y: 78 },
      { x: 48, y: 50 },
    ];
    return (
      <div class={`${zClass} page-watermark--diffuse`} aria-hidden="true">
        {spots.map((s, i) => (
          <div
            key={i}
            class="page-watermark__spot"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              opacity: String(opacity * (0.55 + (i % 3) * 0.15)),
              transform: `translate(-50%, -50%) rotate(${angle + i * 12}deg)`,
              color,
              fontSize: `${(watermark.fontSize ?? 72) * (0.55 + (i % 3) * 0.12)}px`,
            }}
          >
            {src ? (
              <img
                src={src}
                alt=""
                style={{
                  width: `${Math.round((watermark.scale ?? 0.3) * pageW)}px`,
                  height: "auto",
                }}
              />
            ) : (
              text || "DRAFT"
            )}
          </div>
        ))}
      </div>
    );
  }

  // centered
  return (
    <div
      class={zClass}
      aria-hidden="true"
      style={{
        transform: `rotate(${angle}deg)`,
        opacity: String(opacity),
        color,
        fontSize: src ? undefined : `${watermark.fontSize ?? 96}px`,
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          style={{
            width: `${Math.round((watermark.scale ?? 0.45) * Math.min(pageW, pageH))}px`,
            height: "auto",
            maxHeight: `${pageH * 0.7}px`,
          }}
        />
      ) : (
        text
      )}
    </div>
  );
}
