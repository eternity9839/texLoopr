import type { Block } from "../../document";
import { b } from "../helpers";

export const LEGAL = {
  accent: "#0f6b63",
  ink: "#1c2430",
  muted: "#5c6570",
} as const;

export function legalLetterhead(title: string): Block[] {
  return [
    b("shape", {
      name: "Legal header bar",
      x: 0,
      y: 0,
      w: 720,
      h: 64,
      content: { shape: "rect", filled: true },
      style: { background: "#e6f2f0" },
      pin: { top: true, left: true, right: true },
      zIndex: 0,
    }),
    b("text", {
      name: "Legal title",
      x: 40,
      y: 19,
      w: 640,
      h: 30,
      content: { text: title },
      style: { fontSize: 18, fontWeight: 700, color: LEGAL.ink },
      zIndex: 1,
    }),
    b("shape", {
      name: "Legal accent rule",
      x: 40,
      y: 60,
      w: 640,
      h: 4,
      content: { shape: "rect", filled: true },
      style: { background: LEGAL.accent },
      zIndex: 1,
    }),
  ];
}

export function signaturePair(opts: {
  leftLabel: string;
  rightLabel: string;
  leftCaption: string;
  rightCaption: string;
  leftSignedAt?: string;
  y?: number;
  leftMode?: string;
}): Block[] {
  const y = opts.y ?? 540;
  return [
    b("signature", {
      name: opts.leftLabel,
      x: 40,
      y,
      w: 280,
      h: 120,
      content: {
        mode: opts.leftMode ?? "preset",
        src: "",
        label: opts.leftLabel,
        caption: opts.leftCaption,
        signedAt: opts.leftSignedAt ?? "{{signed_at|date:short}}",
        showLine: true,
      },
      style: { fontSize: 11, color: LEGAL.muted, fontFamily: "ui" },
    }),
    b("signature", {
      name: opts.rightLabel,
      x: 360,
      y,
      w: 280,
      h: 120,
      content: {
        mode: "open",
        src: "",
        label: opts.rightLabel,
        caption: opts.rightCaption,
        signedAt: "",
        showLine: true,
      },
      style: { fontSize: 11, color: LEGAL.muted, fontFamily: "ui" },
    }),
  ];
}

export function urlQrFooter(
  urlField: string,
  label: string,
  y = 790,
): Block[] {
  return [
    b("text", {
      name: `${label} link`,
      x: 40,
      y: y + 18,
      w: 520,
      h: 46,
      content: { text: `${label}\n{{${urlField}}}` },
      style: { fontSize: 10, lineHeight: 1.4, color: LEGAL.muted },
      condition: "output.kind == 'pdf' || output.kind == 'print'",
    }),
    b("qrcode", {
      name: `${label} QR`,
      x: 576,
      y,
      w: 72,
      h: 72,
      content: {
        value: `{{${urlField}}}`,
        ecc: "M",
        dark: LEGAL.ink,
        light: "#ffffff",
      },
      condition: "output.kind == 'pdf' || output.kind == 'print'",
    }),
  ];
}
