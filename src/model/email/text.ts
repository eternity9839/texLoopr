import type { Block } from "../document";
import type { DataRow } from "../bindings";
import type { RuntimeContext } from "../expr";
import { buildSmsText } from "./channelPreview";

/** Plain-text alternative for multipart email / SMS body. */
export function buildEmailText(
  blocks: Block[],
  row: DataRow,
  ctx: RuntimeContext,
  mode: "preview" | "emit" = "emit",
): string {
  return buildSmsText(blocks, row, ctx, mode) || "(empty message)";
}
