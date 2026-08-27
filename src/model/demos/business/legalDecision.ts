import type { Block, Project } from "../../document";
import { DEMO_IMG } from "../assets";
import { northlineStyleExtras } from "../brand/northlineStyles";
import { b, id, outputsFor, page, shell } from "../helpers";
import { LEGAL, legalLetterhead, urlQrFooter } from "./legalShared";

const body = {
  fontSize: 11.5,
  lineHeight: 1.55,
  color: LEGAL.ink,
} as const;

function head(en: string, fr: string): Block[] {
  const blocks = legalLetterhead(en);
  blocks[1]!.variants = [
    { id: id(), language: "fr", content: { text: fr } },
  ];
  return blocks;
}

function bilingual(
  name: string,
  y: number,
  en: string,
  fr: string,
  h = 180,
): Block[] {
  return [
    b("paragraph", {
      name: `${name} EN`,
      x: 40,
      y,
      w: 640,
      h,
      content: { text: en },
      style: body,
      condition: "vars.language != 'fr'",
    }),
    b("paragraph", {
      name: `${name} FR`,
      x: 40,
      y,
      w: 640,
      h,
      content: { text: fr },
      style: body,
      condition: "vars.language == 'fr'",
    }),
  ];
}

function footer(text: string): Block {
  return b("text", {
    name: "Page footer",
    x: 40,
    y: 914,
    w: 640,
    h: 18,
    content: { text },
    style: { fontSize: 9, color: LEGAL.muted, textAlign: "center" },
    pin: { bottom: true, left: true, right: true },
  });
}

function decisionBanner(
  decision: string,
  text: string,
  background: string,
  color = "#ffffff",
): Block {
  return b("text", {
    name: `${decision} banner`,
    x: 40,
    y: 88,
    w: 640,
    h: 42,
    content: { text },
    style: {
      fontSize: 14,
      fontWeight: 700,
      color,
      background,
      textAlign: "center",
      verticalAlign: "middle",
    },
    condition: `vars.decision == '${decision}'`,
  });
}

