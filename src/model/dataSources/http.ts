import type { DataRow } from "../bindings";
import type { DataSourceConfig, LoadDataSourceContext } from "./types";
import { parseCsvRows } from "./parseCsv";
import { parseJsonRows } from "./parseJson";
import { parseXmlRows } from "./parseXml";

export async function loadHttpSource(
  config: Extract<DataSourceConfig, { kind: "http" }>,
  ctx: LoadDataSourceContext = {},
): Promise<DataRow[]> {
  if (!config.url.trim()) {
    throw new Error("HTTP data source needs a URL");
  }
  const method = config.method ?? "GET";
  const text = ctx.fetchText
    ? await ctx.fetchText(config.url, {
        method,
        headers: config.headers,
        body: method === "POST" ? config.body : undefined,
      })
    : await defaultFetch(config.url, method, config.headers, config.body);

  return parseByFormat(text, config.responseFormat, config.rowPath);
}

export function parseByFormat(
  text: string,
  format: "json" | "xml" | "csv",
  rowPath?: string,
): DataRow[] {
  switch (format) {
    case "json":
      return parseJsonRows(text);
    case "xml":
      return parseXmlRows(text, rowPath);
    case "csv":
      return parseCsvRows(text);
  }
}

async function defaultFetch(
  url: string,
  method: string,
  headers?: Record<string, string>,
  body?: string,
): Promise<string> {
  const res = await fetch(url, {
    method,
    headers,
    body: method === "POST" ? body : undefined,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.text();
}
