import type { Block, CustomObject } from "../../document";
import type { ProjectCondition } from "../../documentConditions";
import { b, id } from "../helpers";
import { customObjectFromGroup } from "../../groups";

export const RESUME_X = 48;
export const RESUME_W = 618;
export const RESUME_PAGE_H = 1010;
export const RESUME_CONTENT_X = 16;
export const RESUME_PILL_W = 148;
export const RESUME_INK = "#14231c";
export const RESUME_MUTED = "#5c7468";
export const RESUME_RULE = "#c5d4cb";

export type SkillTier = "expert" | "proficient" | "working";

export type SkillItem = { name: string; tier: SkillTier };

export type SkillCategory = {
  label: string;
  items: SkillItem[];
};

export type ResumePalette = {
  id: string;
  accent: string;
  deep: string;
  soft: string;
  mid: string;
  pill: string;
  wash: string;
};

export const RESUME_PALETTES: Record<string, ResumePalette> = {
  teal: {
    id: "teal",
    accent: "#006e46",
    deep: "#004d32",
    soft: "#e8f3ed",
    mid: "#b7d4c4",
    pill: "#d7ebe0",
    wash: "#f3f8f5",
  },
  blue: {
    id: "blue",
    accent: "#1d5fbf",
    deep: "#123d7a",
    soft: "#e8f0fb",
    mid: "#b8cce8",
    pill: "#d6e4f7",
    wash: "#f2f6fc",
  },
  coral: {
    id: "coral",
    accent: "#c45c26",
    deep: "#8a3d18",
    soft: "#faf0ea",
    mid: "#e8c4ad",
    pill: "#f3ddd0",
    wash: "#fbf6f2",
  },
  forest: {
    id: "forest",
    accent: "#0f6b63",
    deep: "#0a4a44",
    soft: "#e8f3f2",
    mid: "#b7d4d0",
    pill: "#d7ebe8",
    wash: "#f3f8f7",
  },
  slate: {
    id: "slate",
    accent: "#3d4f5f",
    deep: "#243240",
    soft: "#eef1f4",
    mid: "#c5ced6",
    pill: "#dde3e8",
    wash: "#f5f7f9",
  },
};

export const RESUME_PALETTE_IDS = Object.keys(RESUME_PALETTES);

export function resumePalette(id: string): ResumePalette {
  return RESUME_PALETTES[id] ?? RESUME_PALETTES.teal;
}

export function resumePaletteCondition(): ProjectCondition {
  return {
    id: id(),
    name: "Palette",
    var: "palette",
    rowKeys: ["palette"],
    default: "teal",
    values: RESUME_PALETTE_IDS.map((value) => ({
      label: value,
      value,
    })),
  };
}

/** Emit one block per palette (condition vars.palette == id). */
export function paletteVariants<T extends Block>(
  factory: (palette: ResumePalette) => T,
): Block[] {
  return RESUME_PALETTE_IDS.flatMap((pid) => {
    const block = factory(resumePalette(pid));
    return [{ ...block, condition: `vars.palette == '${pid}'` }];
  });
}

function chipWidth(label: string): number {
  return Math.max(44, Math.round(label.length * 6.4 + 18));
}

function tierStyle(tier: SkillTier, palette: ResumePalette) {
  if (tier === "expert") {
    return {
      bg: palette.accent,
      color: "#ffffff",
      border: palette.accent,
      weight: 700,
      borderWidth: 0,
    };
  }
  if (tier === "proficient") {
    return {
      bg: palette.pill,
      color: palette.deep,
      border: palette.mid,
      weight: 600,
      borderWidth: 0,
    };
  }
  return {
    bg: "#ffffff",
    color: RESUME_MUTED,
    border: RESUME_RULE,
    weight: 500,
    borderWidth: 1,
  };
}