export function legalDecision(): Project {
  return shell(
    {
      name: "Administrative decision dossier",
      author: "Northline Administrative Authority",
      subject: "Full bilingual decision and appeal dossier",
      description:
        "Four-page decision dossier with four status branches, EN/FR reasons, optional fine, authority signature, and appeal/docket QR links.",
    },
    [
      page("Decision", [
        ...head("FORMAL DECISION — {{case_id}}", "DÉCISION FORMELLE — {{case_id}}"),
        decisionBanner("approved", "APPROVED / APPROUVÉE", LEGAL.accent),
        decisionBanner("pending", "PENDING / EN INSTANCE", "#e8e4dc", LEGAL.ink),
        decisionBanner("revoked", "REVOKED / RÉVOQUÉE", "#7f1d1d"),
        decisionBanner("rejected", "REJECTED / REJETÉE", "#9b2c2c"),
        b("table", {
          name: "Decision details",
          x: 40,
          y: 158,
          w: 640,
          h: 170,
          content: {
            rows: 5,
            cols: 2,
            cells: [
              ["Authority", "{{authority_name}}"],
              ["Applicant", "{{applicant_name}}"],
              ["Matter", "{{matter_title}}"],
              ["Decision date", "{{decision_date|date:long}}"],
              ["Docket", "{{docket_no}}"],
            ],
          },
          style: { fontSize: 11 },
        }),
        ...bilingual(
          "Operative decision",
          368,
          "The Authority, acting under {{legal_basis}}, issues the following decision:\n\n{{operative_text}}\n\nThis decision takes effect on {{effective_date|date:long}}, subject to the appeal rights stated in this dossier.",
          "L’Autorité, agissant en vertu de {{legal_basis}}, rend la décision suivante :\n\n{{operative_text_fr}}\n\nLa présente décision prend effet le {{effective_date|date:long}}, sous réserve des voies de recours indiquées dans ce dossier.",
          190,
        ),
        b("picture", {
          name: "Approved stamp",
          x: 548,
          y: 604,
          w: 88,
          h: 88,
          content: { src: DEMO_IMG.stamp, alt: "Approved" },
          condition: "vars.decision == 'approved'",
        }),
        ...urlQrFooter("docket_url", "Official docket"),
        footer("{{case_id}} · Formal decision · 1/4"),
      ]),
      page("Reasons", [
        ...head("REASONS FOR DECISION", "MOTIFS DE LA DÉCISION"),
        ...bilingual(
          "Considering one",
          100,
          "CONSIDERING the application filed on {{application_date|date:long}} and the evidence listed in Schedule 1;\n\nCONSIDERING the Authority’s jurisdiction under {{legal_basis}};\n\nCONSIDERING that {{finding_one}};",
          "CONSIDÉRANT la demande déposée le {{application_date|date:long}} et les éléments énumérés à l’Annexe 1 ;\n\nCONSIDÉRANT la compétence de l’Autorité au titre de {{legal_basis}} ;\n\nCONSIDÉRANT que {{finding_one_fr}} ;",
          220,
        ),
        ...bilingual(
          "Considering two",
          354,
          "CONSIDERING the submissions of {{applicant_name}} and the proportionality of the available measures;\n\nTHE AUTHORITY FINDS that {{finding_two}}.\n\nThe reasons above address the material evidence. Immaterial or duplicative submissions do not alter the outcome.",
          "CONSIDÉRANT les observations de {{applicant_name}} et la proportionnalité des mesures disponibles ;\n\nL’AUTORITÉ CONSTATE que {{finding_two_fr}}.\n\nLes motifs ci-dessus répondent aux éléments déterminants. Les observations non pertinentes ou répétitives ne modifient pas l’issue.",
          230,
        ),
        b("text", {
          name: "Optional fine",
          x: 40,
          y: 630,
          w: 640,
          h: 54,
          content: {
            text: "Administrative fine: base {{base_fine|currency:EUR}} · statutory multiplier 1.5× · amount {{base_fine|mul:1.5|currency:EUR}}",
          },
          style: {
            fontSize: 12,
            fontWeight: 700,
            color: "#7f1d1d",
            background: "#fdf0ef",
            padding: 10,
          },
          condition: "has_fine == 'yes'",
        }),
        footer("{{case_id}} · Reasons · 2/4"),
      ]),
      page("Orders", [
        ...head("ORDERS & COMPLIANCE", "INJONCTIONS ET CONFORMITÉ"),
        b("table", {
          name: "Orders",
          x: 40,
          y: 100,
          w: 640,
          h: 300,
          content: {
            header: true,
            zebra: true,
            sourcePath: "orders",
            rows: 2,
            cols: 4,
            cells: [
              ["Order", "Responsible party", "Due date", "Evidence required"],
              [
                "{{order}}",
                "{{responsible}}",
                "{{due_date|date:short}}",
                "{{evidence}}",
              ],
            ],
            headerBackground: "#e6f2f0",
          },
          style: { fontSize: 10.5 },
        }),
        ...bilingual(
          "Compliance",
          440,
          "Compliance evidence must be uploaded against docket {{docket_no}}. Failure to comply may result in enforcement permitted by law. A pending appeal does not suspend the decision unless the competent body grants a stay.",
          "Les justificatifs de conformité sont déposés au dossier {{docket_no}}. Le défaut d’exécution peut entraîner les mesures prévues par la loi. Un recours ne suspend pas la décision sauf octroi d’un sursis par l’organe compétent.",
          130,
        ),
        ...urlQrFooter("docket_url", "Upload compliance evidence"),
        footer("{{case_id}} · Orders · 3/4"),
      ]),
      page("Appeal and authentication", [
        ...head("APPEAL RIGHTS & AUTHENTICATION", "VOIES DE RECOURS ET AUTHENTIFICATION"),
        ...bilingual(
          "Appeal",
          104,
          "An affected person may appeal to {{appeal_body}} within {{appeal_days}} days after service of this decision. The notice of appeal must identify the decision, grounds, requested remedy, and supporting evidence. Filing requirements and any fee appear at the appeal portal.",
          "Toute personne concernée peut saisir {{appeal_body}} dans un délai de {{appeal_days}} jours suivant la notification. Le recours indique la décision contestée, les moyens, la mesure demandée et les pièces justificatives. Les modalités et frais éventuels figurent sur le portail de recours.",
          170,
        ),
        b("signature", {
          name: "Authority signature",
          x: 40,
          y: 330,
          w: 320,
          h: 130,
          content: {
            mode: "preset",
            src: DEMO_IMG.signature,
            label: "For the Authority / Pour l’Autorité",
            caption: "{{authority_signer}}\n{{authority_signer_title}}",
            signedAt: "{{decision_date|date:short}}",
            showLine: true,
          },
          style: { fontSize: 11, color: LEGAL.muted, fontFamily: "ui" },
        }),
        b("paragraph", {
          name: "Service certification",
          x: 392,
          y: 330,
          w: 288,
          h: 130,
          content: {
            text: "Service certified by {{service_officer}}\nMethod: {{service_method}}\nDate: {{service_date|date:long}}\nRecipient: {{applicant_name}}",
          },
          style: { ...body, fontSize: 10.5 },
        }),
        ...urlQrFooter("appeal_url", "File or review an appeal", 700),
        ...urlQrFooter("docket_url", "Authenticate this decision", 798),
        footer("{{case_id}} · Appeal rights · 4/4"),
      ]),
    ],
    {
      artboard: "document",
      outputs: outputsFor("preview", "pdf", "print"),
      ...northlineStyleExtras("en"),
    },
  );
}
