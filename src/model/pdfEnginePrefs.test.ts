import { describe, expect, it } from "vitest";
import { prefs, updatePrefs, createProject } from "../state/store";
import { beforeEach } from "vitest";

describe("pdfEngine prefs", () => {
  beforeEach(() => {
    createProject();
  });

  it("defaults to browser", () => {
    expect(prefs.value.pdfEngine ?? "browser").toBe("browser");
  });

  it("persists rust via updatePrefs", () => {
    updatePrefs({ pdfEngine: "rust" });
    expect(prefs.value.pdfEngine).toBe("rust");
    updatePrefs({ pdfEngine: "browser" });
    expect(prefs.value.pdfEngine).toBe("browser");
  });
});
