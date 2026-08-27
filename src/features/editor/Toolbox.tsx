import { useEffect, useState } from "preact/hooks";
import { Icon, BLOCK_TYPE_ICON } from "../../ui/icons";
import {
  ALL_PLACE_TOOLS,
  LINK_DATE_TOOLS,
  MEDIA_SHEET_TOOLS,
  SHAPE_SHEET_TOOLS,
  SIGNATURE_QR_TOOLS,
  STRUCTURE_TOOLS,
  TEXT_SHEET_TOOLS,
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

export function localizedBlockTypeLabel(
  type: BlockType,
  fallback?: string,
): string {
  const key = TOOL_LABEL_KEYS[type];
  return key ? t(key) : (fallback ?? type);
}

function localizedToolLabel(tool: PlaceToolDef): string {
  return localizedBlockTypeLabel(tool.type, tool.label);
}

function toolKey(tool: PlaceToolDef): string {
  return tool.preset ? `${tool.type}:${tool.preset}` : tool.type;
}

function isArmed(tool: PlaceToolDef): boolean {
  return (
    activeTool.value === tool.type &&
    (activeToolPreset.value ?? null) === (tool.preset ?? null)
  );
}

function anyArmed(tools: PlaceToolDef[]): boolean {
  return tools.some(isArmed);
}

type SheetId =
  | "none"
  | "text"
  | "shape"
  | "media"
  | "word"
  | "customs"
  | "linkDate"
  | "signQr";

/** Open a toolbox flyout from shortcuts (or elsewhere). */
export const TOOLBOX_SHEET_EVENT = "texlooper-toolbox-sheet";

export function openToolboxSheet(id: Exclude<SheetId, "none">): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TOOLBOX_SHEET_EVENT, { detail: { sheet: id } }),
  );
}

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
            <span>{localizedToolLabel(tool)}</span>
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

  useEffect(() => {
    const onSheet = (e: Event) => {
      const detail = (e as CustomEvent<{ sheet: Exclude<SheetId, "none"> }>)
        .detail;
      if (detail?.sheet) setSheet(detail.sheet);
    };
    window.addEventListener(TOOLBOX_SHEET_EVENT, onSheet);
    return () => window.removeEventListener(TOOLBOX_SHEET_EVENT, onSheet);
  }, []);

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

  const textArmed = anyArmed(TEXT_SHEET_TOOLS);
  const shapeArmed = anyArmed(SHAPE_SHEET_TOOLS);
  const mediaArmed = anyArmed(MEDIA_SHEET_TOOLS);
  const linkDateArmed = anyArmed(LINK_DATE_TOOLS);
  const signQrArmed = anyArmed(SIGNATURE_QR_TOOLS);

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

        <button
          type="button"
          class={sheet === "text" || textArmed ? "tool tool--on" : "tool"}
          title={`${t("toolTextSet")} (T)`}
          aria-label={t("toolTextSet")}
          aria-expanded={sheet === "text"}
          onClick={() => toggleSheet("text")}
        >
          <Icon name="text" size={15} />
        </button>
        <button
          type="button"
          class={
            sheet === "linkDate" || linkDateArmed ? "tool tool--on" : "tool"
          }
          title="Link & date — fold open to choose"
          aria-label="Link and date"
          aria-expanded={sheet === "linkDate"}
          onClick={() => toggleSheet("linkDate")}
        >
          <Icon name="link" size={15} />
        </button>

        <span class="tool-palette__sep" aria-hidden="true" />

        <button
          type="button"
          class={sheet === "shape" || shapeArmed ? "tool tool--on" : "tool"}
          title={`${t("toolShapeSet")} (S)`}
          aria-label={t("toolShapeSet")}
          aria-expanded={sheet === "shape"}
          onClick={() => toggleSheet("shape")}
        >
          <Icon name="shape" size={15} />
        </button>
        <button
          type="button"
          class={sheet === "media" || mediaArmed ? "tool tool--on" : "tool"}
          title={`${t("toolMediaSet")} (I)`}
          aria-label={t("toolMediaSet")}
          aria-expanded={sheet === "media"}
          onClick={() => toggleSheet("media")}
        >
          <Icon name="picture" size={15} />
        </button>
        <button
          type="button"
          class={sheet === "signQr" || signQrArmed ? "tool tool--on" : "tool"}
          title="Signature & QR — fold open to choose"
          aria-label="Signature and QR code"
          aria-expanded={sheet === "signQr"}
          onClick={() => toggleSheet("signQr")}
        >
          <Icon name="signature" size={15} />
        </button>

        <span class="tool-palette__sep" aria-hidden="true" />

        {STRUCTURE_TOOLS.map((tool) => {
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

      {sheet === "text" && (
        <ToolSheet
          title={t("toolTextSet")}
          hint={t("toolSheetHint")}
          tools={TEXT_SHEET_TOOLS}
          arm={arm}
        />
      )}
      {sheet === "shape" && (
        <ToolSheet
          title={t("toolShapeSet")}
          hint={t("toolSheetHint")}
          tools={SHAPE_SHEET_TOOLS}
          arm={arm}
        />
      )}
      {sheet === "media" && (
        <ToolSheet
          title={t("toolMediaSet")}
          hint={t("toolSheetHint")}
          tools={MEDIA_SHEET_TOOLS}
          arm={arm}
        />
      )}
      {sheet === "linkDate" && (
        <ToolSheet
          title="Link & date"
          hint={t("toolSheetHint")}
          tools={LINK_DATE_TOOLS}
          arm={arm}
        />
      )}
      {sheet === "signQr" && (
        <ToolSheet
          title="Signature & QR"
          hint={t("toolSheetHint")}
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
