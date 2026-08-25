// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/preact";
import { SettingsMode } from "./SettingsMode";
import { catalogBackend, catalogReady, createProject, prefs } from "../../state/store";

beforeEach(() => {
  cleanup();
  createProject();
});

describe("SettingsMode", () => {
  it("shows the product-level sections only (no canvas options)", () => {
    const { getByText } = render(<SettingsMode />);
    expect(getByText("Preferences")).toBeTruthy();
    expect(getByText("Connections")).toBeTruthy();
    // grid/snap controls belong to the editor toolbar, not settings
    expect(document.body.innerHTML.includes("Snap to grid")).toBe(false);
  });

  it("changes the theme through the store prefs", () => {
    const { container } = render(<SettingsMode />);
    const themeSelect = container.querySelector(
      "#settings-theme",
    ) as HTMLSelectElement;
    expect(themeSelect).toBeTruthy();
    fireEvent.change(themeSelect, { target: { value: "dusk" } });
    expect(prefs.value.theme).toBe("dusk");
  });

  it("reflects the catalog connection state", () => {
    catalogReady.value = true;
    catalogBackend.value = "tauri";
    const { getByText } = render(<SettingsMode />);
    expect(getByText("Desktop library (Tauri)")).toBeTruthy();
  });

  it("reports browser storage when no backend is present", () => {
    catalogReady.value = true;
    catalogBackend.value = "web";
    const { getByText } = render(<SettingsMode />);
    expect(getByText("Browser library")).toBeTruthy();
  });
});
