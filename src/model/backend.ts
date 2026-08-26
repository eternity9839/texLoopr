/**
 * Transport bridge to the Rust backbone (ADR 0016).
 * Prefer: tauri-local → http-remote → js-fallback (dev only).
 */

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
import { getApiBaseUrl, getApiKey, resolveBackendTransport } from "../runtimeConfig";

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

async function httpJson<T>(
  path: string,
  init?: RequestInit & { raw?: boolean },
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) throw new Error("apiBaseUrl not configured");
  const { raw, headers: initHeaders, ...fetchInit } = init ?? {};
  const headers = new Headers(initHeaders);
  if (!headers.has("Content-Type") && fetchInit.body) {
    headers.set("Content-Type", "application/json");
  }
  const key = getApiKey();
  if (key) headers.set("X-Api-Key", key);
  const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    ...fetchInit,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (raw || ct.includes("application/pdf") || ct.includes("application/octet-stream")) {
    return (await res.arrayBuffer()) as T;
  }
  return (await res.json()) as T;
}

export async function parseDataInputBackend(raw: string): Promise<DataRow[]> {
  const transport = resolveBackendTransport();
  if (transport === "tauri-local") {
    try {
      const result = await invoke<{
        rows: DataRow[];
        columns: string[];
        format: string;
      }>("data_parse", { text: raw });
      return result.rows;
    } catch {
      /* fall through */
    }
  }
  if (transport === "http-remote") {
    try {
      const result = await httpJson<{ rows: DataRow[] }>("/v1/data/parse", {
        method: "POST",
        body: JSON.stringify({ text: raw }),
      });
      return result.rows;
    } catch {
      /* fall through to JS only if allowed */
    }
  }
  return parseDataInputJs(raw);
}

export async function resolveTemplateBackend(
  template: string,
  row: DataRow | undefined,
  options: { missingAsEmpty?: boolean; ctx?: RuntimeContext } = {},
): Promise<string> {
  const transport = resolveBackendTransport();
  if (transport === "tauri-local") {
    try {
      return await invoke<string>("template_resolve", {
        template,
        row: row ?? {},
        ctx: options.ctx ?? null,
        missing_as_empty: options.missingAsEmpty ?? true,
      });
    } catch {
      /* fall through */
    }
  }
  if (transport === "http-remote") {
    try {
      const result = await httpJson<{ text: string }>("/v1/template/resolve", {
        method: "POST",
        body: JSON.stringify({
          template,
          row: row ?? {},
          ctx: options.ctx ?? null,
          missingAsEmpty: options.missingAsEmpty ?? true,
        }),
      });
      return result.text;
    } catch {
      /* fall through */
    }
  }
  return resolveTemplateJs(template, row, options);
}

export async function runWorkflowBackend(
  opts: RunOptions,
): Promise<WorkflowResult> {
  const transport = resolveBackendTransport();
  if (transport === "tauri-local") {
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
      /* fall through */
    }
  }
  if (transport === "http-remote") {
    try {
      return await httpJson<WorkflowResult>("/v1/workflow/run", {
        method: "POST",
        body: JSON.stringify({
          project: opts.project,
          row: opts.row,
          output: opts.output,
          vars: opts.vars ?? null,
          preview: Boolean(opts.preview),
        }),
      });
    } catch {
      /* fall through */
    }
  }
  return runWorkflowJs(opts);
}

export async function getRuntimeInfo(): Promise<{
  version: string;
  backbone: string;
  engines: string[];
} | null> {
  const transport = resolveBackendTransport();
  if (transport === "tauri-local") {
    try {
      return await invoke("get_runtime_info");
    } catch {
      return null;
    }
  }
  if (transport === "http-remote") {
    try {
      return await httpJson("/v1/runtime");
    } catch {
      return null;
    }
  }
  return {
    version: "0.1.0",
    backbone: "javascript",
    engines: ["bindings", "expr", "runtime"],
  };
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

/** Rust structure import (ADR 0012). */
export async function importPdfStructureBackend(
  opts: { path?: string; bytesBase64?: string },
  onProgress?: (p: PdfImportProgress) => void,
): Promise<PdfImportResult | null> {
  const transport = resolveBackendTransport();
  if (transport === "tauri-local") {
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
  if (transport === "http-remote" && opts.bytesBase64) {
    return httpJson<PdfImportResult>("/v1/import-pdf", {
      method: "POST",
      body: JSON.stringify({ bytesBase64: opts.bytesBase64 }),
    });
  }
  return null;
}

/** Rust PDF render (ADR 0014 / 0016). */
export async function renderProjectPdfBackend(
  project: import("./document").Project,
  row: DataRow,
  output?: unknown,
): Promise<Uint8Array> {
  const transport = resolveBackendTransport();
  if (transport === "tauri-local") {
    const bytes = await invoke<number[]>("render_project_pdf_cmd", {
      project,
      row,
      output: output ?? null,
    });
    return new Uint8Array(bytes);
  }
  if (transport === "http-remote") {
    const buf = await httpJson<ArrayBuffer>("/v1/render", {
      method: "POST",
      body: JSON.stringify({ project, row, output: output ?? null }),
      raw: true,
    });
    return new Uint8Array(buf);
  }
  throw new Error("PDF rendering requires the Rust backend (Tauri or apiBaseUrl).");
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

/** Rust batch render + optional ZIP. */
export async function renderBatchBackend(opts: {
  project: import("./document").Project;
  rows: DataRow[];
  output?: unknown;
  includeZip?: boolean;
}): Promise<RenderBatchResult> {
  const transport = resolveBackendTransport();
  if (transport === "tauri-local") {
    return invoke<RenderBatchResult>("render_batch_cmd", {
      project: opts.project,
      rows: opts.rows,
      output: opts.output ?? null,
      includeZip: opts.includeZip ?? true,
    });
  }
  if (transport === "http-remote") {
    return httpJson<RenderBatchResult>("/v1/render-batch", {
      method: "POST",
      body: JSON.stringify({
        project: opts.project,
        rows: opts.rows,
        output: opts.output ?? null,
        includeZip: opts.includeZip ?? true,
      }),
    });
  }
  throw new Error("Rendering requires the Rust backend (Tauri or apiBaseUrl).");
}

export { isTauri, resolveBackendTransport };
