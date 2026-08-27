import { describe, expect, it } from "vitest";
import {
  createErrorReport,
  ErrorCodes,
  formatErrorForClipboard,
  sectionFromCode,
} from "./appErrors";

describe("appErrors", () => {
  it("parses section from code", () => {
    expect(sectionFromCode(ErrorCodes.RENDER_BATCH)).toBe("render");
    expect(sectionFromCode(ErrorCodes.BOOT_HYDRATE)).toBe("boot");
    expect(sectionFromCode("nope")).toBe("unknown");
  });

  it("creates reports with id and clipboard text", () => {
    const r = createErrorReport({
      code: ErrorCodes.SAVE_DOWNLOAD,
      message: "Could not save",
      cause: new Error("disk full"),
    });
    expect(r.section).toBe("save");
    expect(r.id).toMatch(/^err_/);
    expect(r.detail).toContain("disk full");
    expect(formatErrorForClipboard(r)).toContain(ErrorCodes.SAVE_DOWNLOAD);
  });
});
