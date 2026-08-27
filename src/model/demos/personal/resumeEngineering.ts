import type { Block, Project } from "../../document";
import { b, outputsFor, page, shell } from "../helpers";
import {
  mergeExperienceEntryTemplate,
  mergeExperienceGroup,
  mergeSkillTierSection,
  paletteVariants,
  resumeAccentBar,
  resumeFooter,
  resumePalette,
  resumeSection,
  RESUME_INK,
  RESUME_MUTED,
  RESUME_PALETTE_IDS,
  RESUME_PILL_W,
  RESUME_W,
  RESUME_X,
} from "./resumeShared";

function paletteAccentBarBlocks(): Block[] {
  return RESUME_PALETTE_IDS.flatMap((pid) => resumeAccentBar(resumePalette(pid)));
}

function paletteResumeSection(label: string, y: number): Block[] {
  return RESUME_PALETTE_IDS.flatMap((pid) =>
    resumeSection(label, y, resumePalette(pid)).map((block) => ({
      ...block,
      condition: `vars.palette == '${pid}'`,
    })),
  );
}

/**
 * Two-page engineering CV — merge-driven layout with palette axis,
 * four experience slots, tiered skills, certifications repeater.
 */
export function resumeEngineering(): Project {
  const teal = resumePalette("teal");
  const expY = [252, 430, 560, 690] as const;

  return shell(
    {
      name: "Resume — engineering",
      author: "texLooper samples",
      subject: "Data-driven CV with palette + skill tiers",
      description:
        "Two-page engineering résumé: flip Data rows for candidate, Palette axis for accent colours, four jobs, tiered skill rows, certification repeater.",
    },
    [
      page(
        "Resume",
        [
          ...paletteAccentBarBlocks(),

          ...paletteVariants((palette) =>
            b("shape", {
              name: "Header wash",
              x: 16,
              y: 0,
              w: 698,
              h: 212,
              content: { shape: "rect", filled: true },
              style: { background: palette.soft },
              zIndex: 0,
              pin: { top: true, left: true, right: true },
            }),
          ),

          b("text", {
            name: "Name",
            x: RESUME_X,
            y: 28,
            w: RESUME_W,
            h: 42,
            content: { text: "{{full_name}}" },
            style: {
              fontFamily: "display",
              fontSize: 36,
              fontWeight: 700,
              color: teal.deep,
            },
            zIndex: 1,
          }),

          ...paletteVariants((palette) =>
            b("shape", {
              name: "Role badge",
              x: RESUME_X,
              y: 74,
              w: 214,
              h: 24,
              content: { shape: "rect", variant: "rounded", filled: true },
              style: { background: palette.accent, borderRadius: 12 },
              zIndex: 1,
            }),
          ),
          b("text", {
            name: "Role",
            x: RESUME_X,
            y: 74,
            w: 214,
            h: 24,
            content: { text: "{{role}}" },
            style: {
              fontFamily: "ui",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: "#ffffff",
              textAlign: "center",
              verticalAlign: "middle",
            },
            zIndex: 2,
          }),

          b("paragraph", {
            name: "Headline",
            x: RESUME_X,
            y: 108,
            w: RESUME_W,
            h: 48,
            content: { text: "{{summary}}" },
            style: {
              fontFamily: "doc",
              fontSize: 10.5,
              lineHeight: 1.4,
              color: RESUME_INK,
            },
            zIndex: 1,
          }),

          b("text", {
            name: "Contact location",
            x: RESUME_X,
            y: 162,
            w: 160,
            h: 16,
            content: { text: "{{location}}" },
            style: {
              fontFamily: "ui",
              fontSize: 9.5,
              fontWeight: 600,
              color: RESUME_MUTED,
              verticalAlign: "middle",
              whiteSpace: "nowrap",
            },
            zIndex: 1,
          }),
          b("link", {
            name: "Email",
            x: RESUME_X + 168,
            y: 162,
            w: 180,
            h: 16,
            content: {
              hook: "mailto",
              target: "{{email}}",
              label: "{{email}}",
            },
            style: {
              fontFamily: "ui",
              fontSize: 9.5,
              fontWeight: 600,
              color: teal.deep,
              background: "transparent",
              textDecoration: "none",
              verticalAlign: "middle",
              whiteSpace: "nowrap",
            },
            zIndex: 1,
          }),
          b("link", {
            name: "Website",
            x: RESUME_X + 358,
            y: 162,
            w: 160,
            h: 16,
            content: {
              hook: "url",
              target: "https://{{website}}",
              label: "{{website}}",
            },
            style: {
              fontFamily: "ui",
              fontSize: 9.5,
              fontWeight: 600,
              color: teal.deep,
              background: "transparent",
              textDecoration: "none",
              verticalAlign: "middle",
              whiteSpace: "nowrap",
            },
            zIndex: 1,
          }),

          ...paletteVariants((palette) =>
            b("shape", {
              name: "Header rule",
              x: RESUME_X,
              y: 208,
              w: RESUME_W,
              h: 2.5,
              content: { shape: "rect", filled: true },
              style: { background: palette.accent },
              zIndex: 1,
            }),
          ),

          ...paletteResumeSection("Experience", 224),
          mergeExperienceGroup(expY[0], "j1", teal),
          mergeExperienceGroup(expY[1], "j2", teal),
          mergeExperienceGroup(expY[2], "j3", teal),
          mergeExperienceGroup(expY[3], "j4", teal, 2),

          ...paletteResumeSection("Open source", 820),
          b("paragraph", {
            name: "OSS",
            x: RESUME_X,
            y: 848,
            w: RESUME_W,
            h: 40,
            content: {
              text: "{{oss_note|default:Open-source contributor — side projects and notes on {{website}}.}}",
            },
            style: {
              fontFamily: "doc",
              fontSize: 10.5,
              lineHeight: 1.45,
              color: RESUME_INK,
            },
            zIndex: 1,
          }),

          ...resumeFooter("{{full_name}}  ·  1 / 2"),
        ],
        { spread: false },
      ),

      page(
        "Education, skills & certifications",
        [
          ...paletteAccentBarBlocks(),

          ...paletteResumeSection("Certifications", 36),
          b("repeat", {
            name: "Certifications",
            x: RESUME_X,
            y: 64,
            w: RESUME_W,
            h: 26,
            content: {
              itemsPath: "certifications",
              itemVar: "item",
              blocks: [
                b("shape", {
                  name: "Cert mark",
                  x: 8,
                  y: 6,
                  w: 8,
                  h: 8,
                  content: { shape: "rect", variant: "rounded", filled: true },
                  style: { background: teal.accent, borderRadius: 2 },
                  zIndex: 1,
                }),
                b("text", {
                  name: "Cert name",
                  x: 24,
                  y: 2,
                  w: RESUME_W - 80,
                  h: 18,
                  content: { text: "{{name}}" },
                  style: {
                    fontFamily: "doc",
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: RESUME_INK,
                    verticalAlign: "middle",
                  },
                  zIndex: 1,
                }),
                b("text", {
                  name: "Cert year",
                  x: RESUME_W - 52,
                  y: 3,
                  w: 52,
                  h: 16,
                  content: { text: "{{year}}" },
                  style: {
                    fontFamily: "ui",
                    fontSize: 8.5,
                    fontWeight: 700,
                    color: "#ffffff",
                    background: teal.accent,
                    textAlign: "center",
                    verticalAlign: "middle",
                    borderRadius: 8,
                  },
                  zIndex: 2,
                }),
              ],
            },
            zIndex: 1,
          }),

          ...paletteResumeSection("Education", 200),
          b("text", {
            name: "Education primary",
            x: RESUME_X + 12,
            y: 232,
            w: RESUME_W - RESUME_PILL_W - 24,
            h: 32,
            content: {
              text: "{{edu1_degree}} — {{edu1_school}}",
            },
            style: {
              fontFamily: "ui",
              fontSize: 11,
              fontWeight: 700,
              color: RESUME_INK,
            },
          }),
          b("text", {
            name: "Education primary dates",
            x: RESUME_X + RESUME_W - RESUME_PILL_W,
            y: 236,
            w: RESUME_PILL_W,
            h: 18,
            content: { text: "{{edu1_years}}" },
            style: {
              fontFamily: "ui",
              fontSize: 9,
              fontWeight: 600,
              color: teal.deep,
              textAlign: "center",
            },
          }),
          b("text", {
            name: "Education secondary",
            x: RESUME_X + 12,
            y: 272,
            w: RESUME_W - RESUME_PILL_W - 24,
            h: 32,
            content: {
              text: "{{edu2_degree}} — {{edu2_school}}",
            },
            style: {
              fontFamily: "ui",
              fontSize: 11,
              fontWeight: 700,
              color: RESUME_INK,
            },
          }),
          b("text", {
            name: "Education secondary dates",
            x: RESUME_X + RESUME_W - RESUME_PILL_W,
            y: 276,
            w: RESUME_PILL_W,
            h: 18,
            content: { text: "{{edu2_years}}" },
            style: {
              fontFamily: "ui",
              fontSize: 9,
              fontWeight: 600,
              color: teal.deep,
              textAlign: "center",
            },
          }),

          ...paletteResumeSection("Skills", 324),
          ...mergeSkillTierSection(348, teal),

          b("text", {
            name: "Languages",
            x: RESUME_X,
            y: 480,
            w: RESUME_W,
            h: 40,
            content: { text: "{{languages}}" },
            style: {
              fontFamily: "doc",
              fontSize: 10.5,
              lineHeight: 1.45,
              color: RESUME_MUTED,
            },
          }),

          ...resumeFooter("{{full_name}}  ·  2 / 2"),
        ],
        { spread: false },
      ),
    ],
    {
      language: "en",
      outputs: outputsFor("preview", "pdf", "image"),
      artboard: "a4",
      customObjects: [mergeExperienceEntryTemplate(teal)],
    },
  );
}
