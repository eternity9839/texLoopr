import type { Block, Project } from "../../document";
import { DEMO_IMG } from "../assets";
import { northlineStyleExtras } from "../brand/northlineStyles";
import { b, id, outputsFor, page, shell } from "../helpers";
import {
  LEGAL,
  legalLetterhead,
  signaturePair,
  urlQrFooter,
} from "./legalShared";

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

function footer(text: string): Block {
  return b("text", {
    name: "Document footer",
    x: 40,
    y: 914,
    w: 640,
    h: 18,
    content: { text },
    style: { fontSize: 9, color: LEGAL.muted, textAlign: "center" },
    pin: { bottom: true, left: true, right: true },
  });
}

function clause(
  name: string,
  y: number,
  en: string,
  fr: string,
  h = 150,
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

export function contractLong(): Project {
  return shell(
    {
      name: "Master services agreement",
      author: "Northline Legal",
      subject: "Long-form bilingual MSA with schedules",
      description:
        "Six-page EN/FR services agreement with status branches, portal QR, signatures, and fee schedule.",
    },
    [
      page("Cover", [
        ...head("MASTER SERVICES AGREEMENT", "CONTRAT-CADRE DE SERVICES"),
        b("text", {
          name: "Agreement number",
          x: 40,
          y: 112,
          w: 640,
          h: 28,
          content: {
            text: "Agreement {{contract_id}} · Effective {{start_date|date:long}}",
          },
          style: { fontSize: 12, color: LEGAL.muted },
          variants: [
            {
              id: id(),
              language: "fr",
              content: {
                text: "Contrat {{contract_id}} · Prise d’effet {{start_date|date:long}}",
              },
            },
          ],
        }),
        b("text", {
          name: "Draft banner",
          x: 40,
          y: 168,
          w: 640,
          h: 40,
          content: { text: "DRAFT — FOR REVIEW ONLY" },
          style: {
            fontSize: 13,
            fontWeight: 700,
            color: LEGAL.ink,
            background: "#f5e8c8",
            textAlign: "center",
            verticalAlign: "middle",
          },
          condition: "vars.status == 'draft'",
        }),
        b("text", {
          name: "Executed banner",
          x: 40,
          y: 168,
          w: 640,
          h: 40,
          content: { text: "EXECUTED COPY" },
          style: {
            fontSize: 13,
            fontWeight: 700,
            color: "#ffffff",
            background: LEGAL.accent,
            textAlign: "center",
            verticalAlign: "middle",
          },
          condition: "vars.status == 'executed'",
        }),
        b("paragraph", {
          name: "Parties",
          x: 70,
          y: 280,
          w: 580,
          h: 190,
          content: {
            text: "BETWEEN\n\n{{provider}}, of {{provider_address}}\n(“Provider”)\n\nAND\n\n{{client}}, of {{client_address}}\n(“Client”)",
          },
          style: {
            fontSize: 15,
            lineHeight: 1.55,
            color: LEGAL.ink,
            textAlign: "center",
          },
        }),
        b("picture", {
          name: "Approval stamp",
          x: 548,
          y: 536,
          w: 88,
          h: 88,
          content: { src: DEMO_IMG.stamp, alt: "Approved" },
          condition: "approved == 'yes'",
        }),
        ...urlQrFooter("portal_url", "Secure contract portal"),
        footer("{{provider}} · {{client}} · {{contract_id}} · 1/6"),
      ]),
      page("Definitions", [
        ...head("1. DEFINITIONS & SERVICES", "1. DÉFINITIONS ET SERVICES"),
        ...clause(
          "Definitions",
          96,
          "“Affiliate” means an entity controlling, controlled by, or under common control with a party. “Confidential Information” means non-public commercial, technical, or personal information. “Deliverables” means the work products listed in Schedule A. “Services” means the professional services performed under this Agreement.",
          "« Affiliée » désigne toute entité contrôlant une partie, contrôlée par elle ou sous contrôle commun. « Informations confidentielles » désigne toute information commerciale, technique ou personnelle non publique. « Livrables » désigne les résultats prévus à l’Annexe A. « Services » désigne les prestations exécutées au titre du présent Contrat.",
          180,
        ),
        ...clause(
          "Services",
          304,
          "1.1 Provider will perform the Services with reasonable skill and care, using qualified personnel.\n\n1.2 Client will provide timely access, decisions, and materials. Dates move reasonably when a Client dependency is late.\n\n1.3 Changes to scope, assumptions, or deliverables require a written change order signed by both parties.",
          "1.1 Le Prestataire exécute les Services avec compétence et diligence, au moyen d’un personnel qualifié.\n\n1.2 Le Client fournit en temps utile les accès, décisions et éléments nécessaires. Les délais sont ajustés raisonnablement en cas de retard imputable au Client.\n\n1.3 Toute modification du périmètre, des hypothèses ou des livrables exige un avenant écrit signé par les deux parties.",
          260,
        ),
        footer("{{contract_id}} · Definitions · 2/6"),
      ]),
      page("Fees and IP", [
        ...head("2. FEES, PAYMENT & IP", "2. HONORAIRES, PAIEMENT ET PI"),
        ...clause(
          "Fees",
          96,
          "2.1 Fees are stated in Schedule A and exclude VAT. Invoices are due within {{net_days}} days.\n\n2.2 The stated service rate is {{service_rate|currency:EUR}}. The sample overtime multiplier is 1.5×; sample overtime total: {{overtime_total|currency:EUR}}.\n\n2.3 Pre-approved expenses are reimbursed at cost.",
          "2.1 Les honoraires figurent à l’Annexe A et s’entendent hors TVA. Les factures sont payables sous {{net_days}} jours.\n\n2.2 Le tarif de service indiqué est de {{service_rate|currency:EUR}}. Le coefficient d’heures supplémentaires de l’exemple est 1,5× ; total pré-calculé : {{overtime_total|currency:EUR}}.\n\n2.3 Les frais préalablement approuvés sont remboursés au coût réel.",
          220,
        ),
        ...clause(
          "IP",
          344,
          "3.1 Each party retains its pre-existing intellectual property. On full payment, Client owns bespoke Deliverables, excluding Provider tools, methods, templates, and know-how.\n\n3.2 Provider grants Client a perpetual licence to embedded Provider materials solely as needed to use the Deliverables.\n\n3.3 Client warrants that materials it supplies may lawfully be used for the Services.",
          "3.1 Chaque partie conserve ses droits de propriété intellectuelle antérieurs. Après paiement intégral, le Client détient les Livrables sur mesure, à l’exclusion des outils, méthodes, modèles et savoir-faire du Prestataire.\n\n3.2 Le Prestataire concède au Client une licence perpétuelle sur les éléments intégrés nécessaires à l’utilisation des Livrables.\n\n3.3 Le Client garantit que les éléments fournis peuvent être légalement utilisés.",
          250,
        ),
        footer("{{contract_id}} · Fees and intellectual property · 3/6"),
      ]),
      page("Liability and term", [
        ...head(
          "4. LIABILITY, CONFIDENTIALITY & TERM",
          "4. RESPONSABILITÉ, CONFIDENTIALITÉ ET DURÉE",
        ),
        ...clause(
          "Liability",
          96,
          "4.1 Neither party is liable for indirect or consequential loss. Except for fraud, wilful misconduct, confidentiality breach, or unpaid fees, aggregate liability is capped at fees paid in the preceding twelve months.\n\n4.2 Each party protects Confidential Information with reasonable safeguards and uses it only for this Agreement.",
          "4.1 Aucune partie n’est responsable des dommages indirects. Sauf fraude, faute intentionnelle, violation de confidentialité ou impayés, la responsabilité totale est plafonnée aux honoraires versés au cours des douze mois précédents.\n\n4.2 Chaque partie protège les Informations confidentielles par des mesures raisonnables et les utilise uniquement aux fins du présent Contrat.",
          230,
        ),
        ...clause(
          "Term",
          354,
          "5.1 This Agreement begins on {{start_date|date:long}} and continues for {{term_months}} months, renewing monthly unless either party gives {{notice_days}} days’ notice.\n\n5.2 A material breach may be terminated if not cured within fifteen days after written notice. Accrued payment, IP, confidentiality, and liability terms survive termination.\n\n5.3 Governing law and exclusive jurisdiction: {{jurisdiction}}.",
          "5.1 Le présent Contrat prend effet le {{start_date|date:long}} pour {{term_months}} mois, puis se renouvelle mensuellement sauf préavis de {{notice_days}} jours.\n\n5.2 Un manquement grave peut entraîner la résiliation s’il n’est pas réparé dans les quinze jours suivant notification écrite. Les clauses de paiement, PI, confidentialité et responsabilité survivent.\n\n5.3 Droit applicable et juridiction exclusive : {{jurisdiction}}.",
          260,
        ),
        footer("{{contract_id}} · Liability and term · 4/6"),
      ]),
      page("Signatures", [
        ...head("EXECUTION", "SIGNATURE"),
        ...clause(
          "Execution",
          112,
          "The parties agree that electronic signatures and counterparts are effective as originals. Each signatory confirms authority to bind the party identified below.",
          "Les parties conviennent que les signatures électroniques et les exemplaires séparés ont valeur d’original. Chaque signataire confirme son pouvoir d’engager la partie indiquée ci-dessous.",
          110,
        ),
        ...signaturePair({
          leftLabel: "Provider signature",
          rightLabel: "Client signature",
          leftCaption: "{{provider_signer}}\n{{provider_signer_title}}",
          rightCaption: "{{client_signer}}\n{{client_signer_title}}",
          y: 300,
        }),
        ...urlQrFooter("portal_url", "Verify executed agreement"),
        footer("{{contract_id}} · Execution · 5/6"),
      ]),
      page("Schedule A", [
        ...head("SCHEDULE A — SERVICES & FEES", "ANNEXE A — SERVICES ET HONORAIRES"),
        b("table", {
          name: "Service schedule",
          x: 40,
          y: 100,
          w: 640,
          h: 250,
          content: {
            header: true,
            zebra: true,
            sourcePath: "services",
            rows: 2,
            cols: 5,
            cells: [
              ["Service", "Qty", "Rate", "Tax", "Precomputed total"],
              [
                "{{service}}",
                "{{quantity}}",
                "{{rate|currency:EUR}}",
                "{{tax_rate}}",
                "{{line_total|currency:EUR}}",
              ],
            ],
            headerBackground: "#e6f2f0",
          },
          style: { fontSize: 10.5, color: LEGAL.ink },
        }),
        b("table", {
          name: "Schedule totals",
          x: 400,
          y: 390,
          w: 280,
          h: 120,
          content: {
            rows: 3,
            cols: 2,
            cells: [
              ["Subtotal", "{{subtotal|currency:EUR}}"],
              ["VAT rate", "{{vat_rate}}"],
              ["Total", "{{grand_total|currency:EUR}}"],
            ],
          },
          style: { fontSize: 12, fontWeight: 600 },
        }),
        ...clause(
          "Acceptance",
          548,
          "Deliverables are accepted when Client confirms acceptance or does not identify a material failure against the stated criteria within ten business days. Provider will correct one timely, substantiated rejection at no additional charge.",
          "Les Livrables sont acceptés lorsque le Client confirme leur réception ou ne signale aucun écart substantiel aux critères dans les dix jours ouvrés. Le Prestataire corrigera sans frais un rejet motivé et formulé dans les délais.",
          120,
        ),
        footer("{{contract_id}} · Schedule A · 6/6"),
      ]),
    ],
    {
      artboard: "document",
      outputs: outputsFor("preview", "pdf", "print"),
      ...northlineStyleExtras("en"),
    },
  );
}

export function contractEmployees(): Project {
  const employeeRow = [
    b("text", {
      name: "Employee name",
      x: 0,
      y: 0,
      w: 210,
      h: 24,
      content: { text: "{{name}}" },
      style: { fontSize: 11, fontWeight: 700, color: LEGAL.ink },
    }),
    b("text", {
      name: "Employee terms",
      x: 220,
      y: 0,
      w: 400,
      h: 44,
      content: {
        text: "{{role}} · {{start_date|date:short}} · {{salary|currency:EUR}} · {{language}}",
      },
      style: { fontSize: 10.5, color: LEGAL.muted },
    }),
  ];

  return shell(
    {
      name: "Employee agreement pack",
      author: "Northline People Operations",
      subject: "Bilingual employment agreement pack",
      description:
        "Three-page employment pack with employee repeater, policy schedule, portal QR, and dual signatures.",
    },
    [
      page("Employment terms", [
        ...head("EMPLOYMENT AGREEMENT", "CONTRAT DE TRAVAIL"),
        ...clause(
          "Appointment",
          104,
          "Northline appoints {{employee_name}} as {{job_title}} from {{employment_start|date:long}}. The normal place of work is {{work_location}}. The employee reports to {{manager_name}} and will perform the duties reasonably associated with the role.",
          "Northline engage {{employee_name}} en qualité de {{job_title}} à compter du {{employment_start|date:long}}. Le lieu habituel de travail est {{work_location}}. Le salarié rend compte à {{manager_name}} et exerce les missions raisonnablement liées à son poste.",
          150,
        ),
        b("table", {
          name: "Core terms",
          x: 40,
          y: 290,
          w: 640,
          h: 190,
          content: {
            rows: 5,
            cols: 2,
            cells: [
              ["Employment type", "{{employment_type}}"],
              ["Salary", "{{annual_salary|currency:EUR}} per year"],
              ["Hours", "{{weekly_hours}} per week"],
              ["Probation", "{{probation_months}} months"],
              ["Notice", "{{notice_days}} days"],
            ],
          },
          style: { fontSize: 11 },
        }),
        ...clause(
          "Duties",
          516,
          "The employee will comply with lawful instructions, protect confidential information, disclose conflicts, and follow security and acceptable-use policies. Statutory rights prevail where mandatory law provides greater protection.",
          "Le salarié respecte les instructions licites, protège les informations confidentielles, déclare les conflits d’intérêts et suit les politiques de sécurité et d’utilisation. Les droits légaux impératifs demeurent applicables.",
          120,
        ),
        footer("{{employee_name}} · Employment terms · 1/3"),
      ]),
      page("Employee schedule", [
        ...head("EMPLOYEE SCHEDULE", "LISTE DES SALARIÉS"),
        b("paragraph", {
          name: "Schedule note",
          x: 40,
          y: 94,
          w: 640,
          h: 60,
          content: {
            text: "Rows below are generated from the employees data collection. Each row carries its language value for later sample CSV binding.",
          },
          style: body,
        }),
        b("repeat", {
          name: "Employees",
          x: 40,
          y: 180,
          w: 640,
          h: 58,
          content: {
            itemsPath: "employees",
            itemVar: "employee",
            blocks: employeeRow,
          },
        }),
        ...clause(
          "Policies",
          620,
          "The handbook, privacy notice, remote-work policy, and information-security policy form operational guidance but do not reduce statutory employment protections.",
          "Le règlement, la notice de confidentialité ainsi que les politiques de télétravail et de sécurité constituent des règles opérationnelles sans réduire les protections légales du salarié.",
          100,
        ),
        footer("{{employee_name}} · Employee schedule · 2/3"),
      ]),
      page("Acknowledgment", [
        ...head("ACKNOWLEDGMENT & SIGNATURES", "ACCEPTATION ET SIGNATURES"),
        ...clause(
          "Acknowledgment",
          110,
          "The employee confirms receipt of this agreement and the policies listed on page two, and has had an opportunity to obtain independent advice before signing.",
          "Le salarié reconnaît avoir reçu le présent contrat et les politiques indiquées en page deux, et avoir eu la possibilité de solliciter un conseil indépendant avant signature.",
          110,
        ),
        ...signaturePair({
          leftLabel: "Employer",
          rightLabel: "Employee",
          leftCaption: "{{employer_signer}}\n{{employer_title}}",
          rightCaption: "{{employee_name}}\n{{job_title}}",
          y: 300,
        }),
        ...urlQrFooter("portal_url", "Employee document portal"),
        footer("{{employee_name}} · Signatures · 3/3"),
      ]),
    ],
    {
      artboard: "document",
      outputs: outputsFor("preview", "pdf", "print"),
      ...northlineStyleExtras("en"),
    },
  );
}
