// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { StudioLayout } from "./StudioLayout";
import { createProject, prefs, updatePrefs } from "../state/store";

type MqlListener = (e: { matches: boolean }) => void;
let mqlListeners: MqlListener[] = [];

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
  for (const cb of [...mqlListeners]) cb({ matches });
}

const ui = {
  navigator: <nav class="test-nav">outline</nav>,
  main: <main class="test-main">canvas</main>,
  inspector: <aside class="test-inspector">props</aside>,
};

beforeEach(() => {
  cleanup();
  createProject();
  updatePrefs({
    navCollapsed: false,
    inspectorCollapsed: false,
  });
});

describe("StudioLayout — desktop grid", () => {
  it("renders both rails as grid columns when the viewport is wide", () => {
    stubMatchMedia(false);
    const { container } = render(
      <StudioLayout {...ui} variant="edit" />,
    );
    expect(container.querySelector(".studio-layout--narrow")).toBeNull();
    expect(container.querySelector(".studio-nav")).toBeTruthy();
    expect(container.querySelector(".studio-inspector")).toBeTruthy();
  });

  it("collapse toggles mark their rail via data state", () => {
    stubMatchMedia(false);
    updatePrefs({ navCollapsed: true });
    const { getByLabelText, container } = render(
      <StudioLayout {...ui} variant="edit" />,
    );
    const nav = container.querySelector(".studio-nav");
    expect(nav?.getAttribute("data-collapsed")).toBe("true");
    fireEvent.click(getByLabelText("Expand Outline"));
    expect(prefs.value.navCollapsed).toBe(false);
    expect(nav?.getAttribute("data-collapsed")).toBeNull();
  });

  it("keeps rail controls inside the panel flow, not floating", () => {
    stubMatchMedia(false);
    const asideBottom = <div class="appearance-bar">bar</div>;
    const { container } = render(
      <StudioLayout {...ui} variant="edit" asideBottom={asideBottom} />,
    );
    // No absolutely-positioned chrome remnants
    expect(container.querySelector(".rail-chrome")).toBeNull();
    expect(container.querySelector(".rail-toggle")).toBeNull();
    expect(container.querySelector(".prop-dock__toggle")).toBeNull();
    // Headers live inside their panels and bodies slide via reveal
    expect(container.querySelector(".studio-nav .rail-head")).toBeTruthy();
    expect(
      container.querySelector(".studio-inspector .rail-head"),
    ).toBeTruthy();
    expect(
      container.querySelector(".studio-nav .rail-reveal .studio-rail__body"),
    ).toBeTruthy();
    // Bottom content renders bare, without a duplicate dock chrome
    expect(container.querySelector(".appearance-bar")).toBeTruthy();
    expect(container.querySelector(".prop-dock")).toBeNull();
  });

  it("reacts to viewport changes without remount", () => {
    stubMatchMedia(false);
    const { container } = render(<StudioLayout {...ui} variant="edit" />);
    expect(container.querySelector(".studio-nav")).toBeTruthy();
    const layout = container.querySelector(".studio-layout") as HTMLElement;
    const inlineStyle = () => layout.getAttribute("style") ?? "";
    expect(inlineStyle()).toContain("grid-template-columns");
    act(() => resizeViewport(true));
    // Narrow mode drops the inline template so CSS stacks the grid
    expect(inlineStyle()).not.toContain("grid-template-columns");
    act(() => resizeViewport(false));
    expect(inlineStyle()).toContain("grid-template-columns");
  });
});

describe("StudioLayout — narrow stacked flow", () => {
  beforeEach(() => stubMatchMedia(true));

  it("keeps every section in the flow; no drawers, scrims or tabs exist", () => {
    const { container } = render(<StudioLayout {...ui} variant="edit" />);
    // All three sections stay mounted and in normal flow
    expect(container.querySelector(".studio-nav")).toBeTruthy();
    expect(container.querySelector(".test-main")).toBeTruthy();
    expect(container.querySelector(".studio-inspector")).toBeTruthy();
    // Overlay chrome is gone for good
    expect(container.querySelector(".drawer-scrim")).toBeNull();
    expect(container.querySelector(".studio-drawer--left")).toBeNull();
    expect(container.querySelector(".drawer-tab--left")).toBeNull();
    // No inline column template — the media query stacks the grid
    const layout = container.querySelector(".studio-layout") as HTMLElement;
    expect(layout.getAttribute("style")).toBeNull();
    expect(layout.className).toContain("studio-layout--stack");
  });

  it("starts canvas-first with both rails collapsed to header bars", () => {
    const { container } = render(<StudioLayout {...ui} variant="edit" />);
    expect(
      container
        .querySelector(".studio-nav")
        ?.getAttribute("data-collapsed"),
    ).toBe("true");
    expect(
      container
        .querySelector(".studio-inspector")
        ?.getAttribute("data-collapsed"),
    ).toBe("true");
    // Closed rails keep their labelled header as the tap target
    expect(container.querySelector(".studio-nav .rail-head__label")?.textContent).toBe("Outline");
    expect(container.querySelector(".studio-inspector .rail-head__label")?.textContent).toBe("Inspect");
    // Prefs stay untouched by the narrow accordion state
    expect(prefs.value.navCollapsed).toBe(false);
  });

  it("slides one pane open at a time without touching prefs", () => {
    const { getByLabelText, container } = render(
      <StudioLayout {...ui} variant="edit" />,
    );
    fireEvent.click(getByLabelText("Expand Outline"));
    expect(
      container
        .querySelector(".studio-nav")
        ?.getAttribute("data-collapsed"),
    ).toBeNull();
    expect(
      container
        .querySelector(".studio-inspector")
        ?.getAttribute("data-collapsed"),
    ).toBe("true");
    // Opening the inspector closes the outline (single-open accordion)
    fireEvent.click(getByLabelText("Expand Inspect"));
    expect(
      container
        .querySelector(".studio-nav")
        ?.getAttribute("data-collapsed"),
    ).toBe("true");
    expect(
      container
        .querySelector(".studio-inspector")
        ?.getAttribute("data-collapsed"),
    ).toBeNull();
    expect(prefs.value.navCollapsed).toBe(false);
    expect(prefs.value.inspectorCollapsed).toBe(false);
  });

  it("collapse toggles mark their section collapsed on desktop", () => {
    stubMatchMedia(false);
    const { getByLabelText, container } = render(
      <StudioLayout {...ui} variant="edit" />,
    );
    fireEvent.click(getByLabelText("Collapse Outline"));
    expect(prefs.value.navCollapsed).toBe(true);
    expect(
      container
        .querySelector(".studio-nav")
        ?.getAttribute("data-collapsed"),
    ).toBe("true");
  });

  it("bottom content renders bare and grows with its content", () => {
    const asideBottom = (
      <div class="appearance-bar" style={{ height: "333px" }}>
        controls
      </div>
    );
    const { container } = render(
      <StudioLayout {...ui} variant="edit" asideBottom={asideBottom} />,
    );
    expect(container.querySelector(".appearance-bar")).toBeTruthy();
    expect(container.querySelector(".pane-resizer--north")).toBeNull();
  });
});
