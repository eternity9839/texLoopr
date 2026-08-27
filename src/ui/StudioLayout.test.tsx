// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { StudioLayout } from "./StudioLayout";
import { createProject, prefs, updatePrefs } from "../state/store";

type MqlListener = (e: { matches: boolean }) => void;
let mqlListeners: MqlListener[] = [];

function setInnerSize(w: number, h = 800) {
  Object.defineProperty(window, "innerWidth", { value: w, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: h, configurable: true });
}

function stubMatchMedia(matches: boolean) {
  mqlListeners = [];
  (window as unknown as { matchMedia: unknown }).matchMedia = (
    query: string,
  ) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: (_t: string, cb: MqlListener) => {
      mqlListeners.push(cb);
    },
    removeEventListener: (_t: string, cb: MqlListener) => {
      mqlListeners = mqlListeners.filter((l) => l !== cb);
    },
    addListener: (cb: MqlListener) => {
      mqlListeners.push(cb);
    },
    removeListener: (cb: MqlListener) => {
      mqlListeners = mqlListeners.filter((l) => l !== cb);
    },
    dispatchEvent: () => false,
  });
}

function resizeViewport(matches: boolean) {
  setInnerSize(matches ? 700 : 1280);
  for (const cb of [...mqlListeners]) cb({ matches });
  window.dispatchEvent(new Event("resize"));
}

const editUi = {
  tools: <nav class="test-tools">tools</nav>,
  main: <main class="test-main">canvas</main>,
  inspector: <aside class="test-inspector">props</aside>,
};

const auxUi = {
  navigator: <nav class="test-nav">outline</nav>,
  main: <main class="test-main">data</main>,
};

beforeEach(() => {
  cleanup();
  createProject();
  updatePrefs({
    navCollapsed: false,
    inspectorCollapsed: false,
  });
  delete window.__TEXLOOPER__;
});

describe("StudioLayout — desktop edit grid", () => {
  beforeEach(() => {
    setInnerSize(1280);
    stubMatchMedia(false);
  });

  it("renders tools + inspector columns when the viewport is wide", () => {
    const { container } = render(
      <StudioLayout {...editUi} variant="edit" />,
    );
    expect(container.querySelector(".studio-layout--stack")).toBeNull();
    expect(container.querySelector(".studio-tools")).toBeTruthy();
    expect(container.querySelector(".studio-inspector")).toBeTruthy();
    expect(container.querySelector(".studio-nav")).toBeNull();
  });

  it("collapse toggles mark the inspector via data state", () => {
    updatePrefs({ inspectorCollapsed: true });
    const { getByLabelText, container } = render(
      <StudioLayout {...editUi} variant="edit" />,
    );
    const insp = container.querySelector(".studio-inspector");
    expect(insp?.getAttribute("data-collapsed")).toBe("true");
    fireEvent.click(getByLabelText("Expand Inspect"));
    expect(prefs.value.inspectorCollapsed).toBe(false);
    expect(insp?.getAttribute("data-collapsed")).toBeNull();
  });

  it("keeps rail controls inside the panel flow, not floating", () => {
    const { container } = render(
      <StudioLayout {...editUi} variant="edit" />,
    );
    expect(container.querySelector(".rail-chrome")).toBeNull();
    expect(container.querySelector(".rail-toggle")).toBeNull();
    expect(container.querySelector(".prop-dock")).toBeNull();
    expect(
      container.querySelector(".studio-inspector .rail-head"),
    ).toBeTruthy();
    expect(
      container.querySelector(
        ".studio-inspector .rail-reveal .studio-rail__body",
      ),
    ).toBeTruthy();
  });

  it("reacts to viewport changes without remount", () => {
    const { container } = render(<StudioLayout {...editUi} variant="edit" />);
    expect(container.querySelector(".studio-tools")).toBeTruthy();
    const layout = container.querySelector(".studio-layout") as HTMLElement;
    const inlineStyle = () => layout.getAttribute("style") ?? "";
    expect(inlineStyle()).toContain("grid-template-columns");
    act(() => resizeViewport(true));
    expect(inlineStyle()).not.toContain("grid-template-columns");
    act(() => resizeViewport(false));
    expect(inlineStyle()).toContain("grid-template-columns");
  });
});

describe("StudioLayout — aux navigator", () => {
  it("renders outline navigator without tools or inspector", () => {
    setInnerSize(1280);
    stubMatchMedia(false);
    const { container } = render(
      <StudioLayout {...auxUi} variant="aux" />,
    );
    expect(container.querySelector(".studio-nav")).toBeTruthy();
    expect(container.querySelector(".studio-tools")).toBeNull();
    expect(container.querySelector(".studio-inspector")).toBeNull();
  });
});

describe("StudioLayout — narrow stacked flow", () => {
  beforeEach(() => {
    setInnerSize(700);
    stubMatchMedia(true);
  });

  it("keeps sections in the flow; no drawers or scrims", () => {
    const { container } = render(<StudioLayout {...editUi} variant="edit" />);
    expect(container.querySelector(".studio-tools")).toBeTruthy();
    expect(container.querySelector(".test-main")).toBeTruthy();
    expect(container.querySelector(".studio-inspector")).toBeTruthy();
    expect(container.querySelector(".drawer-scrim")).toBeNull();
    const layout = container.querySelector(".studio-layout") as HTMLElement;
    expect(layout.getAttribute("style")).toBeNull();
    expect(layout.className).toContain("studio-layout--stack");
  });

  it("starts canvas-first with inspector collapsed on narrow", () => {
    const { container } = render(<StudioLayout {...editUi} variant="edit" />);
    expect(
      container
        .querySelector(".studio-inspector")
        ?.getAttribute("data-collapsed"),
    ).toBe("true");
    expect(
      container.querySelector(".studio-inspector .rail-head__label")
        ?.textContent,
    ).toBe("Inspect");
  });

  it("slides inspector open without touching prefs", () => {
    const { getByLabelText, container } = render(
      <StudioLayout {...editUi} variant="edit" />,
    );
    fireEvent.click(getByLabelText("Expand Inspect"));
    expect(
      container
        .querySelector(".studio-inspector")
        ?.getAttribute("data-collapsed"),
    ).toBeNull();
    expect(prefs.value.inspectorCollapsed).toBe(false);
  });
});
