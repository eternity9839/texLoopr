import { useState } from "preact/hooks";
import { Icon, BLOCK_TYPE_ICON } from "../../ui/icons";
import {
  TOOL_GROUPS,
  WORD_HELPER_TOOLS,
  type PlaceToolDef,
} from "../../model/placeTools";
import {
  activeTool,
  activeToolPreset,
  armPlaceTool,
  armSelectTool,
  placeCustomObject,
  prefs,
  project,
  setStudioView,
} from "../../state/store";
import { t, type MessageKey } from "../../i18n";
import type { BlockType } from "../../model/document";

export const BLOCK_TOOLS: { type: BlockType; label: string }[] =
  TOOL_GROUPS.flatMap((g) =>
    g.tools.map((tool) => ({ type: tool.type, label: tool.label })),
  );

const TOOL_LABEL_KEYS: Partial<Record<BlockType, MessageKey>> = {
  paragraph: "toolParagraph",
  text: "toolText",
  data: "toolData",
  link: "toolLink",
  list: "toolList",
  picture: "toolPicture",
  shape: "toolShape",
  files: "toolFiles",
  table: "toolTable",
  group: "toolGroup",
};

export function localizedBlockTypeLabel(type: BlockType, fallback?: string): string {
  const key = TOOL_LABEL_KEYS[type];
  return key ? t(key) : (fallback ?? type);
}

function localizedToolLabel(tool: PlaceToolDef): string {
  return localizedBlockTypeLabel(tool.type, tool.label);
}

function toolKey(t: PlaceToolDef): string {
  return t.preset ? `${t.type}:${t.preset}` : t.type;
}

function isArmed(t: PlaceToolDef): boolean {
  return (
    activeTool.value === t.type &&
    (activeToolPreset.value ?? null) === (t.preset ?? null)
  );
}

/** Fixed left tool palette — arm place tools; click the page to configure. */
export function Toolbox() {
  void prefs.value.locale;
  const customs = project.value.customObjects ?? [];
  const [sheet, setSheet] = useState<"none" | "word" | "customs">("none");

  const arm = (tool: PlaceToolDef) => {
    setStudioView("edit");
    if (isArmed(tool)) {
      armSelectTool();
      return;
    }
    armPlaceTool(tool.type, tool.preset ?? null);
    setSheet("none");
  };

  return (
    <div class="tool-palette" aria-label="Blocks toolbox" data-tour="toolbox">
      <div class="tool-palette__bar" role="toolbar" aria-label="Insert blocks">
        <button
          type="button"
          class={!activeTool.value ? "tool tool--on" : "tool"}
          title={`${t("toolSelect")} (V)`}
          aria-label={t("toolSelect")}
          aria-pressed={!activeTool.value}
          onClick={() => {
            setStudioView("edit");
            armSelectTool();
            setSheet("none");
          }}
        >
          <Icon name="pointer" size={15} />
        </button>
        <span class="tool-palette__sep" aria-hidden="true" />
        {TOOL_GROUPS.map((group, gi) => (
          <div class="tool-palette__group" key={group.id} role="group">
            {gi > 0 && <span class="tool-palette__sep" aria-hidden="true" />}
            {group.tools.map((tool) => {
              const label = localizedToolLabel(tool);
              return (
              <button
                type="button"
                class={isArmed(tool) ? "tool tool--on" : "tool"}
                key={toolKey(tool)}
                title={`${label} — ${tool.hint}`}
                aria-label={`${label}. ${tool.hint}`}
                aria-pressed={isArmed(tool)}
                onClick={() => arm(tool)}
              >
                <Icon name={BLOCK_TYPE_ICON[tool.type]} size={15} />
              </button>
              );
            })}
          </div>
        ))}
        <span class="tool-palette__sep" aria-hidden="true" />
        <button
          type="button"
          class={sheet === "word" ? "tool tool--on" : "tool"}
          title="Word-style helpers — headings, line, text box, lists"
          aria-label="Word-style helpers"
          aria-expanded={sheet === "word"}
          onClick={() =>
            setSheet((s) => (s === "word" ? "none" : "word"))
          }
        >
          <Icon name="book" size={15} />
        </button>
        <button
          type="button"
          class={sheet === "customs" ? "tool tool--on" : "tool"}
          title="Custom objects — place a saved group"
          aria-label="Custom objects"
          aria-expanded={sheet === "customs"}
          onClick={() =>
            setSheet((s) => (s === "customs" ? "none" : "customs"))
          }
        >
          <Icon name="object" size={15} />
        </button>
      </div>

      {sheet === "word" && (
        <div
          class="tool-palette__sheet"
          role="dialog"
          aria-label="Word-style helpers"
        >
          <p class="tool-palette__sheet-title">Word helpers</p>
          <p class="tool-palette__hint muted">
            Arm a helper, then click the page — a small window collects options
            before the block is added.
          </p>
          <div class="tool-palette__customs" aria-label="Helpers">
            {WORD_HELPER_TOOLS.map((tool) => (
              <button
                type="button"
                key={toolKey(tool)}
                class={
                  isArmed(tool)
                    ? "toolbox__custom toolbox__custom--flash"
                    : "toolbox__custom"
                }
                title={tool.hint}
                onClick={() => arm(tool)}
              >
                <Icon name={BLOCK_TYPE_ICON[tool.type]} size={12} />
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {sheet === "customs" && (
        <div
          class="tool-palette__sheet"
          role="dialog"
          aria-label="Custom objects"
        >
          <p class="tool-palette__sheet-title">Custom objects</p>
          {customs.length > 0 ? (
            <div class="tool-palette__customs" aria-label="Saved customs">
              {customs.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  class="toolbox__custom"
                  title={`Place “${c.name}”`}
                  onClick={() => {
                    setStudioView("edit");
                    placeCustomObject(c.id);
                    setSheet("none");
                  }}
                >
                  <Icon name="object" size={12} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <p class="tool-palette__hint muted">
              Save a selected group as a custom object to reuse it here.
            </p>
          )}
        </div>
      )}

      {activeTool.value && (
        <p class="tool-palette__armed muted" role="status">
          Click the page to place · Esc to cancel
        </p>
      )}
    </div>
  );
}
