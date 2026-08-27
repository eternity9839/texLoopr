import type { Project } from "../../document";
import { DEMO_IMG } from "../assets";
import { northlineStyleExtras, NL, nlText } from "../brand/northlineStyles";
import { b, id, outputsFor, page, shell } from "../helpers";

export function a5Handout(): Project {
  const outputs = outputsFor("preview", "pdf", "print", "email");
  return shell(
    {
      name: "A5 multilingual handout",
      author: "Northline Events",
      subject: "Compact event handout for print, screen and email",
      description:
        "EN/FR/NL A5 handout with merge-driven agenda, screen callout, email footer and RSVP QR.",
    },
    [
      page("Handout", [
        b("shape", {
          name: "Header bar", x: 0, y: 0, w: 505, h: 62,
          content: { shape: "rect", filled: true },
          style: { background: NL.accent },
          pin: { top: true, left: true, right: true },
        }),
        b("picture", {
          name: "Logo", x: 24, y: 15, w: 82, h: 32,
          content: { src: DEMO_IMG.logoMark, alt: "{{company}}" },
          zIndex: 1,
        }),
        b("text", {
          name: "Company", x: 122, y: 20, w: 220, h: 24,
          content: { text: "{{company}}" },
          style: { fontSize: 14, fontWeight: 700, color: NL.paper },
          zIndex: 1,
        }),
        b("text", {
          name: "Date", x: 350, y: 20, w: 123, h: 20,
          content: { text: "{{date|date:short}}" },
          style: { fontSize: 10, color: "#d4ece8", textAlign: "right" },
          zIndex: 1,
        }),
        b("text", {
          name: "Title", x: 30, y: 82, w: 445, h: 48,
          content: { text: "{{title}}" },
          style: { ...nlText("nl-h1"), fontSize: 24 },
          variants: [
            { id: id(), language: "fr", content: { text: "{{title_fr}}" } },
            { id: id(), language: "nl", content: { text: "{{title_nl}}" } },
          ],
        }),
        b("paragraph", {
          name: "Body", x: 30, y: 142, w: 445, h: 142,
          content: { text: "{{body}}" },
          style: { ...nlText("nl-body-tight"), lineHeight: 1.5 },
          variants: [
            { id: id(), language: "fr", content: { text: "{{body_fr}}" } },
            { id: id(), language: "nl", content: { text: "{{body_nl}}" } },
          ],
        }),
        b("list", {
          name: "Highlights", x: 30, y: 298, w: 445, h: 110,
          content: {
            items: ["{{highlight_1}}", "{{highlight_2}}", "{{highlight_3}}"],
            markerColor: NL.accent,
          },
          style: { fontSize: 11.5, lineHeight: 1.5, color: "#3d4a5c" },
        }),
        b("text", {
          name: "Agenda label", x: 30, y: 424, w: 190, h: 22,
          content: { text: "Agenda" },
          style: { ...nlText("nl-h3"), color: NL.accent },
          variants: [
            { id: id(), language: "fr", content: { text: "Programme" } },
            { id: id(), language: "nl", content: { text: "Agenda" } },
          ],
        }),
        b("list", {
          name: "Agenda", x: 30, y: 452, w: 300, h: 94,
          content: {
            items: ["{{agenda_1}}", "{{agenda_2}}", "{{agenda_3}}"],
            markerColor: NL.accent,
          },
          style: { fontSize: 10.5, lineHeight: 1.45, color: NL.ink },
        }),
        b("qrcode", {
          name: "RSVP QR", x: 374, y: 438, w: 90, h: 90,
          content: { value: "{{rsvp_url}}", ecc: "M", dark: NL.ink, light: NL.paper },
          condition: "output.kind == 'pdf' || output.kind == 'print'",
        }),
        b("paragraph", {
          name: "Screen callout", x: 30, y: 558, w: 445, h: 52,
          content: { text: "More information: {{info_url}}\nRSVP online: {{rsvp_url}}" },
          style: {
            fontSize: 10, lineHeight: 1.4, background: NL.accentSoft,
            padding: 9, color: NL.accent, borderRadius: 4,
          },
          condition: "output.kind == 'preview'",
        }),
        b("paragraph", {
          name: "Print details", x: 30, y: 558, w: 330, h: 52,
          content: { text: "{{contact}}\n{{info_url}}" },
          style: { fontSize: 10, lineHeight: 1.45, color: NL.inkMuted },
          condition: "output.kind == 'pdf' || output.kind == 'print'",
        }),
        b("paragraph", {
          name: "Email footer", x: 30, y: 558, w: 445, h: 52,
          content: { text: "Questions? {{contact}} · Details: {{info_url}} · RSVP: {{rsvp_url}}" },
          style: { fontSize: 10.5, lineHeight: 1.45, color: NL.accent, textAlign: "center" },
          condition: "output.kind == 'email'",
          variants: [
            {
              id: id(), language: "fr",
              content: { text: "Questions ? {{contact}} · Infos : {{info_url}} · Réponse : {{rsvp_url}}" },
            },
            {
              id: id(), language: "nl",
              content: { text: "Vragen? {{contact}} · Info: {{info_url}} · RSVP: {{rsvp_url}}" },
            },
          ],
        }),
        b("text", {
          name: "Footer", x: 30, y: 668, w: 445, h: 20,
          content: { text: "{{company}} · {{contact}} · {{env.today|date:short}}" },
          style: { ...nlText("nl-fineprint"), textAlign: "center" },
          pin: { bottom: true, left: true, right: true },
        }),
      ], {
        spread: false,
        margins: { top: 0, right: 30, bottom: 36, left: 30 },
        background: NL.paper,
      }),
    ],
    {
      artboard: "a5",
      outputs,
      ...northlineStyleExtras("en"),
    },
  );
}