export function skillChipBlocks(
  x: number,
  y: number,
  item: SkillItem,
  palette: ResumePalette,
): Block[] {
  const tier = tierStyle(item.tier, palette);
  const w = chipWidth(item.name);
  return [
    b("shape", {
      name: `Skill chip ${item.name}`,
      x,
      y,
      w,
      h: 22,
      content: { shape: "rect", variant: "rounded", filled: true },
      style: {
        background: tier.bg,
        borderWidth: tier.borderWidth,
        borderColor: tier.border,
        borderRadius: 11,
      },
      zIndex: 1,
    }),
    b("text", {
      name: `Skill chip label ${item.name}`,
      x,
      y,
      w,
      h: 22,
      content: { text: item.name },
      style: {
        fontFamily: "ui",
        fontSize: 9,
        fontWeight: tier.weight,
        color: tier.color,
        textAlign: "center",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      },
      zIndex: 2,
    }),
  ];
}

export function skillLegendBlocks(y: number, palette: ResumePalette): Block[] {
  const tiers: { tier: SkillTier; label: string }[] = [
    { tier: "expert", label: "Expert" },
    { tier: "proficient", label: "Proficient" },
    { tier: "working", label: "Exposure" },
  ];
  const blocks: Block[] = [];
  let x = RESUME_X + RESUME_W - 280;
  for (const { tier, label } of tiers) {
    blocks.push(...skillChipBlocks(x, y, { name: label, tier }, palette));
    x += chipWidth(label) + 8;
  }
  return blocks;
}

export function skillCategoryRow(
  y: number,
  category: SkillCategory,
  palette: ResumePalette,
): { blocks: Block[]; h: number } {
  const labelW = 118;
  const chipGap = 6;
  const rowGap = 6;
  const chipAreaX = labelW + 10;
  const chipAreaW = RESUME_W - chipAreaX - 8;
  let cx = chipAreaX;
  let cy = 6;
  let rowMaxH = 22;
  const chips: Block[] = [];

  for (const item of category.items) {
    const w = chipWidth(item.name);
    if (cx + w > chipAreaX + chipAreaW && cx > chipAreaX) {
      cx = chipAreaX;
      cy += rowMaxH + rowGap;
      rowMaxH = 22;
    }
    chips.push(...skillChipBlocks(cx, cy, item, palette));
    cx += w + chipGap;
    rowMaxH = Math.max(rowMaxH, 22);
  }

  const innerH = Math.max(34, cy + rowMaxH + 6);
  const blocks: Block[] = [
    b("shape", {
      name: `${category.label} skill wash`,
      x: 0,
      y: 0,
      w: RESUME_W,
      h: innerH,
      content: { shape: "rect", filled: true },
      style: {
        background: palette.wash,
        borderWidth: 1,
        borderColor: palette.pill,
        borderRadius: 4,
      },
      zIndex: 0,
    }),
    b("text", {
      name: `${category.label} label`,
      x: 10,
      y: 0,
      w: labelW,
      h: innerH,
      content: { text: category.label },
      style: {
        fontFamily: "ui",
        fontSize: 10,
        fontWeight: 700,
        color: palette.deep,
        verticalAlign: "middle",
      },
      zIndex: 1,
    }),
    ...chips,
  ];

  return {
    blocks: [
      {
        id: id(),
        type: "group",
        name: `Skills · ${category.label}`,
        x: RESUME_X,
        y,
        w: RESUME_W,
        h: innerH,
        content: { blocks },
        style: {},
        zIndex: 1,
      },
    ],
    h: innerH,
  };
}

export function layoutSkillCategories(
  startY: number,
  categories: SkillCategory[],
  palette: ResumePalette,
  gap = 6,
): Block[] {
  const blocks: Block[] = [];
  let y = startY;
  for (const cat of categories) {
    const row = skillCategoryRow(y, cat, palette);
    blocks.push(...row.blocks);
    y += row.h + gap;
  }
  return blocks;
}

export function resumeSection(label: string, y: number, palette: ResumePalette): Block[] {
  return [
    b("shape", {
      name: `Accent ${label}`,
      x: RESUME_X,
      y: y + 3,
      w: 9,
      h: 9,
      content: { shape: "rect", variant: "rounded", filled: true },
      style: { background: palette.accent, borderRadius: 2 },
    }),
    b("text", {
      name: `H ${label}`,
      x: RESUME_X + 16,
      y,
      w: RESUME_W - 16,
      h: 16,
      content: { text: label },
      style: {
        fontFamily: "ui",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1.8,
        color: palette.accent,
      },
    }),
    b("shape", {
      name: `Rule ${label}`,
      x: RESUME_X,
      y: y + 18,
      w: RESUME_W,
      h: 2,
      content: { shape: "rect", filled: true },
      style: { background: palette.accent },
    }),
  ];
}

