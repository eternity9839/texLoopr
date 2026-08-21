import { describe, expect, it } from "vitest";
import { parseDataInput, resolveTemplate, evaluateCondition } from "../bindings";
import { PAGE_HEIGHT, PAGE_WIDTH, ensureProjectAutomation } from "../document";
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

describe("DEMO_LIBRARY preview validation", () => {
  for (const demo of DEMO_LIBRARY) {
    it(`${demo.id} parses data and resolves templates in preview`, () => {
      const project = ensureProjectAutomation(demo.build());
      const rows = parseDataInput(demo.sampleCsv);
      expect(rows.length).toBeGreaterThan(0);

      const row = rows[0]!;
      const ctx = enrichPreviewContext(project, row, 0);
      expect(ctx).toBeTruthy();

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
          expect(block.x + block.w).toBeLessThanOrEqual(PAGE_WIDTH + 1);
          expect(block.y + block.h).toBeLessThanOrEqual(PAGE_HEIGHT + 1);
        }
      }
    });
  }
});
