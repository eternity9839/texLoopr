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
import { invoke, listen, isTauriShell } from "@texlooper/platform";

function isTauri(): boolean {
  return isTauriShell();
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

export async function getRuntimeInfo(): Promise<RuntimeInfo | null> {
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
    version: __APP_VERSION__,
    channel: __APP_CHANNEL__,
    backbone: "javascript",
    engines: ["bindings", "expr", "runtime"],
  };
}

export type RuntimeInfo = {
  version: string;
  backbone: string;
  engines: string[];
  channel?: string;
  gitCommit?: string;
  gitTag?: string;
  builtAtUnix?: number;
  profile?: string;
  target?: string;
};

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
        unlisten = await listen<PdfImportProgress>("pdf-import-progress", (payload) => {
          onProgress(payload);
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
  opts?: { projectId?: string | null },
): Promise<Uint8Array> {
  const { attachEmitTrace } = await import("./emitIdentity");
  const stamped = attachEmitTrace(
    project as unknown as Record<string, unknown>,
    { projectId: opts?.projectId },
  );
  const transport = resolveBackendTransport();
  if (transport === "tauri-local") {
    const bytes = await invoke<number[]>("render_project_pdf_cmd", {
      project: stamped,
      row,
      output: output ?? null,
    });
    return new Uint8Array(bytes);
  }
  if (transport === "http-remote") {
    const buf = await httpJson<ArrayBuffer>("/v1/render", {
      method: "POST",
      body: JSON.stringify({ project: stamped, row, output: output ?? null }),
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
  projectId?: string | null;
}): Promise<RenderBatchResult> {
  const output = opts.output as { kind?: string } | null | undefined;
  if (output?.kind === "email") {
    return renderEmailBatchBackend(opts);
  }
  const { attachEmitTrace } = await import("./emitIdentity");
  const stamped = attachEmitTrace(
    opts.project as unknown as Record<string, unknown>,
    { projectId: opts.projectId },
  );
  const transport = resolveBackendTransport();
  if (transport === "tauri-local") {
    return invoke<RenderBatchResult>("render_batch_cmd", {
      project: stamped,
      rows: opts.rows,
      output: opts.output ?? null,
      includeZip: opts.includeZip ?? true,
    });
  }
  if (transport === "http-remote") {
    return httpJson<RenderBatchResult>("/v1/render-batch", {
      method: "POST",
      body: JSON.stringify({
        project: stamped,
        rows: opts.rows,
        output: opts.output ?? null,
        includeZip: opts.includeZip ?? true,
      }),
    });
  }
  throw new Error("Rendering requires the Rust backend (Tauri or apiBaseUrl).");
}

/** Multipart .eml batch (TS). Available without Rust. */
export async function renderEmailBatchBackend(opts: {
  project: import("./document").Project;
  rows: DataRow[];
  output?: unknown;
  includeZip?: boolean;
  projectId?: string | null;
}): Promise<RenderBatchResult> {
  const {
    buildEmailArtifacts,
    mergeEmailEnvelope,
    resolveEmailPdfAttachment,
  } = await import("./email");
  const output = opts.output as import("./workflow").OutputProfile;
  const files: RenderBatchFile[] = [];
  const errors: string[] = [];
  for (let i = 0; i < opts.rows.length; i += 1) {
    const row = opts.rows[i] ?? {};
    try {
      const envelope = mergeEmailEnvelope(opts.project.email, output.email);
      const attachment = envelope.attachPdf
        ? await resolveEmailPdfAttachment({
            project: opts.project,
            row,
            projectId: opts.projectId,
          })
        : null;
      const art = buildEmailArtifacts({
        project: opts.project,
        row,
        output,
        projectId: opts.projectId,
        attachments: attachment ? [attachment] : undefined,
      });
      const safe = art.subject.replace(/[^\w.-]+/g, "_").slice(0, 40) || "message";
      const bytes = new TextEncoder().encode(art.eml);
      let binary = "";
      for (let j = 0; j < bytes.length; j += 1) {
        binary += String.fromCharCode(bytes[j]!);
      }
      files.push({
        rowIndex: i,
        name: `${safe}-${i + 1}.eml`,
        bytesBase64: btoa(binary),
      });
    } catch (err) {
      errors.push(
        `Row ${i + 1}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return { files, zipBase64: null, errors };
}

/** Run a SQLite SELECT and return object rows (desktop / API). */
export async function runSqlQueryBackend(opts: {
  driver: "sqlite" | "postgres";
  connection: string;
  query: string;
}): Promise<Record<string, unknown>[]> {
  if (opts.driver === "postgres") {
    throw new Error("Postgres data sources are not implemented yet");
  }
  const transport = resolveBackendTransport();
  if (transport === "tauri-local") {
    return invoke<Record<string, unknown>[]>("dataset_sql_query", {
      connection: opts.connection,
      query: opts.query,
    });
  }
  if (transport === "http-remote") {
    const result = await httpJson<{ rows: Record<string, unknown>[] }>(
      "/v1/data/sql",
      {
        method: "POST",
        body: JSON.stringify({
          driver: opts.driver,
          connection: opts.connection,
          query: opts.query,
        }),
      },
    );
    return result.rows;
  }
  throw new Error("SQL queries require the desktop app or API server");
}

/** Read a local data file (path) via desktop/API. */
export async function readDataFileBackend(path: string): Promise<string> {
  const transport = resolveBackendTransport();
  if (transport === "tauri-local") {
    return invoke<string>("dataset_read_file", { path });
  }
  if (transport === "http-remote") {
    const result = await httpJson<{ text: string }>("/v1/data/read-file", {
      method: "POST",
      body: JSON.stringify({ path }),
    });
    return result.text;
  }
  throw new Error("File data sources require the desktop app or API server");
}

export { isTauri, resolveBackendTransport };
