import { parseDataInput, type DataRow } from "../bindings";

/** Parse CSV/TSV text into rows (delegates to shared parser). */
export function parseCsvRows(raw: string): DataRow[] {
  const text = raw.trim();
  if (!text) return [];
  if (text.startsWith("[") || text.startsWith("{")) {
    throw new Error("CSV data source received JSON; use the JSON source");
  }
  return parseDataInput(text);
}