export function handoutWorkshop(): Project {
  const outputs = outputsFor("preview", "pdf", "print", "email");
  return shell(
    {
      name: "Workshop handout",
      author: "Northline Learning",
      subject: "Workshop agenda and learning outcomes",
      description:
        "A4 bilingual workshop sheet with schedule, attendance banners and scan-to-RSVP.",
    },
    [
      page("Workshop", [
        b("shape", {
          name: "Header", x: 0, y: 0, w: 714, h: 92,
          content: { shape: "rect", filled: true },
          style: { background: NL.ink },
          pin: { top: true, left: true, right: true },
        }),
        b("picture", {
          name: "Logo", x: 40, y: 24, w: 105, h: 42,
          content: { src: DEMO_IMG.logoMark, alt: "Northline" },
          zIndex: 1,
        }),
        b("text", {
          name: "Title", x: 170, y: 22, w: 504, h: 50,
          content: { text: "{{title}}" },
          style: { ...nlText("nl-h1"), color: NL.paper, textAlign: "right" },
          variants: [{ id: id(), language: "fr", content: { text: "{{title_fr}}" } }],
          zIndex: 1,
        }),
        b("text", {
          name: "In-person banner", x: 40, y: 112, w: 634, h: 38,
          content: { text: "IN PERSON · {{venue}} · {{date|date:long}}" },
          style: {
            ...nlText("nl-label"), color: NL.accent, background: NL.accentSoft,
            padding: 11, textAlign: "center",
          },
          condition: "vars.segment == 'in-person'",
        }),
        b("text", {
          name: "Online banner", x: 40, y: 112, w: 634, h: 38,
          content: { text: "ONLINE · {{platform}} · {{date|date:long}}" },
          style: {
            ...nlText("nl-label"), color: "#315f86", background: "#eaf2f8",
            padding: 11, textAlign: "center",
          },
          condition: "vars.segment == 'online'",
        }),
        b("paragraph", {
          name: "Introduction", x: 40, y: 174, w: 634, h: 90,
          content: { text: "{{body}}" },
          style: { ...nlText("nl-lead"), fontSize: 15 },
          variants: [{ id: id(), language: "fr", content: { text: "{{body_fr}}" } }],
        }),
        b("text", {
          name: "Agenda heading", x: 40, y: 286, w: 280, h: 28,
          content: { text: "Agenda" },
          style: { ...nlText("nl-h2"), color: NL.accent },
          variants: [{ id: id(), language: "fr", content: { text: "Programme" } }],
        }),
        b("list", {
          name: "Agenda", x: 40, y: 326, w: 280, h: 200,
          content: {
            items: ["{{agenda_1}}", "{{agenda_2}}", "{{agenda_3}}", "{{agenda_4}}"],
            markerColor: NL.accent,
          },
          style: { ...nlText("nl-body-tight"), lineHeight: 1.55 },
        }),
        b("text", {
          name: "Outcomes heading", x: 364, y: 286, w: 310, h: 28,
          content: { text: "Learning outcomes" },
          style: { ...nlText("nl-h2"), color: NL.accent },
          variants: [{ id: id(), language: "fr", content: { text: "Objectifs pédagogiques" } }],
        }),
        b("list", {
          name: "Learning outcomes", x: 364, y: 326, w: 310, h: 200,
          content: {
            items: ["{{outcome_1}}", "{{outcome_2}}", "{{outcome_3}}", "{{outcome_4}}"],
            markerColor: NL.accent,
          },
          style: { ...nlText("nl-body-tight"), lineHeight: 1.55 },
        }),
        b("table", {
          name: "Schedule", x: 40, y: 560, w: 634, h: 190,
          content: {
            header: true, zebra: true, rows: 5, cols: 3,
            cells: [
              ["Time", "Session", "Lead"],
              ["{{time_1}}", "{{session_1}}", "{{lead_1}}"],
              ["{{time_2}}", "{{session_2}}", "{{lead_2}}"],
              ["{{time_3}}", "{{session_3}}", "{{lead_3}}"],
              ["{{time_4}}", "{{session_4}}", "{{lead_4}}"],
            ],
            headerBackground: NL.accentSoft,
          },
          style: { fontSize: 11, color: NL.ink },
          variants: [{
            id: id(), language: "fr",
            content: {
              header: true, zebra: true, rows: 5, cols: 3,
              cells: [
                ["Heure", "Session", "Animation"],
                ["{{time_1}}", "{{session_1_fr}}", "{{lead_1}}"],
                ["{{time_2}}", "{{session_2_fr}}", "{{lead_2}}"],
                ["{{time_3}}", "{{session_3_fr}}", "{{lead_3}}"],
                ["{{time_4}}", "{{session_4_fr}}", "{{lead_4}}"],
              ],
              headerBackground: NL.accentSoft,
            },
          }],
        }),
        b("qrcode", {
          name: "RSVP QR", x: 548, y: 792, w: 112, h: 112,
          content: { value: "{{rsvp_url}}", ecc: "M", dark: NL.ink, light: NL.paper },
          condition: "output.kind == 'pdf' || output.kind == 'print'",
        }),
        b("paragraph", {
          name: "RSVP details", x: 40, y: 806, w: 470, h: 76,
          content: { text: "Reserve your place: {{rsvp_url}}\n{{contact}}" },
          style: { ...nlText("nl-h3"), color: NL.accent, lineHeight: 1.5 },
          variants: [{
            id: id(), language: "fr",
            content: { text: "Réservez votre place : {{rsvp_url}}\n{{contact}}" },
          }],
        }),
        b("text", {
          name: "Footer", x: 40, y: 960, w: 634, h: 18,
          content: { text: "{{company}} · {{date|date:short}} · {{contact}}" },
          style: { ...nlText("nl-fineprint"), textAlign: "center" },
          pin: { bottom: true, left: true, right: true },
        }),
      ], { spread: false, background: NL.paper }),
    ],
    {
      artboard: "a4",
      outputs,
      ...northlineStyleExtras("en"),
    },
  );
}

