import { describe, expect, it } from "vitest";
import { email } from "../demos/mass-publication/index";
import { buildEmailArtifacts, buildEmlMessage } from "./index";

describe("email pipeline", () => {
  it("buildEmlMessage emits multipart headers", () => {
    const eml = buildEmlMessage({
      subject: "Hello",
      text: "plain",
      html: "<p>hi</p>",
      appVersion: "0.3.2-alpha",
      appChannel: "alpha",
      installId: "11111111-2222-4333-8444-555555555555",
      projectId: "proj-demo",
    });
    expect(eml).toContain("MIME-Version: 1.0");
    expect(eml).toContain("multipart/alternative");
    expect(eml).toContain("Subject: Hello");
    expect(eml).toContain("text/plain");
    expect(eml).toContain("text/html");
    expect(eml).toContain("X-Mailer: texLooper/0.3.2-alpha (alpha)");
    expect(eml).toContain("X-TexLooper-Version: 0.3.2-alpha");
    expect(eml).toContain(
      "X-TexLooper-Instance-Id: 11111111-2222-4333-8444-555555555555",
    );
    expect(eml).toContain("X-TexLooper-Project-Id: proj-demo");
    expect(eml).toMatch(/Message-ID: </);
  });

  it("wraps the message in multipart/mixed with file attachments", () => {
    const eml = buildEmlMessage({
      subject: "Attached",
      text: "plain",
      html: "<p>hi</p>",
      attachments: [
        {
          filename: "document.pdf",
          mime: "application/pdf",
          dataBase64: "UERG",
        },
      ],
    });
    expect(eml).toContain("Content-Type: multipart/mixed");
    expect(eml).toContain("Content-Type: multipart/alternative");
    expect(eml).toContain("Content-Type: application/pdf; name=\"document.pdf\"");
    expect(eml).toContain(
      "Content-Disposition: attachment; filename=\"document.pdf\"",
    );
    expect(eml).toContain("UERG");
  });

  it("buildEmailArtifacts for newsletter demo", () => {
    const project = email();
    const row = {
      preheader: "Skim in a minute",
      title: "Ship notes",
      intro: "We shipped reliability work.",
      first_name: "Ada",
      email: "ada@example.com",
      language: "en",
      cta_label: "Read more",
      cta_url: "https://example.com",
      mod1_title: "Reliability",
      mod1_body: "Fewer incidents",
      mod2_title: "Docs",
      mod2_body: "Clearer guides",
      sender_name: "Northline",
      sender_role: "Lifecycle",
      unsub_url: "https://example.com/unsub",
      year: "2026",
      subject: "Ship notes for {{first_name}}",
    };
    const output =
      project.outputs?.find((o) => o.kind === "email") ??
      ({
        id: "out-email",
        name: "Email",
        kind: "email" as const,
      });

    const art = buildEmailArtifacts({
      project,
      row,
      output,
      installId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      attachments: [
        {
          filename: "notes.txt",
          mime: "text/plain",
          dataBase64: "bm90ZXM=",
        },
      ],
    });
    expect(art.html).toContain("Ship notes");
    expect(art.html.toLowerCase()).toContain("<table");
    expect(art.eml).toMatch(/multipart\//);
    expect(art.eml).toMatch(/^From:/m);
    expect(art.eml).toContain("X-TexLooper-Instance-Id: aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
    expect(art.eml).toContain("X-Mailer: texLooper/");
    expect(art.text).toContain("Ship notes");
    expect(art.subject).toContain("Ada");
    expect(art.attachments).toEqual([{ filename: "notes.txt" }]);
    expect(art.eml).toContain("filename=\"notes.txt\"");
    expect(art.html).toContain("display:none");
    expect(art.html).toContain("Skim in a minute");
  });

  it("preview HTML keeps unresolved merge tokens visible", () => {
    const project = email();
    const row = {
      title: "Hello {{missing_field}}",
      intro: "Body with {{also_missing}}",
      first_name: "Ada",
      email: "ada@example.com",
      language: "en",
      subject: "Hi {{first_name}}",
    };
    const output = {
      id: "out-email",
      name: "Email",
      kind: "email" as const,
    };
    const art = buildEmailArtifacts({
      project,
      row,
      output,
      installId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    });
    expect(art.html).toContain("{{missing_field}}");
    expect(art.html).toContain("fff4ce");
    expect(art.from).toBeTruthy();
    expect(art.to).toContain("ada@");
  });
});
