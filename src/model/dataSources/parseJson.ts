import { parseDataInput, type DataRow } from "../bindings";

/** Parse JSON object or array of objects into rows. */
export function parseJsonRows(raw: string): DataRow[] {
  const text = raw.trim();
  if (!text) return [];
  if (!(text.startsWith("[") || text.startsWith("{"))) {
    throw new Error("JSON data source expects an object or array");
  }
  return parseDataInput(text);
}
