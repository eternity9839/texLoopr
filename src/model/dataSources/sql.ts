import type { DataRow } from "../bindings";
import type { DataSourceConfig, LoadDataSourceContext } from "./types";

export async function loadSqlSource(
  config: Extract<DataSourceConfig, { kind: "sql" }>,
  ctx: LoadDataSourceContext = {},
): Promise<DataRow[]> {
  if (config.driver === "postgres") {
    throw new Error("Postgres data sources are not implemented yet");
  }
  if (!config.connection.trim()) {
    throw new Error("SQLite data source needs a connection (file path)");
  }
  if (!config.query.trim()) {
    throw new Error("SQL data source needs a query");
  }
  if (!ctx.runSql) {
    throw new Error("SQL refresh requires the desktop or API backend");
  }
  const rows = await ctx.runSql({
    driver: config.driver,
    connection: config.connection,
    query: config.query,
  });
  return rows as DataRow[];
}
