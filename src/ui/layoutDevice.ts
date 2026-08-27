/**
 * Unified device / responsive layout model.
 * Chrome (shell, stack vs wide) is device-dependent; page geometry stays CSS px @ 96dpi.
 */

import { useEffect, useState } from "preact/hooks";
import {
  CANVAS_PRESETS,
  type CanvasPresetId,
  type EditorPrefs,
} from "../model/document";
import type { RulerUnit } from "../model/rulerUnits";
import { isRulerUnit } from "../model/rulerUnits";
import { hasTauriIpc, runtimeConfig } from "../runtimeConfig";
import {
  applyDesktopShellGeometry,
  readSanitizedViewport,
  type ViewportSize,
} from "./viewportMetrics";

// windowSize lives on TexLooperRuntime via runtimeConfig.ts
export type { ViewportSize };

export type LayoutShell = "desktop" | "web";
export type LayoutMode = "wide" | "stack";
export type ArtboardClass = "print" | "device" | "social";
export type PointerKind = "fine" | "coarse";

export type LayoutOutputDevice = {
  media: string | null;
  dpi: number | null;
};

export type LayoutDevice = {
  shell: LayoutShell;
  layoutMode: LayoutMode;
  artboardClass: ArtboardClass;
  viewport: ViewportSize;
  pointer: PointerKind;
  density: "compact" | "comfortable";
  outputDevice: LayoutOutputDevice;
  rulerUnit: RulerUnit;
  /** True when raw WebKit metrics were discarded as corrupt. */
  viewportSanitized: boolean;
};

export const STACK_BREAKPOINT = 880;
export const DESKTOP_WIDE_MIN = 640;

export function detectShell(): LayoutShell {
  if (typeof window === "undefined") return "web";
  if (runtimeConfig().profile === "desktop") return "desktop";
  if (runtimeConfig().embeddedInDesktopHost) return "desktop";
  if (hasTauriIpc()) return "desktop";
  return "web";
}

export function artboardClassFromPreset(
  preset: CanvasPresetId | string | undefined,
): ArtboardClass {
  const id = (preset ?? "document") as CanvasPresetId;
  const group = CANVAS_PRESETS[id]?.group;
  if (group === "Social") return "social";
  if (group === "Devices") return "device";
  return "print";
}

function rawViewportLooksCorrupt(): boolean {
  if (typeof window === "undefined") return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  return !(
    Number.isFinite(w) &&
    Number.isFinite(h) &&
    w >= 320 &&
    h >= 320 &&
    w <= 8192 &&
    h <= 8192
  );
}

function readPointer(): PointerKind {
  if (typeof window === "undefined" || !window.matchMedia) return "fine";
  return window.matchMedia("(pointer: coarse)").matches ? "coarse" : "fine";
}

/**
 * Desktop Tauri always uses wide chrome unless the window is intentionally
 * tiny AND metrics are sane. Corrupt/negative widths must never force stack.
 */
export function resolveLayoutMode(
  shell: LayoutShell,
  viewportW: number,
  opts?: { metricsCorrupt?: boolean },
): LayoutMode {
  if (shell === "desktop") {
    if (opts?.metricsCorrupt) return "wide";
    if (viewportW >= DESKTOP_WIDE_MIN) return "wide";
    // Only stack desktop when metrics are trustworthy and window is tiny.
    return viewportW >= 320 ? "stack" : "wide";
  }
  if (viewportW < STACK_BREAKPOINT) return "stack";
  return "wide";
}

export type DetectLayoutDeviceOpts = {
  prefs?: Pick<EditorPrefs, "density" | "rulerUnit" | "canvasPreset">;
  artboard?: CanvasPresetId | string | null;
  outputDevice?: LayoutOutputDevice;
};

export function detectLayoutDevice(
  opts: DetectLayoutDeviceOpts = {},
): LayoutDevice {
  const shell = detectShell();
  const metricsCorrupt = rawViewportLooksCorrupt();
  const viewport = readSanitizedViewport();
  const layoutMode = resolveLayoutMode(shell, viewport.w, { metricsCorrupt });
  const artboard =
    opts.artboard ?? opts.prefs?.canvasPreset ?? "document";
  const density =
    opts.prefs?.density === "comfortable" ? "comfortable" : "compact";
  const rulerRaw = opts.prefs?.rulerUnit;
  const rulerUnit: RulerUnit = isRulerUnit(rulerRaw) ? rulerRaw : "px";

  return {
    shell,
    layoutMode,
    artboardClass: artboardClassFromPreset(artboard),
    viewport,
    pointer: readPointer(),
    density,
    outputDevice: opts.outputDevice ?? { media: null, dpi: null },
    rulerUnit,
    viewportSanitized: metricsCorrupt || Boolean(window.__TEXLOOPER__?.windowSize),
  };
}

export function applyLayoutDeviceAttrs(device: LayoutDevice): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.shell = device.shell;
  root.dataset.layoutMode = device.layoutMode;
  root.dataset.artboardClass = device.artboardClass;
  root.dataset.pointer = device.pointer;
  applyDesktopShellGeometry(device.viewport);
}

export function subscribeLayoutDevice(
  onChange: (device: LayoutDevice) => void,
  getOpts: () => DetectLayoutDeviceOpts = () => ({}),
): () => void {
  if (typeof window === "undefined") return () => {};

  const emit = () => {
    const next = detectLayoutDevice(getOpts());
    applyLayoutDeviceAttrs(next);
    onChange(next);
  };

  emit();

  const mqNarrow = window.matchMedia?.(
    `(max-width: ${STACK_BREAKPOINT}px)`,
  );
  const mqPointer = window.matchMedia?.("(pointer: coarse)");
  const onMq = () => emit();
  mqNarrow?.addEventListener("change", onMq);
  mqPointer?.addEventListener("change", onMq);
  window.addEventListener("resize", emit);
  window.visualViewport?.addEventListener("resize", emit);
  window.addEventListener("texlooper-window-size", emit);

  return () => {
    mqNarrow?.removeEventListener("change", onMq);
    mqPointer?.removeEventListener("change", onMq);
    window.removeEventListener("resize", emit);
    window.visualViewport?.removeEventListener("resize", emit);
    window.removeEventListener("texlooper-window-size", emit);
  };
}

/** React hook: live LayoutDevice snapshot. */
export function useLayoutDevice(
  getOpts: () => DetectLayoutDeviceOpts = () => ({}),
): LayoutDevice {
  const [device, setDevice] = useState(() => detectLayoutDevice(getOpts()));
  useEffect(() => subscribeLayoutDevice(setDevice, getOpts), [getOpts]);
  return device;
}
