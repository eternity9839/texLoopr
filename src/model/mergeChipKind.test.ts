import { describe, expect, it } from "vitest";
import { mergeChipClassName, mergeChipKind } from "./mergeChipKind";

describe("mergeChipKind", () => {
  it("marks bare data paths as data", () => {
    expect(mergeChipKind("name")).toBe("data");
    expect(mergeChipKind("bank.iban")).toBe("data");
    expect(mergeChipKind("company")).toBe("data");
  });

  it("keeps data green when only default filter is used", () => {
    expect(mergeChipKind("name", ["default:n/a"])).toBe("data");
    expect(mergeChipKind("name|default:n/a")).toBe("data");
  });

  it("marks string / date transforms as runtime", () => {
    expect(mergeChipKind("name", ["upper"])).toBe("runtime");
    expect(mergeChipKind("name|upper")).toBe("runtime");
    expect(mergeChipKind("date", ["date:short"])).toBe("runtime");
    expect(mergeChipKind("price", ["currency:EUR"])).toBe("runtime");
  });

  it("marks runtime roots as runtime", () => {
    expect(mergeChipKind("vars.language")).toBe("runtime");
    expect(mergeChipKind("env.today")).toBe("runtime");
    expect(mergeChipKind("env.today|date:short")).toBe("runtime");
    expect(mergeChipKind("output.kind")).toBe("runtime");
    expect(mergeChipKind("device.platform")).toBe("runtime");
  });

  it("picks CSS class from kind", () => {
    expect(mergeChipClassName("name")).toBe("block-data");
    expect(mergeChipClassName("name", ["upper"])).toBe("block-runtime");
    expect(mergeChipClassName("vars.x", [], true)).toBe(
      "block-runtime merge-aware-text__chip--warn",
    );
  });
});
