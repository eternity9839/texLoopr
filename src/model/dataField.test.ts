import { describe, expect, it } from "vitest";
import {
  dataFieldLabel,
  dataFieldTemplate,
  normalizeDataFieldPath,
  resolveDataField,
} from "./dataField";

describe("dataField helpers", () => {
  it("normalizes wrapped and bare paths", () => {
    expect(normalizeDataFieldPath("company")).toBe("company");
    expect(normalizeDataFieldPath("{{ company }}")).toBe("company");
    expect(normalizeDataFieldPath("date|date:short")).toBe("date|date:short");
  });

  it("builds merge templates", () => {
    expect(dataFieldTemplate("title")).toBe("{{title}}");
    expect(dataFieldLabel("")).toBe("field");
    expect(dataFieldLabel("name")).toBe("name");
  });

  it("resolves against a data row", () => {
    expect(
      resolveDataField("company", { company: "Northline", name: "Ada" }),
    ).toBe("Northline");
  });
});
