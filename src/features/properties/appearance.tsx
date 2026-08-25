import type { ComponentProps } from "preact";
import { FONT_OPTIONS, type Block, type BlockStyle } from "../../model/document";
import { Icon } from "../../ui/icons";

/** Minimal contract shared by the properties panel and the ribbon */
export interface AppearanceCtx {
  block: Block;
  setStyle: (patch: Partial<BlockStyle>) => void;
}

export function FontFamilySelect({
  ctx,
  id = "font-family",
  disabled,
}: {
  ctx: AppearanceCtx;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <label class="appearance-font" for={id}>
      <span class="sr-only">Font</span>
      <select
        id={id}
        disabled={disabled}
        value={ctx.block.style.fontFamily ?? ""}
        onChange={(e) =>
          ctx.setStyle({
            fontFamily:
              (e.currentTarget.value || undefined) as BlockStyle["fontFamily"],
          })
        }
      >
        <option value="">Default</option>
        {FONT_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SizeStepper({
  ctx,
  disabled,
}: {
  ctx: AppearanceCtx;
  disabled?: boolean;
}) {
  const size = ctx.block.style.fontSize ?? 14;
  const clamp = (v: number) => Math.min(72, Math.max(10, v));
  return (
    <div class="appearance-size" role="group" aria-label="Font size">
      <button
        type="button"
        class="btn btn--quiet btn--small"
        disabled={disabled}
        aria-label="Decrease font size"
        onClick={() => ctx.setStyle({ fontSize: clamp(size - 1) })}
      >
        −
      </button>
      <input
        type="number"
        disabled={disabled}
        aria-label="Font size"
        min={10}
        max={72}
        value={size}
        onInput={(e) =>
          ctx.setStyle({
            fontSize: clamp(Number(e.currentTarget.value) || 14),
          })
        }
      />
      <button
        type="button"
        class="btn btn--quiet btn--small"
        disabled={disabled}
        aria-label="Increase font size"
        onClick={() => ctx.setStyle({ fontSize: clamp(size + 1) })}
      >
        +
      </button>
    </div>
  );
}

export function BIUToggle({
  ctx,
  disabled,
}: {
  ctx: AppearanceCtx;
  disabled?: boolean;
}) {
  const s = ctx.block.style;
  const bold = Number(s.fontWeight) >= 600;
  const italic = s.fontStyle === "italic";
  const under = s.textDecoration === "underline";
  return (
    <div class="appearance-biu" role="group" aria-label="Type emphasis">
      <button
        type="button"
        class="btn btn--small"
        disabled={disabled}
        aria-pressed={bold}
        aria-label="Bold"
        title="Bold"
        onClick={() => ctx.setStyle({ fontWeight: bold ? 400 : 700 })}
      >
        <Icon name="bold" />
      </button>
      <button
        type="button"
        class="btn btn--small"
        disabled={disabled}
        aria-pressed={italic}
        aria-label="Italic"
        title="Italic"
        onClick={() =>
          ctx.setStyle({ fontStyle: italic ? "normal" : "italic" })
        }
      >
        <Icon name="italic" />
      </button>
      <button
        type="button"
        class="btn btn--small"
        disabled={disabled}
        aria-pressed={under}
        aria-label="Underline"
        title="Underline"
        onClick={() =>
          ctx.setStyle({
            textDecoration: under ? "none" : "underline",
          })
        }
      >
        <Icon name="underline" />
      </button>
    </div>
  );
}

const LINE_HEIGHTS: [string, string][] = [
  ["1", "Single"],
  ["1.15", "1.15"],
  ["1.4", "1.4"],
  ["1.8", "1.8"],
  ["2.2", "Double"],
];

export function LineHeightSelect({
  ctx,
  disabled,
}: {
  ctx: AppearanceCtx;
  disabled?: boolean;
}) {
  return (
    <select
      disabled={disabled}
      aria-label="Line spacing"
      value={String(ctx.block.style.lineHeight ?? "1.4")}
      onChange={(e) =>
        ctx.setStyle({ lineHeight: Number(e.currentTarget.value) })
      }
    >
      {LINE_HEIGHTS.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function TextColorSwatch({
  ctx,
  disabled,
}: {
  ctx: AppearanceCtx;
  disabled?: boolean;
}) {
  return (
    <label class="appearance-swatch" title="Text color">
      <span class="sr-only">Text color</span>
      <input
        type="color"
        disabled={disabled}
        value={ctx.block.style.color ?? "#2a2622"}
        onInput={(e) => ctx.setStyle({ color: e.currentTarget.value })}
      />
    </label>
  );
}

export function TransformSelect({
  ctx,
  disabled,
}: {
  ctx: AppearanceCtx;
  disabled?: boolean;
}) {
  return (
    <select
      disabled={disabled}
      aria-label="Letter case"
      value={ctx.block.style.textTransform ?? "none"}
      onChange={(e) =>
        ctx.setStyle({
          textTransform: e.currentTarget.value as BlockStyle["textTransform"],
        })
      }
    >
      <option value="none">Aa</option>
      <option value="uppercase">AA</option>
      <option value="lowercase">aa</option>
      <option value="capitalize">Ab</option>
    </select>
  );
}

const ALIGNS: {
  v: "left" | "center" | "right";
  icon: ComponentProps<typeof Icon>["name"];
  label: string;
}[] = [
    { v: "left", icon: "alignTextLeft", label: "Align left" },
    { v: "center", icon: "alignTextCenter", label: "Align center" },
    { v: "right", icon: "alignTextRight", label: "Align right" },
  ];

export function AlignPicker({
  ctx,
  disabled,
}: {
  ctx: AppearanceCtx;
  disabled?: boolean;
}) {
  return (
    <div class="appearance-align" role="group" aria-label="Alignment">
      {ALIGNS.map((a) => (
        <button
          key={a.v}
          type="button"
          class="btn btn--small"
          disabled={disabled}
          aria-pressed={(ctx.block.style.textAlign ?? "left") === a.v}
          aria-label={a.label}
          title={a.label}
          onClick={() => ctx.setStyle({ textAlign: a.v })}
        >
          <Icon name={a.icon} />
        </button>
      ))}
    </div>
  );
}

export function ClearFormatButton({ ctx }: { ctx: AppearanceCtx }) {
  return (
    <button
      type="button"
      class="btn btn--ghost btn--small"
      title="Clear formatting"
      onClick={() => ctx.setStyle({ ...emptyStyle() })}
    >
      Clear format
    </button>
  );
}

function emptyStyle(): Partial<BlockStyle> {
  return {
    fontFamily: undefined,
    fontSize: undefined,
    fontWeight: undefined,
    fontStyle: undefined,
    textDecoration: undefined,
    color: undefined,
    textAlign: undefined,
    textIndent: undefined,
    lineHeight: undefined,
    letterSpacing: undefined,
    textTransform: undefined,
    verticalAlign: undefined,
    shadow: undefined,
    background: undefined,
    borderRadius: undefined,
    borderColor: undefined,
    borderWidth: undefined,
    opacity: undefined,
    padding: undefined,
  };
}
