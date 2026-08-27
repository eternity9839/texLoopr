import type { Project } from "../document";
import type { DataRow } from "../bindings";
import { resolveTemplate } from "../bindings";
import type { OutputProfile } from "../workflow";
import { buildEmailHtml } from "./html";
import { buildEmailText } from "./text";
import { buildEmlMessage, imagesFromDataUriBlocks } from "./eml";
import {
  appChannelLabel,
  appVersionLabel,
  getOrCreateInstallId,
} from "./identity";
import { collectPresentedBlocks } from "./channelPreview";

export interface EmailArtifacts {
  subject: string;
  html: string;
  text: string;
  eml: string;
  language: string;
  installId: string;
  from: string;
  to: string;
  preheader: string;
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

  const subjectRaw = String(
    row.subject ?? project.subject ?? project.name ?? "Message",
  );
  const subject = resolveTemplate(subjectRaw, row, {
    missingAsEmpty: false,
    ctx,
  });

  const preheader = resolveTemplate(
    String(row.preheader ?? row.preview_text ?? ""),
    row,
    { missingAsEmpty: true, ctx },
  );

  const { cidByBlockId, images } = imagesFromDataUriBlocks(blocks);

  const htmlEmit = buildEmailHtml(blocks, {
    row,
    ctx,
    cidByBlockId,
    inlineDataUri: false,
    title: subject,
    mode: "emit",
  });

  const htmlPreview = buildEmailHtml(blocks, {
    row,
    ctx,
    inlineDataUri: true,
    title: subject,
    mode: "preview",
  });

  const text = buildEmailText(blocks, row, ctx, "emit");
  const to =
    opts.to ?? String(row.email ?? row.to ?? "recipient@example.com");
  const from = opts.from ?? "noreply@northline.example";
  const installId = opts.installId ?? getOrCreateInstallId();
  const eml = buildEmlMessage({
    from,
    to,
    subject,
    text,
    html: htmlEmit,
    images,
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
    preheader,
  };
}

export { buildEmailHtml } from "./html";
export { buildEmailText } from "./text";
export { buildEmlMessage } from "./eml";
export { layoutEmailBlocks, EMAIL_CONTENT_WIDTH } from "./layout";
export {
  buildSmsArtifacts,
  buildSmsText,
  collectPresentedBlocks,
} from "./channelPreview";
