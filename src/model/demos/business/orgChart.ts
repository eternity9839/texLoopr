import type { Project } from "../../document";
import { DEMO_IMG } from "../assets";
import { northlineStyleExtras } from "../brand/northlineStyles";
import { b, outputsFor, page, shell } from "../helpers";

function orgBox(
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  titleEn: string,
  titleFr: string,
  person: string,
  condition?: string,
) {
  return b("group", {
    name,
    x, y, w, h,
    content: {
      blocks: [
        b("shape", {
          name: `${name} card`,
          x: 0, y: 0, w, h,
          content: { shape: "rect" },
          style: {
            background: "#ffffff", borderColor: "#d8dde3",
            borderWidth: 1, borderRadius: 7, shadow: true,
          },
        }),
        b("text", {
          name: `${name} title EN`,
          x: 10, y: 10, w: w - 20, h: 20,
          content: { text: titleEn },
          style: { fontSize: 11, fontWeight: 700, color: "#0f6b63", textAlign: "center" },
          condition: "vars.language != 'fr'",
          zIndex: 1,
        }),
        b("text", {
          name: `${name} title FR`,
          x: 10, y: 10, w: w - 20, h: 20,
          content: { text: titleFr },
          style: { fontSize: 11, fontWeight: 700, color: "#0f6b63", textAlign: "center" },
          condition: "vars.language == 'fr'",
          zIndex: 1,
        }),
        b("text", {
          name: `${name} person`,
          x: 10, y: 34, w: w - 20, h: h - 42,
          content: { text: person },
          style: { fontSize: 10.5, lineHeight: 1.35, color: "#3d4a5c", textAlign: "center" },
          zIndex: 1,
        }),
      ],
    },
    condition,
  });
}

