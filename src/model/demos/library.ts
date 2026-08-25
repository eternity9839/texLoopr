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
      page("Continuation", [
        b("picture", {
          name: "Logo small",
          x: 40,
          y: 28,
          w: 110,
          h: 32,
          content: { src: DEMO_IMG.logoMark, alt: "Northline" },
        }),
        b("text", {
          name: "Cont reference",
          x: 400,
          y: 28,
          w: 260,
          h: 36,
          content: { text: "{{signer}} · {{ref}}\nPage 2 of 2" },
          style: { fontSize: 10, color: "#5c6570", textAlign: "right" },
        }),
        b("shape", {
          name: "Rule 2",
          x: 40,
          y: 72,
          w: 620,
          h: 3,
          content: { shape: "rect" },
          style: { background: "#0f6b63" },
        }),
        b("text", {
          name: "Recap subject",
          x: 40,
          y: 96,
          w: 620,
          h: 22,
          content: { text: "Re: {{subject}} — continued" },
          style: { fontSize: 12, fontWeight: 700, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "Follow-up body",
          x: 40,
          y: 134,
          w: 620,
          h: 190,
          content: {
            text: "Dear {{title}} {{name}},\n\nFollowing our schedule, the next steps are straightforward: countersign the enclosed copy, confirm a kickoff slot, and grant read access to the systems listed in Schedule A.\n\nOur team typically completes onboarding within two weeks of signature. During that window we hold a weekly status call and share progress in a shared channel, so your stakeholders always know where things stand.",
          },
          style: { fontSize: 12, lineHeight: 1.5, color: "#1c2430" },
        }),
        b("text", {
          name: "Enclosures label",
          x: 40,
          y: 356,
          w: 200,
          h: 20,
          content: { text: "Enclosures" },
          style: { fontSize: 12, fontWeight: 700, color: "#1c2430" },
        }),
        b("list", {
          name: "Enclosures",
          x: 40,
          y: 382,
          w: 480,
          h: 88,
          content: {
            items: [
              "Countersignature copy (2 × A4)",
              "Schedule A — systems & access list",
              "Onboarding checklist for {{company}}",
            ],
            markerColor: "#0f6b63",
          },
          style: { fontSize: 11, lineHeight: 1.45, color: "#3d4a5c" },
        }),
        b("paragraph", {
          name: "Postscript",
          x: 40,
          y: 500,
          w: 620,
          h: 64,
          content: {
            text: "P.S. If anyone else at {{company}} should be part of the kickoff, simply reply to this letter and we will extend the invitation.",
          },
          style: { fontSize: 11, color: "#3d4a5c" },
        }),
        b("text", {
          name: "Initials line",
          x: 40,
          y: 880,
          w: 300,
          h: 20,
          content: { text: "{{name}} ________ · {{signer}} ________" },
          style: { fontSize: 10, color: "#8a929c" },
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
      page("Back", [
        b("shape", {
          name: "Band",
          x: 0,
          y: 0,
          w: 720,
          h: 120,
          content: { shape: "rect" },
          style: { background: "#0f6b63" },
          zIndex: 0,
        }),
        b("text", {
          name: "Back headline",
          x: 40,
          y: 38,
          w: 640,
          h: 48,
          content: { text: "{{headline}}" },
          style: {
            fontSize: 22,
            fontWeight: 700,
            color: "#ffffff",
            verticalAlign: "middle",
          },
          zIndex: 1,
        }),
        b("text", {
          name: "Why label",
          x: 40,
          y: 152,
          w: 240,
          h: 20,
          content: { text: "WHY ATLAS PACK" },
          style: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#0f6b63" },
        }),
        b("list", {
          name: "Why list",
          x: 40,
          y: 178,
          w: 380,
          h: 132,
          content: {
            items: [
              "Water-resistant seams rated for 200 cycles",
              "Laptop sleeve fits up to 16-inch devices",
              "Lifetime stitching guarantee",
              "Recycled shell — 68% ocean-bound plastic",
            ],
            markerColor: "#0f6b63",
          },
          style: { fontSize: 12, lineHeight: 1.5, color: "#3d4a5c" },
        }),
        b("picture", {
          name: "Detail shot",
          x: 452,
          y: 170,
          w: 228,
          h: 148,
          content: { src: DEMO_IMG.productHero, alt: "Atlas Pack detail" },
        }),
        b("text", {
          name: "Stockists label",
          x: 40,
          y: 348,
          w: 240,
          h: 20,
          content: { text: "ALSO IN STORE" },
          style: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#0f6b63" },
        }),
        b("paragraph", {
          name: "Stockists",
          x: 40,
          y: 374,
          w: 400,
          h: 96,
          content: {
            text: "Northline Flagship — Harbor Lane, Antwerp\nBrightline Co. — Market Ave, Lisbon\nKanaal Goods — Stationsplein, Rotterdam",
          },
          style: { fontSize: 12, lineHeight: 1.55, color: "#3d4a5c" },
        }),
        b("text", {
          name: "Coupon code",
          x: 480,
          y: 374,
          w: 200,
          h: 44,
          content: { text: "{{cta}}\ncode SPRING26" },
          style: { fontSize: 14, fontWeight: 700, color: "#1c2430", textAlign: "right" },
        }),
        b("table", {
          name: "Fine offer table",
          x: 40,
          y: 500,
          w: 640,
          h: 110,
          content: {
            rows: 3,
            cols: 3,
            cells: [
              ["Model", "Finish", "Launch price"],
              ["{{sku1}}", "{{color1}}", "{{price1}}"],
              ["{{sku2}}", "{{color2}}", "{{price2}}"],
            ],
          },
          style: { fontSize: 11 },
        }),
        b("paragraph", {
          name: "Small print",
          x: 40,
          y: 640,
          w: 640,
          h: 96,
          content: {
            text: "Offer valid through {{valid_until}} while stocks last. Prices include VAT; delivery excluded. Cannot be combined with other promotions. Full terms: {{store_url}}/terms.",
          },
          style: { fontSize: 10, lineHeight: 1.5, color: "#8a929c" },
        }),
        b("text", {
          name: "Back lot code",
          x: 40,
          y: 900,
          w: 640,
          h: 18,
          content: { text: "{{lot}} · northline.example/atlas" },
          style: { fontSize: 9, color: "#8a929c", textAlign: "center" },
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
      page("Plain-text version", [
        b("text", {
          name: "PT subject",
          x: 40,
          y: 40,
          w: 620,
          h: 22,
          content: { text: "Subject: {{title}}" },
          style: { fontSize: 13, fontWeight: 700, color: "#1c2430" },
        }),
        b("text", {
          name: "PT preheader",
          x: 40,
          y: 68,
          w: 620,
          h: 18,
          content: { text: "{{preheader}}" },
          style: { fontSize: 11, color: "#5c6570" },
        }),
        b("shape", {
          name: "PT rule",
          x: 40,
          y: 96,
          w: 620,
          h: 1,
          content: { variant: "line" },
          style: { borderWidth: 1, borderColor: "#d4d9e0" },
        }),
        b("paragraph", {
          name: "PT greeting + intro",
          x: 40,
          y: 116,
          w: 620,
          h: 110,
          content: {
            text: "Hi {{first_name}},\n\n{{intro}}\n\nWe keep this plain-text edition short so it renders anywhere.",
          },
          style: { fontSize: 12, lineHeight: 1.55, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "PT module 1",
          x: 40,
          y: 244,
          w: 620,
          h: 64,
          content: {
            text: "* {{mod1_title}}\n  {{mod1_body}}",
          },
          style: { fontSize: 12, lineHeight: 1.5, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "PT module 2",
          x: 40,
          y: 324,
          w: 620,
          h: 64,
          content: {
            text: "* {{mod2_title}}\n  {{mod2_body}}",
          },
          style: { fontSize: 12, lineHeight: 1.5, color: "#1c2430" },
        }),
        b("text", {
          name: "PT cta",
          x: 40,
          y: 408,
          w: 620,
          h: 22,
          content: { text: "{{cta_label}}: {{cta_url}}" },
          style: { fontSize: 12, fontWeight: 600, color: "#0f6b63" },
        }),
        b("shape", {
          name: "PT rule 2",
          x: 40,
          y: 452,
          w: 620,
          h: 1,
          content: { variant: "line" },
          style: { borderWidth: 1, borderColor: "#d4d9e0" },
        }),
        b("paragraph", {
          name: "PT signature",
          x: 40,
          y: 472,
          w: 620,
          h: 64,
          content: {
            text: "— {{sender_name}}, {{sender_role}}\nReply to this email with questions; a human reads every response.",
          },
          style: { fontSize: 11, lineHeight: 1.5, color: "#3d4a5c" },
        }),
        b("paragraph", {
          name: "PT footer",
          x: 40,
          y: 880,
          w: 620,
          h: 44,
          content: {
            text: "You are receiving this because you subscribed as {{email}}.\nUnsubscribe: {{unsub_url}} · © {{year}} Northline",
          },
          style: { fontSize: 9, lineHeight: 1.5, color: "#9aa3ad", textAlign: "center" },
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
        b("text", {
          name: "Page 1 footer",
          x: 40,
          y: 900,
          w: 620,
          h: 18,
          content: { text: "{{bill_company}} · {{invoice_no}} · Page 1 of 2" },
          style: { fontSize: 9, color: "#8a929c", textAlign: "center" },
        }),
      ]),
      page("Notes & remittance", [
        b("text", {
          name: "Remit title",
          x: 40,
          y: 32,
          w: 400,
          h: 28,
          content: { text: "Invoice {{invoice_no}} — notes & remittance" },
          style: { fontSize: 16, fontWeight: 700, color: "#1c2430" },
        }),
        b("table", {
          name: "Remit stub",
          x: 40,
          y: 76,
          w: 620,
          h: 110,
          content: {
            rows: 4,
            cols: 2,
            cells: [
              ["Amount due ({{currency}})", "{{total}}"],
              ["Due date", "{{due_date}}"],
              ["Terms", "{{terms}}"],
              ["Reference", "{{invoice_no}} / {{bill_name}}"],
            ],
          },
          style: { fontSize: 12 },
        }),
        b("text", {
          name: "Bank label",
          x: 40,
          y: 214,
          w: 200,
          h: 20,
          content: { text: "Payment details" },
          style: { fontSize: 12, fontWeight: 700, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "Bank block",
          x: 40,
          y: 240,
          w: 360,
          h: 88,
          content: {
            text: "Northline Systems BV\nIBAN: BE68 1234 5678\nBIC: GKCCBEBB\nReference: {{bank_ref}} — invoice {{invoice_no}}",
          },
          style: { fontSize: 11, lineHeight: 1.5, color: "#3d4a5c" },
        }),
        b("shape", {
          name: "QR plate",
          x: 460,
          y: 236,
          w: 200,
          h: 96,
          content: { shape: "rect" },
          style: { background: "#f2f4f7", borderRadius: 6, borderWidth: 1, borderColor: "#d4d9e0" },
        }),
        b("text", {
          name: "QR hint",
          x: 472,
          y: 268,
          w: 176,
          h: 32,
          content: { text: "Scan-to-pay placeholder" },
          style: { fontSize: 10, color: "#5c6570", textAlign: "center" },
          zIndex: 2,
        }),
        b("text", {
          name: "Line recap label",
          x: 40,
          y: 368,
          w: 300,
          h: 20,
          content: { text: "What am I paying for?" },
          style: { fontSize: 12, fontWeight: 700, color: "#1c2430" },
        }),
        b("list", {
          name: "Line recap",
          x: 40,
          y: 394,
          w: 620,
          h: 92,
          content: {
            items: [
              "{{desc1}} — {{qty1}} × {{rate1}} = {{amt1}}",
              "{{desc2}} — {{qty2}} × {{rate2}} = {{amt2}}",
              "{{desc3}} — {{qty3}} × {{rate3}} = {{amt3}}",
            ],
            markerColor: "#0f6b63",
          },
          style: { fontSize: 11.5, lineHeight: 1.5, color: "#3d4a5c" },
        }),
        b("paragraph", {
          name: "Late policy",
          x: 40,
          y: 512,
          w: 620,
          h: 72,
          content: {
            text: "Late payments accrue interest at 1% per month above the ECB reference rate, as agreed in the master services agreement. Disputes must be raised in writing within 14 days of the invoice date.",
          },
          style: { fontSize: 11, lineHeight: 1.55, color: "#5c6570" },
        }),
        b("paragraph", {
          name: "Thanks",
          x: 40,
          y: 608,
          w: 620,
          h: 48,
          content: {
            text: "Thank you for partnering with Northline. This invoice closes with our best month yet for {{ship_name}} uptime.",
          },
          style: { fontSize: 12, lineHeight: 1.5, color: "#1c2430" },
        }),
        b("text", {
          name: "Sign-off",
          x: 40,
          y: 880,
          w: 620,
          h: 20,
          content: { text: "billing@northline.example · Page 2 of 2" },
          style: { fontSize: 9, color: "#8a929c", textAlign: "center" },
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
      page("Figures & references", [
        b("text", {
          name: "Running head",
          x: 40,
          y: 36,
          w: 620,
          h: 18,
          content: { text: "{{journal}} · {{paper_title}}" },
          style: { fontSize: 9.5, color: "#8a929c", textAlign: "center" },
        }),
        b("picture", {
          name: "Figure 2",
          x: 60,
          y: 84,
          w: 280,
          h: 170,
          content: { src: DEMO_IMG.chartThumb, alt: "Figure 2" },
        }),
        b("text", {
          name: "Caption 2",
          x: 40,
          y: 264,
          w: 320,
          h: 34,
          content: {
            text: "Figure 2. Correction rate by merge strategy across the invoice corpus.",
          },
          style: { fontSize: 10, color: "#5c6570", textAlign: "center" },
        }),
        b("picture", {
          name: "Figure 3",
          x: 380,
          y: 84,
          w: 280,
          h: 170,
          content: { src: DEMO_IMG.chartThumb, alt: "Figure 3" },
        }),
        b("text", {
          name: "Caption 3",
          x: 360,
          y: 264,
          w: 320,
          h: 34,
          content: {
            text: "Figure 3. Human review minutes per 1,000 documents under sparse-data conditions.",
          },
          style: { fontSize: 10, color: "#5c6570", textAlign: "center" },
        }),
        b("text", {
          name: "Results label",
          x: 40,
          y: 330,
          w: 240,
          h: 20,
          content: { text: "Key results" },
          style: { fontSize: 12, fontWeight: 700, color: "#1c2430" },
        }),
        b("list", {
          name: "Findings",
          x: 40,
          y: 356,
          w: 620,
          h: 110,
          content: {
            items: [
              "Conditional blocks reduced manual corrections by 38% versus static templates.",
              "Output-aware workflows cut average render time to 120 ms per document.",
              "Sandboxed expressions eliminated all template-injection incidents in the corpus.",
            ],
            markerColor: "#0f6b63",
          },
          style: { fontSize: 11.5, lineHeight: 1.55, color: "#1c2430" },
        }),
        b("text", {
          name: "References label",
          x: 40,
          y: 496,
          w: 240,
          h: 20,
          content: { text: "References" },
          style: { fontSize: 12, fontWeight: 700, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "References",
          x: 40,
          y: 522,
          w: 620,
          h: 150,
          content: {
            text: "[1] Ng, A., Costa, M., & Berg, L. ({{year}}). Sparse-data regimes in bulk document generation. {{journal}}, {{volume}}(2), 114–131.\n[2] Ferreira, J. (2025). Merge-field semantics for conditional rendering. Proc. DocEng Workshop, 22–30.\n[3] Okafor, D. (2024). Trust boundaries in templating runtimes. Journal of Applied Templates, 12(4), 301–318.",
          },
          style: { fontSize: 10.5, lineHeight: 1.6, color: "#3d4a5c" },
        }),
        b("paragraph", {
          name: "Correspondence",
          x: 40,
          y: 700,
          w: 620,
          h: 48,
          content: {
            text: "Correspondence: {{authors}}, {{affiliation}}. Keywords cross-reference: {{keywords}}.",
          },
          style: { fontSize: 10, lineHeight: 1.5, color: "#5c6570" },
        }),
        b("text", {
          name: "License line",
          x: 40,
          y: 900,
          w: 620,
          h: 18,
          content: { text: "© {{year}} {{affiliation}} · CC BY 4.0" },
          style: { fontSize: 9, color: "#8a929c", textAlign: "center" },
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
      page("Customs declaration", [
        b("text", {
          name: "CN title",
          x: 24,
          y: 24,
          w: 420,
          h: 22,
          content: { text: "CUSTOMS DECLARATION — CN23 (simplified)" },
          style: { fontSize: 12, fontWeight: 700, color: "#1c2430" },
        }),
        b("table", {
          name: "CN parties",
          x: 24,
          y: 56,
          w: 460,
          h: 120,
          content: {
            rows: 4,
            cols: 2,
            cells: [
              ["Sender", "{{from_name}} — {{from_address}}"],
              ["Addressee", "{{to_name}}"],
              ["Destination", "{{to_address}}"],
              ["Service", "{{carrier}} {{service}}"],
            ],
          },
          style: { fontSize: 10 },
        }),
        b("table", {
          name: "CN parcel",
          x: 24,
          y: 192,
          w: 460,
          h: 72,
          content: {
            rows: 3,
            cols: 2,
            cells: [
              ["Tracking", "{{tracking}}"],
              ["Total weight", "{{weight}}"],
              ["Dimensions", "{{dims}} (zone {{zone}})"],
            ],
          },
          style: { fontSize: 10 },
        }),
        b("text", {
          name: "Contents label",
          x: 24,
          y: 288,
          w: 300,
          h: 18,
          content: { text: "Contents" },
          style: { fontSize: 11, fontWeight: 700, color: "#1c2430" },
        }),
        b("list", {
          name: "Contents list",
          x: 24,
          y: 310,
          w: 460,
          h: 88,
          content: {
            items: [
              "Merchandise samples — no commercial value beyond €20",
              "Documents and onboarding material",
              "Return label enclosed inside pouch",
            ],
            markerColor: "#0f6b63",
          },
          style: { fontSize: 10.5, lineHeight: 1.45, color: "#3d4a5c" },
        }),
        b("paragraph", {
          name: "CN remarks",
          x: 24,
          y: 414,
          w: 460,
          h: 60,
          content: {
            text: "I certify the particulars are true to the best of my knowledge. Handling notes for {{carrier}}: fragile contents, this side up.",
          },
          style: { fontSize: 10, lineHeight: 1.5, color: "#5c6570" },
        }),
        b("text", {
          name: "CN sign line",
          x: 24,
          y: 496,
          w: 300,
          h: 20,
          content: { text: "{{from_name}} ________  Date ____________" },
          style: { fontSize: 10, color: "#8a929c" },
        }),
        b("shape", {
          name: "CN barcode strip",
          x: 508,
          y: 56,
          w: 40,
          h: 380,
          content: { shape: "rect" },
          style: { background: "#1c2430", borderRadius: 2 },
        }),
        b("text", {
          name: "CN tracking vertical",
          x: 496,
          y: 448,
          w: 64,
          h: 18,
          content: { text: "{{tracking}}" },
          style: {
            fontSize: 8,
            fontWeight: 700,
            color: "#1c2430",
            textAlign: "center",
          },
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
        b("text", {
          name: "Page footer",
          x: 40,
          y: 900,
          w: 620,
          h: 18,
          content: { text: "{{subject}} · {{date}} · Page 1 of 2" },
          style: { fontSize: 9, color: "#8a929c", textAlign: "center" },
        }),
      ]),
      page("Appendix", [
        b("text", {
          name: "Appendix title",
          x: 40,
          y: 32,
          w: 400,
          h: 26,
          content: { text: "Appendix — {{subject}}" },
          style: { fontSize: 15, fontWeight: 700, color: "#1c2430" },
        }),
        b("text", {
          name: "Distribution label",
          x: 40,
          y: 72,
          w: 240,
          h: 20,
          content: { text: "Distribution & owners" },
          style: { fontSize: 12, fontWeight: 700, color: "#1c2430" },
        }),
        b("table", {
          name: "Owner matrix",
          x: 40,
          y: 98,
          w: 620,
          h: 110,
          content: {
            rows: 4,
            cols: 3,
            cells: [
              ["Topic", "Owner", "Follow-up"],
              ["{{topic1}}", "{{owner1}}", "Notes by {{decision_date}}"],
              ["{{topic2}}", "{{owner2}}", "Notes by {{decision_date}}"],
              ["{{topic3}}", "{{owner3}}", "Notes by {{decision_date}}"],
            ],
          },
          style: { fontSize: 11 },
        }),
        b("text", {
          name: "Context label",
          x: 40,
          y: 234,
          w: 240,
          h: 20,
          content: { text: "Background" },
          style: { fontSize: 12, fontWeight: 700, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "Context body",
          x: 40,
          y: 260,
          w: 620,
          h: 120,
          content: {
            text: "For readers joining late: this memo continues the planning thread opened by {{from}} last month. Capacity numbers referenced in the agenda come from the shared sheet; risk entries mirror the register as of {{date}}.\n\nNothing in this appendix changes the actions on page one — it exists so nobody has to reverse-engineer the meeting.",
          },
          style: { fontSize: 11.5, lineHeight: 1.55, color: "#3d4a5c" },
        }),
        b("text", {
          name: "Pre-read label",
          x: 40,
          y: 408,
          w: 240,
          h: 20,
          content: { text: "Pre-reads" },
          style: { fontSize: 12, fontWeight: 700, color: "#1c2430" },
        }),
        b("files", {
          name: "Pre-read pack",
          x: 40,
          y: 434,
          w: 220,
          h: 48,
          content: { label: "Pre-read pack (PDF)", count: 3 },
        }),
        b("files", {
          name: "Capacity sheet",
          x: 284,
          y: 434,
          w: 220,
          h: 48,
          content: { label: "Capacity sheet", count: 1 },
        }),
        b("list", {
          name: "Decision checklist",
          x: 40,
          y: 512,
          w: 480,
          h: 88,
          content: {
            items: [
              "Confirm owners for topics 1–3",
              "Sign off capacity asks before {{decision_date}}",
              "Book follow-up for unresolved risks",
            ],
            markerColor: "#0f6b63",
          },
          style: { fontSize: 11.5, lineHeight: 1.5, color: "#3d4a5c" },
        }),
        b("paragraph", {
          name: "Action recap",
          x: 40,
          y: 630,
          w: 620,
          h: 48,
          content: {
            text: "Recap of page-one actions: {{action1}} · {{action2}}. Decisions close {{decision_date}}.",
          },
          style: { fontSize: 11, lineHeight: 1.5, color: "#5c6570" },
        }),
        b("text", {
          name: "Appendix footer",
          x: 40,
          y: 900,
          w: 620,
          h: 18,
          content: { text: "{{to}} · {{from}} · Page 2 of 2" },
          style: { fontSize: 9, color: "#8a929c", textAlign: "center" },
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
        b("text", {
          name: "Paid badge",
          x: 40,
          y: 480,
          w: 160,
          h: 36,
          content: { text: "PAID ✓ {{invoice_no}}" },
          style: {
            fontSize: 14,
            fontWeight: 700,
            color: "#0f6b63",
            textAlign: "center",
            verticalAlign: "middle",
          },
          condition: "status == 'paid'",
        }),
        b("text", {
          name: "Page footer",
          x: 40,
          y: 900,
          w: 520,
          h: 18,
          content: { text: "Invoice {{invoice_no}} · Page 1 of 2" },
          style: { fontSize: 9, color: "#8a929c", textAlign: "center" },
        }),
      ]),
      page("Remittance advice", [
        b("text", {
          name: "Remit heading",
          x: 40,
          y: 36,
          w: 520,
          h: 28,
          content: { text: "Remittance advice — {{invoice_no}}" },
          style: { fontSize: 18, fontWeight: 700, color: "#1c2430" },
        }),
        b("text", {
          name: "Remit status",
          x: 40,
          y: 72,
          w: 520,
          h: 24,
          content: {
            text: "{{#if status == 'paid'}}Marked PAID — no action needed{{else}}Please return the slip below with your payment{{/if}}",
          },
          style: { fontSize: 11.5, color: "#5c6570" },
        }),
        b("table", {
          name: "Remit fields",
          x: 40,
          y: 116,
          w: 520,
          h: 110,
          content: {
            rows: 4,
            cols: 2,
            cells: [
              ["Billed to", "{{bill_name}} · {{bill_company}}"],
              ["Address", "{{bill_address}}"],
              ["Issued / due", "{{invoice_date|date:short}} / {{due_date|date:short}}"],
              ["Total due", "{{total|currency:EUR}}"],
            ],
          },
          style: { fontSize: 12 },
        }),
        b("shape", {
          name: "Slip wash",
          x: 40,
          y: 260,
          w: 520,
          h: 150,
          content: { variant: "rect" },
          style: {
            background: "#f2f4f7",
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#d4d9e0",
            shadow: true,
          },
        }),
        b("text", {
          name: "Slip lines",
          x: 64,
          y: 284,
          w: 472,
          h: 104,
          content: {
            text: "Payee: Northline Billing\nAmount: {{total|currency:EUR}}   Reference: {{invoice_no}}\nSigned: ______________________   Date: ____________",
          },
          style: { fontSize: 11.5, lineHeight: 1.8, color: "#1c2430" },
          zIndex: 1,
        }),
        b("paragraph", {
          name: "Remit note",
          x: 40,
          y: 440,
          w: 520,
          h: 72,
          content: {
            text: "Keep this page for your records. Line items repeat from {{line_items.length}} entries on page one; amounts include applicable VAT where stated.",
          },
          style: { fontSize: 10.5, lineHeight: 1.55, color: "#5c6570" },
        }),
        b("text", {
          name: "Remit footer",
          x: 40,
          y: 900,
          w: 520,
          h: 18,
          content: { text: "{{bill_company}} · {{invoice_no}} · Page 2 of 2" },
          style: { fontSize: 9, color: "#8a929c", textAlign: "center" },
        }),
      ]),
    ],
  );
}


const ACCENT = "#2383e2";
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
      y: y + 26,
      w: 292,
      h: 108,
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
      subject: "CV + cover letter driven by Data rows",
      description:
        "Two-page resume with every field bound to data, plus a matching cover letter page. Load the ten sample profiles in Data and flip the preview row to render each candidate.",
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
          y: 104,
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
          y: 130,
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
          y: 172,
          w: 608,
          h: 3,
          content: { variant: "rect" },
          style: { background: ACCENT, borderRadius: 2 },
        }),

        // ---- Main column ----
        sectionHeading("Profile", 56, 192, 200),
        b("paragraph", {
          name: "Summary",
          x: 56,
          y: 214,
          w: 400,
          h: 84,
          content: { text: "{{summary}}" },
          style: { fontSize: 11.5, lineHeight: 1.55, color: INK },
        }),
        sectionHeading("Experience", 56, 318, 200),
        ...jobEntry(342, {
          period: "{{j1_period}}",
          title: "{{j1_title}} — {{j1_company}}",
          company: "j1",
          p1: "{{j1_p1}}",
          p2: "{{j1_p2}}",
          p3: "{{j1_p3}}",
        }),
        ...jobEntry(478, {
          period: "{{j2_period}}",
          title: "{{j2_title}} — {{j2_company}}",
          company: "j2",
          p1: "{{j2_p1}}",
          p2: "{{j2_p2}}",
          p3: "{{j2_p3}}",
        }),
        ...jobEntry(614, {
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
          h: 556,
          content: { variant: "rect" },
          style: {
            background: "#f3f6fa",
            borderRadius: 8,
            padding: 10,
            shadow: true,
          },
        }),
        sectionHeading("Skills", 500, 228, 152),
        b("list", {
          name: "Skills list",
          x: 502,
          y: 252,
          w: 150,
          h: 150,
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
        sectionHeading("Education", 500, 430, 152),
        b("text", {
          name: "Education entries",
          x: 500,
          y: 454,
          w: 152,
          h: 120,
          content: {
            text: "{{edu1_degree}}\n{{edu1_school}}, {{edu1_years}}\n\n{{edu2_degree}}\n{{edu2_school}}, {{edu2_years}}",
          },
          style: { fontSize: 10.5, lineHeight: 1.45, color: INK },
        }),
        sectionHeading("Languages", 500, 600, 152),
        b("text", {
          name: "Languages line",
          x: 500,
          y: 624,
          w: 152,
          h: 70,
          content: { text: "{{languages}}" },
          style: { fontSize: 10.5, lineHeight: 1.5, color: INK },
        }),

        // ---- Footer ----
        b("shape", {
          name: "Footer rule",
          x: 56,
          y: 772,
          w: 608,
          h: 1,
          content: { variant: "line" },
          style: { borderWidth: 1, borderColor: "#d4d9e0" },
        }),
        b("text", {
          name: "Footer refs",
          x: 56,
          y: 784,
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
      page("Cover letter", [
        b("text", {
          name: "CL sender",
          x: 56,
          y: 48,
          w: 400,
          h: 56,
          content: {
            text: "{{full_name}}\n{{email}} · {{phone}}\n{{location}}",
          },
          style: { fontFamily: "ui", fontSize: 10.5, lineHeight: 1.5, color: MUTED },
        }),
        b("picture", {
          name: "CL portrait",
          x: 560,
          y: 44,
          w: 104,
          h: 104,
          content: { src: "", alt: "Portrait", fit: "cover" },
          style: { borderRadius: 52, borderWidth: 2, borderColor: ACCENT },
        }),
        b("shape", {
          name: "CL rule",
          x: 56,
          y: 124,
          w: 608,
          h: 3,
          content: { variant: "rect" },
          style: { background: ACCENT, borderRadius: 2 },
        }),
        b("text", {
          name: "CL subject",
          x: 56,
          y: 148,
          w: 460,
          h: 20,
          content: { text: "Application: {{role}}" },
          style: {
            fontFamily: "ui",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1.6,
            color: ACCENT,
          },
        }),
        b("text", {
          name: "CL recipient",
          x: 56,
          y: 176,
          w: 420,
          h: 44,
          content: {
            text: "Hiring Team\n[Company name]\n[Office address]",
          },
          style: { fontFamily: "ui", fontSize: 11, lineHeight: 1.45, color: INK },
        }),
        b("text", {
          name: "CL salutation",
          x: 56,
          y: 240,
          w: 608,
          h: 22,
          content: { text: "Dear Hiring Team," },
          style: { fontFamily: "ui", fontSize: 12, color: INK },
        }),
        b("paragraph", {
          name: "CL opening",
          x: 56,
          y: 270,
          w: 608,
          h: 92,
          content: {
            text: "I am applying for the {{role}} position. {{summary}} The short version: I like owning outcomes end to end, and I measure my work by the numbers it moves.",
          },
          style: { fontFamily: "ui", fontSize: 11.5, lineHeight: 1.6, color: INK },
        }),
        b("paragraph", {
          name: "CL proof",
          x: 56,
          y: 378,
          w: 608,
          h: 118,
          content: {
            text: "Most recently at {{j1_company}}, {{j1_p1|lower}} — and before that, {{j2_p1|lower}}. Earlier in my career at {{j3_company}} I learned to ship small, measure honestly, and write things down so the next person moves faster.",
          },
          style: { fontFamily: "ui", fontSize: 11.5, lineHeight: 1.6, color: INK },
        }),
        b("paragraph", {
          name: "CL fit",
          x: 56,
          y: 512,
          w: 608,
          h: 96,
          content: {
            text: "What draws me to your team is the chance to bring {{skill1}}, {{skill2}} and {{skill3}} to problems that matter, alongside people who care about craft. My toolkit also covers {{skill4}} and {{skill5}}, picked up while delivering {{edu1_degree}}-level coursework and everything since.",
          },
          style: { fontFamily: "ui", fontSize: 11.5, lineHeight: 1.6, color: INK },
        }),
        b("paragraph", {
          name: "CL closing",
          x: 56,
          y: 624,
          w: 608,
          h: 64,
          content: {
            text: "My full CV is on page one; references are available on request. Thank you for your time and consideration — I would welcome a conversation about where I can help your team most.",
          },
          style: { fontFamily: "ui", fontSize: 11.5, lineHeight: 1.6, color: INK },
        }),
        b("text", {
          name: "CL sign-off",
          x: 56,
          y: 712,
          w: 608,
          h: 40,
          content: {
            text: "Kind regards,\n{{full_name}}\n{{website}}",
          },
          style: { fontFamily: "ui", fontSize: 11.5, lineHeight: 1.5, color: INK },
        }),
        b("shape", {
          name: "CL footer rule",
          x: 56,
          y: 900,
          w: 608,
          h: 1,
          content: { variant: "line" },
          style: { borderWidth: 1, borderColor: "#d4d9e0" },
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
Sofia Reyes,UX Designer,sofia.reyes@example.com,+34 612 345 678,"Barcelona, Spain",sofiareyes.design,"Product designer crafting calm, research-led interfaces for fintech and health. Runs continuous discovery and designs in systems, not screens.",2021 — Now,Lead Product Designer,Clara Health,"Redesigned patient portal raising task success 41%","Built token-based design system across web and app","Coached squad designers on accessibility practice",2018 — 2021,Product Designer,Pago Fintech,"Simplified KYC flow cutting abandonment 26%","Ran quarterly benchmark usability programmes","Prototyped award-winning onboarding in Figma",2016 — 2018,Visual Designer,Estudio Norte,"Delivered brand systems for 12 startups","Introduced motion guidelines to the studio","Supported sales with interactive demos",Figma,Design systems,User research,Prototyping,Accessibility,Interaction design,BA Interaction Design,ELISAVA Barcelona,2016,Foundation Art & Design,Escola Eina,2013,"Spanish — native · Catalan — native · English — C1"
Tomás Ferreira,Backend Engineer,tomas.ferreira@example.com,+351 912 345 678,"Porto, Portugal",tomasferreira.dev,"Backend engineer focused on payment rails and event-driven systems. Keeps ledgers correct under load and writes the runbooks nobody dreads.",2020 — Now,Senior Backend Engineer,Miro Pay,"Owns ledger service clearing €40M monthly with zero reconciliation drift","Cut p99 transfer latency from 900 to 120 ms via write batching","Led PCI-DSS scope reduction saving €180k in audit effort",2017 — 2020,Backend Engineer,Ticketline PT,"Rebuilt queueing for flash sales sustaining 60k checkouts/minute","Introduced outbox pattern eliminating duplicate emails","Migrated monolith billing module to Go services",2015 — 2017,Junior Developer,Sapo Labs,"Shipped notification pipeline for carrier partners","Automated contract testing across 12 integrations",PostgreSQL,Banking domain,Kafka,Go,Event sourcing,Observability,BSc Computer Engineering,University of Porto,2015,Postgraduate Distributed Systems,Instituto Superior Técnico,2017,"Portuguese — native · English — fluent · Spanish — B2"
Hana Suzuki,Mobile Engineer,hana.suzuki@example.com,+31 6 8765 4321,"Amsterdam, Netherlands",hanasuzuki.app,"Mobile engineer shipping native-feeling apps on tight budgets. Cares about cold-start time, offline behaviour and review scores above 4.6.",2022 — Now,Senior iOS Engineer,Fietsfinder,"Rewrote navigation stack cutting cold start to 800 ms","Shipped offline maps used by 200k riders monthly","Reduced crash-free sessions gap between platforms to 0.3%",2019 — 2022,Mobile Engineer,Stadsapp BV,"Launched parking app adopted by three municipalities","Built OTA feature flags removing release bottlenecks","Introduced Swift Concurrency patterns team-wide",2017 — 2019,Junior Android Developer,Tulip Media,"Delivered news app widgets with 30% DAU lift","Owned Play Store release pipeline automation",Swift,Kotlin,Offline sync,CI/CD,Performance,Accessibility,BSc Interaction Technology,Utrecht University of Applied Sciences,2017,iOS Specialisation Stanford Online,2019,"Japanese — native · English — fluent · Dutch — B1"
Liam O'Connor,Site Reliability Engineer,liam.oconnor.example@gmail.com,+353 87 123 4567,"Dublin, Ireland",liamoconnor.ie,"SRE who treats reliability as a product feature. Blames systems, not people; automates toil until the pager goes quiet.",2021 — Now,Staff SRE,Cloudharbor,"Error budgets now gate releases across 40 services","Cut MTTR 55% by rebuilding incident command process","Designed multi-region failover surviving annual game-day drills",2018 — 2021,SRE,Riverdock Hosting,"Terraformed bare-metal fleet of 600 hosts","Built SLO tooling adopted by five product teams","Eliminated 70% of manual capacity planning",2016 — 2018,Systems Administrator,Eircom Cloud,"Automated DNS and certificate rotation org-wide","Wrote first incident-response playbook",Kubernetes,SLO design,Terraform,Incident response,Go,Grafana,BSc Computer Science,Trinity College Dublin,2016,Certificate Enterprise Architecture,IMI Dublin,2019,"English — native · Irish — fluent"
Fatima Zahra El Amrani,Growth Analyst,fatima.elamrani@example.com,+32 471 987 654,"Brussels, Belgium",fatimazehra.be,"Growth analyst pairing rigorous experimentation with honest storytelling. Turns funnel noise into a prioritised backlog leadership actually trusts.",2022 — Now,Senior Growth Analyst,Lumen Learning,"Grew activation 24% through onboarding experiment programme","Built self-serve metrics layer replacing weekly ad-hoc reports","Ran pricing research informing tier redesign at €6M scale",2020 — 2022,Growth Analyst,Velodrop,"Scaled referral loop contributing 18% of signups","Introduced Bayesian A/B evaluation replacing peak peeking","Automated LTV reporting across six markets",2018 — 2020,Marketing Data Intern,Shoply,"Dashboarded campaign ROI for 20+ channels","Cleaned tracking taxonomy cutting attribution disputes","SQL,dbt,Experimentation,Amplitude,Python,Data storytelling,BSc Business Analytics,Solvay Brussels School,2018,MSc Marketing Intelligence,VU Amsterdam,2020,"Arabic — native · French — fluent · Dutch — fluent · English — fluent"
Viktor Lindgren,Security Engineer,viktor.lindgren@example.com,+46 70 123 45 67,"Stockholm, Sweden",viktorlindgren.se,"Security engineer embedding secure defaults into developer workflows. Ships paved roads, not gates; measures security work by tickets developers no longer file.",2021 — Now,Senior Security Engineer,Nordbank IT,"Led supply-chain hardening after industry-wide xz-style scare","Cut critical findings per audit from 14 to 2 across two years","Built internal threat-modelling guild training 80 engineers",2019 — 2021,Application Security Engineer,Fastighetspay,"Secured open-banking flows ahead of PSD2 deadline","Introduced dependency scanning blocking 100% of known CVEs","Wrote secure-coding curriculum for onboarding squads",2017 — 2019,Security Consultant,Härd Security,"Ran pentests for 25 fintech and retail clients","Disclosed three CVEs in widely-used Nordic banking SDKs",Threat modelling,AppSec,CI/CD hardening,Cryptography basics,Python,Public speaking,MSc Information Security,KTH Royal Institute of Technology,2017,OSCP,Offensive Security,2019,"Swedish — native · English — fluent"`;

export const DEMO_LIBRARY: DemoEntry[] = [
  {
    id: "welcome",
    title: "Welcome",
    category: "Starter",
    blurb: "Tiny binding & condition tour.",
    sampleCsv: `name,company,role
Ada Lovelace,Analytical Engines,Mathematician
Alan Turing,Bletchley Park,Cryptanalyst
Grace Hopper,US Navy,Rear Admiral
Katherine Johnson,NASA,Research Mathematician
Radia Perlman,Sun Microsystems,Network Engineer
Margaret Hamilton,MIT Instrumentation Lab,Software Lead
Linus Torvalds,Linux Foundation,Kernel Maintainer
Barbara Liskov,MIT,Professor
Edsger Dijkstra,Texas Instruments,Computer Scientist`,
    build: welcome,
  },
  {
    id: "letter",
    title: "Business letter",
    category: "Correspondence",
    blurb: "Letterhead, address block, signature.",
    sampleCsv: `date,title,name,company,address,subject,topic,signer,ref
21 Aug 2026,Ms,Elena Voss,Harbor Mutual,"12 Quay St, Rotterdam",Renewal of coverage,cyber liability,Jordan Hale,NL-4482
21 Aug 2026,Mr,Tom Ikeda,Brightline Co,"88 Market Ave, Lisbon",Onboarding pack,API access,Jordan Hale,NL-4483
22 Aug 2026,Dr,Priya Nair,Kanaal Bank,"5 Stationsplein, Rotterdam",Audit follow-up,data residency,Rowan Ellis,NL-4484
25 Aug 2026,Mx,Sam Duval,Estudio Norte,"17 Rua Nova, Porto",Workshop invitation,design systems,Jordan Hale,NL-4485
28 Aug 2026,Ms,Lena Fischer,Wolke Systems,"Torstraße 84, Berlin",Renewal of coverage,platform SLOs,Rowan Ellis,NL-4486
01 Sep 2026,Mr,Omar Haddad,Dispatchly,"22 Quai des Charbonnages, Brussels",Statement of account,freight billing,Petra Vos,NL-4487
03 Sep 2026,Dr,Aiko Tanaka,Clara Health,"8 Kalverstraat, Amsterdam",Partnership draft,patient portal API,Petra Vos,NL-4488
08 Sep 2026,Ms,Nora Bergström,Fjord Analytics,"3 Bryggen, Bergen",Onboarding pack,warehouse onboarding,Jordan Hale,NL-4489`,
    build: letter,
  },
  {
    id: "resume",
    title: "Resume — 10 profiles",
    category: "Career",
    blurb:
      "Two-page CV + cover letter; every field merges from Data. Ten candidate profiles included — flip the preview row to switch.",
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
MSA-2026-19,15 Sep 2026,Northline Systems BV,Orbit Labs,45,2,Netherlands,60,no,Implementation,1,proj,"€12,500",Training seats,8,seat,"€3,200","€15,700"
MSA-2026-20,01 Oct 2026,Northline Systems BV,Kanaal Bank,30,2,Belgium,45,pending,Data pipeline retainer,12,mo,"€9,600",On-call coverage,90,day,"€4,500","€14,100"
MSA-2026-21,15 Oct 2026,Northline Systems BV,Fleetwise BV,60,3,Netherlands,30,yes,Telematics integration,1,proj,"€28,000",Managed hosting,12,mo,"€7,200","€35,200"
MSA-2026-22,01 Nov 2026,Northline Systems BV,Clara Health,45,4,Belgium,60,pending,Compliance review,1,proj,"€16,000",Security audits,4,qtr,"€5,600","€21,600"
MSA-2026-23,15 Nov 2026,Northline Systems BV,Wolke Systems,30,1,Belgium,30,yes,Migration assessment,1,proj,"€8,400",Enablement workshops,6,day,"€2,700","€11,100"`,
    build: contract,
  },
  {
    id: "advertisement",
    title: "Print advertisement",
    category: "Marketing",
    blurb: "Hero, offer table, CTA plate.",
    sampleCsv: `headline,offer_copy,valid_until,sku1,color1,price1,sku2,color2,price2,cta,store_url,lot
Carry less. Arrive ready.,Save 20% on Atlas Pack with code SPRING26.,30 Sep 2026,AP-41,Slate,"€189",AP-42,Sand,"€189",Shop now,northline.example/atlas,LOT-8821
Built for the long commute.,Bundle Atlas Pack with the Day Sling and save €40.,30 Sep 2026,AP-41,Slate,SL-07,Moss,"€89",Pre-order,northline.example/atlas,LOT-8821
Rain-ready. City-proof.,Free dry-bag insert with every Atlas Pack this month.,15 Oct 2026,AP-43,Storm Blue,"€199",AP-44,Graphite,"€199",Find a store,northline.example/atlas,LOT-8904
Two sizes. One warranty.,Launch pricing ends soon — lifetime stitching guarantee included.,15 Oct 2026,AP-45,Rust,"€179",AP-46,Fog,"€179",Shop now,northline.example/atlas,LOT-8905
Pack for the weekend.,Weekender bundle: Atlas Pack 35L plus packing cubes at €219.,31 Oct 2026,AW-12,Olive,"€219",AP-41,Slate,"€189",Reserve yours,northline.example/weekender,LOT-9001
Last call for spring stock.,Final reduction on remaining Slate and Sand colorways.,10 Nov 2026,AP-42,Sand,"€159",AP-44,Graphite,"€169",While stocks last,northline.example/atlas,LOT-9110`,
    build: advertisement,
  },
  {
    id: "email",
    title: "Email newsletter",
    category: "Email",
    blurb: "Preheader, modules, unsubscribe footer.",
    sampleCsv: `preheader,title,first_name,intro,mod1_title,mod1_body,mod2_title,mod2_body,cta_label,cta_url,sender_name,sender_role,email,unsub_url,year
Your August digest is ready,Product updates for August,Maya,"Here is what shipped this month for your workspace.",Automations,Conditional emit to webhooks,Editor,Faster block resize on dense pages,Read the notes,https://northline.example/notes,Sam Ortega,Product,maya@client.example,https://northline.example/unsub,2026
September release notes,Autumn refresh is live,Noah,"Smaller fixes with outsized impact — the full changelog is one click away.",Templates,Saved templates sync across devices,Data view,Csv paste now maps columns automatically,See what changed,https://northline.example/changelog,Sam Ortega,Product,noah@client.example,https://northline.example/unsub,2026
You are on the early list,Beta: batch PDF export,Ivy,"As an early-access workspace you can now queue hundred-page exports.",Batch export,Queue up to 500 pages per job,Webhooks,Retry policy now configurable,Join the beta,https://northline.example/beta,Priya Anand,Engineering,ivy@client.example,https://northline.example/unsub,2026
A faster Data view landed,Performance update,Omar,"Large datasets scroll smoothly again after this week's tuning.",Virtual lists,Hundred-thousand-row sheets stay at 60fps,Filters,Column search now matches type aliases,Open the app,https://northline.example/login,Priya Anand,Engineering,omar@client.example,https://northline.example/unsub,2026
Invitation: templating meetup October,Talks and workshops,Elif,"Northline hosts a community evening on document automation in Antwerp.",Program,Three talks plus open clinic time,Venue,Harbor Lane studio doors at 18:30,RSVP here,https://northline.example/meetup,Dana Willems,Community,elif@client.example,https://northline.example/unsub,2026
Your invoice is ready (no action needed),Receipt for September billing,Lucas,"This is a courtesy copy of your automated monthly receipt.",Billing,Plan: Studio — €29.00 incl VAT,Usage,4,120 documents rendered in September,View billing,https://northline.example/billing,Northline Billing,Finance,lucas@client.example,https://northline.example/unsub,2026
We fixed your top annoyance,Maintenance window notes,Sofia,"The five most-upvoted friction reports are resolved tonight.",Dark mode,True contrast tokens for print preview,Shortcuts,New palette command on Ctrl-K,Review the fixes,https://northline.example/fixes,Sam Ortega,Product,sofia@client.example,https://northline.example/unsub,2026
Welcome week: getting started,Onboarding track for new workspaces,Amir,"Five short lessons to get your first merged PDF out the door.",Lesson 1,Load data from csv or json,Lesson 2,Compose blocks and bind fields,Start lesson 1,https://northline.example/start,Dana Willems,Community,amir@client.example,https://northline.example/unsub,2026`,
    build: email,
  },
  {
    id: "invoice",
    title: "Commercial invoice",
    category: "Finance",
    blurb: "Bill-to, line items, tax & totals.",
    sampleCsv: `invoice_no,invoice_date,due_date,bill_name,bill_company,bill_address,ship_name,ship_address,desc1,qty1,rate1,amt1,desc2,qty2,rate2,amt2,desc3,qty3,rate3,amt3,subtotal,tax_pct,tax,shipping,currency,total,terms,bank_ref,status
INV-1042,01 Aug 2026,31 Aug 2026,Finance Desk,Acme Retail,"12 Quay St",Warehouse 3,"Dock 4, Port",Platform fee,1,"€2,000","€2,000",Seats,12,"€40","€480",Overage,3,"€25","€75","€2,555",21,"€536.55","€0",EUR,"€3,091.55",Net 30,BE68 1234 5678,open
INV-0991,01 Jul 2026,15 Jul 2026,AP Team,Orbit Labs,"1 Orbit Way",Same,"",Retainer,1,"€1,200","€1,200",,,,,,"€1,200",21,"€252","€15",EUR,"€1,467",Net 15,BE68 1234 5678,past_due
INV-1043,03 Aug 2026,02 Sep 2026,Billing,Kanaal Bank,"5 Stationsplein, Rotterdam",Ops,"Floor 2",Data pipeline fee,1,"€800","€800",Connectors,6,"€60","€360",Support,1,"€150","€150","€1,310",21,"€275.10","€0",EUR,"€1,585.10",Net 30,BE68 1234 5678,open
INV-1044,05 Aug 2026,04 Sep 2026,AP Team,Fleetwise BV,"9 Havenweg, Antwerp",Garage 2,"Gate B",Telematics licence,14,"€35","€490",Install days,2,"€450","€900",SIM plans,14,"€6","€84","€1,474",21,"€309.54","€45",EUR,"€1,828.54",Net 30,BE68 1234 5678,open
INV-1045,08 Aug 2026,23 Aug 2026,Finance,Clara Health,"40 Meir, Antwerp",IT,"Suite 5",Compliance audit,1,"€4,000","€4,000",Remediation hours,16,"€95","€1,520",,,,"€5,520",21,"€1,159.20","€0",EUR,"€6,679.20",Net 15,BE68 1234 5678,open
INV-1046,12 Aug 2026,11 Sep 2026,Procurement,Wolke Systems,"Torstraße 84, Berlin",DC West,"Rack 12",Migration assessment,1,"€7,000","€7,000",Workshops,3,"€600","€1,800",Travel,1,"€240","€240","€9,040",19,"€1,717.60","€120",EUR,"€10,877.60",Net 30,BE68 1234 5678,pending
INV-1020,01 Jun 2026,01 Jul 2026,Finance Desk,Acme Retail,"12 Quay St",Warehouse 3,"Dock 4, Port",Platform fee,1,"€2,000","€2,000",Seats,10,"€40","€400",Overage,1,"€25","€25","€2,425",21,"€509.25","€0",EUR,"€2,934.25",Net 30,BE68 1234 5678,paid
INV-0988,15 May 2026,31 May 2026,AP Team,Pogo Fintech,"2 Kaai, Ghent",Same,"",Consulting day,2,"€700","€1,400",Report pack,1,"€300","€300",,,,"€1,700",21,"€357","€0",EUR,"€2,057",Net 15,BE68 1234 5678,paid`,
    build: invoice,
  },
  {
    id: "paper",
    title: "Research paper cover",
    category: "Publishing",
    blurb: "Title, abstract, figure caption.",
    sampleCsv: `journal,volume,year,paper_title,authors,affiliation,abstract,keywords,figure_caption
Journal of Applied Templates,14,2026,"Adaptive document composition under sparse data regimes","A. Ng · M. Costa · L. Berg",Northline Research Institute,"We study how conditional blocks and output-aware workflows improve bulk document fidelity when source rows are incomplete. Experiments on letter and invoice corpora show reduced manual correction with sandboxed expressions.","templating, conditional rendering, bulk PDF",Revenue trajectory under three merge strategies
Journal of Applied Templates,13,2025,"Sandboxed expressions for print pipelines","R. Osei · T. Lindqvist",Nordic Doc Lab,"Print pipelines increasingly evaluate user-authored expressions at render time. We characterise the attack surface and propose a capability-based sandbox with measurable overhead under two milliseconds per page.","security, expressions, print pipeline",Overhead distribution across 10k synthetic pages
Proc. DocEng Workshop,9,2025,"Merge-field semantics: a field study of 40 templates","J. Ferreira",University of Porto,"Interviews with template authors reveal recurring ambiguity around missing values and defaults. We distil eight semantic rules adopted by practitioners and formalise them as a type system.","merge fields, semantics, practitioner studies",Ambiguity classes observed across the corpus
Journal of Applied Templates,12,2024,"Trust boundaries in templating runtimes","D. Okafor",Lagos Systems Group,"We formalise trust boundaries between data providers, template authors and output sinks, and show how boundary violations map to real incidents reported by bulk-mail operators.","runtime security, bulk documents, incident analysis",Incident timeline clustered by boundary crossed
Intl. Journal of Document Automation,7,2024,"Layout constraints from natural-language briefs","H. Yamada · P. Costa",Kyoto Media Lab,"Marketing briefs arrive as prose; layouts arrive as grids. We train a constraint extractor that maps brief sentences to alignment and density constraints with 91% agreement on our annotated set.","layout inference, nlp, advertising",Agreement by constraint category
Bulletin of the NLP Society,31,2023,"Row-level evaluation for conditional text","K. Berg · A. Ng",Northline Research Institute,"Conditional prose blocks are typically evaluated per document; we define row-level evaluation semantics that preserve coherence across multi-row merges and reduce reviewer load in letter campaigns.","conditionals, evaluation semantics, letters",Reviewer minutes saved per thousand letters`,
    build: paper,
  },
  {
    id: "label",
    title: "Shipping label",
    category: "Logistics",
    blurb: "Thermal label, barcode, device hints.",
    sampleCsv: `carrier,service,tracking,from_name,from_address,to_name,to_address,weight,dims,zone
Northline Parcel,Express,NL9 4482 0199 3,Northline DC,"14 Harbor Lane",Elena Voss,"12 Quay St, Rotterdam",2.4kg,30x20x10,B
Northline Parcel,Standard,NL9 4482 0201 8,Northline DC,"14 Harbor Lane",Tom Ikeda,"88 Market Ave, Lisbon",1.1kg,20x15x8,C
Northline Parcel,Express,NL9 4483 0117 5,Northline DC,"14 Harbor Lane",Priya Nair,"5 Stationsplein, Rotterdam",0.8kg,25x18x6,B
Northline Freight,Pallet,NL9 5511 0088 2,Northline DC,"14 Harbor Lane",Wolke Systems,"Torstraße 84, Berlin",84kg,120x80x90,D
Northline Parcel,Standard,NL9 4483 0121 9,Northline DC,"14 Harbor Lane",Sofia Reyes,"C/ Mallorca 21, Barcelona",1.6kg,30x20x10,E
Northline Parcel,Express,NL9 4484 0004 1,Northline DC,"14 Harbor Lane",Omar Haddad,"22 Quai des Charbonnages, Brussels",3.2kg,40x30x15,B
Northline Parcel,Economy,NL9 4484 0019 6,Northline DC,"14 Harbor Lane",Ivy Chen,"12 Rue Haute, Brussels",0.5kg,20x15x8,A
Northline Freight,Pallet,NL9 5512 0340 7,Northline DC,"14 Harbor Lane",Kanaal Bank,"5 Stationsplein, Rotterdam",210kg,120x100x110,D`,
    build: shippingLabel,
  },
  {
    id: "memo",
    title: "Internal memo",
    category: "Office",
    blurb: "Memo header, agenda table, actions.",
    sampleCsv: `to,from,date,subject,body,t1,topic1,owner1,t2,topic2,owner2,t3,topic3,owner3,action1,action2,decision_date
All managers,PMO Office,21 Aug 2026,Q3 planning checkpoint,"Please review the agenda below ahead of Thursday's session. Bring capacity notes for your squads.",09:00,Goals recap,Alex,09:25,Risk register,Sam,09:50,Staffing asks,Jordan,Publish capacity sheet,Confirm room booking,28 Aug 2026
Engineering chapter leads,Platform Group,28 Aug 2026,Migration wave 4 retro,"Retro pack is attached as pre-read. Come with one thing that worked and one to change.",10:00,Timeline review,Priya,10:20,Cost drift,Noah,10:45,Runbook gaps,Ivy,Fold learnings into wave 5 plan,Nominate retro scribe,04 Sep 2026
Support guild,Operations,02 Sep 2026,Holiday coverage & escalation,"Draft rota attached; we will walk the escalation ladder end to end.",09:15,Rota walkthrough,Lena,09:35,Escalation ladder,Omar,10:00,SLA exceptions,Sofia,Publish final rota,Update on-call handbook,09 Sep 2026
Product council,Northline Product,09 Sep 2026,Roadmap trade-offs Q4,"Two candidates can both fit if we descope integrations. Decision needed Thursday.",11:00,Q4 bets,Elena,11:30,Integration descoping,Amara,12:00,Resourcing,Jonas,Circle preferred bet,Notify stakeholders of descoping,16 Sep 2026
Security working group,IT & Compliance,16 Sep 2026,Access review findings,"Findings from the quarterly access review plus remediation owners and dates.",14:00,Findings summary,Jonas,14:25,Remediation plan,Dana,14:50,Tooling asks,Priya,Assign remediation owners,Schedule pen-test window,23 Sep 2026
Comms circle,Marketing & PMO,23 Sep 2026,Launch comms sequencing,"Sequencing the Atlas campaign with product release notes without double-briefing press.",09:30,Campaign calendar,Maya,09:55,Release notes sync,Sam,10:20,FAQ ownership,Dana,Lock channel sequence,Draft joint FAQ,30 Sep 2026`,
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
    "line_items": [
      {"description": "Retainer", "qty": 1, "amount": 1200},
      {"description": "Priority support", "qty": 1, "amount": 267}
    ]
  },
  {
    "invoice_no": "INV-2214",
    "invoice_date": "2026-08-04",
    "due_date": "2026-09-03",
    "bill_name": "Billing",
    "bill_company": "Kanaal Bank",
    "bill_address": "5 Stationsplein, Rotterdam",
    "status": "open",
    "total": 1585.1,
    "line_items": [
      {"description": "Data pipeline fee", "qty": 1, "amount": 800},
      {"description": "Connectors", "qty": 6, "amount": 360},
      {"description": "Support", "qty": 1, "amount": 150}
    ]
  },
  {
    "invoice_no": "INV-2150",
    "invoice_date": "2026-06-01",
    "due_date": "2026-06-30",
    "bill_name": "Procurement",
    "bill_company": "Fleetwise BV",
    "bill_address": "9 Havenweg, Antwerp",
    "status": "paid",
    "total": 1828.54,
    "line_items": [
      {"description": "Telematics licence", "qty": 14, "amount": 490},
      {"description": "Install days", "qty": 2, "amount": 900},
      {"description": "SIM plans", "qty": 14, "amount": 84}
    ]
  },
  {
    "invoice_no": "INV-2230",
    "invoice_date": "2026-08-18",
    "due_date": "2026-09-17",
    "bill_name": "IT",
    "bill_company": "Clara Health",
    "bill_address": "40 Meir, Antwerp",
    "status": "open",
    "total": 6679.2,
    "line_items": [
      {"description": "Compliance audit", "qty": 1, "amount": 4000},
      {"description": "Remediation hours", "qty": 16, "amount": 1520}
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