export function resumeAccentBar(palette: ResumePalette): Block[] {
  return [
    b("shape", {
      name: "Accent bar",
      x: 0,
      y: 0,
      w: 12,
      h: RESUME_PAGE_H,
      content: { shape: "rect", filled: true },
      style: { background: palette.accent },
      zIndex: 0,
      pin: { left: true, top: true, bottom: true },
    }),
    b("shape", {
      name: "Accent soft",
      x: 12,
      y: 0,
      w: 4,
      h: RESUME_PAGE_H,
      content: { shape: "rect", filled: true },
      style: { background: palette.mid, opacity: 0.55 },
      zIndex: 0,
      pin: { left: true, top: true, bottom: true },
    }),
  ];
}

export function resumeFooter(label: string): Block[] {
  return [
    b("shape", {
      name: `${label} page rule`,
      x: RESUME_X,
      y: 968,
      w: RESUME_W,
      h: 1,
      content: { shape: "rect", filled: true },
      style: { background: RESUME_RULE },
      pin: { bottom: true, left: true, right: true },
    }),
    b("text", {
      name: `${label} folio`,
      x: RESUME_X,
      y: 978,
      w: RESUME_W,
      h: 16,
      content: { text: label },
      style: {
        fontFamily: "ui",
        fontSize: 8.5,
        color: RESUME_MUTED,
        textAlign: "right",
      },
      pin: { bottom: true, right: true },
    }),
  ];
}

export type ExperienceEntry = {
  company: string;
  title: string;
  place: string;
  dates: string;
  bullets: string[];
};

export function experienceGroupHeight(bulletCount: number): number {
  const listH = Math.max(44, bulletCount * 22 + 8);
  return 38 + listH;
}

export function experienceGroupChildren(
  opts: ExperienceEntry,
  palette: ResumePalette,
): Block[] {
  const listH = Math.max(44, opts.bullets.length * 22 + 8);
  const groupH = 38 + listH;
  const titleW = RESUME_W - RESUME_PILL_W - 12 - RESUME_CONTENT_X;

  return [
    b("shape", {
      name: "Job stripe",
      x: 0,
      y: 0,
      w: 3,
      h: groupH,
      content: { shape: "rect", filled: true },
      style: { background: palette.mid, borderRadius: 2 },
      zIndex: 0,
    }),
    b("shape", {
      name: "Date pill",
      x: RESUME_W - RESUME_PILL_W,
      y: -1,
      w: RESUME_PILL_W,
      h: 20,
      content: { shape: "rect", variant: "rounded", filled: true },
      style: { background: palette.pill, borderRadius: 10 },
      zIndex: 1,
    }),
    b("text", {
      name: "Job title",
      x: RESUME_CONTENT_X,
      y: 0,
      w: titleW,
      h: 18,
      content: { text: opts.title },
      style: {
        fontFamily: "ui",
        fontSize: 12,
        fontWeight: 700,
        color: RESUME_INK,
      },
      zIndex: 2,
    }),
    b("text", {
      name: "Job dates",
      x: RESUME_W - RESUME_PILL_W,
      y: 0,
      w: RESUME_PILL_W,
      h: 18,
      content: { text: opts.dates },
      style: {
        fontFamily: "ui",
        fontSize: 9.5,
        fontWeight: 600,
        color: palette.deep,
        textAlign: "center",
        verticalAlign: "middle",
      },
      zIndex: 2,
    }),
    b("text", {
      name: "Job place",
      x: RESUME_CONTENT_X,
      y: 18,
      w: RESUME_W - RESUME_CONTENT_X,
      h: 16,
      content: { text: `${opts.company}  ·  ${opts.place}` },
      style: {
        fontFamily: "ui",
        fontSize: 10.5,
        fontStyle: "italic",
        color: RESUME_MUTED,
      },
      zIndex: 2,
    }),
    b("list", {
      name: "Job bullets",
      x: RESUME_CONTENT_X,
      y: 38,
      w: RESUME_W - RESUME_CONTENT_X,
      h: listH,
      content: { items: opts.bullets, markerColor: palette.accent },
      style: {
        fontFamily: "doc",
        fontSize: 10.5,
        lineHeight: 1.38,
        color: RESUME_INK,
        listStyle: "disc",
      },
      zIndex: 2,
    }),
  ];
}

