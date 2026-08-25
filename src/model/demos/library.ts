import type { Project } from "../document";
import { createId } from "../document";
import { defaultOutputs } from "../workflow";
import { DEMO_IMG } from "./assets";
import { b, page, shell } from "./helpers";

export interface DemoEntry {
  id: string;
  title: string;
  category: string;
  blurb: string;
  /** Sample CSV loaded into Data when the demo opens */
  sampleCsv: string;
  build: () => Project;
}

function letter(): Project {
  return shell(
    {
      name: "Formal business letter",
      author: "Northline Correspondence",
      subject: "A4 letterhead with merge fields",
      description:
        "Conventional letter: letterhead, date, address block, body, signature. Binds recipient fields.",
    },
    [
      page("Letter", [
        b("picture", {
          name: "Logo",
          x: 40,
          y: 28,
          w: 140,
          h: 40,
          content: { src: DEMO_IMG.logoMark, alt: "Northline" },
        }),
        b("text", {
          name: "Sender",
          x: 400,
          y: 28,
          w: 260,
          h: 52,
          content: {
            text: "Northline Systems\n14 Harbor Lane, Antwerp\nops@northline.example",
          },
          style: { fontSize: 10, color: "#5c6570", textAlign: "right" },
        }),
        b("shape", {
          name: "Rule",
          x: 40,
          y: 84,
          w: 620,
          h: 4,
          content: { shape: "rect" },
          style: { background: "#0f6b63" },
        }),
        b("text", {
          name: "Date",
          x: 40,
          y: 108,
          w: 200,
          h: 22,
          content: { text: "{{date}}" },
          style: { fontSize: 12, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "Recipient",
          x: 40,
          y: 140,
          w: 280,
          h: 64,
          content: {
            text: "{{title}} {{name}}\n{{company}}\n{{address}}",
          },
          style: { fontSize: 12, color: "#1c2430" },
        }),
        b("text", {
          name: "Subject line",
          x: 40,
          y: 220,
          w: 520,
          h: 24,
          content: { text: "Re: {{subject}}" },
          style: { fontSize: 13, fontWeight: 700, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "Salutation + body",
          x: 40,
          y: 256,
          w: 620,
          h: 160,
          content: {
            text: "Dear {{title}} {{name}},\n\nThank you for your inquiry regarding {{topic}}. We are pleased to confirm availability for the engagement described in our proposal dated {{date}}.\n\nPlease find the enclosed schedule. We remain at your disposal for any clarification.",
          },
          style: { fontSize: 12, color: "#1c2430" },
        }),
        b("text", {
          name: "Closing",
          x: 40,
          y: 440,
          w: 200,
          h: 40,
          content: { text: "Yours sincerely,\n{{signer}}" },
          style: { fontSize: 12, color: "#1c2430" },
        }),
        b("picture", {
          name: "Signature",
          x: 40,
          y: 488,
          w: 160,
          h: 44,
          content: { src: DEMO_IMG.signature, alt: "Signature" },
        }),
        b("text", {
          name: "Confidential",
          x: 40,
          y: 900,
          w: 620,
          h: 20,
          content: {
            text: "Confidential — intended solely for {{company}}. {{ref}}",
          },
          style: { fontSize: 9, color: "#8a929c", textAlign: "center" },
          condition: "output.kind != 'preview' || env.preview",
        }),
      ]),
    ],
  );
}

function contract(): Project {
  return shell(
    {
      name: "Service agreement",
      author: "Northline Legal",
      subject: "Two-page contract with schedule table",
      description:
        "Conventional MSA-style first pages: parties, clauses, fees table, approval stamp, signature block.",
    },
    [
      page("Terms", [
        b("text", {
          name: "Title",
          x: 40,
          y: 36,
          w: 500,
          h: 28,
          content: { text: "MASTER SERVICES AGREEMENT" },
          style: { fontSize: 18, fontWeight: 700, color: "#1c2430" },
        }),
        b("text", {
          name: "Ref",
          x: 40,
          y: 68,
          w: 400,
          h: 18,
          content: { text: "Agreement No. {{contract_id}} · Effective {{start_date}}" },
          style: { fontSize: 11, color: "#5c6570" },
        }),
        b("paragraph", {
          name: "Parties",
          x: 40,
          y: 100,
          w: 620,
          h: 56,
          content: {
            text: "This Agreement is entered into by {{provider}} (“Provider”) and {{client}} (“Client”). Each party represents it has authority to bind its organization.",
          },
          style: { fontSize: 11, color: "#1c2430" },
        }),
        b("list", {
          name: "Key terms",
          x: 40,
          y: 168,
          w: 400,
          h: 100,
          content: {
            items: [
              "1. Services as described in Schedule A",
              "2. Fees payable within {{net_days}} days",
              "3. Confidentiality for {{term_years}} years",
              "4. Governing law: {{jurisdiction}}",
            ],
          },
          style: { fontSize: 11, color: "#1c2430" },
        }),
        b("picture", {
          name: "Stamp",
          x: 520,
          y: 168,
          w: 72,
          h: 72,
          content: { src: DEMO_IMG.stamp, alt: "Approved" },
          condition: "data.approved == 'yes'",
        }),
        b("paragraph", {
          name: "Clause 5",
          x: 40,
          y: 288,
          w: 620,
          h: 88,
          content: {
            text: "5. Limitation of liability. Except for willful misconduct, Provider’s aggregate liability under this Agreement shall not exceed the fees paid by Client in the twelve (12) months preceding the claim. Neither party is liable for indirect or consequential damages.",
          },
          style: { fontSize: 11, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "Clause 6",
          x: 40,
          y: 388,
          w: 620,
          h: 72,
          content: {
            text: "6. Termination. Either party may terminate for convenience with {{notice_days}} days’ written notice, or immediately for material breach not cured within fifteen (15) days of notice.",
          },
          style: { fontSize: 11, color: "#1c2430" },
        }),
      ]),
      page("Schedule A", [
        b("text", {
          name: "Schedule title",
          x: 40,
          y: 36,
          w: 400,
          h: 24,
          content: { text: "Schedule A — Fees & deliverables" },
          style: { fontSize: 15, fontWeight: 700, color: "#1c2430" },
        }),
        b("table", {
          name: "Fee table",
          x: 40,
          y: 80,
          w: 620,
          h: 140,
          content: {
            rows: 4,
            cols: 4,
            cells: [
              ["Item", "Qty", "Unit", "Amount"],
              ["{{line1}}", "{{qty1}}", "{{unit1}}", "{{amt1}}"],
              ["{{line2}}", "{{qty2}}", "{{unit2}}", "{{amt2}}"],
              ["Total", "", "", "{{total}}"],
            ],
          },
          style: { fontSize: 11, color: "#1c2430" },
        }),
        b("text", {
          name: "Sign provider",
          x: 40,
          y: 280,
          w: 260,
          h: 48,
          content: { text: "Provider\n{{provider}}\n________________" },
          style: { fontSize: 11, color: "#1c2430" },
        }),
        b("text", {
          name: "Sign client",
          x: 360,
          y: 280,
          w: 260,
          h: 48,
          content: { text: "Client\n{{client}}\n________________" },
          style: { fontSize: 11, color: "#1c2430" },
        }),
        b("picture", {
          name: "Sig",
          x: 40,
          y: 340,
          w: 150,
          h: 40,
          content: { src: DEMO_IMG.signature, alt: "Signature" },
        }),
      ]),
    ],
  );
}

function advertisement(): Project {
  return shell(
    {
      name: "Print advertisement",
      author: "Northline Marketing",
      subject: "Full-bleed retail flyer",
      description:
        "Print ad layout: hero image, headline, offer table, CTA. Extra QR-style mark for print output.",
    },
    [
      page("Flyer", [
        b("picture", {
          name: "Hero",
          x: 0,
          y: 0,
          w: 720,
          h: 220,
          content: { src: DEMO_IMG.productHero, alt: "Atlas Pack" },
          zIndex: 0,
        }),
        b("text", {
          name: "Eyebrow",
          x: 40,
          y: 240,
          w: 200,
          h: 18,
          content: { text: "LIMITED RELEASE" },
          style: { fontSize: 10, fontWeight: 700, color: "#0f6b63" },
        }),
        b("paragraph", {
          name: "Headline",
          x: 40,
          y: 262,
          w: 480,
          h: 56,
          content: {
            text: "{{headline|default:Carry less. Arrive ready.}}",
          },
          style: { fontSize: 26, fontWeight: 700, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "Body",
          x: 40,
          y: 328,
          w: 420,
          h: 72,
          content: {
            text: "{{offer_copy}} Valid through {{valid_until}} at participating retailers. While supplies last.",
          },
          style: { fontSize: 12, color: "#3d4a5c" },
        }),
        b("table", {
          name: "SKUs",
          x: 40,
          y: 420,
          w: 400,
          h: 110,
          content: {
            rows: 3,
            cols: 3,
            cells: [
              ["SKU", "Color", "Price"],
              ["{{sku1}}", "{{color1}}", "{{price1}}"],
              ["{{sku2}}", "{{color2}}", "{{price2}}"],
            ],
          },
          style: { fontSize: 11 },
        }),
        b("shape", {
          name: "CTA plate",
          x: 480,
          y: 420,
          w: 180,
          h: 110,
          content: { shape: "rect" },
          style: { background: "#0f6b63", borderRadius: 4 },
        }),
        b("text", {
          name: "CTA",
          x: 496,
          y: 456,
          w: 148,
          h: 48,
          content: { text: "{{cta}}\n{{store_url}}" },
          style: { fontSize: 13, fontWeight: 700, color: "#ffffff", textAlign: "center" },
          zIndex: 2,
        }),
        b("text", {
          name: "Print code",
          x: 40,
          y: 900,
          w: 300,
          h: 18,
          content: { text: "PRINT LOT {{lot}} · {{device.dpi}}dpi" },
          style: { fontSize: 9, color: "#8a929c" },
          condition: "output.kind == 'print' || output.kind == 'pdf'",
        }),
      ]),
    ],
  );
}

function email(): Project {
  return shell(
    {
      name: "Email newsletter",
      author: "Northline Lifecycle",
      subject: "Transactional + marketing email frame",
      description:
        "Email-safe single column: preheader, logo, hero, modules, footer unsubscribe. API output ready.",
    },
    [
      page("Message", [
        b("text", {
          name: "Preheader",
          x: 48,
          y: 16,
          w: 520,
          h: 16,
          content: { text: "{{preheader}}" },
          style: { fontSize: 9, color: "#9aa3ad" },
        }),
        b("shape", {
          name: "Canvas",
          x: 40,
          y: 40,
          w: 540,
          h: 720,
          content: { shape: "rect" },
          style: { background: "#ffffff", borderRadius: 2 },
          zIndex: 0,
        }),
        b("picture", {
          name: "Logo",
          x: 64,
          y: 56,
          w: 120,
          h: 36,
          content: { src: DEMO_IMG.logoMark, alt: "Northline" },
          zIndex: 1,
        }),
        b("picture", {
          name: "Hero",
          x: 64,
          y: 108,
          w: 492,
          h: 160,
          content: { src: DEMO_IMG.productHero, alt: "Feature" },
          zIndex: 1,
        }),
        b("text", {
          name: "Title",
          x: 64,
          y: 288,
          w: 492,
          h: 28,
          content: { text: "{{title}}" },
          style: { fontSize: 20, fontWeight: 700, color: "#1c2430" },
          zIndex: 1,
        }),
        b("paragraph", {
          name: "Intro",
          x: 64,
          y: 324,
          w: 492,
          h: 72,
          content: { text: "Hi {{first_name}},\n\n{{intro}}" },
          style: { fontSize: 13, color: "#3d4a5c" },
          zIndex: 1,
        }),
        b("table", {
          name: "Modules",
          x: 64,
          y: 412,
          w: 492,
          h: 100,
          content: {
            rows: 3,
            cols: 2,
            cells: [
              ["Update", "Detail"],
              ["{{mod1_title}}", "{{mod1_body}}"],
              ["{{mod2_title}}", "{{mod2_body}}"],
            ],
          },
          style: { fontSize: 11 },
          zIndex: 1,
        }),
        b("text", {
          name: "CTA link",
          x: 64,
          y: 536,
          w: 280,
          h: 28,
          content: { text: "→ {{cta_label}}: {{cta_url}}" },
          style: { fontSize: 13, fontWeight: 600, color: "#0f6b63" },
          zIndex: 1,
        }),
        b("picture", {
          name: "Avatar",
          x: 64,
          y: 584,
          w: 48,
          h: 48,
          content: { src: DEMO_IMG.headshot, alt: "Author" },
          zIndex: 1,
        }),
        b("text", {
          name: "From",
          x: 124,
          y: 592,
          w: 300,
          h: 36,
          content: { text: "{{sender_name}}\n{{sender_role}}" },
          style: { fontSize: 11, color: "#5c6570" },
          zIndex: 1,
        }),
        b("text", {
          name: "Footer",
          x: 64,
          y: 680,
          w: 492,
          h: 48,
          content: {
            text: "You’re receiving this because you subscribed as {{email}}.\nUnsubscribe · {{unsub_url}} · © {{year}} Northline",
          },
          style: { fontSize: 9, color: "#9aa3ad", textAlign: "center" },
          zIndex: 1,
        }),
        b("text", {
          name: "API hint",
          x: 64,
          y: 740,
          w: 400,
          h: 16,
          content: { text: "Emit via API · {{output.apiMethod}} {{output.apiUrl}}" },
          style: { fontSize: 9, color: "#0f6b63" },
          condition: "output.kind == 'api'",
          zIndex: 1,
        }),
      ]),
    ],
  );
}

function invoice(): Project {
  return shell(
    {
      name: "Commercial invoice",
      author: "Northline Finance",
      subject: "Invoice with line items and totals",
      description:
        "Standard B2B invoice: bill-to, ship-to, line table, tax, payment terms, logo.",
    },
    [
      page("Invoice", [
        b("picture", {
          name: "Logo",
          x: 40,
          y: 28,
          w: 130,
          h: 38,
          content: { src: DEMO_IMG.logoMark, alt: "Northline" },
        }),
        b("text", {
          name: "Invoice label",
          x: 420,
          y: 28,
          w: 240,
          h: 40,
          content: { text: "INVOICE\n{{invoice_no}}" },
          style: { fontSize: 20, fontWeight: 700, color: "#1c2430", textAlign: "right" },
        }),
        b("text", {
          name: "Meta",
          x: 420,
          y: 78,
          w: 240,
          h: 40,
          content: { text: "Date {{invoice_date}}\nDue {{due_date}}" },
          style: { fontSize: 11, color: "#5c6570", textAlign: "right" },
        }),
        b("paragraph", {
          name: "Bill to",
          x: 40,
          y: 126,
          w: 280,
          h: 64,
          content: {
            text: "Bill to\n{{bill_name}}\n{{bill_company}}\n{{bill_address}}",
          },
          style: { fontSize: 11, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "Ship to",
          x: 360,
          y: 126,
          w: 280,
          h: 64,
          content: {
            text: "Ship to\n{{ship_name}}\n{{ship_address}}",
          },
          style: { fontSize: 11, color: "#1c2430" },
        }),
        b("table", {
          name: "Lines",
          x: 40,
          y: 196,
          w: 620,
          h: 180,
          content: {
            rows: 5,
            cols: 4,
            cells: [
              ["Description", "Qty", "Rate", "Amount"],
              ["{{desc1}}", "{{qty1}}", "{{rate1}}", "{{amt1}}"],
              ["{{desc2}}", "{{qty2}}", "{{rate2}}", "{{amt2}}"],
              ["{{desc3}}", "{{qty3}}", "{{rate3}}", "{{amt3}}"],
              ["", "", "Subtotal", "{{subtotal}}"],
            ],
          },
          style: { fontSize: 11 },
        }),
        b("table", {
          name: "Totals",
          x: 400,
          y: 400,
          w: 260,
          h: 90,
          content: {
            rows: 3,
            cols: 2,
            cells: [
              ["Tax ({{tax_pct}}%)", "{{tax}}"],
              ["Shipping", "{{shipping}}"],
              ["Total {{currency}}", "{{total}}"],
            ],
          },
          style: { fontSize: 12, fontWeight: 600 },
        }),
        b("paragraph", {
          name: "Terms",
          x: 40,
          y: 420,
          w: 320,
          h: 72,
          content: {
            text: "Payment terms: {{terms}}\nBank: {{bank_ref}}\nQuestions: billing@northline.example",
          },
          style: { fontSize: 10, color: "#5c6570" },
        }),
        b("text", {
          name: "Past due",
          x: 40,
          y: 520,
          w: 400,
          h: 22,
          content: { text: "STATUS: PAST DUE — please remit {{total}} immediately." },
          style: { fontSize: 12, fontWeight: 700, color: "#b45309" },
          condition: "data.status == 'past_due'",
        }),
      ]),
    ],
  );
}

function paper(): Project {
  return shell(
    {
      name: "Research paper cover",
      author: "Northline Research",
      subject: "Academic-style title page + abstract",
      description:
        "Paper cover: title, authors, affiliation, abstract, keywords, figure placeholder.",
    },
    [
      page("Cover", [
        b("text", {
          name: "Journal",
          x: 40,
          y: 48,
          w: 500,
          h: 18,
          content: { text: "{{journal}} · Vol. {{volume}} · {{year}}" },
          style: { fontSize: 11, color: "#0f6b63" },
        }),
        b("paragraph", {
          name: "Title",
          x: 40,
          y: 88,
          w: 620,
          h: 72,
          content: { text: "{{paper_title}}" },
          style: { fontSize: 22, fontWeight: 700, color: "#1c2430", textAlign: "center" },
        }),
        b("text", {
          name: "Authors",
          x: 40,
          y: 176,
          w: 620,
          h: 24,
          content: { text: "{{authors}}" },
          style: { fontSize: 13, color: "#1c2430", textAlign: "center" },
        }),
        b("text", {
          name: "Affiliation",
          x: 40,
          y: 204,
          w: 620,
          h: 20,
          content: { text: "{{affiliation}}" },
          style: { fontSize: 11, color: "#5c6570", textAlign: "center" },
        }),
        b("text", {
          name: "Abstract label",
          x: 40,
          y: 260,
          w: 120,
          h: 18,
          content: { text: "Abstract" },
          style: { fontSize: 12, fontWeight: 700, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "Abstract",
          x: 40,
          y: 284,
          w: 620,
          h: 140,
          content: { text: "{{abstract}}" },
          style: { fontSize: 11, color: "#1c2430" },
        }),
        b("text", {
          name: "Keywords",
          x: 40,
          y: 440,
          w: 620,
          h: 24,
          content: { text: "Keywords: {{keywords}}" },
          style: { fontSize: 11, color: "#5c6570" },
        }),
        b("picture", {
          name: "Figure",
          x: 200,
          y: 500,
          w: 300,
          h: 140,
          content: { src: DEMO_IMG.chartThumb, alt: "Figure 1" },
        }),
        b("text", {
          name: "Caption",
          x: 140,
          y: 652,
          w: 420,
          h: 20,
          content: { text: "Figure 1. {{figure_caption}}" },
          style: { fontSize: 10, color: "#5c6570", textAlign: "center" },
        }),
      ]),
    ],
  );
}

function shippingLabel(): Project {
  const outputs = defaultOutputs().map((o) =>
    o.kind === "print" ? { ...o, name: "Label 203dpi" } : o,
  );
  return shell(
    {
      name: "Shipping label",
      author: "Northline Logistics",
      subject: "203dpi label printer layout",
      description:
        "Compact label for thermal printers: addresses, barcode field, weight table. Print-device conditions.",
    },
    [
      page("Label", [
        b("text", {
          name: "Carrier",
          x: 24,
          y: 16,
          w: 200,
          h: 18,
          content: { text: "{{carrier}} · {{service}}" },
          style: { fontSize: 10, fontWeight: 700, color: "#1c2430" },
        }),
        b("text", {
          name: "Tracking",
          x: 24,
          y: 36,
          w: 280,
          h: 22,
          content: { text: "{{tracking}}" },
          style: { fontSize: 14, fontWeight: 700, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "From",
          x: 24,
          y: 68,
          w: 200,
          h: 64,
          content: { text: "FROM\n{{from_name}}\n{{from_address}}" },
          style: { fontSize: 10, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "To",
          x: 240,
          y: 68,
          w: 220,
          h: 72,
          content: { text: "TO\n{{to_name}}\n{{to_address}}" },
          style: { fontSize: 11, fontWeight: 600, color: "#1c2430" },
        }),
        b("table", {
          name: "Parcel",
          x: 24,
          y: 160,
          w: 300,
          h: 72,
          content: {
            rows: 2,
            cols: 3,
            cells: [
              ["Weight", "Dims", "Zone"],
              ["{{weight}}", "{{dims}}", "{{zone}}"],
            ],
          },
          style: { fontSize: 10 },
        }),
        b("shape", {
          name: "Barcode area",
          x: 24,
          y: 250,
          w: 420,
          h: 56,
          content: { shape: "rect" },
          style: { background: "#1c2430" },
        }),
        b("text", {
          name: "Barcode text",
          x: 40,
          y: 268,
          w: 388,
          h: 24,
          content: { text: "|||| {{tracking}} ||||" },
          style: {
            fontSize: 16,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
          },
          zIndex: 2,
        }),
        b("text", {
          name: "Device note",
          x: 24,
          y: 320,
          w: 400,
          h: 16,
          content: {
            text: "Print · {{device.media}} @ {{device.dpi}}dpi",
          },
          style: { fontSize: 9, color: "#0f6b63" },
          condition: "output.kind == 'print'",
        }),
      ]),
    ],
    { outputs },
  );
}

function memo(): Project {
  return shell(
    {
      name: "Internal memo & agenda",
      author: "Northline PMO",
      subject: "Office memo with agenda table",
      description:
        "Classic corporate memo header plus meeting agenda table and action list.",
    },
    [
      page("Memo", [
        b("text", {
          name: "MEMO",
          x: 40,
          y: 32,
          w: 120,
          h: 24,
          content: { text: "MEMORANDUM" },
          style: { fontSize: 14, fontWeight: 700, color: "#0f6b63" },
        }),
        b("table", {
          name: "Header fields",
          x: 40,
          y: 68,
          w: 620,
          h: 100,
          content: {
            rows: 4,
            cols: 2,
            cells: [
              ["To", "{{to}}"],
              ["From", "{{from}}"],
              ["Date", "{{date}}"],
              ["Subject", "{{subject}}"],
            ],
          },
          style: { fontSize: 11 },
        }),
        b("paragraph", {
          name: "Body",
          x: 40,
          y: 188,
          w: 620,
          h: 88,
          content: { text: "{{body}}" },
          style: { fontSize: 12, color: "#1c2430" },
        }),
        b("text", {
          name: "Agenda label",
          x: 40,
          y: 292,
          w: 200,
          h: 20,
          content: { text: "Meeting agenda" },
          style: { fontSize: 12, fontWeight: 700, color: "#1c2430" },
        }),
        b("table", {
          name: "Agenda",
          x: 40,
          y: 320,
          w: 620,
          h: 140,
          content: {
            rows: 4,
            cols: 3,
            cells: [
              ["Time", "Topic", "Owner"],
              ["{{t1}}", "{{topic1}}", "{{owner1}}"],
              ["{{t2}}", "{{topic2}}", "{{owner2}}"],
              ["{{t3}}", "{{topic3}}", "{{owner3}}"],
            ],
          },
          style: { fontSize: 11 },
        }),
        b("list", {
          name: "Actions",
          x: 40,
          y: 484,
          w: 420,
          h: 88,
          content: {
            items: [
              "Action: {{action1}}",
              "Action: {{action2}}",
              "Decision by: {{decision_date}}",
            ],
          },
          style: { fontSize: 11 },
        }),
        b("files", {
          name: "Attachments",
          x: 480,
          y: 484,
          w: 180,
          h: 48,
          content: { label: "Attachments", count: 2 },
        }),
      ]),
    ],
  );
}

function welcome(): Project {
  const blockA = createId();
  return shell(
    {
      name: "Welcome to texLoopr",
      author: "You",
      subject: "Quickstart sample",
      description: "Small starter with bindings, conditions, and a guide comment.",
    },
    [
      page("Page 1", [
        {
          id: blockA,
          type: "paragraph",
          name: "Greeting",
          x: 40,
          y: 48,
          w: 300,
          h: 56,
          content: {
            text: "Hello {{name|upper}}, welcome to {{company|default:texLoopr}}.",
          },
          style: { fontSize: 16, fontWeight: 600, color: "#1c2430" },
          bindings: { text: "name" },
        },
        b("text", {
          name: "Role line",
          x: 40,
          y: 120,
          w: 220,
          h: 28,
          content: { text: "Role: {{role}}" },
          style: { fontSize: 13, color: "#3d4a5c" },
          condition: "data.role",
        }),
        b("text", {
          name: "Print-only mark",
          x: 40,
          y: 160,
          w: 240,
          h: 24,
          content: { text: "LABEL · {{device.media}} · {{device.dpi}}dpi" },
          style: { fontSize: 11, color: "#0f6b63" },
          condition: "output.kind == 'print' && device.media == 'label'",
        }),
      ]),
      page("Page 2", [
        b("text", {
          name: "Next steps",
          x: 40,
          y: 240,
          w: 320,
          h: 72,
          content: {
            text: "Next steps\n• Load your data in the Data view\n• Drag blocks from the toolbox\n• Pick a saved prebuild to start fast",
          },
          style: { fontSize: 12, color: "#3d4a5c" },
        }),
      ]),
    ],
    {
      comments: [
        {
          id: createId(),
          blockId: blockA,
          body: "Open Samples for full letter, contract, invoice, email, and more.",
          author: "Guide",
          createdAt: new Date().toISOString(),
        },
      ],
    },
  );
}



function advancedInvoice(): Project {
  const lineChildren = [
    b("text", {
      name: "Line desc",
      x: 8,
      y: 6,
      w: 280,
      h: 22,
      content: { text: "{{description}}" },
      style: { fontSize: 12, color: "#1c2430" },
    }),
    b("text", {
      name: "Line qty",
      x: 300,
      y: 6,
      w: 48,
      h: 22,
      content: { text: "{{qty}}" },
      style: { fontSize: 12, textAlign: "right" },
    }),
    b("text", {
      name: "Line amount",
      x: 360,
      y: 6,
      w: 100,
      h: 22,
      content: { text: "{{amount|currency:EUR}}" },
      style: { fontSize: 12, textAlign: "right" },
    }),
  ];
  return shell(
    {
      name: "Advanced invoice (repeat)",
      author: "Northline Billing",
      subject: "Repeater + filters + #if",
      description:
        "JSON line_items repeater, currency filters, conditional overdue banner.",
    },
    [
      page("Invoice", [
        b("text", {
          name: "Title",
          x: 40,
          y: 32,
          w: 400,
          h: 32,
          content: { text: "Invoice {{invoice_no}}" },
          style: { fontSize: 22, fontWeight: 700 },
        }),
        b("text", {
          name: "Overdue",
          x: 40,
          y: 72,
          w: 520,
          h: 28,
          content: {
            text: "{{#if status == 'past_due'}}OVERDUE — pay immediately{{else}}Status: {{status|upper}}{{/if}}",
          },
          style: { fontSize: 12, color: "#9b2c2c" },
          condition: "status",
        }),
        b("text", {
          name: "Bill to",
          x: 40,
          y: 120,
          w: 280,
          h: 64,
          content: {
            text: "{{bill_name}}\n{{bill_company}}\n{{bill_address}}",
          },
          style: { fontSize: 12 },
        }),
        b("text", {
          name: "Dates",
          x: 400,
          y: 120,
          w: 220,
          h: 48,
          content: {
            text: "Issued {{invoice_date|date:short}}\nDue {{due_date|date:short}}",
          },
          style: { fontSize: 11, textAlign: "right", color: "#5c6570" },
        }),
        b("repeat", {
          name: "Line items",
          x: 40,
          y: 220,
          w: 520,
          h: 48,
          content: {
            itemsPath: "line_items",
            itemVar: "item",
            blocks: lineChildren,
          },
        }),
        b("text", {
          name: "Total",
          x: 360,
          y: 420,
          w: 200,
          h: 28,
          content: { text: "Total {{total|currency:EUR}}" },
          style: { fontSize: 14, fontWeight: 700, textAlign: "right" },
        }),
        b("picture", {
          name: "Stamp",
          x: 40,
          y: 480,
          w: 96,
          h: 64,
          content: { src: "{{stamp_url}}", alt: "Paid stamp" },
          condition: "status == 'paid'",
        }),
      ]),
    ],
  );
}


const ACCENT = "#31547a";
const INK = "#232a33";
const MUTED = "#5c6570";

function sectionHeading(text: string, x: number, y: number, w: number) {
  return b("text", {
    name: `Heading ${text}`,
    x,
    y,
    w,
    h: 20,
    content: { text },
    style: {
      fontFamily: "ui",
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1.6,
      color: ACCENT,
    },
  });
}

function jobEntry(
  y: number,
  f: { period: string; title: string; company: string; p1: string; p2: string; p3: string },
) {
  return [
    b("text", {
      name: `Job period ${f.period}`,
      x: 56,
      y,
      w: 96,
      h: 20,
      content: { text: f.period },
      style: {
        fontFamily: "ui",
        fontSize: 10,
        fontWeight: 600,
        color: MUTED,
        verticalAlign: "middle",
      },
    }),
    b("text", {
      name: `Job role ${f.title}`,
      x: 164,
      y,
      w: 292,
      h: 20,
      content: { text: f.title },
      style: {
        fontFamily: "ui",
        fontSize: 12.5,
        fontWeight: 700,
        color: INK,
        verticalAlign: "middle",
      },
    }),
    b("list", {
      name: `Job bullets ${f.company}`,
      x: 164,
      y: y + 24,
      w: 292,
      h: 54,
      content: {
        items: [f.p1, f.p2, f.p3],
        markerColor: ACCENT,
      },
      style: {
        fontSize: 11.5,
        lineHeight: 1.35,
        color: INK,
        listStyle: "disc",
      },
    }),
  ];
}

function resume(): Project {
  return shell(
    {
      name: "Resume — merge-field template",
      author: "texLoopr samples",
      subject: "One-page CV driven by Data rows",
      description:
        "Full resume layout with every field bound to data. Load the five sample profiles in Data and flip the preview row to render each candidate.",
    },
    [
      page("Resume", [
        // ---- Header ----
        b("picture", {
          name: "Portrait",
          x: 560,
          y: 44,
          w: 104,
          h: 104,
          content: { src: "", alt: "Portrait", fit: "cover" },
          style: { borderRadius: 52, borderWidth: 2, borderColor: ACCENT },
        }),
        b("text", {
          name: "Candidate name",
          x: 56,
          y: 48,
          w: 480,
          h: 56,
          content: { text: "{{full_name}}" },
          style: {
            fontFamily: "display",
            fontSize: 34,
            fontWeight: 700,
            color: INK,
          },
        }),
        b("text", {
          name: "Role line",
          x: 56,
          y: 108,
          w: 480,
          h: 22,
          content: { text: "{{role}}" },
          style: {
            fontFamily: "ui",
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 2.4,
            color: ACCENT,
            verticalAlign: "middle",
          },
        }),
        b("text", {
          name: "Contact block",
          x: 56,
          y: 136,
          w: 400,
          h: 40,
          content: {
            text: "{{email}} · {{phone}}\n{{location}} · {{website}}",
          },
          style: {
            fontFamily: "ui",
            fontSize: 10.5,
            lineHeight: 1.5,
            color: MUTED,
          },
        }),
        b("shape", {
          name: "Header rule",
          x: 56,
          y: 188,
          w: 608,
          h: 3,
          content: { variant: "rect" },
          style: { background: ACCENT, borderRadius: 2 },
        }),

        // ---- Main column ----
        sectionHeading("Profile", 56, 212, 200),
        b("paragraph", {
          name: "Summary",
          x: 56,
          y: 236,
          w: 400,
          h: 92,
          content: { text: "{{summary}}" },
          style: { fontSize: 11.5, lineHeight: 1.55, color: INK },
        }),
        sectionHeading("Experience", 56, 344, 200),
        ...jobEntry(368, {
          period: "{{j1_period}}",
          title: "{{j1_title}} — {{j1_company}}",
          company: "j1",
          p1: "{{j1_p1}}",
          p2: "{{j1_p2}}",
          p3: "{{j1_p3}}",
        }),
        ...jobEntry(452, {
          period: "{{j2_period}}",
          title: "{{j2_title}} — {{j2_company}}",
          company: "j2",
          p1: "{{j2_p1}}",
          p2: "{{j2_p2}}",
          p3: "{{j2_p3}}",
        }),
        ...jobEntry(536, {
          period: "{{j3_period}}",
          title: "{{j3_title}} — {{j3_company}}",
          company: "j3",
          p1: "{{j3_p1}}",
          p2: "{{j3_p2}}",
          p3: "{{j3_p3}}",
        }),

        // ---- Sidebar ----
        b("shape", {
          name: "Sidebar wash",
          x: 488,
          y: 212,
          w: 176,
          h: 420,
          content: { variant: "rect" },
          style: {
            background: "#f2f4f7",
            borderRadius: 8,
            padding: 10,
            shadow: true,
          },
        }),
        sectionHeading("Skills", 500, 226, 152),
        b("list", {
          name: "Skills list",
          x: 502,
          y: 250,
          w: 150,
          h: 118,
          content: {
            items: [
              "{{skill1}}",
              "{{skill2}}",
              "{{skill3}}",
              "{{skill4}}",
              "{{skill5}}",
              "{{skill6}}",
            ],
            markerColor: ACCENT,
          },
          style: {
            fontSize: 11,
            lineHeight: 1.45,
            color: INK,
            listStyle: "square",
          },
        }),
        sectionHeading("Education", 500, 384, 152),
        b("text", {
          name: "Education entries",
          x: 500,
          y: 408,
          w: 152,
          h: 88,
          content: {
            text: "{{edu1_degree}}\n{{edu1_school}}, {{edu1_years}}\n\n{{edu2_degree}}\n{{edu2_school}}, {{edu2_years}}",
          },
          style: { fontSize: 10.5, lineHeight: 1.45, color: INK },
        }),
        sectionHeading("Languages", 500, 512, 152),
        b("text", {
          name: "Languages line",
          x: 500,
          y: 536,
          w: 152,
          h: 56,
          content: { text: "{{languages}}" },
          style: { fontSize: 10.5, lineHeight: 1.5, color: INK },
        }),

        // ---- Footer ----
        b("shape", {
          name: "Footer rule",
          x: 56,
          y: 668,
          w: 608,
          h: 1,
          content: { variant: "line" },
          style: { borderWidth: 1, borderColor: "#d4d9e0" },
        }),
        b("text", {
          name: "Footer refs",
          x: 56,
          y: 678,
          w: 608,
          h: 18,
          content: {
            text: "References available on request · {{website}}",
          },
          style: {
            fontFamily: "ui",
            fontSize: 9.5,
            letterSpacing: 0.4,
            color: MUTED,
            textAlign: "center",
          },
        }),
      ]),
    ],
  );
}

export const RESUME_PROFILES_CSV = `full_name,role,email,phone,location,website,summary,j1_period,j1_title,j1_company,j1_p1,j1_p2,j1_p3,j2_period,j2_title,j2_company,j2_p1,j2_p2,j2_p3,j3_period,j3_title,j3_company,j3_p1,j3_p2,j3_p3,skill1,skill2,skill3,skill4,skill5,skill6,edu1_degree,edu1_school,edu1_years,edu2_degree,edu2_school,edu2_years,languages
Elena Voss,Senior Frontend Engineer,elena.voss@example.com,+32 470 111 222,"Ghent, Belgium",elenavoss.dev,"Frontend engineer with 8 years building design systems and data-heavy dashboards. Ships accessible React at scale and mentors cross-functional teams.",2021 — Now,Senior Frontend Engineer,Nordwind Analytics,"Led rebuild of the analytics console used by 40k monthly users","Cut bundle size 46% via route-level code splitting","Drove WCAG 2.1 AA compliance across 120+ screens",2018 — 2021,Frontend Engineer,Tandem Retail,"Built checkout A/B framework lifting conversion 7.4%","Introduced Storybook adopted by 5 product squads","Automated visual regression catching 90% of UI defects pre-release",2016 — 2018,Junior Web Developer,Studio Pixel,"Delivered 25+ client sites on WordPress and JAMstack","Owned migration of legacy jQuery suite to Vue","Ran client workshops translating briefs into sitemaps",TypeScript,React,Preact,Vite,CSS architecture,Accessibility,MSc Computer Science,Ghent University,2016,BSc Software Engineering,Hanze University,2014,"English — fluent · Dutch — native · French — B1"
Marcus Chen,Data Scientist,marcus.chen@example.com,+31 6 2345 6789,"Amsterdam, Netherlands",marcuschen.io,"Data scientist specialising in forecasting and experimentation. Turns messy pipelines into decision-grade models and clear stakeholder narratives.",2022 — Now,Lead Data Scientist,Delta Logistics,"Owns demand-forecast platform steering €120M inventory","Cut forecast error 28% with gradient-boosted ensembles","Built churn early-warning saving €1.8M annually",2019 — 2022,Data Scientist,Kanaal Bank,"Deployed credit-risk models under ECB review","Automated feature store cutting release cycle 3x","Published internal uplift-modelling toolkit",2017 — 2019,Analytics Consultant,Bright Data Co,"Delivered 15 dashboard projects for retail clients","Migrated reporting estate from Excel to dbt","Trained client teams on SQL and experiment design",Python,dbt,Airflow,SQL,Forecasting,Experimentation,MSc Statistics,Delft University of Technology,2017,BSc Mathematics,Utrecht University,2015,"English — fluent · Dutch — fluent · Mandarin — native"
Amara Okafor,Product Manager,amara.okafor@example.com,+44 7700 900 123,"London, UK",amaraokafor.com,"Product manager bridging research, design and engineering for B2B SaaS. Launched three zero-to-one products and scaled pricing to £8M ARR.",2023 — Now,Principal Product Manager,Fleetwise,"Owns telematics platform roadmap across 3 squads","Launched usage-based pricing growing ARR 22%","Ran discovery programme interviewing 60 fleet operators",2020 — 2023,Senior Product Manager,Dispatchly,"Shipped driver mobile app rated 4.8 on stores","Introduced OKR cadence adopted company-wide","Reduced onboarding drop-off 35% via redesign",2017 — 2020,Associate Product Manager,MarketMuse,"Grew activation 18% through lifecycle emails","Managed integrations partnership roadmap","Founded internal product-guild community",Product strategy,Discovery,Roadmapping,SQL,Analytics,Pricing,MSc Management,London Business School,2017,BSc Economics,University of Lagos,2014,"English — native · Igbo — native · French — A2"
Jonas Weber,DevOps Engineer,jonas.weber@example.com,+49 151 2345 678,"Berlin, Germany",jonasweber.dev,"Platform engineer focused on Kubernetes, observability and developer joy. Cut deploy times from hours to minutes for teams of 100+.",2022 — Now,Staff Platform Engineer,Wolke Systems,"Designed multi-region K8s platform at 99.95% SLA","Reduced mean deploy time from 45 to 6 minutes","Introduced OpenTelemetry tracing org-wide",2019 — 2022,DevOps Engineer,Funkhaus Media,"Terraformed full AWS estate as code","Built self-service preview environments per PR","Handled migration of 40 services to EKS",2016 — 2019,System Administrator,Bergwerk IT,"Automated patching for 300+ servers with Ansible","Consolidated monitoring onto Prometheus stack","Wrote runbooks adopted as company standard",Kubernetes,Terraform,AWS,Observability,Go,CI/CD design,BSc Information Systems, TU Munich,2016,Ausbildung IT Specialist,Berufsschule München,2013,"German — native · English — fluent"
Sofia Reyes,UX Designer,sofia.reyes@example.com,+34 612 345 678,"Barcelona, Spain",sofiareyes.design,"Product designer crafting calm, research-led interfaces for fintech and health. Runs continuous discovery and designs in systems, not screens.",2021 — Now,Lead Product Designer,Clara Health,"Redesigned patient portal raising task success 41%","Built token-based design system across web and app","Coached squad designers on accessibility practice",2018 — 2021,Product Designer,Pago Fintech,"Simplified KYC flow cutting abandonment 26%","Ran quarterly benchmark usability programmes","Prototyped award-winning onboarding in Figma",2016 — 2018,Visual Designer,Estudio Norte,"Delivered brand systems for 12 startups","Introduced motion guidelines to the studio","Supported sales with interactive demos",Figma,Design systems,User research,Prototyping,Accessibility,Interaction design,BA Interaction Design,ELISAVA Barcelona,2016,Foundation Art & Design,Escola Eina,2013,"Spanish — native · Catalan — native · English — C1"`;

export const DEMO_LIBRARY: DemoEntry[] = [
  {
    id: "welcome",
    title: "Welcome",
    category: "Starter",
    blurb: "Tiny binding & condition tour.",
    sampleCsv: `name,company,role
Ada Lovelace,Analytical Engines,Mathematician
Alan Turing,Bletchley Park,Cryptanalyst`,
    build: welcome,
  },
  {
    id: "letter",
    title: "Business letter",
    category: "Correspondence",
    blurb: "Letterhead, address block, signature.",
    sampleCsv: `date,title,name,company,address,subject,topic,signer,ref
21 Aug 2026,Ms,Elena Voss,Harbor Mutual,"12 Quay St, Rotterdam",Renewal of coverage,cyber liability,Jordan Hale,NL-4482
21 Aug 2026,Mr,Tom Ikeda,Brightline Co,"88 Market Ave, Lisbon",Onboarding pack,API access,Jordan Hale,NL-4483`,
    build: letter,
  },
  {
    id: "resume",
    title: "Resume — 5 profiles",
    category: "Career",
    blurb:
      "Full one-page CV template; every field merges from Data. Five candidate profiles included — flip the preview row to switch.",
    sampleCsv: RESUME_PROFILES_CSV,
    build: resume,
  },
  {
    id: "contract",
    title: "Service agreement",
    category: "Legal",
    blurb: "MSA clauses, fee schedule, signatures.",
    sampleCsv: `contract_id,start_date,provider,client,net_days,term_years,jurisdiction,notice_days,approved,line1,qty1,unit1,amt1,line2,qty2,unit2,amt2,total
MSA-2026-18,01 Sep 2026,Northline Systems BV,Acme Retail NV,30,3,Belgium,30,yes,Platform license,1,yr,"€24,000",Support hours,40,hr,"€6,000","€30,000"
MSA-2026-19,15 Sep 2026,Northline Systems BV,Orbit Labs,45,2,Netherlands,60,no,Implementation,1,proj,"€12,500",Training seats,8,seat,"€3,200","€15,700"`,
    build: contract,
  },
  {
    id: "advertisement",
    title: "Print advertisement",
    category: "Marketing",
    blurb: "Hero, offer table, CTA plate.",
    sampleCsv: `headline,offer_copy,valid_until,sku1,color1,price1,sku2,color2,price2,cta,store_url,lot
Carry less. Arrive ready.,Save 20% on Atlas Pack with code SPRING26.,30 Sep 2026,AP-41,Slate,"€189",AP-42,Sand,"€189",Shop now,northline.example/atlas,LOT-8821`,
    build: advertisement,
  },
  {
    id: "email",
    title: "Email newsletter",
    category: "Email",
    blurb: "Preheader, modules, unsubscribe footer.",
    sampleCsv: `preheader,title,first_name,intro,mod1_title,mod1_body,mod2_title,mod2_body,cta_label,cta_url,sender_name,sender_role,email,unsub_url,year
Your August digest is ready,Product updates for August,Maya,"Here is what shipped this month for your workspace.",Automations,Conditional emit to webhooks,Editor,Faster block resize on dense pages,Read the notes,https://northline.example/notes,Sam Ortega,Product,maya@client.example,https://northline.example/unsub,2026`,
    build: email,
  },
  {
    id: "invoice",
    title: "Commercial invoice",
    category: "Finance",
    blurb: "Bill-to, line items, tax & totals.",
    sampleCsv: `invoice_no,invoice_date,due_date,bill_name,bill_company,bill_address,ship_name,ship_address,desc1,qty1,rate1,amt1,desc2,qty2,rate2,amt2,desc3,qty3,rate3,amt3,subtotal,tax_pct,tax,shipping,currency,total,terms,bank_ref,status
INV-1042,01 Aug 2026,31 Aug 2026,Finance Desk,Acme Retail,"12 Quay St",Warehouse 3,"Dock 4, Port",Platform fee,1,"€2,000","€2,000",Seats,12,"€40","€480",Overage,3,"€25","€75","€2,555",21,"€536.55","€0",EUR,"€3,091.55",Net 30,BE68 1234 5678,open
INV-0991,01 Jul 2026,15 Jul 2026,AP Team,Orbit Labs,"1 Orbit Way",Same,"",Retainer,1,"€1,200","€1,200",,,,,,"€1,200",21,"€252","€15",EUR,"€1,467",Net 15,BE68 1234 5678,past_due`,
    build: invoice,
  },
  {
    id: "paper",
    title: "Research paper cover",
    category: "Publishing",
    blurb: "Title, abstract, figure caption.",
    sampleCsv: `journal,volume,year,paper_title,authors,affiliation,abstract,keywords,figure_caption
Journal of Applied Templates,14,2026,"Adaptive document composition under sparse data regimes","A. Ng · M. Costa · L. Berg",Northline Research Institute,"We study how conditional blocks and output-aware workflows improve bulk document fidelity when source rows are incomplete. Experiments on letter and invoice corpora show reduced manual correction with sandboxed expressions.","templating, conditional rendering, bulk PDF",Revenue trajectory under three merge strategies`,
    build: paper,
  },
  {
    id: "label",
    title: "Shipping label",
    category: "Logistics",
    blurb: "Thermal label, barcode, device hints.",
    sampleCsv: `carrier,service,tracking,from_name,from_address,to_name,to_address,weight,dims,zone
Northline Parcel,Express,NL9 4482 0199 3,Northline DC,"14 Harbor Lane",Elena Voss,"12 Quay St, Rotterdam",2.4kg,30x20x10,B
Northline Parcel,Standard,NL9 4482 0201 8,Northline DC,"14 Harbor Lane",Tom Ikeda,"88 Market Ave, Lisbon",1.1kg,20x15x8,C`,
    build: shippingLabel,
  },
  {
    id: "memo",
    title: "Internal memo",
    category: "Office",
    blurb: "Memo header, agenda table, actions.",
    sampleCsv: `to,from,date,subject,body,t1,topic1,owner1,t2,topic2,owner2,t3,topic3,owner3,action1,action2,decision_date
All managers,PMO Office,21 Aug 2026,Q3 planning checkpoint,"Please review the agenda below ahead of Thursday's session. Bring capacity notes for your squads.",09:00,Goals recap,Alex,09:25,Risk register,Sam,09:50,Staffing asks,Jordan,Publish capacity sheet,Confirm room booking,28 Aug 2026`,
    build: memo,
  },
  {
    id: "advanced-invoice",
    title: "Advanced invoice (repeat)",
    category: "Finance",
    blurb: "JSON line_items repeater, currency filters, conditional banner.",
    sampleCsv: `[
  {
    "invoice_no": "INV-2201",
    "invoice_date": "2026-08-01",
    "due_date": "2026-08-31",
    "bill_name": "Finance Desk",
    "bill_company": "Acme Retail",
    "bill_address": "12 Quay St",
    "status": "open",
    "total": 3091.55,
    "stamp_url": "",
    "line_items": [
      {"description": "Platform fee", "qty": 1, "amount": 2000},
      {"description": "Seats", "qty": 12, "amount": 480},
      {"description": "Overage", "qty": 3, "amount": 75}
    ]
  },
  {
    "invoice_no": "INV-2188",
    "invoice_date": "2026-07-01",
    "due_date": "2026-07-15",
    "bill_name": "AP Team",
    "bill_company": "Orbit Labs",
    "bill_address": "1 Orbit Way",
    "status": "past_due",
    "total": 1467,
    "stamp_url": "",
    "line_items": [
      {"description": "Retainer", "qty": 1, "amount": 1200}
    ]
  }
]`,
    build: advancedInvoice,
  },
];

export function getDemo(id: string): DemoEntry | undefined {
  return DEMO_LIBRARY.find((d) => d.id === id);
}

export function createDemoProject(): Project {
  return welcome();
}
