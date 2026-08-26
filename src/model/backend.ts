/** Prefer Rust (Tauri) for heavy runtime work; fall back to JS on web. */

import {
  parseDataInput as parseDataInputJs,
  type DataRow,
} from "./bindings";
import {
  resolveTemplate as resolveTemplateJs,
} from "./bindings";
import {
  runWorkflow as runWorkflowJs,
  type RunOptions,
  type WorkflowResult,
} from "./runtime";
import type { RuntimeContext } from "./expr";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export async function parseDataInputBackend(raw: string): Promise<DataRow[]> {
  if (!isTauri()) return parseDataInputJs(raw);
  try {
    const result = await invoke<{
      rows: DataRow[];
      columns: string[];
      format: string;
    }>("data_parse", { text: raw });
    return result.rows;
  } catch {
    return parseDataInputJs(raw);
  }
}

export async function resolveTemplateBackend(
  template: string,
  row: DataRow | undefined,
  options: { missingAsEmpty?: boolean; ctx?: RuntimeContext } = {},
): Promise<string> {
  if (!isTauri()) {
    return resolveTemplateJs(template, row, options);
  }
  try {
    return await invoke<string>("template_resolve", {
      template,
      row: row ?? {},
      ctx: options.ctx ?? null,
      missing_as_empty: options.missingAsEmpty ?? true,
    });
  } catch {
    return resolveTemplateJs(template, row, options);
  }
}

export async function runWorkflowBackend(
  opts: RunOptions,
): Promise<WorkflowResult> {
  if (!isTauri()) return runWorkflowJs(opts);
  try {
    const result = await invoke<{
      ok: boolean;
      skippedRow: boolean;
      context: RuntimeContext;
      scriptResults: Record<string, unknown>;
      logs: WorkflowResult["logs"];
      emit: WorkflowResult["emit"];
      pdfBase64?: string | null;
    }>("workflow_run", {
      project: opts.project,
      row: opts.row,
      output: opts.output,
      vars: opts.vars ?? null,
      preview: Boolean(opts.preview),
    });
    return {
      ok: result.ok,
      skippedRow: result.skippedRow,
      context: result.context,
      scriptResults: result.scriptResults as WorkflowResult["scriptResults"],
      logs: result.logs,
      emit: result.emit,
      pdfBase64: result.pdfBase64,
    };
  } catch {
    return runWorkflowJs(opts);
  }
}

export async function getRuntimeInfo(): Promise<{
  version: string;
  backbone: string;
  engines: string[];
} | null> {
  if (!isTauri()) {
    return {
      version: "0.1.0",
      backbone: "javascript",
      engines: ["bindings", "expr", "runtime"],
    };
  }
  try {
    return await invoke("get_runtime_info");
  } catch {
    return null;
  }
}

export type PdfImportProgress = {
  phase: string;
  page: number;
  total: number;
};

export type PdfImportResult = {
  project: import("./document").Project;
  warnings: string[];
};

/** Rust structure import (ADR 0012). Web builds return null. */
export async function importPdfStructureBackend(
  opts: { path?: string; bytesBase64?: string },
  onProgress?: (p: PdfImportProgress) => void,
): Promise<PdfImportResult | null> {
  if (!isTauri()) return null;
  let unlisten: (() => void) | undefined;
  try {
    if (onProgress) {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen<PdfImportProgress>("pdf-import-progress", (e) => {
        onProgress(e.payload);
      });
    }
    return await invoke<PdfImportResult>("pdf_import_structure", {
      path: opts.path ?? null,
      bytesBase64: opts.bytesBase64 ?? null,
    });
  } finally {
    unlisten?.();
  }
}

/** Rust PDF render (ADR 0014). Requires desktop runtime. */
export async function renderProjectPdfBackend(
  project: import("./document").Project,
  row: DataRow,
  output?: unknown,
): Promise<Uint8Array> {
  if (!isTauri()) {
    throw new Error("PDF rendering requires the desktop app (Rust runtime).");
  }
  const bytes = await invoke<number[]>("render_project_pdf_cmd", {
    project,
    row,
    output: output ?? null,
  });
  return new Uint8Array(bytes);
}

export type RenderBatchFile = {
  name: string;
  bytesBase64: string;
  rowIndex: number;
};

export type RenderBatchResult = {
  files: RenderBatchFile[];
  zipBase64: string | null;
  errors: string[];
};

/** Rust batch render + optional ZIP (ADR 0014). No JS fallback. */
export async function renderBatchBackend(opts: {
  project: import("./document").Project;
  rows: DataRow[];
  output?: unknown;
  includeZip?: boolean;
}): Promise<RenderBatchResult> {
  if (!isTauri()) {
    throw new Error("Rendering requires the desktop app (Rust runtime).");
  }
  return invoke<RenderBatchResult>("render_batch_cmd", {
    project: opts.project,
    rows: opts.rows,
    output: opts.output ?? null,
    includeZip: opts.includeZip ?? true,
  });
}
