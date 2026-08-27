import type { DataRow } from "../bindings";
import type { DataSourceConfig } from "./types";

/**
 * Inbound sources do not pull on refresh — rows arrive via
 * POST /v1/data/sources/{id}/ingest. Manual refresh is a no-op that keeps
 * existing rows (caller should not clear them).
 */
export async function loadInboundSource(
  _config: Extract<DataSourceConfig, { kind: "inbound" }>,
  existingRows: DataRow[] = [],
): Promise<DataRow[]> {
  return existingRows;
}
