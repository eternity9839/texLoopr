import type { Project } from "../../document";
import { b, page, shell } from "../helpers";
import { northlineStyleExtras, nlText, NL } from "../brand/northlineStyles";

/** Bilingual wedding invitation — EN/FR via vars.language (ADR 0015). */
export function weddingInvite(): Project {
  return shell(
    {
      name: "Wedding invitation",
      author: "Northline Events",
      subject: "Harbor Lane celebration",
      description:
        "A5 invitation with Northline document style and EN/FR guest copy.",
    },
    [
      page(
        "Invitation",
        [
          b("shape", {
            name: "Border",
            x: 24,
            y: 24,
            w: 457,
            h: 666,
            content: { shape: "rect", filled: false },
            style: {
              borderColor: NL.accent,
              borderWidth: 2,
              background: "transparent",
            },
            zIndex: 0,
          }),
          b("text", {
            name: "Eyebrow EN",
            x: 56,
            y: 72,
            w: 393,
            h: 20,
            content: { text: "Together with their families" },
            style: { ...nlText("nl-label"), textAlign: "center", color: NL.accent },
            condition: "vars.language != 'fr'",
          }),
          b("text", {
            name: "Eyebrow FR",
            x: 56,
            y: 72,
            w: 393,
            h: 20,
            content: { text: "Avec leurs familles" },
            style: { ...nlText("nl-label"), textAlign: "center", color: NL.accent },
            condition: "vars.language == 'fr'",
          }),
          b("text", {
            name: "Names",
            x: 56,
            y: 120,
            w: 393,
            h: 80,
            content: {
              text: "{{guest_name}}{{#if partner_name}} & {{partner_name}}{{/if}}",
            },
            style: { ...nlText("nl-display"), textAlign: "center", fontSize: 28 },
          }),
          b("text", {
            name: "Invite EN",
            x: 72,
            y: 220,
            w: 361,
            h: 72,
            content: {
              text: "request the pleasure of your company at their wedding celebration",
            },
            style: { ...nlText("nl-lead"), textAlign: "center" },
            condition: "vars.language != 'fr'",
          }),
          b("text", {
            name: "Invite FR",
            x: 72,
            y: 220,
            w: 361,
            h: 72,
            content: {
              text: "ont le plaisir de vous inviter à la célébration de leur mariage",
            },
            style: { ...nlText("nl-lead"), textAlign: "center" },
            condition: "vars.language == 'fr'",
          }),
          b("text", {
            name: "Date",
            x: 56,
            y: 320,
            w: 393,
            h: 36,
            content: { text: "{{date|date:long}}" },
            style: { ...nlText("nl-h2"), textAlign: "center", color: NL.accent },
          }),
          b("date", {
            name: "Today stamp",
            x: 56,
            y: 288,
            w: 393,
            h: 22,
            content: {
              source: "today",
              format: "short",
              path: "date",
              fixed: "",
            },
            style: {
              ...nlText("nl-caption"),
              textAlign: "center",
              color: "#5c6570",
            },
          }),
          b("text", {
            name: "Venue",
            x: 56,
            y: 372,
            w: 393,
            h: 48,
            content: { text: "{{venue}}\n{{city}}" },
            style: { ...nlText("nl-body"), textAlign: "center" },
          }),
          b("text", {
            name: "RSVP EN",
            x: 72,
            y: 480,
            w: 361,
            h: 40,
            content: { text: "Kindly reply by {{rsvp_by|date:short}}" },
            style: { ...nlText("nl-caption"), textAlign: "center" },
            condition: "vars.language != 'fr'",
          }),
          b("text", {
            name: "RSVP FR",
            x: 72,
            y: 480,
            w: 361,
            h: 40,
            content: { text: "Merci de répondre avant le {{rsvp_by|date:short}}" },
            style: { ...nlText("nl-caption"), textAlign: "center" },
            condition: "vars.language == 'fr'",
          }),
          b("text", {
            name: "Footer",
            x: 56,
            y: 620,
            w: 393,
            h: 24,
            content: { text: "Northline Events · Harbor Lane" },
            style: { ...nlText("nl-fineprint"), textAlign: "center" },
            pin: { bottom: true, left: true, right: true },
          }),
        ],
        {
          spread: false,
          margins: { top: 48, right: 40, bottom: 48, left: 40 },
          background: NL.paperWarm,
        },
      ),
    ],
    {
      artboard: "a5",
      ...northlineStyleExtras("en"),
    },
  );
}
