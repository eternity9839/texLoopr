import type { Project } from "../../document";
import { DEMO_IMG } from "../assets";
import { northlineStyleExtras, NL, nlText } from "../brand/northlineStyles";
import { b, id, outputsFor, page, shell } from "../helpers";

export function newsletterProduct(): Project {
  const outputs = outputsFor("preview", "email", "pdf");

  return shell(
    {
      name: "Product newsletter",
      author: "Northline Lifecycle",
      subject: "Transactional + marketing email frame",
      description:
        "Email-first product newsletter with segment badges, print QR and a plain-text inbox edition.",
    },
    [
      page("Message", [
        b("shape", {
          name: "Header bar", x: 0, y: 0, w: 720, h: 48,
          content: { shape: "rect", filled: true },
          style: { background: NL.paperCool },
          pin: { top: true, left: true, right: true },
        }),
        b("text", {
          name: "Preheader", x: 48, y: 16, w: 520, h: 16,
          content: { text: "{{preheader}}" },
          style: { fontSize: 9, color: NL.inkFaint },
          condition: "output.kind == 'email'",
        }),
        b("shape", {
          name: "Canvas", x: 40, y: 56, w: 640, h: 780,
          content: { shape: "rect" },
          style: { background: NL.paper, borderRadius: 2 },
        }),
        b("picture", {
          name: "Logo", x: 64, y: 72, w: 120, h: 36,
          content: { src: DEMO_IMG.logoMark, alt: "Northline" },
          zIndex: 1,
          variants: [{ id: id(), output: "email", x: 40, w: 100 }],
        }),
        b("text", {
          name: "B2B badge", x: 520, y: 76, w: 136, h: 28,
          content: { text: "FOR TEAMS" },
          style: {
            ...nlText("nl-label"), color: NL.paper, background: NL.accent,
            textAlign: "center", borderRadius: 4, padding: 7,
          },
          condition: "vars.segment == 'b2b'",
          zIndex: 2,
        }),
        b("text", {
          name: "Consumer badge", x: 520, y: 76, w: 136, h: 28,
          content: { text: "FOR YOU" },
          style: {
            ...nlText("nl-label"), color: NL.accent, background: NL.accentSoft,
            textAlign: "center", borderRadius: 4, padding: 7,
          },
          condition: "vars.segment == 'consumer'",
          zIndex: 2,
        }),
        b("picture", {
          name: "Hero", x: 64, y: 124, w: 592, h: 180,
          content: { src: DEMO_IMG.productHero, alt: "Feature" },
          zIndex: 1,
          variants: [{ id: id(), output: "email", x: 40, w: 520, h: 160 }],
        }),
        b("text", {
          name: "Title", x: 64, y: 324, w: 592, h: 32,
          content: { text: "{{title}}" },
          style: { fontSize: 20, fontWeight: 700, color: NL.ink },
          zIndex: 1,
          variants: [
            { id: id(), language: "fr", content: { text: "{{title}}" } },
            { id: id(), output: "email", x: 40, w: 520 },
          ],
        }),
        b("paragraph", {
          name: "Intro", x: 64, y: 368, w: 592, h: 120,
          content: {
            text: "Hi {{first_name}},\n\n{{intro}}\n\nWe put the important updates below so you can skim in under a minute — then dig into the full changelog when you have time.",
          },
          style: { fontSize: 13, color: "#3d4a5c", lineHeight: 1.55 },
          zIndex: 1,
          variants: [
            {
              id: id(), language: "fr",
              content: {
                text: "Bonjour {{first_name}},\n\n{{intro}}\n\nVoici les mises à jour essentielles — moins d’une minute pour parcourir, puis le changelog complet quand vous avez le temps.",
              },
            },
            { id: id(), output: "email", x: 40, w: 520 },
          ],
        }),
        b("table", {
          name: "Modules", x: 64, y: 508, w: 592, h: 120,
          content: {
            rows: 3, cols: 2,
            cells: [
              ["Update", "Detail"],
              ["{{mod1_title}}", "{{mod1_body}}"],
              ["{{mod2_title}}", "{{mod2_body}}"],
            ],
          },
          style: { fontSize: 11 },
          zIndex: 1,
          variants: [
            {
              id: id(), language: "fr",
              content: {
                rows: 3, cols: 2,
                cells: [
                  ["Mise à jour", "Détail"],
                  ["{{mod1_title}}", "{{mod1_body}}"],
                  ["{{mod2_title}}", "{{mod2_body}}"],
                ],
              },
            },
            { id: id(), output: "email", x: 40, w: 520 },
          ],
        }),
        b("text", {
          name: "CTA", x: 64, y: 652, w: 430, h: 28,
          content: { text: "→ {{cta_label}} · {{cta_url}}" },
          style: { ...nlText("nl-h3"), color: NL.accent },
          zIndex: 1,
          variants: [
            { id: id(), language: "fr", content: { text: "→ {{cta_label}} · {{cta_url}}" } },
            { id: id(), output: "email", x: 40, w: 480 },
          ],
        }),
        b("qrcode", {
          name: "CTA QR", x: 548, y: 644, w: 92, h: 92,
          content: { value: "{{cta_url}}", ecc: "M", dark: NL.ink, light: NL.paper },
          condition: "output.kind == 'pdf' || output.kind == 'print'",
          zIndex: 2,
        }),
        b("picture", {
          name: "Avatar", x: 64, y: 714, w: 48, h: 48,
          content: { src: DEMO_IMG.headshot, alt: "Author" },
          variants: [{ id: id(), output: "email", x: 40 }],
          zIndex: 1,
        }),
        b("text", {
          name: "From", x: 124, y: 722, w: 360, h: 40,
          content: { text: "{{sender_name}}\n{{sender_role}}" },
          style: { fontSize: 11, color: NL.inkMuted },
          variants: [{ id: id(), output: "email", x: 100 }],
          zIndex: 1,
        }),
        b("text", {
          name: "Email footer", x: 64, y: 900, w: 592, h: 44,
          content: {
            text: "You’re receiving this because you subscribed as {{email}}.\nWeb version: {{web_version_url}} · Unsubscribe: {{unsub_url}} · © {{year}} Northline",
          },
          style: { fontSize: 9, color: NL.inkFaint, textAlign: "center" },
          pin: { bottom: true, left: true, right: true },
          condition: "output.kind == 'email'",
          variants: [
            {
              id: id(), language: "fr",
              content: {
                text: "Vous recevez ce message car vous êtes abonné(e) avec {{email}}.\nVersion web : {{web_version_url}} · Se désabonner : {{unsub_url}} · © {{year}} Northline",
              },
            },
            { id: id(), output: "email", x: 40, w: 520 },
          ],
        }),
        b("text", {
          name: "Page footer", x: 64, y: 900, w: 592, h: 40,
          content: {
            text: "Web version: {{web_version_url}} · © {{year}} Northline · {{env.today|date:short}}",
          },
          style: { fontSize: 9, color: NL.inkMuted, textAlign: "center" },
          pin: { bottom: true, left: true, right: true },
          condition: "output.kind != 'email'",
        }),
      ]),
      page("Plain-text version", [
        b("text", {
          name: "PT subject", x: 40, y: 56, w: 620, h: 22,
          content: { text: "Subject: {{title}}" },
          style: { fontSize: 13, fontWeight: 700, color: NL.ink },
        }),
        b("paragraph", {
          name: "PT body", x: 40, y: 100, w: 620, h: 500,
          content: {
            text: "Hi {{first_name}},\n\n{{intro}}\n\n* {{mod1_title}}\n  {{mod1_body}}\n\n* {{mod2_title}}\n  {{mod2_body}}\n\n{{cta_label}}: {{cta_url}}\nWeb version: {{web_version_url}}",
          },
          style: { fontSize: 12, lineHeight: 1.55, color: NL.ink },
          variants: [{
            id: id(), language: "fr",
            content: {
              text: "Bonjour {{first_name}},\n\n{{intro}}\n\n* {{mod1_title}}\n  {{mod1_body}}\n\n* {{mod2_title}}\n  {{mod2_body}}\n\n{{cta_label}} : {{cta_url}}\nVersion web : {{web_version_url}}",
            },
          }],
        }),
        b("paragraph", {
          name: "PT footer", x: 40, y: 880, w: 620, h: 44,
          content: {
            text: "Unsubscribe: {{unsub_url}} · © {{year}} Northline",
          },
          style: { fontSize: 9, color: NL.inkFaint, textAlign: "center" },
          pin: { bottom: true, left: true, right: true },
        }),
      ], { condition: "output.kind == 'email'" }),
    ],
    {
      outputs,
      activeOutputId: outputs.find((output) => output.kind === "email")?.id,
      ...northlineStyleExtras("en"),
    },
  );
}