export function experienceGroup(
  y: number,
  opts: ExperienceEntry,
  palette: ResumePalette,
): Block {
  const h = experienceGroupHeight(opts.bullets.length);
  return {
    id: id(),
    type: "group",
    name: `${opts.company} · ${opts.title}`,
    x: RESUME_X,
    y,
    w: RESUME_W,
    h,
    content: { blocks: experienceGroupChildren(opts, palette) },
    style: {},
    zIndex: 1,
  };
}

/** Merge-field experience row (3 bullets). */
export function mergeExperienceGroup(
  y: number,
  prefix: string,
  palette: ResumePalette,
  bulletCount = 3,
): Block {
  const h = experienceGroupHeight(bulletCount);
  const titleW = RESUME_W - RESUME_PILL_W - 12 - RESUME_CONTENT_X;
  const listH = Math.max(44, bulletCount * 22 + 8);
  const bullets = Array.from({ length: bulletCount }, (_, i) => `{{${prefix}_p${i + 1}}}`);

  return {
    id: id(),
    type: "group",
    name: `Experience · ${prefix}`,
    x: RESUME_X,
    y,
    w: RESUME_W,
    h,
    content: {
      blocks: [
        b("shape", {
          name: "Job stripe",
          x: 0,
          y: 0,
          w: 3,
          h,
          content: { shape: "rect", filled: true },
          style: { background: palette.mid, borderRadius: 2 },
          zIndex: 0,
        }),
        b("shape", {
          name: "Date pill",
          x: RESUME_W - RESUME_PILL_W,
          y: -1,
          w: RESUME_PILL_W,
          h: 20,
          content: { shape: "rect", variant: "rounded", filled: true },
          style: { background: palette.pill, borderRadius: 10 },
          zIndex: 1,
        }),
        b("text", {
          name: "Job title",
          x: RESUME_CONTENT_X,
          y: 0,
          w: titleW,
          h: 18,
          content: { text: `{{${prefix}_title}}` },
          style: {
            fontFamily: "ui",
            fontSize: 12,
            fontWeight: 700,
            color: RESUME_INK,
          },
          zIndex: 2,
        }),
        b("text", {
          name: "Job dates",
          x: RESUME_W - RESUME_PILL_W,
          y: 0,
          w: RESUME_PILL_W,
          h: 18,
          content: { text: `{{${prefix}_period}}` },
          style: {
            fontFamily: "ui",
            fontSize: 9.5,
            fontWeight: 600,
            color: palette.deep,
            textAlign: "center",
            verticalAlign: "middle",
          },
          zIndex: 2,
        }),
        b("text", {
          name: "Job place",
          x: RESUME_CONTENT_X,
          y: 18,
          w: RESUME_W - RESUME_CONTENT_X,
          h: 16,
          content: { text: `{{${prefix}_company}}  ·  {{location}}` },
          style: {
            fontFamily: "ui",
            fontSize: 10.5,
            fontStyle: "italic",
            color: RESUME_MUTED,
          },
          zIndex: 2,
        }),
        b("list", {
          name: "Job bullets",
          x: RESUME_CONTENT_X,
          y: 38,
          w: RESUME_W - RESUME_CONTENT_X,
          h: listH,
          content: { items: bullets, markerColor: palette.accent },
          style: {
            fontFamily: "doc",
            fontSize: 10.5,
            lineHeight: 1.38,
            color: RESUME_INK,
            listStyle: "disc",
          },
          zIndex: 2,
        }),
      ],
    },
    style: {},
    zIndex: 1,
  };
}

export function mergeExperienceEntryTemplate(palette: ResumePalette): CustomObject {
  return customObjectFromGroup(
    mergeExperienceGroup(
      0,
      "j1",
      palette,
      3,
    ),
    "Experience entry",
  );
}