export function companyChart(): Project {
  const visual = "output.kind != 'email'";

  return shell(
    {
      name: "Company organization chart",
      author: "Northline People Operations",
      subject: "Leadership and full-company organization views",
      description:
        "A landscape org chart with language, leadership-depth and compact email branches.",
    },
    [
      page("Organization", [
        b("shape", {
          name: "Header",
          x: 0, y: 0, w: 960, h: 64,
          content: { shape: "rect", filled: true },
          style: { background: "#1c2430" },
          condition: visual,
        }),
        b("picture", {
          name: "Logo",
          x: 34, y: 17, w: 116, h: 32,
          content: { src: DEMO_IMG.logoMark, alt: "Northline" },
          condition: visual,
          zIndex: 1,
        }),
        b("text", {
          name: "Chart title EN",
          x: 220, y: 18, w: 706, h: 28,
          content: { text: "NORTHLINE SYSTEMS — ORGANIZATION" },
          style: { fontSize: 19, fontWeight: 700, color: "#ffffff", textAlign: "right" },
          condition: "output.kind != 'email' && vars.language != 'fr'",
          zIndex: 1,
        }),
        b("text", {
          name: "Chart title FR",
          x: 220, y: 18, w: 706, h: 28,
          content: { text: "NORTHLINE SYSTEMS — ORGANIGRAMME" },
          style: { fontSize: 19, fontWeight: 700, color: "#ffffff", textAlign: "right" },
          condition: "output.kind != 'email' && vars.language == 'fr'",
          zIndex: 1,
        }),
        orgBox(
          "Executive",
          382, 82, 196, 66,
          "EXECUTIVE",
          "DIRECTION GÉNÉRALE",
          "{{ceo_name}}\nCEO",
          visual,
        ),
        b("shape", {
          name: "Executive stem",
          x: 478, y: 148, w: 3, h: 27,
          content: { shape: "rect", filled: true },
          style: { background: "#9aa3ad" },
          condition: visual,
        }),
        b("shape", {
          name: "Leadership rail",
          x: 130, y: 174, w: 700, h: 3,
          content: { shape: "rect", filled: true },
          style: { background: "#9aa3ad" },
          condition: visual,
        }),
        ...[
          orgBox(
            "Operations",
            38, 196, 204, 78,
            "OPERATIONS",
            "OPÉRATIONS",
            "{{ops_lead}}\nCOO",
            visual,
          ),
          orgBox(
            "Product",
            264, 196, 204, 78,
            "PRODUCT",
            "PRODUIT",
            "{{product_lead}}\nVP Product",
            visual,
          ),
          orgBox(
            "Engineering",
            490, 196, 204, 78,
            "ENGINEERING",
            "INGÉNIERIE",
            "{{engineering_lead}}\nVP Engineering",
            visual,
          ),
          orgBox(
            "Revenue",
            716, 196, 204, 78,
            "REVENUE",
            "REVENU",
            "{{revenue_lead}}\nVP Revenue",
            visual,
          ),
        ],
        ...[140, 366, 592, 818].map((x, index) =>
          b("shape", {
            name: `Department stem ${index + 1}`,
            x, y: 176, w: 3, h: 20,
            content: { shape: "rect", filled: true },
            style: { background: "#9aa3ad" },
            condition: visual,
          })
        ),
        orgBox(
          "Operations team",
          38, 306, 204, 94,
          "OPERATIONS TEAM",
          "ÉQUIPE OPÉRATIONS",
          "{{ops_ic_1}}\n{{ops_ic_2}}\n{{ops_ic_3}}",
          "output.kind != 'email' && vars.view == 'full'",
        ),
        orgBox(
          "Product team",
          264, 306, 204, 94,
          "PRODUCT TEAM",
          "ÉQUIPE PRODUIT",
          "{{product_ic_1}}\n{{product_ic_2}}\n{{product_ic_3}}",
          "output.kind != 'email' && vars.view == 'full'",
        ),
        orgBox(
          "Engineering team",
          490, 306, 204, 94,
          "ENGINEERING TEAM",
          "ÉQUIPE INGÉNIERIE",
          "{{engineering_ic_1}}\n{{engineering_ic_2}}\n{{engineering_ic_3}}",
          "output.kind != 'email' && vars.view == 'full'",
        ),
        orgBox(
          "Revenue team",
          716, 306, 204, 94,
          "REVENUE TEAM",
          "ÉQUIPE REVENU",
          "{{revenue_ic_1}}\n{{revenue_ic_2}}\n{{revenue_ic_3}}",
          "output.kind != 'email' && vars.view == 'full'",
        ),
        ...[140, 366, 592, 818].map((x, index) =>
          b("shape", {
            name: `Team stem ${index + 1}`,
            x, y: 274, w: 3, h: 32,
            content: { shape: "rect", filled: true },
            style: { background: "#9aa3ad" },
            condition: "output.kind != 'email' && vars.view == 'full'",
          })
        ),
        b("text", {
          name: "Leadership hint EN",
          x: 38, y: 326, w: 884, h: 54,
          content: { text: "Leadership view — switch View to “full” to include individual contributors." },
          style: {
            fontSize: 12, color: "#5c6570", textAlign: "center",
            background: "#f2f4f7", borderRadius: 6, verticalAlign: "middle",
          },
          condition: "output.kind != 'email' && vars.view == 'leadership' && vars.language != 'fr'",
        }),
        b("text", {
          name: "Leadership hint FR",
          x: 38, y: 326, w: 884, h: 54,
          content: { text: "Vue direction — choisissez « full » pour afficher les contributeurs individuels." },
          style: {
            fontSize: 12, color: "#5c6570", textAlign: "center",
            background: "#f2f4f7", borderRadius: 6, verticalAlign: "middle",
          },
          condition: "output.kind != 'email' && vars.view == 'leadership' && vars.language == 'fr'",
        }),
        b("paragraph", {
          name: "Email list EN",
          x: 64, y: 52, w: 832, h: 360,
          content: {
            text: "Northline Systems — organization\n\nExecutive — {{ceo_name}}, CEO\nOperations — {{ops_lead}}, COO\nProduct — {{product_lead}}, VP Product\nEngineering — {{engineering_lead}}, VP Engineering\nRevenue — {{revenue_lead}}, VP Revenue\n\nCompany: {{company_url}}\nCareers: {{careers_url}}",
          },
          style: { fontSize: 14, lineHeight: 1.65, color: "#1c2430" },
          condition: "output.kind == 'email' && vars.language != 'fr'",
        }),
        b("paragraph", {
          name: "Email list FR",
          x: 64, y: 52, w: 832, h: 360,
          content: {
            text: "Northline Systems — organigramme\n\nDirection générale — {{ceo_name}}, CEO\nOpérations — {{ops_lead}}, COO\nProduit — {{product_lead}}, VP Produit\nIngénierie — {{engineering_lead}}, VP Ingénierie\nRevenu — {{revenue_lead}}, VP Revenu\n\nEntreprise : {{company_url}}\nCarrières : {{careers_url}}",
          },
          style: { fontSize: 14, lineHeight: 1.65, color: "#1c2430" },
          condition: "output.kind == 'email' && vars.language == 'fr'",
        }),
        b("text", {
          name: "Footer links",
          x: 38, y: 476, w: 884, h: 28,
          content: { text: "{{company_url}}   ·   {{careers_url}}" },
          style: { fontSize: 10.5, color: "#0f6b63", textAlign: "center" },
          condition: visual,
        }),
      ], { spread: false }),
    ],
    {
      artboard: "landscape",
      outputs: outputsFor("preview", "pdf", "image"),
      ...northlineStyleExtras("en"),
    },
  );
}
