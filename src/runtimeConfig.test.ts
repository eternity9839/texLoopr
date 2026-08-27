// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import {
  getApiBaseUrl,
  isDesktopShell,
  isEphemeral,
  resolveBackendTransport,
} from "./runtimeConfig";

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

  it("resolveBackendTransport prefers apiBaseUrl as http-remote", () => {
    window.__TEXLOOPER__ = { apiBaseUrl: "http://127.0.0.1:8787" };
    expect(resolveBackendTransport()).toBe("http-remote");
    expect(getApiBaseUrl()).toBe("http://127.0.0.1:8787");
  });

  it("resolveBackendTransport honors forced transport", () => {
    window.__TEXLOOPER__ = {
      apiBaseUrl: "http://127.0.0.1:8787",
      transport: "js-fallback",
    };
    expect(resolveBackendTransport()).toBe("js-fallback");
  });

  it("resolveBackendTransport defaults to js-fallback without Tauri or API", () => {
    delete window.__TEXLOOPER__;
    expect(resolveBackendTransport()).toBe("js-fallback");
  });

  it("resolveBackendTransport treats desktop profile as tauri-local", () => {
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    window.__TEXLOOPER__ = { profile: "desktop", embeddedInDesktopHost: true };
    expect(resolveBackendTransport()).toBe("tauri-local");
  });

  it("isDesktopShell reads profile and Tauri internals", () => {
    delete window.__TEXLOOPER__;
    expect(isDesktopShell()).toBe(false);
    window.__TEXLOOPER__ = { profile: "desktop" };
    expect(isDesktopShell()).toBe(true);
    window.__TEXLOOPER__ = { profile: "official" };
    expect(isDesktopShell()).toBe(false);
  });
});
