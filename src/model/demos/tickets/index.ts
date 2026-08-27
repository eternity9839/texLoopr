import type { Project } from "../../document";
import { b, id, outputsFor, page, shell } from "../helpers";

type TicketConfig = {
  name: string;
  subject: string;
  description: string;
  artboard: "a4" | "a5";
  accent: string;
  codeField: string;
  titleField: string;
  detailField: string;
  dateField: string;
  qrField: "checkin_url" | "redeem_url";
  emailSubject: string;
  emailPreheader: string;
};

function ticketProject(config: TicketConfig): Project {
  const outputs = outputsFor("preview", "pdf", "email");
  const emailOutput = outputs.find((output) => output.kind === "email");
  if (emailOutput) {
    emailOutput.email = {
      attachPdf: true,
      subject: config.emailSubject,
      preheader: config.emailPreheader,
    };
  }

  const width = config.artboard === "a5" ? 505 : 714;
  const ticketWidth = Math.min(width - 64, 570);
  const left = Math.round((width - ticketWidth) / 2);

  return shell(
    {
      name: config.name,
      author: "Northline Tickets",
      subject: config.subject,
      description: config.description,
    },
    [
      page(
        "Ticket",
        [
          b("shape", {
            name: "Ticket card",
            x: left,
            y: 48,
            w: ticketWidth,
            h: 560,
            content: { shape: "rect", filled: true },
            style: {
              background: "#ffffff",
              borderColor: config.accent,
              borderWidth: 2,
              borderRadius: 12,
            },
          }),
          b("shape", {
            name: "Accent band",
            x: left,
            y: 48,
            w: ticketWidth,
            h: 72,
            content: { shape: "rect", filled: true },
            style: { background: config.accent },
            zIndex: 1,
          }),
          b("text", {
            name: "Ticket type",
            x: left + 24,
            y: 70,
            w: ticketWidth - 48,
            h: 28,
            content: { text: "ADMISSION TICKET" },
            style: {
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1.5,
            },
            variants: [
              {
                id: id(),
                language: "fr",
                content: { text: "BILLET D’ACCÈS" },
              },
            ],
            zIndex: 2,
          }),
          b("text", {
            name: "Ticket title",
            x: left + 24,
            y: 146,
            w: ticketWidth - 48,
            h: 68,
            content: { text: `{{${config.titleField}}}` },
            style: { color: "#172033", fontSize: 25, fontWeight: 700 },
          }),
          b("paragraph", {
            name: "Ticket details",
            x: left + 24,
            y: 230,
            w: ticketWidth - 48,
            h: 94,
            content: {
              text: `{{${config.detailField}}}\n{{${config.dateField}}}\nHolder: {{holder_name}}`,
            },
            style: { color: "#445066", fontSize: 13, lineHeight: 1.55 },
            variants: [
              {
                id: id(),
                language: "fr",
                content: {
                  text: `{{${config.detailField}}}\n{{${config.dateField}}}\nTitulaire : {{holder_name}}`,
                },
              },
            ],
          }),
          b("qrcode", {
            name: "Check-in QR",
            x: left + 24,
            y: 350,
            w: 132,
            h: 132,
            content: {
              value: `{{${config.qrField}}}`,
              ecc: "M",
              dark: "#172033",
              light: "#ffffff",
            },
          }),
          b("text", {
            name: "Ticket code",
            x: left + 180,
            y: 366,
            w: ticketWidth - 204,
            h: 52,
            content: { text: `CODE\n{{${config.codeField}}}` },
            style: { color: "#172033", fontSize: 16, fontWeight: 700 },
          }),
          b("text", {
            name: "Valid status",
            x: left + 180,
            y: 438,
            w: ticketWidth - 204,
            h: 34,
            content: { text: "VALID · Ready to use" },
            style: {
              color: "#12633d",
              background: "#e5f6ed",
              fontSize: 11,
              fontWeight: 700,
              padding: 9,
              borderRadius: 4,
            },
            condition: "vars.status == 'valid'",
            variants: [
              {
                id: id(),
                language: "fr",
                content: { text: "VALIDE · Prêt à utiliser" },
              },
            ],
          }),
          b("text", {
            name: "Used status",
            x: left + 180,
            y: 438,
            w: ticketWidth - 204,
            h: 34,
            content: { text: "USED · Already redeemed" },
            style: {
              color: "#725400",
              background: "#fff3c4",
              fontSize: 11,
              fontWeight: 700,
              padding: 9,
              borderRadius: 4,
            },
            condition: "vars.status == 'used'",
            variants: [
              {
                id: id(),
                language: "fr",
                content: { text: "UTILISÉ · Déjà présenté" },
              },
            ],
          }),
          b("text", {
            name: "Cancelled status",
            x: left + 180,
            y: 438,
            w: ticketWidth - 204,
            h: 34,
            content: { text: "CANCELLED · Do not admit" },
            style: {
              color: "#8c2631",
              background: "#fde7ea",
              fontSize: 11,
              fontWeight: 700,
              padding: 9,
              borderRadius: 4,
            },
            condition: "vars.status == 'cancelled'",
            variants: [
              {
                id: id(),
                language: "fr",
                content: { text: "ANNULÉ · Accès refusé" },
              },
            ],
          }),
          b("text", {
            name: "Scan note",
            x: left + 24,
            y: 520,
            w: ticketWidth - 48,
            h: 42,
            content: { text: "Present this QR code at entry." },
            style: { color: "#667085", fontSize: 10, textAlign: "center" },
            variants: [
              {
                id: id(),
                language: "fr",
                content: { text: "Présentez ce code QR à l’entrée." },
              },
            ],
          }),
        ],
        { condition: "output.kind != 'email'", spread: false },
      ),
      page(
        "Email",
        [
          b("text", {
            name: "Email heading",
            x: left,
            y: 72,
            w: ticketWidth,
            h: 44,
            content: { text: "Your ticket is confirmed" },
            style: { color: "#172033", fontSize: 24, fontWeight: 700 },
            variants: [
              {
                id: id(),
                language: "fr",
                content: { text: "Votre billet est confirmé" },
              },
            ],
          }),
          b("paragraph", {
            name: "Email confirmation",
            x: left,
            y: 142,
            w: ticketWidth,
            h: 170,
            content: {
              text: `Hello {{holder_name}},\n\nYour PDF ticket for {{${config.titleField}}} is attached. Keep it available on your phone or print it before arrival.\n\nReference: {{${config.codeField}}}`,
            },
            style: { color: "#445066", fontSize: 14, lineHeight: 1.6 },
            variants: [
              {
                id: id(),
                language: "fr",
                content: {
                  text: `Bonjour {{holder_name}},\n\nVotre billet PDF pour {{${config.titleField}}} est joint. Gardez-le sur votre téléphone ou imprimez-le avant votre arrivée.\n\nRéférence : {{${config.codeField}}}`,
                },
              },
            ],
          }),
          b("text", {
            name: "Email status",
            x: left,
            y: 340,
            w: ticketWidth,
            h: 38,
            content: { text: "Ticket status: {{status}}" },
            style: {
              color: config.accent,
              background: "#f2f4f7",
              fontSize: 12,
              fontWeight: 700,
              padding: 10,
            },
            variants: [
              {
                id: id(),
                language: "fr",
                content: { text: "Statut du billet : {{status}}" },
              },
            ],
          }),
        ],
        { condition: "output.kind == 'email'", spread: false },
      ),
    ],
    {
      artboard: config.artboard,
      outputs,
      activeOutputId: outputs[0]?.id,
      language: "en",
    },
  );
}

