import type { Project } from "../../document";
import { DEMO_IMG } from "../assets";
import { northlineStyleExtras } from "../brand/northlineStyles";
import { b, outputsFor, page, shell } from "../helpers";

export function ratesFines(): Project {
  return shell(
    {
      name: "Rates and fines",
      author: "Northline Municipal Services",
      subject: "Rate card and multilingual fine notice",
      description:
        "A two-page rate and fine demo with literal multipliers, fine-type branches and payment QR.",
    },
    [
      page("Rate card", [
        b("shape", {
          name: "Header",
          x: 0, y: 0, w: 714, h: 76,
          content: { shape: "rect", filled: true },
          style: { background: "#1c2430" },
        }),
        b("picture", {
          name: "Mark",
          x: 38, y: 20, w: 122, h: 36,
          content: { src: DEMO_IMG.logoMark, alt: "Northline" },
          zIndex: 1,
        }),
        b("text", {
          name: "Rate title EN",
          x: 290, y: 21, w: 386, h: 32,
          content: { text: "MUNICIPAL SERVICE RATE CARD" },
          style: { fontSize: 18, fontWeight: 700, color: "#ffffff", textAlign: "right" },
          condition: "vars.language != 'fr'",
          zIndex: 1,
        }),
        b("text", {
          name: "Rate title FR",
          x: 290, y: 21, w: 386, h: 32,
          content: { text: "BARÈME DES SERVICES MUNICIPAUX" },
          style: { fontSize: 18, fontWeight: 700, color: "#ffffff", textAlign: "right" },
          condition: "vars.language == 'fr'",
          zIndex: 1,
        }),
        b("paragraph", {
          name: "Rate intro EN",
          x: 38, y: 104, w: 638, h: 70,
          content: {
            text: "Reference {{rate_card_no}} · effective {{effective_date|date:long}}\nRates below exclude VAT unless stated. Approved work orders use the precomputed quote total supplied in merge data.",
          },
          style: { fontSize: 11.5, lineHeight: 1.5, color: "#3d4a5c" },
          condition: "vars.language != 'fr'",
        }),
        b("paragraph", {
          name: "Rate intro FR",
          x: 38, y: 104, w: 638, h: 70,
          content: {
            text: "Référence {{rate_card_no}} · en vigueur le {{effective_date|date:long}}\nLes tarifs ci-dessous sont hors TVA sauf indication. Le devis pré-calculé fourni dans les données de fusion fait foi.",
          },
          style: { fontSize: 11.5, lineHeight: 1.5, color: "#3d4a5c" },
          condition: "vars.language == 'fr'",
        }),
        b("table", {
          name: "Rates",
          x: 38, y: 200, w: 638, h: 260,
          content: {
            header: true,
            zebra: true,
            sourcePath: "rates",
            rows: 2,
            cols: 4,
            cells: [
              ["Code", "Service / Prestation", "Unit / Unité", "Rate / Tarif"],
              ["{{code}}", "{{label}}", "{{unit}}", "{{rate|currency:EUR}}"],
            ],
            headerBackground: "#e6f2f0",
            cellPadding: 8,
          },
          style: { fontSize: 11, color: "#1c2430" },
        }),
        b("shape", {
          name: "Overtime plate",
          x: 38, y: 492, w: 638, h: 128,
          content: { shape: "rect" },
          style: { background: "#f2f4f7", borderRadius: 7, borderColor: "#d8dde3", borderWidth: 1 },
        }),
        b("text", {
          name: "Overtime heading",
          x: 58, y: 514, w: 598, h: 24,
          content: { text: "OVERTIME / HEURES SUPPLÉMENTAIRES" },
          style: { fontSize: 12, fontWeight: 700, color: "#0f6b63" },
          zIndex: 1,
        }),
        b("paragraph", {
          name: "Overtime calculation",
          x: 58, y: 548, w: 598, h: 54,
          content: {
            text: "Rate field: {{overtime_rate|currency:EUR}} per hour\nCalculation demo: {{hours}} h × €75 = {{hours|mul:75|currency:EUR}} · Quote checksum: {{quote_checksum_total|currency:EUR}}",
          },
          style: { fontSize: 12, lineHeight: 1.55, color: "#1c2430" },
          zIndex: 1,
        }),
        b("paragraph", {
          name: "Terms EN",
          x: 38, y: 660, w: 638, h: 120,
          content: {
            text: "Minimum call-out: {{minimum_hours}} hours. Cancellations within {{cancel_hours}} hours may be billed at the base call-out. The supplied quote_total field is authoritative; the multiplication above demonstrates template filters only.",
          },
          style: { fontSize: 11, lineHeight: 1.55, color: "#5c6570" },
          condition: "vars.language != 'fr'",
        }),
        b("paragraph", {
          name: "Terms FR",
          x: 38, y: 660, w: 638, h: 120,
          content: {
            text: "Intervention minimale : {{minimum_hours}} heures. Toute annulation à moins de {{cancel_hours}} heures peut être facturée au forfait de base. Le champ quote_total fourni fait foi ; le calcul ci-dessus illustre uniquement les filtres.",
          },
          style: { fontSize: 11, lineHeight: 1.55, color: "#5c6570" },
          condition: "vars.language == 'fr'",
        }),
        b("text", {
          name: "Rate total",
          x: 376, y: 812, w: 300, h: 34,
          content: { text: "Quoted total: {{quote_total|currency:EUR}}" },
          style: { fontSize: 15, fontWeight: 700, textAlign: "right", color: "#1c2430" },
        }),
        b("text", {
          name: "Footer",
          x: 38, y: 956, w: 638, h: 18,
          content: { text: "rates@northline.example · {{rate_card_no}} · 1 / 2" },
          style: { fontSize: 9, color: "#9aa3ad", textAlign: "center" },
        }),
      ], { spread: false }),
      page("Fine notice", [
        b("shape", {
          name: "Header",
          x: 0, y: 0, w: 714, h: 72,
          content: { shape: "rect", filled: true },
          style: { background: "#e6f2f0" },
        }),
        b("text", {
          name: "Fine title EN",
          x: 38, y: 20, w: 638, h: 30,
          content: { text: "NOTICE OF FINE — {{notice_no}}" },
          style: { fontSize: 19, fontWeight: 700, color: "#1c2430" },
          condition: "vars.language != 'fr'",
          zIndex: 1,
        }),
        b("text", {
          name: "Fine title FR",
          x: 38, y: 20, w: 638, h: 30,
          content: { text: "AVIS D’AMENDE — {{notice_no}}" },
          style: { fontSize: 19, fontWeight: 700, color: "#1c2430" },
          condition: "vars.language == 'fr'",
          zIndex: 1,
        }),
        ...[
          ["Parking banner", "PARKING VIOLATION / INFRACTION DE STATIONNEMENT", "#fff2cc", "vars.fine_type == 'parking'"],
          ["Admin banner", "ADMINISTRATIVE PENALTY / SANCTION ADMINISTRATIVE", "#e6f2f0", "vars.fine_type == 'admin'"],
          ["Late banner", "LATE-FEE NOTICE / AVIS DE RETARD", "#fce8e6", "vars.fine_type == 'late_fee'"],
        ].map(([name, text, background, condition]) =>
          b("text", {
            name,
            x: 38, y: 92, w: 638, h: 36,
            content: { text },
            style: {
              fontSize: 11, fontWeight: 700, textAlign: "center",
              verticalAlign: "middle", background, borderRadius: 5,
            },
            condition,
          })
        ),
        b("table", {
          name: "Fine facts",
          x: 38, y: 152, w: 638, h: 180,
          content: {
            rows: 6, cols: 2,
            cells: [
              ["Recipient / Destinataire", "{{recipient_name}}"],
              ["Incident", "{{incident_date|date:long}} · {{location}}"],
              ["Reference", "{{case_ref}}"],
              ["Base fine / Amende", "{{base_fine|currency:EUR}}"],
              ["Daily rate / Tarif journalier", "{{daily_rate_text}}"],
              ["Statutory cap / Plafond", "{{fine_cap|currency:EUR}}"],
            ],
          },
          style: { fontSize: 11.5 },
        }),
        b("shape", {
          name: "Calculation plate",
          x: 38, y: 356, w: 418, h: 132,
          content: { shape: "rect" },
          style: { background: "#f2f4f7", borderRadius: 7 },
        }),
        b("paragraph", {
          name: "Fine calculation",
          x: 58, y: 378, w: 378, h: 90,
          content: {
            text: "Days overdue: {{days_overdue}}\nDemo: {{days_overdue}} × €12 = {{days_overdue|mul:12|currency:EUR}}\nPrecomputed penalty: {{late_penalty_total|currency:EUR}}\nAmount due: {{fine_total|currency:EUR}}",
          },
          style: { fontSize: 12, lineHeight: 1.45, color: "#1c2430" },
          zIndex: 1,
        }),
        b("qrcode", {
          name: "Fine payment QR",
          x: 520, y: 356, w: 132, h: 132,
          content: {
            value: "{{pay_url}}", ecc: "M",
            dark: "#1c2430", light: "#ffffff",
          },
          condition: "output.kind == 'pdf' || output.kind == 'print'",
        }),
        b("paragraph", {
          name: "Actions EN",
          x: 38, y: 520, w: 638, h: 92,
          content: {
            text: "Pay by {{due_date|date:long}} at {{pay_url}}. To contest this notice, submit evidence at {{contest_url}} before the due date. Quote {{notice_no}} on every submission.",
          },
          style: { fontSize: 11.5, lineHeight: 1.55, color: "#3d4a5c" },
          condition: "vars.language != 'fr'",
        }),
        b("paragraph", {
          name: "Actions FR",
          x: 38, y: 520, w: 638, h: 92,
          content: {
            text: "Payez avant le {{due_date|date:long}} sur {{pay_url}}. Pour contester, déposez vos justificatifs sur {{contest_url}} avant l’échéance. Indiquez {{notice_no}}.",
          },
          style: { fontSize: 11.5, lineHeight: 1.55, color: "#3d4a5c" },
          condition: "vars.language == 'fr'",
        }),
        b("signature", {
          name: "Officer signature",
          x: 38, y: 650, w: 300, h: 130,
          content: {
            mode: "preset", src: DEMO_IMG.signature,
            label: "Issuing officer / Agent émetteur",
            caption: "{{officer_name}}\n{{officer_title}}",
            signedAt: "{{issue_date|date:short}}", showLine: true,
          },
          style: { fontSize: 10.5, color: "#5c6570", fontFamily: "ui" },
        }),
        b("paragraph", {
          name: "Checksum",
          x: 390, y: 668, w: 286, h: 92,
          content: {
            text: "Reconciliation\nBase + penalty checksum:\n{{fine_checksum_total|currency:EUR}}\n\nContest: {{contest_url}}",
          },
          style: { fontSize: 10.5, lineHeight: 1.45, color: "#5c6570" },
        }),
        b("text", {
          name: "Footer",
          x: 38, y: 956, w: 638, h: 18,
          content: { text: "fines@northline.example · {{notice_no}} · 2 / 2" },
          style: { fontSize: 9, color: "#9aa3ad", textAlign: "center" },
        }),
      ], { spread: false }),
    ],
    {
      artboard: "a4",
      outputs: outputsFor("preview", "pdf", "print"),
      ...northlineStyleExtras("en"),
    },
  );
}
