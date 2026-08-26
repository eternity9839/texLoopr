/** Named header-row looks applied via Design → Table. */

export type TableHeaderStyleId =
  | "default"
  | "bold"
  | "subtle"
  | "lined"
  | "custom";

export type TableHeaderStylePatch = {
  headerStyle: TableHeaderStyleId;
  headerBackground?: string;
  headerColor?: string;
  headerFontWeight?: number;
  headerFontSize?: number;
  headerTextAlign?: "left" | "center" | "right";
  headerRule?: boolean;
};

export const TABLE_HEADER_STYLES: {
  id: TableHeaderStyleId;
  label: string;
  patch: Omit<TableHeaderStylePatch, "headerStyle">;
}[] = [
  {
    id: "default",
    label: "Default",
    patch: {
      headerBackground: "#f0ebe3",
      headerColor: "",
      headerFontWeight: 600,
      headerFontSize: 0,
      headerTextAlign: "left",
      headerRule: false,
    },
  },
  {
    id: "bold",
    label: "Bold band",
    patch: {
      headerBackground: "#1e3a5f",
      headerColor: "#ffffff",
      headerFontWeight: 700,
      headerFontSize: 0,
      headerTextAlign: "left",
      headerRule: false,
    },
  },
  {
    id: "subtle",
    label: "Subtle",
    patch: {
      headerBackground: "#f5f5f5",
      headerColor: "#5c6570",
      headerFontWeight: 600,
      headerFontSize: 0,
      headerTextAlign: "left",
      headerRule: false,
    },
  },
  {
    id: "lined",
    label: "Underline",
    patch: {
      headerBackground: "transparent",
      headerColor: "",
      headerFontWeight: 600,
      headerFontSize: 0,
      headerTextAlign: "left",
      headerRule: true,
    },
  },
];

export function applyTableHeaderStyle(
  id: TableHeaderStyleId,
): TableHeaderStylePatch {
  if (id === "custom") return { headerStyle: "custom" };
  const preset = TABLE_HEADER_STYLES.find((s) => s.id === id);
  return {
    headerStyle: id,
    ...(preset?.patch ?? TABLE_HEADER_STYLES[0]!.patch),
  };
}
