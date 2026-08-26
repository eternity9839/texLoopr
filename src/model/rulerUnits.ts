/** Ruler display units. Document geometry stays in CSS px (96dpi). */

export type RulerUnit = "px" | "mm" | "cm" | "in";

export const RULER_UNITS: readonly RulerUnit[] = ["px", "mm", "cm", "in"];

/** CSS reference: 1in = 96px */
export const CSS_PX_PER_IN = 96;

export function isRulerUnit(v: unknown): v is RulerUnit {
  return v === "px" || v === "mm" || v === "cm" || v === "in";
}

export function pxToUnit(px: number, unit: RulerUnit): number {
  if (!Number.isFinite(px)) return 0;
  switch (unit) {
    case "px":
      return px;
    case "in":
      return px / CSS_PX_PER_IN;
    case "cm":
      return (px / CSS_PX_PER_IN) * 2.54;
    case "mm":
      return (px / CSS_PX_PER_IN) * 25.4;
  }
}

export function unitToPx(value: number, unit: RulerUnit): number {
  if (!Number.isFinite(value)) return 0;
  switch (unit) {
    case "px":
      return value;
    case "in":
      return value * CSS_PX_PER_IN;
    case "cm":
      return (value / 2.54) * CSS_PX_PER_IN;
    case "mm":
      return (value / 25.4) * CSS_PX_PER_IN;
  }
}

export function formatUnitValue(px: number, unit: RulerUnit): string {
  const v = pxToUnit(px, unit);
  if (unit === "px") return `${Math.round(v)} px`;
  const digits = unit === "mm" ? 1 : 2;
  return `${v.toFixed(digits)} ${unit}`;
}

/** Hover chip: always pixels, plus preferred metric when not px. */
export function formatRulerHover(px: number, unit: RulerUnit): string {
  const rounded = Math.round(px);
  if (unit === "px") return `${rounded} px`;
  return `${rounded} px · ${formatUnitValue(px, unit)}`;
}

export function rulerUnitLabel(unit: RulerUnit): string {
  switch (unit) {
    case "px":
      return "Pixels (px)";
    case "mm":
      return "Millimetres (mm)";
    case "cm":
      return "Centimetres (cm)";
    case "in":
      return "Inches (in)";
  }
}
