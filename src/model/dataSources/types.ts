/** Discriminator for dataset loaders. */
export type DataSourceKind =
  | "none"
  | "csv"
  | "json"
  | "xml"
  | "http"
  | "sql"
  | "inbound";

export type DataSourceRefresh = {
  mode: "manual" | "interval" | "inbound";
  /** Used when mode === "interval"; enforced by texlooper-cli serve (≥ 5000) */
  intervalMs?: number;
};

export type DataSourceConfig =
  | { kind: "none" }
  | {
      kind: "csv" | "json" | "xml";
      /** Inline payload (paste / last fetched body) */
      inline?: string;
      /** Optional desktop/serve file path hint */
      path?: string;
      /** XML: path to repeating row element (e.g. "items/item") */
      rowPath?: string;
    }
  | {
      kind: "http";
      url: string;
      method?: "GET" | "POST";
      headers?: Record<string, string>;
      body?: string;
      responseFormat: "json" | "xml" | "csv";
      rowPath?: string;
    }
  | {
      kind: "sql";
      driver: "sqlite" | "postgres";
      /** SQLite file path, or postgres connection string */
      connection: string;
      query: string;
    }
  | {
      kind: "inbound";
      /** Shared secret checked via X-Texlooper-Ingest-Secret */
      secret?: string;
      responseFormat?: "json" | "xml" | "csv";
    };

export type LoadDataSourceContext = {
  /** Read a local file (desktop/serve); optional in browser */
  readFile?: (path: string) => Promise<string>;
  /** Run SQL (desktop/serve backend) */
  runSql?: (opts: {
    driver: "sqlite" | "postgres";
    connection: string;
    query: string;
  }) => Promise<Record<string, unknown>[]>;
  /** Override fetch (tests) */
  fetchText?: (
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string },
  ) => Promise<string>;
};

export function defaultSourceForKind(kind: DataSourceKind): DataSourceConfig {
  switch (kind) {
    case "none":
      return { kind: "none" };
    case "csv":
      return { kind: "csv", inline: "" };
    case "json":
      return { kind: "json", inline: "[]" };
    case "xml":
      return { kind: "xml", inline: "", rowPath: "" };
    case "http":
      return {
        kind: "http",
        url: "",
        method: "GET",
        responseFormat: "json",
      };
    case "sql":
      return {
        kind: "sql",
        driver: "sqlite",
        connection: "",
        query: "SELECT * FROM data LIMIT 100",
      };
    case "inbound":
      return { kind: "inbound", responseFormat: "json" };
  }
}
