import { describe, expect, it } from "vitest";
import { parseDataInput, resolveTemplate, evaluateCondition } from "../bindings";
import {
  CANVAS_PRESETS,
  ensureProjectAutomation,
  type CanvasPresetId,
} from "../document";
import { flattenBlocksForPreview } from "../groups";
import { enrichPreviewContext } from "../runtime";
import { DEMO_LIBRARY } from "./library";

function collectText(block: { content: Record<string, unknown> }): string[] {
  const out: string[] = [];
  if (block.content.text) out.push(String(block.content.text));
  if (Array.isArray(block.content.items)) {
    out.push(...block.content.items.map(String));
  }
  if (Array.isArray(block.content.cells)) {
    out.push(...(block.content.cells as string[][]).flat().map(String));
  }
  return out;
}

function artboardSize(
  demo: (typeof DEMO_LIBRARY)[number],
  project: { artboard?: CanvasPresetId },
) {
  const id = (demo.artboard ?? project.artboard ?? "document") as CanvasPresetId;
  const preset = CANVAS_PRESETS[id] ?? CANVAS_PRESETS.document;
  return { w: preset.w, h: preset.h };
}

describe("DEMO_LIBRARY preview validation", () => {
  for (const demo of DEMO_LIBRARY) {
    it(`${demo.id} parses data and resolves templates in preview`, () => {
      const project = ensureProjectAutomation(demo.build());
      const rows = parseDataInput(demo.sampleCsv);
      expect(rows.length).toBeGreaterThan(0);

      const row = rows[0]!;
      const outputs = project.outputs ?? [];
      const ctx = enrichPreviewContext(project, row, {
        kind: "preview",
        name: outputs[0]?.name ?? "preview",
        id: outputs[0]?.id ?? "preview",
      });
      expect(ctx).toBeTruthy();

      const { w, h } = artboardSize(demo, project);
      for (const page of project.pages) {
        const { blocks } = flattenBlocksForPreview(page.blocks, row, ctx);
        for (const block of blocks) {
          if (block.condition) {
            expect(() => evaluateCondition(block.condition, row, ctx)).not.toThrow();
          }
          for (const text of collectText(block)) {
            const resolved = resolveTemplate(text, row, {
              missingAsEmpty: true,
              ctx,
            });
            expect(resolved).not.toMatch(/\{\{[^}]+\}\}/);
          }
          expect(block.x + block.w).toBeLessThanOrEqual(w + 1);
          expect(block.y + block.h).toBeLessThanOrEqual(h + 1);
        }
      }
    });
  }
});
