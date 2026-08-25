// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import { isEphemeral } from "./runtimeConfig";

describe("runtimeConfig", () => {
  const prev = window.__TEXLOOPER__;

  afterEach(() => {
    window.__TEXLOOPER__ = prev;
  });

  it("isEphemeral is false by default", () => {
    delete window.__TEXLOOPER__;
    expect(isEphemeral()).toBe(false);
  });

  it("isEphemeral reads window.__TEXLOOPER__", () => {
    window.__TEXLOOPER__ = { ephemeral: true };
    expect(isEphemeral()).toBe(true);
  });
});
