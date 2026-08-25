// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/preact";
import { PrebuildPicker } from "./PrebuildPicker";
import {
  activePage,
  createProject,
  insertPlacement,
  prebuildPickerOpen,
  setInsertPlacement,
} from "../../state/store";
import { PREBUILD_RECIPES } from "../../model/prebuild/library";

beforeEach(() => {
  cleanup();
  createProject();
  prebuildPickerOpen.value = false;
  setInsertPlacement("cascade");
});

describe("PrebuildPicker", () => {
  it("stays hidden while the picker signal is closed", () => {
    const { container } = render(<PrebuildPicker />);
    expect(container.querySelector(".prebuild-picker")).toBeNull();
  });

  it("opens on the signal and closes via scrim tap or X button", () => {
    prebuildPickerOpen.value = true;
    const { container } = render(<PrebuildPicker />);
    expect(container.querySelector(".prebuild-picker")).toBeTruthy();
    fireEvent.click(document.querySelector(".prebuild-picker__scrim")!);
    expect(prebuildPickerOpen.value).toBe(false);
    expect(container.querySelector(".prebuild-picker")).toBeNull();
    cleanup();
    prebuildPickerOpen.value = true;
    const again = render(<PrebuildPicker />);
    fireEvent.click(again.getByLabelText("Close prebuild picker"));
    expect(prebuildPickerOpen.value).toBe(false);
  });

  it("renders a dialog listing every recipe with size hints", () => {
    prebuildPickerOpen.value = true;
    const { getByRole } = render(<PrebuildPicker />);
    expect(getByRole("dialog", { name: "Insert prebuild" })).toBeTruthy();
    const body = document.body.innerHTML;
    for (const recipe of PREBUILD_RECIPES) {
      expect(body.includes(recipe.label)).toBe(true);
      expect(body.includes(recipe.blurb)).toBe(true);
    }
    expect(document.querySelector(".prebuild-picker__size")).toBeTruthy();
  });

  it("choosing a recipe inserts its pieces and closes the picker", () => {
    prebuildPickerOpen.value = true;
    const recipe = PREBUILD_RECIPES[0]!;
    const expectedCount = recipe.build({ x: 0, y: 0 }).length;
    const before = activePage.value?.blocks.length ?? 0;
    const { getByTitle } = render(<PrebuildPicker />);
    fireEvent.click(getByTitle(new RegExp(`^${recipe.label} —`)));
    expect((activePage.value?.blocks.length ?? 0) - before).toBe(
      expectedCount,
    );
    expect(prebuildPickerOpen.value).toBe(false);
  });

  it("placement select updates where inserts land", () => {
    prebuildPickerOpen.value = true;
    const { container } = render(<PrebuildPicker />);
    const select = container.querySelector(
      ".prebuild-picker__place select",
    ) as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(insertPlacement.value).toBe("cascade");
    fireEvent.change(select, { target: { value: "center" } });
    expect(insertPlacement.value).toBe("center");
    fireEvent.change(select, { target: { value: "margins" } });
    expect(insertPlacement.value).toBe("margins");
  });
});
