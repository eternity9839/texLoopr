import { render as preactRender } from "preact";
import type { Project } from "../../model/document";
import type { DataRow } from "../../model/bindings";
import type { OutputProfile } from "../../model/workflow";
import type { ConditionOverrides } from "../../model/documentConditions";
import {
  buildBrowserPdfDocument,
  type BrowserPdfDocumentModel,
} from "../../model/browserPdf";
import { renderBlock } from "../editor/blocks";
import { log } from "../../debug/logger";

function noopSelect(): void {
  /* print surface is non-interactive */
}

function BrowserPdfSurface({ model }: { model: BrowserPdfDocumentModel }) {
  return (
    <div class="browser-pdf-root">
      {model.pages.map((sheet, i) => (
        <div
          key={sheet.page.id}
          class="browser-pdf-page"
          style={{
            width: `${sheet.width}px`,
            height: `${sheet.height}px`,
            pageBreakAfter: i < model.pages.length - 1 ? "always" : "auto",
          }}
        >
          {sheet.blocks.map((block) => {
            const ctx =
              sheet.itemContexts.get(block.id) ?? model.runtime;
            return (
              <div
                key={block.id}
                class="browser-pdf-block"
                style={{
                  position: "absolute",
                  left: `${block.x}px`,
                  top: `${block.y}px`,
                  width: `${block.w}px`,
                  height: `${block.h}px`,
                  zIndex: block.zIndex ?? 1,
                }}
              >
                {renderBlock({
                  block,
                  selected: false,
                  preview: true,
                  row: model.row,
                  runtime: ctx,
                  onSelect: noopSelect,
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function copyStyles(from: Document, to: Document): void {
  for (const node of from.querySelectorAll('link[rel="stylesheet"], style')) {
    to.head.appendChild(node.cloneNode(true));
  }
  const printCss = to.createElement("style");
  printCss.textContent = `
    @page { margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .browser-pdf-root { margin: 0; padding: 0; }
    .browser-pdf-page {
      position: relative;
      margin: 0 auto;
      background: #fff;
      overflow: hidden;
      box-sizing: border-box;
    }
    .browser-pdf-block { box-sizing: border-box; }
    .block-frame__chrome,
    .block-frame__handles,
    .resize-handle,
    .block-group__badge,
    .pin-badge { display: none !important; }
    .block-frame {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      background: transparent !important;
    }
    @media print {
      .browser-pdf-page { break-after: page; }
      .browser-pdf-page:last-child { break-after: auto; }
    }
  `;
  to.head.appendChild(printCss);
}

function waitForPaint(win: Window): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Fonts / images
        const ready =
          "fonts" in win.document
            ? (win.document as Document & { fonts: FontFaceSet }).fonts.ready
            : Promise.resolve();
        void Promise.resolve(ready).then(() => {
          window.setTimeout(resolve, 120);
        });
      });
    });
  });
}

/**
 * Open a CSS-parity print surface and invoke the system print dialog
 * (Save as PDF). Matches canvas preview flatten + block renderers.
 */
export async function printBrowserPdf(opts: {
  project: Project;
  rows: DataRow[];
  output: OutputProfile;
  languageOverride?: string | null;
  conditionOverrides?: ConditionOverrides | null;
}): Promise<void> {
  const rows = opts.rows.length ? opts.rows : [{}];
  log.info("render", "browser pdf print", {
    rows: rows.length,
    outputId: opts.output.id,
  });

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "texLooper print");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  const iwin = iframe.contentWindow;
  if (!idoc || !iwin) {
    iframe.remove();
    throw new Error("Could not create print frame");
  }

  idoc.open();
  idoc.write(
    "<!doctype html><html><head><meta charset=\"utf-8\"><title>texLooper</title></head><body></body></html>",
  );
  idoc.close();
  copyStyles(document, idoc);

  const mount = idoc.createElement("div");
  idoc.body.appendChild(mount);

  // Concatenate all rows as successive page stacks in one print job.
  const models = rows.map((row) =>
    buildBrowserPdfDocument({
      project: opts.project,
      row,
      output: opts.output,
      languageOverride: opts.languageOverride,
      conditionOverrides: opts.conditionOverrides,
    }),
  );

  preactRender(
    <div class="browser-pdf-batch">
      {models.map((model, idx) => (
        <div key={idx} class="browser-pdf-row">
          <BrowserPdfSurface model={model} />
        </div>
      ))}
    </div>,
    mount,
  );

  try {
    await waitForPaint(iwin);
    iwin.focus();
    iwin.print();
  } finally {
    window.setTimeout(() => {
      try {
        preactRender(null, mount);
      } catch {
        /* ignore */
      }
      iframe.remove();
    }, 1000);
  }
}
