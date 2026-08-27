import type { Project } from "../../document";
import { DEMO_IMG } from "../assets";
import { northlineStyleExtras } from "../brand/northlineStyles";
import { b, outputsFor, page, shell } from "../helpers";

export function hospitalBill(): Project {
  return shell(
    {
      name: "Hospital bill",
      author: "Hôpital Exemple — Patient Finance",
      subject: "Care invoice, remittance and reminder channels",
      description:
        "A multilingual hospital statement with finance filters, coverage branches, signatures and scan-to-pay.",
    },
    [
      page("Statement", [
        b("shape", {
          name: "Header",
          x: 0, y: 0, w: 714, h: 78,
          content: { shape: "rect", filled: true },
          style: { background: "#e6f2f0" },
        }),
        b("picture", {
          name: "Hospital mark",
          x: 38, y: 21, w: 122, h: 36,
          content: { src: DEMO_IMG.logoMark, alt: "Hôpital Exemple" },
          zIndex: 1,
        }),
        b("text", {
          name: "Title EN",
          x: 350, y: 20, w: 326, h: 38,
          content: { text: "PATIENT STATEMENT\n{{bill_no}}" },
          style: { fontSize: 18, fontWeight: 700, textAlign: "right", color: "#1c2430" },
          condition: "vars.language != 'fr'",
          zIndex: 1,
        }),
        b("text", {
          name: "Title FR",
          x: 350, y: 20, w: 326, h: 38,
          content: { text: "FACTURE PATIENT\n{{bill_no}}" },
          style: { fontSize: 18, fontWeight: 700, textAlign: "right", color: "#1c2430" },
          condition: "vars.language == 'fr'",
          zIndex: 1,
        }),
        ...[
          ["Full coverage", "COVERAGE CONFIRMED — insurer pays the covered balance.", "#d8efe8", "vars.coverage == 'full'"],
          ["Partial coverage", "PARTIAL COVERAGE — patient co-pay applies.", "#fff2cc", "vars.coverage == 'partial'"],
          ["No coverage", "NO COVERAGE — patient is responsible for the balance.", "#fce8e6", "vars.coverage == 'none'"],
        ].map(([name, text, background, condition]) =>
          b("text", {
            name,
            x: 38, y: 94, w: 638, h: 34,
            content: { text },
            style: {
              fontSize: 11, fontWeight: 700, textAlign: "center",
              verticalAlign: "middle", background, borderRadius: 5,
            },
            condition,
          })
        ),
        b("paragraph", {
          name: "Patient details",
          x: 38, y: 146, w: 300, h: 86,
          content: {
            text: "{{patient_name}}\n{{patient_address}}\nPatient ID: {{patient_id}}\nVisit: {{visit_date|date:long}}",
          },
          style: { fontSize: 11, lineHeight: 1.45, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "Bill details",
          x: 390, y: 146, w: 286, h: 86,
          content: {
            text: "Issued: {{issue_date|date:short}}\nDue: {{due_date|date:short}}\nInsurer: {{insurer}}\nClaim: {{claim_no}}",
          },
          style: { fontSize: 11, lineHeight: 1.45, textAlign: "right", color: "#5c6570" },
        }),
        b("table", {
          name: "Care lines",
          x: 38, y: 250, w: 638, h: 230,
          content: {
            header: true,
            zebra: true,
            sourcePath: "line_items",
            rows: 2,
            cols: 5,
            cells: [
              ["Code", "Service", "Qty", "Unit rate", "Amount"],
              ["{{code}}", "{{label}}", "{{qty}}", "{{unit_rate|currency:EUR}}", "{{amount|currency:EUR}}"],
            ],
            headerBackground: "#e6f2f0",
            cellPadding: 7,
          },
          style: { fontSize: 10.5, color: "#1c2430" },
        }),
        b("paragraph", {
          name: "Calculation demos",
          x: 38, y: 502, w: 350, h: 118,
          content: {
            text: "Rate field: {{line1_rate|currency:EUR}}\nLine extension demo: {{line1_qty|mul:80|currency:EUR}}\nVAT-inclusive demo (21%): {{subtotal|mul:1.21|currency:EUR}}\nCo-pay demo (15%): {{total|mul:0.15|currency:EUR}}",
          },
          style: {
            fontSize: 11, lineHeight: 1.55, color: "#3d4a5c",
            background: "#f2f4f7", borderRadius: 6, padding: 10,
          },
        }),
        b("table", {
          name: "Authoritative totals",
          x: 414, y: 502, w: 262, h: 150,
          content: {
            rows: 5,
            cols: 2,
            cells: [
              ["Subtotal", "{{subtotal|currency:EUR}}"],
              ["VAT ({{vat_rate_text}})", "{{vat_total|currency:EUR}}"],
              ["Total", "{{total|currency:EUR}}"],
              ["Insurance", "{{insurance_total|currency:EUR}}"],
              ["Patient due", "{{patient_due|currency:EUR}}"],
            ],
          },
          style: { fontSize: 11.5, fontWeight: 600 },
        }),
        b("paragraph", {
          name: "Checksum note",
          x: 38, y: 680, w: 638, h: 72,
          content: {
            text: "Precomputed checksums: line total {{line_checksum_total|currency:EUR}} · invoice total {{invoice_checksum_total|currency:EUR}}. These merge fields are the reconciliation source of truth.",
          },
          style: { fontSize: 10.5, lineHeight: 1.45, color: "#5c6570" },
        }),
        b("text", {
          name: "Portal EN",
          x: 38, y: 790, w: 638, h: 32,
          content: { text: "Questions or itemized records: {{portal_url}}" },
          style: { fontSize: 11, color: "#0f6b63" },
          condition: "vars.language != 'fr'",
        }),
        b("text", {
          name: "Portal FR",
          x: 38, y: 790, w: 638, h: 32,
          content: { text: "Questions ou relevé détaillé : {{portal_url}}" },
          style: { fontSize: 11, color: "#0f6b63" },
          condition: "vars.language == 'fr'",
        }),
        b("text", {
          name: "Footer",
          x: 38, y: 956, w: 638, h: 18,
          content: { text: "Hôpital Exemple · {{bill_no}} · 1 / 3" },
          style: { fontSize: 9, color: "#9aa3ad", textAlign: "center" },
        }),
      ], { spread: false }),
      page("Remittance", [
        b("shape", {
          name: "Header",
          x: 0, y: 0, w: 714, h: 64,
          content: { shape: "rect", filled: true },
          style: { background: "#e6f2f0" },
        }),
        b("text", {
          name: "Remittance title EN",
          x: 38, y: 18, w: 638, h: 28,
          content: { text: "REMITTANCE ADVICE — {{bill_no}}" },
          style: { fontSize: 17, fontWeight: 700, color: "#1c2430" },
          condition: "vars.language != 'fr'",
          zIndex: 1,
        }),
        b("text", {
          name: "Remittance title FR",
          x: 38, y: 18, w: 638, h: 28,
          content: { text: "BORDEREAU DE PAIEMENT — {{bill_no}}" },
          style: { fontSize: 17, fontWeight: 700, color: "#1c2430" },
          condition: "vars.language == 'fr'",
          zIndex: 1,
        }),
        b("table", {
          name: "Payment summary",
          x: 38, y: 92, w: 420, h: 170,
          content: {
            rows: 5, cols: 2,
            cells: [
              ["Patient", "{{patient_name}}"],
              ["Reference", "{{bill_no}}"],
              ["Due date", "{{due_date|date:short}}"],
              ["Rate", "{{copay_rate_text}}"],
              ["Amount due", "{{patient_due|currency:EUR}}"],
            ],
          },
          style: { fontSize: 12 },
        }),
        b("qrcode", {
          name: "Pay QR",
          x: 520, y: 100, w: 132, h: 132,
          content: {
            value: "{{pay_url}}", ecc: "M",
            dark: "#1c2430", light: "#ffffff",
          },
          condition: "output.kind == 'pdf' || output.kind == 'print'",
        }),
        b("text", {
          name: "Pay link",
          x: 486, y: 240, w: 200, h: 46,
          content: { text: "{{pay_url}}" },
          style: { fontSize: 9, color: "#0f6b63", textAlign: "center" },
        }),
        b("paragraph", {
          name: "Instructions EN",
          x: 38, y: 310, w: 638, h: 110,
          content: {
            text: "Pay online or return this advice with your transfer. Quote {{bill_no}} exactly. For payment plans, visit {{portal_url}} before {{due_date|date:short}}.",
          },
          style: { fontSize: 12, lineHeight: 1.55, color: "#3d4a5c" },
          condition: "vars.language != 'fr'",
        }),
        b("paragraph", {
          name: "Instructions FR",
          x: 38, y: 310, w: 638, h: 110,
          content: {
            text: "Payez en ligne ou joignez ce bordereau à votre virement. Indiquez exactement {{bill_no}}. Pour un échéancier, consultez {{portal_url}} avant le {{due_date|date:short}}.",
          },
          style: { fontSize: 12, lineHeight: 1.55, color: "#3d4a5c" },
          condition: "vars.language == 'fr'",
        }),
        b("signature", {
          name: "Patient signature",
          x: 38, y: 490, w: 300, h: 126,
          content: {
            mode: "open", src: "", label: "Patient signature / Signature du patient",
            caption: "{{patient_name}}\nDate", signedAt: "", showLine: true,
          },
          style: { fontSize: 10.5, color: "#5c6570", fontFamily: "ui" },
        }),
        b("paragraph", {
          name: "Office authorization",
          x: 390, y: 490, w: 286, h: 126,
          content: {
            text: "Patient Finance\nHôpital Exemple\nbilling@hopital.example\n\nStatement checksum: {{invoice_checksum_total|currency:EUR}}",
          },
          style: { fontSize: 11, lineHeight: 1.5, color: "#5c6570" },
        }),
        b("text", {
          name: "Footer",
          x: 38, y: 956, w: 638, h: 18,
          content: { text: "billing@hopital.example · {{bill_no}} · 2 / 3" },
          style: { fontSize: 9, color: "#9aa3ad", textAlign: "center" },
        }),
      ], { spread: false }),
      page("Reminder", [
        b("shape", {
          name: "Channel card",
          x: 42, y: 72, w: 630, h: 360,
          content: { shape: "rect" },
          style: { background: "#f2f4f7", borderRadius: 10, borderColor: "#d8dde3", borderWidth: 1 },
        }),
        b("text", {
          name: "Email subject",
          x: 70, y: 104, w: 574, h: 34,
          content: { text: "Payment reminder — {{bill_no}}" },
          style: { fontSize: 18, fontWeight: 700, color: "#1c2430" },
          condition: "output.kind == 'email' && vars.language != 'fr'",
          zIndex: 1,
        }),
        b("text", {
          name: "Email subject FR",
          x: 70, y: 104, w: 574, h: 34,
          content: { text: "Rappel de paiement — {{bill_no}}" },
          style: { fontSize: 18, fontWeight: 700, color: "#1c2430" },
          condition: "output.kind == 'email' && vars.language == 'fr'",
          zIndex: 1,
        }),
        b("paragraph", {
          name: "Email reminder",
          x: 70, y: 160, w: 574, h: 210,
          content: {
            text: "Hello {{patient_name}},\n\nYour balance of {{patient_due|currency:EUR}} is due {{due_date|date:long}}. Pay securely at {{pay_url}} or review coverage at {{portal_url}}.\n\nHôpital Exemple Patient Finance",
          },
          style: { fontSize: 13, lineHeight: 1.55, color: "#3d4a5c" },
          condition: "output.kind == 'email' && vars.language != 'fr'",
          zIndex: 1,
        }),
        b("paragraph", {
          name: "Email reminder FR",
          x: 70, y: 160, w: 574, h: 210,
          content: {
            text: "Bonjour {{patient_name}},\n\nVotre solde de {{patient_due|currency:EUR}} est dû le {{due_date|date:long}}. Payez sur {{pay_url}} ou consultez votre couverture sur {{portal_url}}.\n\nService financier — Hôpital Exemple",
          },
          style: { fontSize: 13, lineHeight: 1.55, color: "#3d4a5c" },
          condition: "output.kind == 'email' && vars.language == 'fr'",
          zIndex: 1,
        }),
        b("text", {
          name: "SMS reminder",
          x: 70, y: 140, w: 574, h: 100,
          content: {
            text: "Hôpital Exemple: {{patient_due|currency:EUR}} due {{due_date|date:short}}. Ref {{bill_no}}. Pay: {{pay_url}}",
          },
          style: { fontSize: 14, lineHeight: 1.5, color: "#1c2430" },
          condition: "output.kind == 'sms'",
          zIndex: 1,
        }),
      ], {
        condition: "output.kind == 'email' || output.kind == 'sms'",
        spread: false,
      }),
    ],
    {
      artboard: "a4",
      outputs: outputsFor("preview", "pdf", "print", "email", "sms"),
      ...northlineStyleExtras("en"),
    },
  );
}
