import type { Block, Project } from "../../document";
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

function bilingual(
  name: string,
  y: number,
  en: string,
  fr: string,
  h = 160,
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

export function rentalHouse(): Project {
  return shell(
    {
      name: "Residential lease",
      author: "Northline Property",
      subject: "Bilingual four-page residential lease",
      description:
        "Residential lease with furnished branches, inventory table, daily late-fee calculation, portal QR, and dual signatures.",
    },
    [
      page("Lease summary", [
        ...head("RESIDENTIAL LEASE", "BAIL D’HABITATION"),
        b("text", {
          name: "Furnished banner",
          x: 40,
          y: 88,
          w: 640,
          h: 36,
          content: { text: "FURNISHED PROPERTY / LOGEMENT MEUBLÉ" },
          style: {
            fontSize: 12,
            fontWeight: 700,
            color: "#ffffff",
            background: LEGAL.accent,
            textAlign: "center",
            verticalAlign: "middle",
          },
          condition: "vars.furnished == 'yes'",
        }),
        b("text", {
          name: "Unfurnished banner",
          x: 40,
          y: 88,
          w: 640,
          h: 36,
          content: { text: "UNFURNISHED PROPERTY / LOGEMENT NON MEUBLÉ" },
          style: {
            fontSize: 12,
            fontWeight: 700,
            color: LEGAL.ink,
            background: "#eef1f4",
            textAlign: "center",
            verticalAlign: "middle",
          },
          condition: "vars.furnished != 'yes'",
        }),
        b("table", {
          name: "Lease details",
          x: 40,
          y: 152,
          w: 640,
          h: 250,
          content: {
            rows: 7,
            cols: 2,
            cells: [
              ["Landlord", "{{landlord_name}} · {{landlord_address}}"],
              ["Tenant", "{{tenant_name}} · {{tenant_address}}"],
              ["Premises", "{{property_address}}"],
              ["Term", "{{lease_start|date:long}} — {{lease_end|date:long}}"],
              ["Monthly rent", "{{monthly_rent|currency:EUR}}"],
              ["Deposit", "{{deposit|currency:EUR}}"],
              ["Payment day", "{{payment_day}} of each month"],
            ],
          },
          style: { fontSize: 11 },
        }),
        ...bilingual(
          "Grant",
          440,
          "The Landlord lets the Premises to the Tenant for residential use only. The Tenant accepts the Premises in the recorded condition, subject to the inventory and mandatory housing standards.",
          "Le Bailleur donne le Logement en location au Locataire à usage exclusif d’habitation. Le Locataire accepte son état constaté, sous réserve de l’inventaire et des normes impératives de logement.",
          110,
        ),
        ...urlQrFooter("portal_url", "Tenant portal"),
        footer("{{lease_id}} · Lease summary · 1/4"),
      ]),
      page("Terms", [
        ...head("LEASE TERMS", "CONDITIONS DU BAIL"),
        ...bilingual(
          "Rent",
          96,
          "1. Rent is payable in advance by the {{payment_day}} of each month. The daily late fine in this sample is €25 (daily_fine = 25). For {{days_late}} late days, the calculated fee is {{days_late|mul:25|currency:EUR}}. Mandatory legal caps prevail.\n\n2. Utilities are allocated as follows: {{utilities_terms}}.\n\n3. The Tenant must promptly report damage and permit reasonable access after lawful notice, except in an emergency.",
          "1. Le loyer est payable d’avance au plus tard le {{payment_day}} de chaque mois. La pénalité journalière de cet exemple est de 25 € (daily_fine = 25). Pour {{days_late}} jours de retard : {{days_late|mul:25|currency:EUR}}. Les plafonds légaux impératifs prévalent.\n\n2. Les charges sont réparties comme suit : {{utilities_terms}}.\n\n3. Le Locataire signale sans délai tout dommage et permet l’accès après préavis légal, sauf urgence.",
          270,
        ),
        ...bilingual(
          "Use",
          398,
          "4. No unlawful activity, nuisance, or hazardous storage is permitted. Alterations require written consent.\n\n5. The Tenant remains responsible for ordinary cleanliness; structural and statutory repairs remain the Landlord’s responsibility unless damage was caused by the Tenant.\n\n6. Notices must be delivered to the addresses stated on page one or through the secure portal.",
          "4. Toute activité illicite, nuisance ou conservation dangereuse est interdite. Les transformations exigent un accord écrit.\n\n5. Le Locataire assure l’entretien courant ; les réparations structurelles et légales incombent au Bailleur, sauf dommage causé par le Locataire.\n\n6. Les notifications sont remises aux adresses de la page un ou via le portail sécurisé.",
          250,
        ),
        footer("{{lease_id}} · Terms · 2/4"),
      ]),
      page("Inventory", [
        ...head("INVENTORY & CONDITION", "INVENTAIRE ET ÉTAT DES LIEUX"),
        b("table", {
          name: "Inventory list",
          x: 40,
          y: 100,
          w: 640,
          h: 430,
          content: {
            header: true,
            zebra: true,
            sourcePath: "inventory",
            rows: 2,
            cols: 4,
            cells: [
              ["Room / item", "Condition", "Quantity", "Notes"],
              ["{{item}}", "{{condition}}", "{{quantity}}", "{{notes}}"],
            ],
            headerBackground: "#e6f2f0",
          },
          style: { fontSize: 10.5 },
        }),
        ...bilingual(
          "Inventory note",
          570,
          "The parties must record exceptions before keys are handed over. Photographs referenced by {{inventory_ref}} form part of this schedule.",
          "Les parties consignent toute réserve avant la remise des clés. Les photographies référencées {{inventory_ref}} font partie de la présente annexe.",
          90,
        ),
        footer("{{lease_id}} · Inventory · 3/4"),
      ]),
      page("Signatures", [
        ...head("EXECUTION & HANDOVER", "SIGNATURE ET REMISE DES CLÉS"),
        ...bilingual(
          "Execution",
          110,
          "By signing, the parties acknowledge the lease, inventory, privacy notice, and key handover record. Nothing in this sample waives mandatory tenant protections.",
          "Par leur signature, les parties reconnaissent le bail, l’inventaire, la notice de confidentialité et le relevé de remise des clés. Aucune clause ne renonce aux protections impératives du locataire.",
          110,
        ),
        ...signaturePair({
          leftLabel: "Landlord",
          rightLabel: "Tenant",
          leftCaption: "{{landlord_name}}\nLandlord / Bailleur",
          rightCaption: "{{tenant_name}}\nTenant / Locataire",
          y: 300,
        }),
        ...urlQrFooter("portal_url", "Lease and maintenance portal"),
        footer("{{lease_id}} · Signatures · 4/4"),
      ]),
    ],
    {
      artboard: "document",
      outputs: outputsFor("preview", "pdf", "print"),
      ...northlineStyleExtras("en"),
    },
  );
}

export function rentalCar(): Project {
  return shell(
    {
      name: "Vehicle rental agreement",
      author: "Northline Mobility",
      subject: "Bilingual three-page vehicle rental pack",
      description:
        "Vehicle rental with insurance branches, literal daily-rate calculation, extras table, portal QR, and dual signatures.",
    },
    [
      page("Rental summary", [
        ...head("VEHICLE RENTAL AGREEMENT", "CONTRAT DE LOCATION DE VÉHICULE"),
        b("text", {
          name: "Insurance included",
          x: 40,
          y: 88,
          w: 640,
          h: 36,
          content: { text: "INSURANCE PACKAGE INCLUDED" },
          style: {
            fontSize: 12,
            fontWeight: 700,
            color: "#ffffff",
            background: LEGAL.accent,
            textAlign: "center",
            verticalAlign: "middle",
          },
          condition: "vars.insurance == 'included'",
        }),
        b("text", {
          name: "Insurance declined",
          x: 40,
          y: 88,
          w: 640,
          h: 36,
          content: { text: "INSURANCE DECLINED — DRIVER COVER REQUIRED" },
          style: {
            fontSize: 12,
            fontWeight: 700,
            color: "#ffffff",
            background: "#9b2c2c",
            textAlign: "center",
            verticalAlign: "middle",
          },
          condition: "vars.insurance == 'declined'",
        }),
        b("table", {
          name: "Rental details",
          x: 40,
          y: 152,
          w: 640,
          h: 240,
          content: {
            rows: 7,
            cols: 2,
            cells: [
              ["Renter", "{{renter_name}} · licence {{licence_no}}"],
              ["Vehicle", "{{vehicle_make}} {{vehicle_model}} · {{registration}}"],
              ["Pickup", "{{pickup_at|date:long}} · {{pickup_location}}"],
              ["Return", "{{return_at|date:long}} · {{return_location}}"],
              ["Rental days", "{{rental_days}}"],
              ["Daily rate", "{{daily_rate|currency:EUR}} (sample rate €65)"],
              ["Base charge", "{{rental_days|mul:65|currency:EUR}}"],
            ],
          },
          style: { fontSize: 11 },
        }),
        b("table", {
          name: "Extras",
          x: 40,
          y: 430,
          w: 640,
          h: 190,
          content: {
            header: true,
            zebra: true,
            sourcePath: "extras",
            rows: 2,
            cols: 3,
            cells: [
              ["Extra", "Rate", "Precomputed amount"],
              ["{{label}}", "{{rate|currency:EUR}}", "{{amount|currency:EUR}}"],
            ],
            headerBackground: "#e6f2f0",
          },
          style: { fontSize: 10.5 },
        }),
        b("text", {
          name: "Grand total",
          x: 400,
          y: 654,
          w: 280,
          h: 34,
          content: { text: "Total {{rental_total|currency:EUR}}" },
          style: { fontSize: 15, fontWeight: 700, textAlign: "right" },
        }),
        footer("{{rental_id}} · Rental summary · 1/3"),
      ]),
      page("Conditions", [
        ...head("RENTAL CONDITIONS", "CONDITIONS DE LOCATION"),
        ...bilingual(
          "Driver duties",
          100,
          "1. Only authorised drivers may operate the vehicle. The driver must obey traffic laws, secure the vehicle, and use the specified fuel or charging method.\n\n2. Mileage included: {{included_km}} km. Excess mileage rate: {{excess_km_rate|currency:EUR}} per km; the payable excess total is supplied as {{excess_total|currency:EUR}}.\n\n3. Accidents, theft, warning lights, and material damage must be reported immediately.",
          "1. Seuls les conducteurs autorisés peuvent conduire le véhicule. Le conducteur respecte le code de la route, sécurise le véhicule et utilise le carburant ou mode de recharge indiqué.\n\n2. Kilométrage inclus : {{included_km}} km. Tarif excédentaire : {{excess_km_rate|currency:EUR}} par km ; total dû pré-calculé : {{excess_total|currency:EUR}}.\n\n3. Tout accident, vol, voyant ou dommage important doit être signalé immédiatement.",
          280,
        ),
        ...bilingual(
          "Return",
          418,
          "4. The vehicle must be returned on time, with keys, documents, accessories, and the agreed fuel or charge level.\n\n5. The renter is responsible for tolls, fines, and administrative charges lawfully incurred during the rental.\n\n6. Insurance scope, exclusions, excess, and roadside assistance are stated in the selected package and mandatory law.",
          "4. Le véhicule est restitué à l’heure, avec clés, documents, accessoires et le niveau de carburant ou de charge convenu.\n\n5. Le locataire répond des péages, amendes et frais administratifs légalement engagés pendant la location.\n\n6. L’étendue, les exclusions, la franchise et l’assistance figurent dans la formule choisie et la loi impérative.",
          240,
        ),
        footer("{{rental_id}} · Conditions · 2/3"),
      ]),
      page("Handover", [
        ...head("VEHICLE HANDOVER", "REMISE DU VÉHICULE"),
        b("table", {
          name: "Handover checklist",
          x: 40,
          y: 100,
          w: 640,
          h: 190,
          content: {
            rows: 5,
            cols: 2,
            cells: [
              ["Odometer out", "{{odometer_out}} km"],
              ["Fuel / charge out", "{{energy_out}}"],
              ["Existing damage", "{{existing_damage}}"],
              ["Accessories", "{{accessories}}"],
              ["Deposit / authorisation", "{{vehicle_deposit|currency:EUR}}"],
            ],
          },
          style: { fontSize: 11 },
        }),
        ...signaturePair({
          leftLabel: "Rental agent",
          rightLabel: "Renter",
          leftCaption: "{{agent_name}}\nNorthline Mobility",
          rightCaption: "{{renter_name}}\nAuthorised driver",
          y: 350,
        }),
        ...urlQrFooter("portal_url", "Rental portal and damage report"),
        footer("{{rental_id}} · Handover · 3/3"),
      ]),
    ],
    {
      artboard: "document",
      outputs: outputsFor("preview", "pdf", "print"),
      ...northlineStyleExtras("en"),
    },
  );
}