export function newsletterDigest(): Project {
  const outputs = outputsFor("preview", "pdf", "print", "email");

  return shell(
    {
      name: "Publication digest",
      author: "Northline Editorial",
      subject: "Print-first multi-column newsletter digest",
      description:
        "A4 editorial digest with a compact single-column email branch and QR web edition.",
    },
    [
      page("Digest", [
        b("shape", {
          name: "Masthead", x: 0, y: 0, w: 714, h: 90,
          content: { shape: "rect", filled: true },
          style: { background: NL.ink },
          pin: { top: true, left: true, right: true },
        }),
        b("text", {
          name: "Digest title", x: 38, y: 20, w: 440, h: 38,
          content: { text: "{{digest_title}}" },
          style: { ...nlText("nl-h1"), color: NL.paper },
          variants: [{ id: id(), language: "fr", content: { text: "{{digest_title_fr}}" } }],
          zIndex: 1,
        }),
        b("paragraph", {
          name: "Edition", x: 500, y: 18, w: 176, h: 54,
          content: { text: "{{edition}}\nNo. {{edition_number}}\n{{edition_date|date:long}}" },
          style: { fontSize: 10, lineHeight: 1.45, color: NL.paperCool, textAlign: "right" },
          zIndex: 1,
        }),
        b("text", {
          name: "B2B badge", x: 38, y: 106, w: 132, h: 28,
          content: { text: "BUSINESS EDITION" },
          style: { ...nlText("nl-label"), background: NL.accentSoft, color: NL.accent, padding: 7 },
          condition: "vars.segment == 'b2b'",
        }),
        b("text", {
          name: "Consumer badge", x: 38, y: 106, w: 132, h: 28,
          content: { text: "CONSUMER EDITION" },
          style: { ...nlText("nl-label"), background: NL.paperWarm, color: NL.ink, padding: 7 },
          condition: "vars.segment == 'consumer'",
        }),
        b("text", {
          name: "Headline", x: 38, y: 154, w: 638, h: 60,
          content: { text: "{{headline}}" },
          style: { ...nlText("nl-h1") },
          variants: [{ id: id(), language: "fr", content: { text: "{{headline_fr}}" } }],
        }),
        b("paragraph", {
          name: "Left column", x: 38, y: 238, w: 302, h: 500,
          content: { text: "{{body_col1}}\n\n{{story_2_title}}\n\n{{body_col2}}" },
          style: { ...nlText("nl-body-tight"), lineHeight: 1.5 },
          condition: "output.kind != 'email'",
          variants: [{
            id: id(), language: "fr",
            content: { text: "{{body_col1_fr}}\n\n{{story_2_title_fr}}\n\n{{body_col2_fr}}" },
          }],
        }),
        b("paragraph", {
          name: "Right column", x: 374, y: 238, w: 302, h: 500,
          content: { text: "{{body_col3}}\n\n{{story_4_title}}\n\n{{body_col4}}" },
          style: { ...nlText("nl-body-tight"), lineHeight: 1.5 },
          condition: "output.kind != 'email'",
          variants: [{
            id: id(), language: "fr",
            content: { text: "{{body_col3_fr}}\n\n{{story_4_title_fr}}\n\n{{body_col4_fr}}" },
          }],
        }),
        b("paragraph", {
          name: "Email body", x: 52, y: 238, w: 610, h: 520,
          content: {
            text: "{{body_col1}}\n\n{{story_2_title}}\n{{body_col2}}\n\n{{body_col3}}\n\n{{story_4_title}}\n{{body_col4}}\n\nRead online: {{web_version_url}}\nMore: {{cta_url}}",
          },
          style: { ...nlText("nl-body"), lineHeight: 1.55 },
          condition: "output.kind == 'email'",
          variants: [{
            id: id(), language: "fr",
            content: {
              text: "{{body_col1_fr}}\n\n{{story_2_title_fr}}\n{{body_col2_fr}}\n\n{{body_col3_fr}}\n\n{{story_4_title_fr}}\n{{body_col4_fr}}\n\nLire en ligne : {{web_version_url}}\nSuite : {{cta_url}}",
            },
          }],
        }),
        b("qrcode", {
          name: "Web edition QR", x: 566, y: 802, w: 92, h: 92,
          content: { value: "{{web_version_url}}", ecc: "M", dark: NL.ink, light: NL.paper },
          condition: "output.kind == 'pdf' || output.kind == 'print'",
        }),
        b("paragraph", {
          name: "Footer", x: 38, y: 926, w: 638, h: 48,
          content: {
            text: "{{edition}} · {{web_version_url}} · {{cta_url}}\nEmail preferences / unsubscribe: {{unsub_url}}",
          },
          style: { ...nlText("nl-fineprint"), textAlign: "center" },
          pin: { bottom: true, left: true, right: true },
          variants: [{
            id: id(), language: "fr",
            content: {
              text: "{{edition}} · {{web_version_url}} · {{cta_url}}\nPréférences / désabonnement : {{unsub_url}}",
            },
          }],
        }),
      ], {
        spread: false,
        margins: { top: 0, right: 38, bottom: 50, left: 38 },
        background: NL.paper,
      }),
    ],
    {
      artboard: "a4",
      outputs,
      activeOutputId: outputs.find((output) => output.kind === "pdf")?.id,
      ...northlineStyleExtras("en"),
    },
  );
}

export const email = newsletterProduct;
