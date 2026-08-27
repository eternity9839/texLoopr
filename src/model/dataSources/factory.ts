import type { DataRow } from "../bindings";
import { parseCsvRows } from "./parseCsv";
import { parseJsonRows } from "./parseJson";
import { parseXmlRows } from "./parseXml";
import { loadHttpSource, parseByFormat } from "./http";
import { loadSqlSource } from "./sql";
import { loadInboundSource } from "./inbound";
import type { DataSourceConfig, LoadDataSourceContext } from "./types";
import { defaultSourceForKind } from "./types";

export type LoadDataSourceOptions = LoadDataSourceContext & {
  /** Current cached rows (used by inbound) */
  existingRows?: DataRow[];
};

/**
 * Materialize a data source into rows for ProjectDataset.rows / template merge.
 */
export async function loadDataSource(
  config: DataSourceConfig | undefined | null,
  opts: LoadDataSourceOptions = {},
): Promise<DataRow[]> {
  const source = config ?? { kind: "none" as const };
  switch (source.kind) {
    case "none":
      return opts.existingRows ?? [];
    case "csv":
      return loadFileLike(source, opts, (raw) => parseCsvRows(raw));
    case "json":
      return loadFileLike(source, opts, (raw) => parseJsonRows(raw));
    case "xml":
      return loadFileLike(source, opts, (raw) =>
        parseXmlRows(raw, source.rowPath),
      );
    case "http":
      return loadHttpSource(source, opts);
    case "sql":
      return loadSqlSource(source, opts);
    case "inbound":
      return loadInboundSource(source, opts.existingRows);
  }
}

async function loadFileLike(
  source: Extract<DataSourceConfig, { kind: "csv" | "json" | "xml" }>,
  opts: LoadDataSourceOptions,
  parse: (raw: string) => DataRow[],
): Promise<DataRow[]> {
  let raw = source.inline ?? "";
  if (!raw.trim() && source.path) {
    if (!opts.readFile) {
      throw new Error(`File path set but no file reader available: ${source.path}`);
    }
    raw = await opts.readFile(source.path);
  }
  return parse(raw);
}

export { parseCsvRows, parseJsonRows, parseXmlRows, parseByFormat, defaultSourceForKind };
export type {
  DataSourceConfig,
  DataSourceKind,
  DataSourceRefresh,
  LoadDataSourceContext,
} from "./types";
