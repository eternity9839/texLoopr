import type { IconName } from "../../ui/icons";

export type InspectorTabId = "props" | "tree" | "meta" | "comments";

export const INSPECTOR_TABS: {
  id: InspectorTabId;
  label: string;
  icon: IconName;
}[] = [
  { id: "props", label: "Properties", icon: "sliders" },
  { id: "tree", label: "Hierarchy", icon: "list" },
  { id: "meta", label: "Metadata", icon: "tags" },
  { id: "comments", label: "Notes", icon: "messages" },
];
