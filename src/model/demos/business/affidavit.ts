import type { Block, Project } from "../../document";
import { DEMO_IMG } from "../assets";
import { northlineStyleExtras } from "../brand/northlineStyles";
import { b, id, outputsFor, page, shell } from "../helpers";
import { LEGAL, legalLetterhead, urlQrFooter } from "./legalShared";

function head(en: string, fr: string): Block[] {
  const blocks = legalLetterhead(en);
  blocks[1]!.variants = [
    { id: id(), language: "fr", content: { text: fr } },
  ];
  return blocks;
}

function statement(
  name: string,
  y: number,
  en: string,
  fr: string,
  h: number,
): Block[] {
  const style = { fontSize: 12, lineHeight: 1.6, color: LEGAL.ink } as const;
  return [
    b("paragraph", {
      name: `${name} EN`,
      x: 48,
      y,
      w: 624,
      h,
      content: { text: en },
      style,
      condition: "vars.language != 'fr'",
    }),
    b("paragraph", {
      name: `${name} FR`,
      x: 48,
      y,
      w: 624,
      h,
      content: { text: fr },
      style,
      condition: "vars.language == 'fr'",
    }),
  ];
}

export function affidavit(): Project {
  return shell(
    {
      name: "Affidavit and jurat",
      author: "Northline Legal",
      subject: "Bilingual sworn statement with witness jurat",
      description:
        "Two-page affidavit with EN/FR body branches, sworn stamp, docket QR, and deponent/witness signatures.",
    },
    [
      page("Affidavit", [
        ...head("AFFIDAVIT — {{docket_no}}", "DÉCLARATION SOUS SERMENT — {{docket_no}}"),
        b("table", {
          name: "Court details",
          x: 48,
          y: 92,
          w: 624,
          h: 110,
          content: {
            rows: 3,
            cols: 2,
            cells: [
              ["Authority", "{{authority}}"],
              ["Matter", "{{matter_title}}"],
              ["Deponent", "{{deponent_name}}"],
            ],
          },
          style: { fontSize: 11 },
        }),
        ...statement(
          "Opening",
          232,
          "I, {{deponent_name}}, of {{deponent_address}}, being duly sworn, state as follows:\n\n1. I am the {{deponent_role}} and have personal knowledge of the matters set out in this affidavit, except where stated to be based on information and belief.",
          "Je soussigné(e), {{deponent_name}}, domicilié(e) à {{deponent_address}}, dûment assermenté(e), déclare ce qui suit :\n\n1. J’agis en qualité de {{deponent_role}} et ai une connaissance personnelle des faits exposés, sauf indication qu’ils reposent sur des informations tenues pour vraies.",
          180,
        ),
        ...statement(
          "Facts",
          436,
          "2. On {{event_date|date:long}}, {{fact_one}}\n\n3. Thereafter, {{fact_two}}\n\n4. The attached exhibits are true copies of records maintained in the ordinary course.\n\n5. I make this affidavit in support of {{purpose}} and for no improper purpose.",
          "2. Le {{event_date|date:long}}, {{fact_one}}\n\n3. Par la suite, {{fact_two}}\n\n4. Les pièces jointes sont des copies fidèles de documents conservés dans le cours normal des activités.\n\n5. La présente déclaration est établie à l’appui de {{purpose}}, sans finalité abusive.",
          250,
        ),
        b("picture", {
          name: "Sworn stamp",
          x: 548,
          y: 724,
          w: 88,
          h: 88,
          content: { src: DEMO_IMG.stamp, alt: "Sworn and approved" },
          condition: "vars.sworn == 'yes'",
        }),
        b("text", {
          name: "Page footer",
          x: 40,
          y: 914,
          w: 640,
          h: 18,
          content: { text: "{{docket_no}} · Affidavit · 1/2" },
          style: { fontSize: 9, color: LEGAL.muted, textAlign: "center" },
          pin: { bottom: true, left: true, right: true },
        }),
      ]),
      page("Jurat", [
        ...head("JURAT & SIGNATURES", "ASSERMENTATION ET SIGNATURES"),
        ...statement(
          "Declaration",
          112,
          "I solemnly affirm that the contents of this affidavit are true and correct to the best of my knowledge and belief. I understand that a knowingly false statement may expose me to penalties.",
          "J’affirme solennellement que le contenu de la présente déclaration est exact au mieux de ma connaissance et de ma conviction. Je comprends qu’une fausse déclaration consciente peut entraîner des sanctions.",
          130,
        ),
        b("signature", {
          name: "Deponent signature",
          x: 48,
          y: 300,
          w: 280,
          h: 130,
          content: {
            mode: "open",
            src: "",
            label: "Deponent / Déclarant",
            caption: "{{deponent_name}}\n{{deponent_role}}",
            signedAt: "{{sworn_date|date:short}}",
            showLine: true,
          },
          style: { fontSize: 11, color: LEGAL.muted, fontFamily: "ui" },
        }),
        b("signature", {
          name: "Witness signature",
          x: 376,
          y: 300,
          w: 280,
          h: 130,
          content: {
            mode: "preset",
            src: DEMO_IMG.signature,
            label: "Witness / Témoin",
            caption: "{{witness_name}}\n{{witness_capacity}}",
            signedAt: "{{sworn_date|date:short}}",
            showLine: true,
          },
          style: { fontSize: 11, color: LEGAL.muted, fontFamily: "ui" },
        }),
        ...statement(
          "Jurat",
          478,
          "Sworn or affirmed before me at {{sworn_place}} on {{sworn_date|date:long}}. Identity verified by {{identity_method}}. Commission or registration: {{witness_registration}}.",
          "Déclaré sous serment ou affirmé devant moi à {{sworn_place}}, le {{sworn_date|date:long}}. Identité vérifiée au moyen de {{identity_method}}. Commission ou inscription : {{witness_registration}}.",
          110,
        ),
        ...urlQrFooter("docket_url", "Verify docket"),
        b("text", {
          name: "Page footer",
          x: 40,
          y: 914,
          w: 640,
          h: 18,
          content: { text: "{{docket_no}} · Jurat · 2/2" },
          style: { fontSize: 9, color: LEGAL.muted, textAlign: "center" },
          pin: { bottom: true, left: true, right: true },
        }),
      ]),
    ],
    {
      artboard: "document",
      outputs: outputsFor("preview", "pdf", "print"),
      ...northlineStyleExtras("en"),
    },
  );
}
