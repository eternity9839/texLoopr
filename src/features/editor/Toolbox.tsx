import { useState } from "preact/hooks";
import { Icon, BLOCK_TYPE_ICON } from "../../ui/icons";
import type { BlockType } from "../../model/document";
import { PREBUILD_RECIPES } from "../../model/prebuild/library";
import {
  activePrebuildId,
  insertBlock,
  placeCustomObject,
  prefs,
  project,
  setStudioView,
  updatePrefs,
} from "../../state/store";

const TOOLS: { type: BlockType; label: string }[] = [
  { type: "paragraph", label: "Paragraph" },
  { type: "text", label: "Text" },
  { type: "list", label: "List" },
  { type: "picture", label: "Picture" },
  { type: "shape", label: "Shape" },
  { type: "table", label: "Table" },
  { type: "files", label: "Files" },
  { type: "prebuild", label: "Prebuild" },
];

export { TOOLS as BLOCK_TOOLS };

export function Toolbox() {
  const collapsed = Boolean(prefs.value.toolsCollapsed);
  const vertical = prefs.value.toolsOrientation === "vertical";
  const recipeId = activePrebuildId.value;
  const customs = project.value.customObjects ?? [];
  const [flash, setFlash] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const place = (type: BlockType) => {
    setStudioView("edit");
    insertBlock(type);
    setFlash(type);
    window.setTimeout(() => setFlash((f) => (f === type ? null : f)), 280);
  };

  if (collapsed) {
    return (
      <div
        class="float-toolbox float-toolbox--peek"
        data-tour="toolbox"
        aria-label="Toolbox"
      >
        <button
          type="button"
          class="float-toolbox__peek"
          title="Show blocks toolbox"
          aria-label="Show blocks toolbox"
          onClick={() => updatePrefs({ toolsCollapsed: false })}
        >
          <Icon name="layout" size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      class={
        vertical
          ? "float-toolbox float-toolbox--vertical"
          : "float-toolbox float-toolbox--horizontal"
      }
      aria-label="Blocks toolbox"
      data-tour="toolbox"
    >
      <div class="float-toolbox__bar" role="toolbar" aria-label="Insert blocks">
        {TOOLS.map((tool) => (
          <button
            type="button"
            class={flash === tool.type ? "tool tool--flash" : "tool"}
            key={tool.type}
            title={`Add ${tool.label}`}
            aria-label={`Add ${tool.label}`}
            onClick={() => place(tool.type)}
          >
            <Icon name={BLOCK_TYPE_ICON[tool.type]} size={15} />
          </button>
        ))}
        <button
          type="button"
          class={moreOpen ? "tool tool--on" : "tool"}
          title="Recipes & custom objects"
          aria-label="Recipes and custom objects"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <Icon name="object" size={15} />
        </button>
        <button
          type="button"
          class="tool tool--ghost"
          title="Hide toolbox"
          aria-label="Hide toolbox"
          onClick={() => {
            setMoreOpen(false);
            updatePrefs({ toolsCollapsed: true });
          }}
        >
          <Icon name="chevronLeft" size={12} />
        </button>
      </div>
      {moreOpen && (
        <div class="float-toolbox__sheet">
          <label class="float-toolbox__field">
            <span>Prebuild</span>
            <select
              value={recipeId}
              title="Prebuild recipe"
              aria-label="Prebuild recipe"
              onChange={(e) => {
                activePrebuildId.value = e.currentTarget.value;
              }}
            >
              {PREBUILD_RECIPES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          {customs.length > 0 ? (
            <div class="float-toolbox__customs" aria-label="Custom objects">
              {customs.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  class={
                    flash === c.id
                      ? "toolbox__custom toolbox__custom--flash"
                      : "toolbox__custom"
                  }
                  title={`Place “${c.name}”`}
                  onClick={() => {
                    setStudioView("edit");
                    placeCustomObject(c.id);
                    setFlash(c.id);
                    window.setTimeout(
                      () => setFlash((f) => (f === c.id ? null : f)),
                      280,
                    );
                  }}
                >
                  <Icon name="object" size={12} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <p class="float-toolbox__hint muted">
              Save a group as a custom object to list it here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