/** Tier legend + three skill rows driven by comma-separated merge fields. */
export function mergeSkillTierSection(
  y: number,
  palette: ResumePalette,
): Block[] {
  const tiers: { key: string; label: string; tier: SkillTier }[] = [
    { key: "skills_expert", label: "Expert", tier: "expert" },
    { key: "skills_proficient", label: "Proficient", tier: "proficient" },
    { key: "skills_exposure", label: "Exposure", tier: "working" },
  ];
  const blocks: Block[] = [...skillLegendBlocks(y, palette)];
  let rowY = y + 30;
  for (const row of tiers) {
    blocks.push(
      b("shape", {
        name: `${row.label} skill wash`,
        x: RESUME_X,
        y: rowY,
        w: RESUME_W,
        h: 34,
        content: { shape: "rect", filled: true },
        style: {
          background: palette.wash,
          borderWidth: 1,
          borderColor: palette.pill,
          borderRadius: 4,
        },
        zIndex: 0,
      }),
      ...skillChipBlocks(RESUME_X + 10, rowY + 6, { name: row.label, tier: row.tier }, palette),
      b("text", {
        name: `${row.label} skills`,
        x: RESUME_X + 128,
        y: rowY + 6,
        w: RESUME_W - 140,
        h: 22,
        content: { text: `{{${row.key}}}` },
        style: {
          fontFamily: "ui",
          fontSize: 9.5,
          fontWeight: 600,
          color: palette.deep,
          verticalAlign: "middle",
        },
        zIndex: 1,
      }),
    );
    rowY += 40;
  }
  return blocks;
}

/** Sidebar-friendly skill chips from skill1..skill6 + skill1_tier.. fields. */
export function mergeSkillChipSlot(
  x: number,
  y: number,
  index: number,
  palette: ResumePalette,
): Block[] {
  const name = `{{skill${index}}}`;
  const tierExpert = `data.skill${index}_tier == 'expert' || (!data.skill${index}_tier && ${index} <= 2)`;
  const tierProf = `data.skill${index}_tier == 'proficient' || (!data.skill${index}_tier && ${index} > 2 && ${index} <= 4)`;
  const tiers: { cond: string; tier: SkillTier }[] = [
    { cond: tierExpert, tier: "expert" },
    { cond: tierProf, tier: "proficient" },
    { cond: "true", tier: "working" },
  ];
  const w = 72;
  const blocks: Block[] = [];
  for (const { cond, tier } of tiers) {
    const style = tierStyle(tier, palette);
    blocks.push(
      b("shape", {
        name: `Skill ${index} chip ${tier}`,
        x,
        y,
        w,
        h: 22,
        content: { shape: "rect", variant: "rounded", filled: true },
        style: {
          background: style.bg,
          borderWidth: style.borderWidth,
          borderColor: style.border,
          borderRadius: 11,
        },
        condition: cond,
        zIndex: 1,
      }),
      b("text", {
        name: `Skill ${index} label ${tier}`,
        x,
        y,
        w,
        h: 22,
        content: { text: name },
        style: {
          fontFamily: "ui",
          fontSize: 9,
          fontWeight: style.weight,
          color: style.color,
          textAlign: "center",
          verticalAlign: "middle",
          whiteSpace: "nowrap",
        },
        condition: cond,
        zIndex: 2,
      }),
    );
  }
  return blocks;
}

export function paletteSectionHeading(
  label: string,
  x: number,
  y: number,
  w: number,
): Block[] {
  return paletteVariants((palette) =>
    b("text", {
      name: `Heading ${label}`,
      x,
      y,
      w,
      h: 20,
      content: { text: label },
      style: {
        fontFamily: "ui",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1.6,
        color: palette.accent,
      },
    }),
  );
}

export function paletteAccentRule(x: number, y: number, w: number): Block[] {
  return paletteVariants((palette) =>
    b("shape", {
      name: "Accent rule",
      x,
      y,
      w,
      h: 3,
      content: { shape: "rect", filled: true },
      style: { background: palette.accent, borderRadius: 2 },
    }),
  );
}
