import { useState } from "preact/hooks";
import { Icon, BLOCK_TYPE_ICON } from "../../ui/icons";
import {
  ALL_PLACE_TOOLS,
  LINK_DATE_TOOLS,
  SIGNATURE_QR_TOOLS,
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
  ALL_PLACE_TOOLS.map((tool) => ({ type: tool.type, label: tool.label }));

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

type SheetId = "none" | "word" | "customs" | "linkDate" | "signQr";

function ToolSheet({
  title,
  hint,
  tools,
  arm,
}: {
  title: string;
  hint: string;
  tools: PlaceToolDef[];
  arm: (tool: PlaceToolDef) => void;
}) {
  return (
    <div class="tool-palette__sheet" role="dialog" aria-label={title}>
      <p class="tool-palette__sheet-title">{title}</p>
      <p class="tool-palette__hint muted">{hint}</p>
      <div class="tool-palette__customs" aria-label={title}>
        {tools.map((tool) => (
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
  );
}

/** Fixed left tool palette — arm place tools; click the page to configure. */
export function Toolbox() {
  void prefs.value.locale;
  const customs = project.value.customObjects ?? [];
  const [sheet, setSheet] = useState<SheetId>("none");

  const arm = (tool: PlaceToolDef) => {
    setStudioView("edit");
    if (isArmed(tool)) {
      armSelectTool();
      return;
    }
    armPlaceTool(tool.type, tool.preset ?? null);
    setSheet("none");
  };

  const toggleSheet = (id: Exclude<SheetId, "none">) =>
    setSheet((s) => (s === id ? "none" : id));

  const linkDateArmed = LINK_DATE_TOOLS.some(isArmed);
  const signQrArmed = SIGNATURE_QR_TOOLS.some(isArmed);

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
            {group.id === "text" && (
              <button
                type="button"
                class={
                  sheet === "linkDate" || linkDateArmed
                    ? "tool tool--on"
                    : "tool"
                }
                title="Link & date — fold open to choose"
                aria-label="Link and date"
                aria-expanded={sheet === "linkDate"}
                onClick={() => toggleSheet("linkDate")}
              >
                <Icon name="link" size={15} />
              </button>
            )}
            {group.id === "media" && (
              <button
                type="button"
                class={
                  sheet === "signQr" || signQrArmed ? "tool tool--on" : "tool"
                }
                title="Signature & QR — fold open to choose"
                aria-label="Signature and QR code"
                aria-expanded={sheet === "signQr"}
                onClick={() => toggleSheet("signQr")}
              >
                <Icon name="signature" size={15} />
              </button>
            )}
          </div>
        ))}
        <span class="tool-palette__sep" aria-hidden="true" />
        <button
          type="button"
          class={sheet === "word" ? "tool tool--on" : "tool"}
          title="Word-style helpers — headings, line, text box, lists"
          aria-label="Word-style helpers"
          aria-expanded={sheet === "word"}
          onClick={() => toggleSheet("word")}
        >
          <Icon name="book" size={15} />
        </button>
        <button
          type="button"
          class={sheet === "customs" ? "tool tool--on" : "tool"}
          title="Custom objects — place a saved group"
          aria-label="Custom objects"
          aria-expanded={sheet === "customs"}
          onClick={() => toggleSheet("customs")}
        >
          <Icon name="object" size={15} />
        </button>
      </div>

      {sheet === "linkDate" && (
        <ToolSheet
          title="Link & date"
          hint="Pick a variant, then click the page to place."
          tools={LINK_DATE_TOOLS}
          arm={arm}
        />
      )}
      {sheet === "signQr" && (
        <ToolSheet
          title="Signature & QR"
          hint="Pick a variant, then click the page to place."
          tools={SIGNATURE_QR_TOOLS}
          arm={arm}
        />
      )}
      {sheet === "word" && (
        <ToolSheet
          title="Word helpers"
          hint="Arm a helper, then click the page — options collect before place."
          tools={WORD_HELPER_TOOLS}
          arm={arm}
        />
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
