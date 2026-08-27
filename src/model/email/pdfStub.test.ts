import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderBatchBackend } from "../backend";
import type { Project } from "../document";
import { resolveEmailPdfAttachment } from "./attachPdf";
import { attachmentFilename, ticketPdfBase64 } from "./pdfStub";

vi.mock("../backend", () => ({
  renderBatchBackend: vi.fn(),
}));

const project = {
  name: "Ticket",
  outputs: [
    { id: "preview", name: "Preview", kind: "preview" },
    { id: "pdf", name: "PDF", kind: "pdf" },
  ],
} as Project;

describe("email PDF attachments", () => {
  beforeEach(() => vi.mocked(renderBatchBackend).mockReset());

  it("builds a valid minimal PDF and safe filename", () => {
    const pdf = atob(ticketPdfBase64("Ticket (A)"));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("(Ticket \\(A\\)) Tj");
    expect(pdf).toContain("xref");
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(attachmentFilename({ ticket_code: "A / 42" }, "ticket")).toBe(
      "A_42.pdf",
    );
  });

  it("uses rendered PDF bytes when the backend succeeds", async () => {
    vi.mocked(renderBatchBackend).mockResolvedValue({
      files: [{ name: "render.pdf", bytesBase64: "cmVuZGVyZWQ=", rowIndex: 0 }],
      zipBase64: null,
      errors: [],
    });

    await expect(
      resolveEmailPdfAttachment({
        project,
        row: { ticket_code: "LIVE-42", event_name: "Live" },
      }),
    ).resolves.toEqual({
      filename: "LIVE-42.pdf",
      mime: "application/pdf",
      dataBase64: "cmVuZGVyZWQ=",
    });
  });

  it("falls back to the PDF stub when rendering fails", async () => {
    vi.mocked(renderBatchBackend).mockImplementationOnce(() => {
      throw new Error("offline");
    });
    const attachment = await resolveEmailPdfAttachment({
      project,
      row: { code: "GIFT-7", gift_name: "Museum pass" },
    });

    expect(attachment?.filename).toBe("GIFT-7.pdf");
    expect(atob(attachment!.dataBase64)).toContain("%PDF-1.4");
  });
});
