import { renderBatchBackend } from "../backend";
import type { DataRow } from "../bindings";
import type { Project } from "../document";
import type { EmlFileAttachment } from "./eml";
import { attachmentFilename, ticketPdfBase64 } from "./pdfStub";

export async function resolveEmailPdfAttachment(opts: {
  project: Project;
  row: DataRow;
  projectId?: string | null;
}): Promise<EmlFileAttachment | null> {
  const pdfOut = opts.project.outputs?.find((output) => output.kind === "pdf");
  if (!pdfOut) return null;

  const fallback = String(
    opts.row.label ??
      opts.row.title ??
      opts.row.event_name ??
      opts.row.gift_name ??
      opts.row.route ??
      opts.row.passenger_name ??
      opts.row.recipient_name ??
      opts.project.name ??
      "ticket",
  );
  const filename = attachmentFilename(opts.row, "ticket");

  try {
    const rendered = await renderBatchBackend({
      project: opts.project,
      rows: [opts.row],
      output: pdfOut,
      includeZip: false,
      projectId: opts.projectId,
    });
    const file = rendered.files[0];
    if (!file?.bytesBase64) throw new Error("PDF render returned no file");
    return {
      filename,
      mime: "application/pdf",
      dataBase64: file.bytesBase64,
    };
  } catch {
    return {
      filename,
      mime: "application/pdf",
      dataBase64: ticketPdfBase64(fallback),
    };
  }
}
