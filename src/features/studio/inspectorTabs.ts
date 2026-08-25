import type { IconName } from "../../ui/icons";

export type InspectorTabId =
  | "layers"
  | "design"
  | "data"
  | "comments"
  | "history"
  | "meta";

export const INSPECTOR_TABS: {
  id: InspectorTabId;
  label: string;
  icon: IconName;
}[] = [
  { id: "layers", label: "Layers", icon: "rows" },
  { id: "design", label: "Design", icon: "sliders" },
  { id: "data", label: "Data", icon: "database" },
  { id: "comments", label: "Notes", icon: "messages" },
  { id: "history", label: "History", icon: "history" },
  { id: "meta", label: "Meta", icon: "tags" },
];
