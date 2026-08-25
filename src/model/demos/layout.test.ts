import { describe, expect, it } from "vitest";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../document";
import { DEMO_LIBRARY } from "./library";

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

describe("DEMO_LIBRARY layout", () => {
  for (const demo of DEMO_LIBRARY) {
    it(`${demo.id} has no major block overlaps on each page`, () => {
      const project = demo.build();
      for (const page of project.pages) {
        const blocks = page.blocks.filter((b) => b.type !== "shape");
        for (let i = 0; i < blocks.length; i++) {
          for (let j = i + 1; j < blocks.length; j++) {
            const a = blocks[i]!;
            const b = blocks[j]!;
            if (a.zIndex !== b.zIndex && (a.zIndex ?? 0) !== (b.zIndex ?? 0)) {
              continue;
            }
            expect(
              overlaps(a, b),
              `${demo.id}/${page.name}: "${a.name}" overlaps "${b.name}"`,
            ).toBe(false);
          }
        }
      }
    });

    it(`${demo.id} blocks stay within page bounds`, () => {
      const project = demo.build();
      for (const page of project.pages) {
        for (const block of page.blocks) {
          expect(block.x).toBeGreaterThanOrEqual(0);
          expect(block.y).toBeGreaterThanOrEqual(0);
          expect(block.x + block.w).toBeLessThanOrEqual(PAGE_WIDTH + 1);
          expect(block.y + block.h).toBeLessThanOrEqual(PAGE_HEIGHT + 1);
        }
      }
    });

    it(`${demo.id} has no empty pages`, () => {
      const project = demo.build();
      for (const page of project.pages) {
        expect(
          page.blocks.length,
          `${demo.id}/${page.name} is empty`,
        ).toBeGreaterThan(0);
      }
    });
  }
});
