// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/preact";
import { HierarchyPanel } from "./HierarchyPanel";
import {
  activePage,
  createProject,
  project,
  select,
  selection,
  studioView,
} from "../../state/store";
import type { Block, BlockStyle, Project } from "../../model/document";

function block(id: string, name: string, type: Block["type"]): Block {
  return {
    id,
    type,
    name,
    x: 10,
    y: 10,
    w: 100,
    h: 40,
    content: {},
    style: {} as BlockStyle,
  };
}

function nestedProject(): Project {
  const p = createEmpty();
  const childA = block("c1", "Item label", "text");
  const childB = block("c2", "Badge", "shape");
  const group = block("g1", "Card group", "group");
  group.content = { blocks: [childA, childB] };
  const table = block("t1", "Price list", "table");
  p.pages[0].blocks = [group, table];
  return p;
}

function createEmpty(): Project {
  createProject();
  return structuredClone(project.value);
}

beforeEach(() => {
  cleanup();
  select(null);
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const g = globalThis as unknown as { ResizeObserver?: unknown };
  g.ResizeObserver = g.ResizeObserver ?? RO;
});

describe("HierarchyPanel", () => {
  it("renders every nesting level of the active page", () => {
    project.value = nestedProject();
    const { container } = render(<HierarchyPanel />);
    const names = [...container.querySelectorAll(".nav-block__name")].map(
      (n) => n.textContent,
    );
    expect(names).toEqual(["Card group", "Item label", "Badge", "Price list"]);
    const depths = [...container.querySelectorAll(".nav-block")].map((b) =>
      (b as HTMLElement).style.paddingLeft,
    );
    expect(depths).toEqual(["8px", "20px", "20px", "8px"]);
  });

  it("search matches component name or type and keeps ancestors", () => {
    project.value = nestedProject();
    const { getByLabelText, container } = render(<HierarchyPanel />);
    const input = getByLabelText("Search hierarchy") as HTMLInputElement;
    // by type: only the table hits, but the page stays expanded
    fireEvent.input(input, { target: { value: "table" } });
    let names = [...container.querySelectorAll(".nav-block__name")].map(
      (n) => n.textContent,
    );
    expect(names).toEqual(["Price list"]);
    // by name: the shape inside the group keeps its parent visible
    fireEvent.input(input, { target: { value: "badge" } });
    names = [...container.querySelectorAll(".nav-block__name")].map(
      (n) => n.textContent,
    );
    expect(names).toEqual(["Card group", "Badge"]);
  });

  it("selects a nested component and jumps to its page on click", () => {
    project.value = nestedProject();
    studioView.value = "data";
    const { getAllByText } = render(<HierarchyPanel />);
    fireEvent.click(getAllByText("Badge")[0]);
    expect(selection.value).toMatchObject({ kind: "block", id: "c2" });
    expect(activePage.value?.id ?? project.value.activePageId).toBe(
      project.value.pages[0].id,
    );
    expect(studioView.value).toBe("edit");
  });

  it("shows container child counts", () => {
    project.value = nestedProject();
    const { container } = render(<HierarchyPanel />);
    const counts = [...container.querySelectorAll(".nav-block__z")];
    expect(counts[0].textContent).toBe("2");
  });
});
