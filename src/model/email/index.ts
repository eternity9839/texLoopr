import type { Project } from "../document";
import type { DataRow } from "../bindings";
import { resolveTemplate } from "../bindings";
import type { OutputProfile } from "../workflow";
import { buildEmailHtml } from "./html";
import { buildEmailText } from "./text";
import {
  buildEmlMessage,
  imagesFromDataUriBlocks,
  type EmlFileAttachment,
} from "./eml";
import {
  appChannelLabel,
  appVersionLabel,
  getOrCreateInstallId,
} from "./identity";
import { collectPresentedBlocks } from "./channelPreview";
import {
  mergeEmailEnvelope,
  parseHeaderLines,
  type EmailEnvelope,
} from "./envelope";

export interface EmailArtifacts {
  subject: string;
  html: string;
  text: string;
  eml: string;
  language: string;
  installId: string;
  from: string;
  to: string;
  replyTo: string;
  cc: string;
  bcc: string;
  preheader: string;
  extraHeaders: { name: string; value: string }[];
  attachments: { filename: string }[];
}

export interface BuildEmailOptions {
  project: Project;
  row: DataRow;
  output: OutputProfile;
  languageOverride?: string | null;
  conditionOverrides?: import("../documentConditions").ConditionOverrides | null;
  from?: string;
  to?: string;
  /** Catalog / library project id when the draft is linked */
  projectId?: string | null;
  /** Override install id (tests) */
  installId?: string;
  attachments?: EmlFileAttachment[];
}

function resolveField(
  raw: string | undefined,
  row: DataRow,
  ctx: import("../expr").RuntimeContext,
  missingAsEmpty = true,
): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return resolveTemplate(s, row, { missingAsEmpty, ctx });
}

/**
 * Resolve visible pages/blocks for email output, apply language×output
 * variants, and emit HTML + plain text + multipart .eml.
 */
export function buildEmailArtifacts(opts: BuildEmailOptions): EmailArtifacts {
  const { project, row, output } = opts;
  const presented = collectPresentedBlocks({
    project,
    row,
    output,
    languageOverride: opts.languageOverride,
    conditionOverrides: opts.conditionOverrides,
  });
  const { language, blocks, ctx } = presented;

  const envelope: EmailEnvelope = mergeEmailEnvelope(
    project.email,
    output.email,
  );

  const subjectRaw =
    envelope.subject ||
    String(row.subject ?? project.subject ?? project.name ?? "Message");
  const subject = resolveTemplate(subjectRaw, row, {
    missingAsEmpty: false,
    ctx,
  });

  const preheader = resolveField(
    envelope.preheader ||
      String(row.preheader ?? row.preview_text ?? ""),
    row,
    ctx,
  );

  const from =
    opts.from ||
    resolveField(envelope.from, row, ctx) ||
    String(project.contactEmail ?? "").trim() ||
    "noreply@texlooper.local";

  const to =
    opts.to ||
    resolveField(envelope.to, row, ctx) ||
    String(row.email ?? row.to ?? "recipient@example.com");

  const replyTo = resolveField(envelope.replyTo, row, ctx);
  const cc = resolveField(envelope.cc, row, ctx);
  const bcc = resolveField(envelope.bcc, row, ctx);

  const extraHeaders = parseHeaderLines(envelope.headers ?? "").map((h) => ({
    name: h.name,
    value: resolveField(h.value, row, ctx) || h.value,
  })).filter((h) => h.value.trim());

  const { cidByBlockId, images } = imagesFromDataUriBlocks(blocks);

  const htmlEmit = buildEmailHtml(blocks, {
    row,
    ctx,
    cidByBlockId,
    inlineDataUri: false,
    title: subject,
    preheader,
    mode: "emit",
  });

  const htmlPreview = buildEmailHtml(blocks, {
    row,
    ctx,
    inlineDataUri: true,
    title: subject,
    preheader,
    mode: "preview",
  });

  const text = buildEmailText(blocks, row, ctx, "emit");
  const installId = opts.installId ?? getOrCreateInstallId();
  const eml = buildEmlMessage({
    from,
    to,
    replyTo: replyTo || undefined,
    cc: cc || undefined,
    bcc: bcc || undefined,
    subject,
    text,
    html: htmlEmit,
    images,
    attachments: opts.attachments,
    extraHeaders,
    appVersion: appVersionLabel(),
    appChannel: appChannelLabel(),
    installId,
    projectId: opts.projectId,
  });

  return {
    subject,
    html: htmlPreview,
    text,
    eml,
    language,
    installId,
    from,
    to,
    replyTo,
    cc,
    bcc,
    preheader,
    extraHeaders,
    attachments: (opts.attachments ?? []).map(({ filename }) => ({ filename })),
  };
}

export { buildEmailHtml } from "./html";
export { buildEmailText } from "./text";
export {
  buildEmlMessage,
  type EmlFileAttachment,
} from "./eml";
export { layoutEmailBlocks, EMAIL_CONTENT_WIDTH } from "./layout";
export {
  buildSmsArtifacts,
  buildSmsText,
  collectPresentedBlocks,
} from "./channelPreview";
export {
  mergeEmailEnvelope,
  parseHeaderLines,
  patchEmailEnvelope,
  type EmailEnvelope,
} from "./envelope";
export { resolveEmailPdfAttachment } from "./attachPdf";
export { attachmentFilename, ticketPdfBase64 } from "./pdfStub";
