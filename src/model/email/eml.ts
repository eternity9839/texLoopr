export interface EmlImagePart {
  cid: string;
  mime: string;
  /** Raw bytes or base64 without data-URI prefix */
  dataBase64: string;
  filename?: string;
}

export interface BuildEmlInput {
  from?: string;
  to?: string;
  subject: string;
  text: string;
  html: string;
  images?: EmlImagePart[];
  date?: Date;
  /** App semver / channel label, e.g. 0.3.2-alpha */
  appVersion?: string;
  /** Channel (alpha, stable, …) */
  appChannel?: string;
  /** Stable install / instance id for correlating the emitting client */
  installId?: string;
  /** Optional project catalog id when known */
  projectId?: string | null;
}

function foldHeader(value: string): string {
  // Keep simple ASCII subjects; encode UTF-8 when needed
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const b64 = btoa(unescape(encodeURIComponent(value)));
  return `=?UTF-8?B?${b64}?=`;
}

function headerToken(value: string): string {
  // RFC 5322 unstructured: strip CR/LF; keep printable
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

function qpEncode(raw: string): string {
  const bytes = new TextEncoder().encode(raw);
  let out = "";
  let lineLen = 0;
  for (const b of bytes) {
    let chunk: string;
    if (
      (b >= 33 && b <= 60) ||
      (b >= 62 && b <= 126) ||
      b === 9 ||
      b === 32
    ) {
      chunk = String.fromCharCode(b);
    } else {
      chunk = `=${b.toString(16).toUpperCase().padStart(2, "0")}`;
    }
    if (lineLen + chunk.length > 75) {
      out += "=\r\n";
      lineLen = 0;
    }
    out += chunk;
    lineLen += chunk.length;
  }
  return out;
}

function guessMimeFromDataUri(src: string): { mime: string; b64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(src);
  if (m) return { mime: m[1]!, b64: m[2]! };
  // SVG data URI with charset
  const m2 = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i.exec(src);
  if (m2) return { mime: m2[1] || "application/octet-stream", b64: m2[2]! };
  return null;
}

/** Collect CID parts from picture blocks that use data URIs. */
export function imagesFromDataUriBlocks(
  blocks: { id: string; type: string; content: Record<string, unknown> }[],
): { cidByBlockId: Map<string, string>; images: EmlImagePart[] } {
  const cidByBlockId = new Map<string, string>();
  const images: EmlImagePart[] = [];
  let n = 0;
  for (const b of blocks) {
    if (b.type !== "picture") continue;
    const src = String(b.content.src ?? "");
    const parsed = guessMimeFromDataUri(src);
    if (!parsed) continue;
    n += 1;
    const cid = `img${n}@texlooper.local`;
    cidByBlockId.set(b.id, cid);
    images.push({
      cid,
      mime: parsed.mime,
      dataBase64: parsed.b64,
      filename: `image-${n}`,
    });
  }
  return { cidByBlockId, images };
}

/** Build a multipart/alternative (+ related) .eml message. */
export function buildEmlMessage(input: BuildEmlInput): string {
  const boundaryAlt = `=_alt_${Date.now().toString(36)}`;
  const boundaryRel = `=_rel_${Date.now().toString(36)}`;
  const hasImages = (input.images?.length ?? 0) > 0;
  const date = (input.date ?? new Date()).toUTCString().replace(/GMT$/, "+0000");
  const version = headerToken(input.appVersion ?? "0.0.0");
  const channel = headerToken(input.appChannel ?? "dev");
  const installId = headerToken(input.installId ?? "unknown");
  const mailer = `texLooper/${version} (${channel})`;
  const messageId = `<${installId}.${Date.now().toString(36)}@texlooper.local>`;

  const headers = [
    `From: ${input.from ?? "texlooper@localhost"}`,
    `To: ${input.to ?? "recipient@example.com"}`,
    `Subject: ${foldHeader(input.subject)}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    `X-Mailer: ${mailer}`,
    `X-TexLooper-Version: ${version}`,
    `X-TexLooper-Channel: ${channel}`,
    `X-TexLooper-Instance-Id: ${installId}`,
  ];
  if (input.projectId) {
    headers.push(`X-TexLooper-Project-Id: ${headerToken(input.projectId)}`);
  }
  headers.push("MIME-Version: 1.0");
  headers.push(
    hasImages
      ? `Content-Type: multipart/related; boundary="${boundaryRel}"`
      : `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
  );

  const altPart = [
    `--${boundaryAlt}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: quoted-printable",
    "",
    qpEncode(input.text),
    `--${boundaryAlt}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: quoted-printable",
    "",
    qpEncode(input.html),
    `--${boundaryAlt}--`,
  ].join("\r\n");

  let body: string;
  if (hasImages) {
    const imageParts = (input.images ?? [])
      .map((img) => {
        const folded = img.dataBase64.replace(/(.{76})/g, "$1\r\n").replace(/\r\n$/, "");
        return [
          `--${boundaryRel}`,
          `Content-Type: ${img.mime}`,
          "Content-Transfer-Encoding: base64",
          `Content-ID: <${img.cid}>`,
          `Content-Disposition: inline; filename="${img.filename ?? "image"}"`,
          "",
          folded,
        ].join("\r\n");
      })
      .join("\r\n");
    body = [
      `--${boundaryRel}`,
      `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
      "",
      altPart,
      imageParts,
      `--${boundaryRel}--`,
    ].join("\r\n");
  } else {
    body = altPart;
  }

  return `${headers.join("\r\n")}\r\n\r\n${body}\r\n`;
}