export function ticketConcert(): Project {
  return ticketProject({
    name: "Concert ticket",
    subject: "Bilingual concert admission ticket",
    description: "A5 concert ticket with row-driven language, status, and email delivery.",
    artboard: "a5",
    accent: "#6d3cc4",
    codeField: "ticket_code",
    titleField: "event_name",
    detailField: "venue",
    dateField: "event_date",
    qrField: "checkin_url",
    emailSubject: "Your ticket for {{event_name}}",
    emailPreheader: "Your PDF concert ticket is attached.",
  });
}

export function ticketTrip(): Project {
  return ticketProject({
    name: "Trip ticket",
    subject: "Bilingual travel ticket",
    description: "A4 travel ticket with passenger status and an attached PDF itinerary.",
    artboard: "a4",
    accent: "#086f83",
    codeField: "pnr",
    titleField: "route",
    detailField: "carrier",
    dateField: "departure_at",
    qrField: "checkin_url",
    emailSubject: "Your trip {{route}} · {{pnr}}",
    emailPreheader: "Your travel ticket and check-in details are attached.",
  });
}

export function ticketGift(): Project {
  return ticketProject({
    name: "Gift ticket",
    subject: "Bilingual gift experience voucher",
    description: "A5 gift voucher with redemption QR, status, and PDF email attachment.",
    artboard: "a5",
    accent: "#a4475f",
    codeField: "code",
    titleField: "gift_name",
    detailField: "message",
    dateField: "valid_until",
    qrField: "redeem_url",
    emailSubject: "A gift for you: {{gift_name}}",
    emailPreheader: "Your printable gift PDF is attached.",
  });
}
