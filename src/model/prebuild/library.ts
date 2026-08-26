import type { Block } from "../document";
import { createId } from "../document";

export interface PrebuildRecipe {
  id: string;
  label: string;
  blurb: string;
  /** Outer size hint for placement cascade */
  w: number;
  h: number;
  build: (origin: { x: number; y: number }) => Block[];
}

function text(
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  body: string,
  style: Block["style"] = {},
): Block {
  return {
    id: createId(),
    type: "text",
    name,
    x,
    y,
    w,
    h,
    content: { text: body },
    style: { fontSize: 12, color: "#2a2622", ...style },
    zIndex: 1,
  };
}

function shape(
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  bg: string,
): Block {
  return {
    id: createId(),
    type: "shape",
    name,
    x,
    y,
    w,
    h,
    content: { shape: "rect" },
    style: { background: bg },
    zIndex: 0,
  };
}

export const PREBUILD_RECIPES: PrebuildRecipe[] = [
  {
    id: "header",
    label: "Letterhead",
    blurb: "Logo line, org name, rule",
    w: 640,
    h: 72,
    build: ({ x, y }) => [
      text("Org", x, y, 280, 28, "{{company|default:Your Company}}", {
        fontSize: 16,
        fontWeight: 700,
      }),
      text(
        "Contact",
        x + 360,
        y,
        280,
        40,
        "{{author|default:Author}}\n{{contactEmail|default:hello@example.com}}",
        { fontSize: 10, color: "#5c6570", textAlign: "right" },
      ),
      shape("Rule", x, y + 52, 640, 3, "#0f6b63"),
    ],
  },
  {
    id: "address",
    label: "Address block",
    blurb: "Recipient merge fields",
    w: 280,
    h: 72,
    build: ({ x, y }) => [
      text(
        "Recipient",
        x,
        y,
        280,
        72,
        "{{title}} {{name}}\n{{company}}\n{{address|default:}}",
        { fontSize: 12 },
      ),
    ],
  },
  {
    id: "signature",
    label: "Signature",
    blurb: "Sign-here field + closing",
    w: 240,
    h: 120,
    build: ({ x, y }) => [
      text("Closing", x, y, 240, 24, "Kind regards,", { fontSize: 12 }),
      {
        id: createId(),
        type: "signature" as const,
        name: "Signature",
        x,
        y: y + 28,
        w: 220,
        h: 88,
        content: {
          src: "",
          label: "Authorized signature",
          caption: "{{name|default:Name}}\n{{role}}",
          showLine: true,
        },
        style: { fontSize: 11, color: "#5c6570", fontFamily: "ui" as const },
        zIndex: 1,
      },
    ],
  },
  {
    id: "footer",
    label: "Footer",
    blurb: "Confidential line + page meta",
    w: 640,
    h: 36,
    build: ({ x, y }) => [
      shape("Rule", x, y, 640, 1, "#c8c2b8"),
      text(
        "Footer",
        x,
        y + 8,
        640,
        24,
        "{{#if confidential}}CONFIDENTIAL — {{/if}}{{subject|default:Document}} · {{version|default:1.0}}",
        { fontSize: 9, color: "#5c6570", textAlign: "center" },
      ),
    ],
  },
];

export function getPrebuildRecipe(id: string): PrebuildRecipe | undefined {
  return PREBUILD_RECIPES.find((r) => r.id === id);
}

/** Expand a recipe into page blocks at origin (ADR 0008). */
export function expandPrebuild(
  recipeId: string,
  origin: { x: number; y: number },
): Block[] {
  const recipe = getPrebuildRecipe(recipeId) ?? PREBUILD_RECIPES[0];
  return recipe.build(origin);
}
