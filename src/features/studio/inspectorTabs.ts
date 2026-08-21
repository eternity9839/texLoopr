import type { IconName } from "../../ui/icons";

export type InspectorTabId = "props" | "meta" | "comments";

export const INSPECTOR_TABS: {
  id: InspectorTabId;
  label: string;
  icon: IconName;
}[] = [
  { id: "props", label: "Properties", icon: "sliders" },
  { id: "meta", label: "Metadata", icon: "tags" },
  { id: "comments", label: "Notes", icon: "messages" },
];