export function handoutPromo(): Project {
  const outputs = outputsFor("preview", "pdf", "print", "email");
  return shell(
    {
      name: "Promotional handout",
      author: "Northline Commerce",
      subject: "A5 offer sheet with VAT pricing",
      description:
        "Bilingual A5 promotion with price tiers, VAT calculation, channel strip and store QR.",
    },
    [
      page("Promotion", [
        b("shape", {
          name: "Hero background", x: 0, y: 0, w: 505, h: 210,
          content: { shape: "rect", filled: true },
          style: { background: NL.accent },
          pin: { top: true, left: true, right: true },
        }),
        b("picture", {
          name: "Product", x: 296, y: 28, w: 174, h: 150,
          content: { src: DEMO_IMG.productHero, alt: "{{product_name}}" },
          zIndex: 1,
        }),
        b("text", {
          name: "Offer label", x: 30, y: 30, w: 230, h: 22,
          content: { text: "{{offer_label}}" },
          style: { ...nlText("nl-label"), color: "#d4ece8" },
          variants: [{ id: id(), language: "fr", content: { text: "{{offer_label_fr}}" } }],
          zIndex: 1,
        }),
        b("text", {
          name: "Title", x: 30, y: 62, w: 250, h: 90,
          content: { text: "{{title}}" },
          style: { ...nlText("nl-h1"), color: NL.paper, fontSize: 28 },
          variants: [{ id: id(), language: "fr", content: { text: "{{title_fr}}" } }],
          zIndex: 1,
        }),
        b("paragraph", {
          name: "Body", x: 30, y: 226, w: 445, h: 82,
          content: { text: "{{body}}" },
          style: { ...nlText("nl-body-tight"), lineHeight: 1.5 },
          variants: [{ id: id(), language: "fr", content: { text: "{{body_fr}}" } }],
        }),
        b("table", {
          name: "Price tiers", x: 30, y: 326, w: 445, h: 150,
          content: {
            header: true, rows: 4, cols: 3,
            cells: [
              ["Tier", "Excl. VAT", "Incl. 21% VAT"],
              ["Starter", "{{base_price|currency:EUR}}", "{{base_price|mul:1.21|currency:EUR}}"],
              ["Plus", "{{plus_price|currency:EUR}}", "{{plus_price|mul:1.21|currency:EUR}}"],
              ["Pro", "{{pro_price|currency:EUR}}", "{{pro_price|mul:1.21|currency:EUR}}"],
            ],
            headerBackground: NL.accentSoft,
          },
          style: { fontSize: 10.5, color: NL.ink },
          variants: [{
            id: id(), language: "fr",
            content: {
              header: true, rows: 4, cols: 3,
              cells: [
                ["Formule", "Hors TVA", "TVA 21 % incluse"],
                ["Starter", "{{base_price|currency:EUR}}", "{{base_price|mul:1.21|currency:EUR}}"],
                ["Plus", "{{plus_price|currency:EUR}}", "{{plus_price|mul:1.21|currency:EUR}}"],
                ["Pro", "{{pro_price|currency:EUR}}", "{{pro_price|mul:1.21|currency:EUR}}"],
              ],
              headerBackground: NL.accentSoft,
            },
          }],
        }),
        b("qrcode", {
          name: "Store QR", x: 365, y: 500, w: 100, h: 100,
          content: { value: "{{store_url}}", ecc: "M", dark: NL.ink, light: NL.paper },
          condition: "output.kind == 'pdf' || output.kind == 'print'",
        }),
        b("paragraph", {
          name: "Store CTA", x: 30, y: 516, w: 305, h: 62,
          content: { text: "Shop the offer\n{{store_url}}" },
          style: { ...nlText("nl-h3"), color: NL.accent, lineHeight: 1.45 },
          variants: [{
            id: id(), language: "fr",
            content: { text: "Voir l’offre\n{{store_url}}" },
          }],
        }),
        b("text", {
          name: "Email strip", x: 0, y: 620, w: 505, h: 42,
          content: { text: "EMAIL OFFER · {{promo_code}} · {{store_url}}" },
          style: {
            fontSize: 11, fontWeight: 700, background: NL.accentSoft,
            color: NL.accent, textAlign: "center", padding: 14,
          },
          condition: "output.kind == 'email'",
          pin: { bottom: true, left: true, right: true },
        }),
        b("text", {
          name: "Print bleed note", x: 30, y: 640, w: 445, h: 24,
          content: { text: "PRINT PRODUCTION · 3 mm bleed · keep marks outside trim" },
          style: { ...nlText("nl-fineprint"), textAlign: "center", color: NL.danger },
          condition: "output.kind == 'pdf' || output.kind == 'print'",
        }),
        b("text", {
          name: "Footer", x: 30, y: 680, w: 445, h: 18,
          content: { text: "{{company}} · {{contact}}" },
          style: { ...nlText("nl-fineprint"), textAlign: "center" },
          pin: { bottom: true, left: true, right: true },
        }),
      ], { spread: false, background: NL.paperWarm }),
    ],
    {
      artboard: "a5",
      outputs,
      ...northlineStyleExtras("en"),
    },
  );
}
