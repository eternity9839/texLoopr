import { describe, expect, it } from "vitest";
import {
  mergeEmailEnvelope,
  parseHeaderLines,
  patchEmailEnvelope,
} from "./envelope";
import { buildEmlMessage, buildEmailArtifacts } from "./index";
import { email } from "../demos/mass-publication/index";

describe("email envelope", () => {
  it("parses header lines and drops reserved names", () => {
    const lines = parseHeaderLines(
      [
        "X-Campaign: spring",
        "List-Id=<news.example.com>",
        "# comment",
        "From: bad@example.com",
        "Subject: ignored",
        "X-TexLooper-Version: hack",
        "Bad Name: x",
        "X-Priority: 1",
      ].join("\n"),
    );
    expect(lines).toEqual([
      { name: "X-Campaign", value: "spring" },
      { name: "List-Id", value: "<news.example.com>" },
      { name: "X-Priority", value: "1" },
    ]);
  });

  it("merges output over project (headers last-wins)", () => {
    const merged = mergeEmailEnvelope(
      {
        from: "docs@example.com",
        replyTo: "help@example.com",
        attachPdf: true,
        headers: "X-Campaign: base\nX-Keep: yes",
      },
      {
        from: "campaign@example.com",
        cc: "ops@example.com",
        headers: "X-Campaign: override",
      },
    );
    expect(merged.from).toBe("campaign@example.com");
    expect(merged.replyTo).toBe("help@example.com");
    expect(merged.cc).toBe("ops@example.com");
    expect(merged.attachPdf).toBe(true);
    expect(merged.headers).toContain("X-Campaign: override");
    expect(merged.headers).toContain("X-Keep: yes");
  });

  it("patchEmailEnvelope clears empty envelopes", () => {
    expect(patchEmailEnvelope({ from: "a@b.c" }, { from: "  " })).toBeUndefined();
    expect(patchEmailEnvelope(undefined, { cc: "x@y.z" })).toEqual({
      cc: "x@y.z",
    });
  });

  it("buildEmlMessage writes Reply-To, Cc, Bcc, and extra headers", () => {
    const eml = buildEmlMessage({
      from: "from@example.com",
      to: "to@example.com",
      replyTo: "reply@example.com",
      cc: "cc@example.com",
      bcc: "bcc@example.com",
      subject: "Hello",
      text: "plain",
      html: "<p>hi</p>",
      extraHeaders: [{ name: "X-Campaign", value: "welcome" }],
      appVersion: "0.3.3-alpha",
      appChannel: "alpha",
      installId: "11111111-2222-4333-8444-555555555555",
    });
    expect(eml).toMatch(/^Reply-To: reply@example.com/m);
    expect(eml).toMatch(/^Cc: cc@example.com/m);
    expect(eml).toMatch(/^Bcc: bcc@example.com/m);
    expect(eml).toMatch(/^X-Campaign: welcome/m);
  });

  it("buildEmailArtifacts resolves project+output envelope templates", () => {
    const project = {
      ...email(),
      contactEmail: "fallback@example.com",
      email: {
        from: "{{sender_email}}",
        replyTo: "support@example.com",
        headers: "X-Campaign: {{campaign}}",
      },
    };
    const output = {
      id: "out-email",
      name: "Email",
      kind: "email" as const,
      email: {
        cc: "ops@example.com",
        subject: "Hi {{first_name}}",
      },
    };
    const art = buildEmailArtifacts({
      project,
      row: {
        first_name: "Ada",
        email: "ada@example.com",
        language: "en",
        sender_email: "lifecycle@example.com",
        campaign: "spring",
        title: "Hello",
        intro: "Body",
      },
      output,
      installId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    });
    expect(art.from).toBe("lifecycle@example.com");
    expect(art.replyTo).toBe("support@example.com");
    expect(art.cc).toBe("ops@example.com");
    expect(art.subject).toBe("Hi Ada");
    expect(art.extraHeaders).toEqual([
      { name: "X-Campaign", value: "spring" },
    ]);
    expect(art.eml).toContain("X-Campaign: spring");
    expect(art.eml).toContain("Reply-To: support@example.com");
  });
});
