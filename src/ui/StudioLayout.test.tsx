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

  it("reacts to viewport changes without remount", () => {
    stubMatchMedia(false);
    const { container } = render(<StudioLayout {...ui} variant="edit" />);
    expect(container.querySelector(".studio-nav")).toBeTruthy();
    act(() => resizeViewport(true));
    expect(container.querySelector(".studio-layout--narrow")).toBeTruthy();
    act(() => resizeViewport(false));
    expect(container.querySelector(".studio-layout--narrow")).toBeNull();
  });
});

describe("StudioLayout — narrow drawers", () => {
  beforeEach(() => stubMatchMedia(true));

  it("replaces rails with overlay drawers plus edge tabs", () => {
    const { getByLabelText, queryByLabelText, container } = render(
      <StudioLayout {...ui} variant="edit" />,
    );
    expect(container.querySelector(".studio-layout--narrow")).toBeTruthy();
    expect(container.querySelector(".studio-nav")).toBeNull();
    expect(container.querySelector(".studio-drawer--left")).toBeTruthy();
    expect(container.querySelector(".drawer-scrim")).toBeTruthy();
    // drawers are open so the reopen tabs stay hidden
    expect(queryByLabelText("Open outline")).toBeNull();
    void getByLabelText;
  });

  it("collapses a drawer into its edge tab and back", () => {
    const { getByLabelText, container } = render(
      <StudioLayout {...ui} variant="edit" />,
    );
    fireEvent.click(getByLabelText("Collapse Outline"));
    expect(prefs.value.navCollapsed).toBe(true);
    expect(container.querySelector(".studio-drawer--left")).toBeNull();
    fireEvent.click(getByLabelText("Open outline"));
    expect(prefs.value.navCollapsed).toBe(false);
    expect(container.querySelector(".studio-drawer--left")).toBeTruthy();
  });

  it("tap on the scrim closes every open drawer", () => {
    const { container } = render(<StudioLayout {...ui} variant="edit" />);
    const scrim = container.querySelector(".drawer-scrim")!;
    expect(scrim).toBeTruthy();
    fireEvent.click(scrim);
    expect(prefs.value.navCollapsed).toBe(true);
    expect(prefs.value.inspectorCollapsed).toBe(true);
    expect(container.querySelector(".studio-drawer--left")).toBeNull();
    expect(container.querySelector(".studio-drawer--right")).toBeNull();
    // edge tabs appear for reopening
    expect(container.querySelector(".drawer-tab--left")).toBeTruthy();
    expect(container.querySelector(".drawer-tab--right")).toBeTruthy();
  });

  it("edge tabs reopen their drawers", () => {
    updatePrefs({ navCollapsed: true, inspectorCollapsed: true });
    const { getByLabelText, container } = render(
      <StudioLayout {...ui} variant="edit" />,
    );
    expect(container.querySelector(".drawer-scrim")).toBeNull();
    fireEvent.click(getByLabelText("Open inspector"));
    expect(prefs.value.inspectorCollapsed).toBe(false);
    expect(container.querySelector(".studio-drawer--right")).toBeTruthy();
  });
});
