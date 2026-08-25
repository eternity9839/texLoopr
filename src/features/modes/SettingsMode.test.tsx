// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/preact";
import { SettingsMode } from "./SettingsMode";
import {
  catalogBackend,
  catalogReady,
  createProject,
  prefs,
  settingsSection,
  updatePrefs,
} from "../../state/store";

beforeEach(() => {
  cleanup();
  createProject();
  settingsSection.value = "general";
  updatePrefs({ locale: "fr" });
});

describe("SettingsMode", () => {
  it("shows the product-level sections only (no canvas options)", () => {
    const { getByText } = render(<SettingsMode />);
    expect(getByText("Préférences")).toBeTruthy();
    expect(getByText("Connexions")).toBeTruthy();
    // grid/snap controls belong to the editor section, not general
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
    expect(getByText("Bibliothèque bureau (Tauri)")).toBeTruthy();
  });

  it("reports browser storage when no backend is present", () => {
    catalogReady.value = true;
    catalogBackend.value = "web";
    const { getByText } = render(<SettingsMode />);
    expect(getByText("Bibliothèque navigateur")).toBeTruthy();
  });
});
