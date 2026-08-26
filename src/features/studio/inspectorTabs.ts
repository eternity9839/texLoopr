import type { IconName } from "../../ui/icons";
import type { MessageKey } from "../../i18n";

export type InspectorTabId =
  | "layers"
  | "design"
  | "data"
  | "comments"
  | "history"
  | "meta";

export const INSPECTOR_TABS: {
  id: InspectorTabId;
  labelKey: MessageKey;
  icon: IconName;
}[] = [
  { id: "layers", labelKey: "tabLayers", icon: "rows" },
  { id: "design", labelKey: "tabDesign", icon: "sliders" },
  { id: "data", labelKey: "tabData", icon: "database" },
  { id: "comments", labelKey: "tabNotes", icon: "messages" },
  { id: "history", labelKey: "tabHistory", icon: "history" },
  { id: "meta", labelKey: "tabMeta", icon: "tags" },
];
