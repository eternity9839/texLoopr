import { describe, expect, it } from "vitest";
import { envClock, localIsoDate } from "./envClock";
import { resolveDateBlockText } from "./dateBlock";
import { qrDataUrl } from "./qrCode";
import { previewContext } from "./runtime";
import { defaultOutputs } from "./workflow";

describe("envClock", () => {
  it("exposes today / now / timestamp", () => {
    const c = envClock(new Date("2026-08-26T12:00:00Z"));
    expect(c.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(c.now).toContain("T");
    expect(c.timestamp).toBeGreaterThan(0);
    expect(localIsoDate(new Date(2026, 7, 26))).toBe("2026-08-26");
  });
});

describe("resolveDateBlockText", () => {
  const runtime = previewContext(
    { invoice_date: "2026-09-01" },
    defaultOutputs()[0]!,
  );

  it("formats today from env", () => {
    const text = resolveDateBlockText(
      { source: "today", format: "iso" },
      undefined,
      runtime,
    );
    expect(text).toBe(String(runtime.env.today));
  });

  it("formats a fixed date", () => {
    const text = resolveDateBlockText(
      { source: "fixed", fixed: "2026-01-15", format: "iso" },
      undefined,
      runtime,
    );
    expect(text).toBe("2026-01-15");
  });

  it("merges a field path", () => {
    const text = resolveDateBlockText(
      { source: "field", path: "invoice_date", format: "iso" },
      { invoice_date: "2026-09-01" },
      runtime,
    );
    expect(text).toBe("2026-09-01");
  });
});

describe("qrDataUrl", () => {
  it("returns an svg data url for a payload", () => {
    const url = qrDataUrl("https://northline.example/track/NL9");
    expect(url.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(url).includes("<svg")).toBe(true);
  });

  it("returns empty for blank payload", () => {
    expect(qrDataUrl("   ")).toBe("");
  });
});
