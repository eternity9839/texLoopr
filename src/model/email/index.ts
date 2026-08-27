import type { Project } from "../document";
import type { DataRow } from "../bindings";
import {
  blockMeetsCondition,
  pageMeetsCondition,
  resolveTemplate,
} from "../bindings";
import type { OutputProfile } from "../workflow";
import { enrichPreviewContext } from "../runtime";
import { resolveDocumentLanguage } from "../documentLanguage";
import { resolveBlockPresentation } from "../blockVariants";
import { flattenBlocksForPreview } from "../groups";
import { buildEmailHtml } from "./html";
import { buildEmailText } from "./text";
import { buildEmlMessage, imagesFromDataUriBlocks } from "./eml";
import {
  appChannelLabel,
  appVersionLabel,
  getOrCreateInstallId,
} from "./identity";

export interface EmailArtifacts {
  subject: string;
  html: string;
  text: string;
  eml: string;
  language: string;
  installId: string;
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
  const language = resolveDocumentLanguage(
    project,
    row,
    opts.languageOverride,
  );
  const ctx = enrichPreviewContext(
    project,
    row,
    output,
    {},
    opts.languageOverride,
    opts.conditionOverrides,
  );

  const pages = (project.pages ?? []).filter((p) =>
    pageMeetsCondition(p, row, ctx, { preview: true }),
  );

  const presented = pages.flatMap((page) => {
    const visible = page.blocks.filter((b) =>
      blockMeetsCondition(b, row, ctx, { preview: true }),
    );
    const withVariants = visible.map((b) =>
      resolveBlockPresentation(b, language, output.kind),
    );
    const flat = flattenBlocksForPreview(withVariants, row, ctx);
    return flat.blocks;
  });

  const subjectRaw =
    String(row.subject ?? project.subject ?? project.name ?? "Message");
  const subject = resolveTemplate(subjectRaw, row, {
    missingAsEmpty: true,
    ctx,
  });

  const { cidByBlockId, images } = imagesFromDataUriBlocks(presented);

  const html = buildEmailHtml(presented, {
    row,
    ctx,
    cidByBlockId,
    inlineDataUri: false,
    title: subject,
  });

  const htmlPreview = buildEmailHtml(presented, {
    row,
    ctx,
    inlineDataUri: true,
    title: subject,
  });

  const text = buildEmailText(presented, row, ctx);
  const to =
    opts.to ??
    String(row.email ?? row.to ?? "recipient@example.com");
  const installId = opts.installId ?? getOrCreateInstallId();
  const eml = buildEmlMessage({
    from: opts.from ?? "noreply@northline.example",
    to,
    subject,
    text,
    html,
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
  };
}

export { buildEmailHtml } from "./html";
export { buildEmailText } from "./text";
export { buildEmlMessage } from "./eml";
export { layoutEmailBlocks, EMAIL_CONTENT_WIDTH } from "./layout";
