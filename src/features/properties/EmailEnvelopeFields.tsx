import type { EmailEnvelope } from "../../model/email/envelope";
import { patchEmailEnvelope } from "../../model/email/envelope";
import { Field } from "../../ui/controls";

/** Shared From / Reply-To / Cc / Bcc / headers editor. */
export function EmailEnvelopeFields({
  value,
  onChange,
  idPrefix,
  showSubject = true,
  showPreheader = true,
  showTo = false,
}: {
  value: EmailEnvelope | undefined;
  onChange: (next: EmailEnvelope | undefined) => void;
  idPrefix: string;
  showSubject?: boolean;
  showPreheader?: boolean;
  /** When true, allow overriding recipient (else row.email / row.to). */
  showTo?: boolean;
}) {
  const patch = (partial: Partial<EmailEnvelope>) => {
    onChange(patchEmailEnvelope(value, partial));
  };

  return (
    <div class="email-envelope-fields">
      <Field
        label="From"
        forId={`${idPrefix}-from`}
        hint="Templates OK. Falls back to contact email."
      >
        <input
          id={`${idPrefix}-from`}
          type="text"
          placeholder="{{sender_email}} or noreply@example.com"
          value={value?.from ?? ""}
          onInput={(e) => patch({ from: e.currentTarget.value })}
        />
      </Field>
      <Field label="Reply-To" forId={`${idPrefix}-reply`}>
        <input
          id={`${idPrefix}-reply`}
          type="text"
          placeholder="support@example.com"
          value={value?.replyTo ?? ""}
          onInput={(e) => patch({ replyTo: e.currentTarget.value })}
        />
      </Field>
      {showTo && (
        <Field
          label="To"
          forId={`${idPrefix}-to`}
          hint="Optional. Default: row email / to."
        >
          <input
            id={`${idPrefix}-to`}
            type="text"
            placeholder="{{email}}"
            value={value?.to ?? ""}
            onInput={(e) => patch({ to: e.currentTarget.value })}
          />
        </Field>
      )}
      <div class="field-row">
        <Field label="Cc" forId={`${idPrefix}-cc`}>
          <input
            id={`${idPrefix}-cc`}
            type="text"
            placeholder="ops@example.com"
            value={value?.cc ?? ""}
            onInput={(e) => patch({ cc: e.currentTarget.value })}
          />
        </Field>
        <Field label="Bcc" forId={`${idPrefix}-bcc`}>
          <input
            id={`${idPrefix}-bcc`}
            type="text"
            placeholder=""
            value={value?.bcc ?? ""}
            onInput={(e) => patch({ bcc: e.currentTarget.value })}
          />
        </Field>
      </div>
      {showSubject && (
        <Field
          label="Subject"
          forId={`${idPrefix}-subject`}
          hint="Optional override. Else document subject / row.subject."
        >
          <input
            id={`${idPrefix}-subject`}
            type="text"
            placeholder="{{subject}} — Quickstart"
            value={value?.subject ?? ""}
            onInput={(e) => patch({ subject: e.currentTarget.value })}
          />
        </Field>
      )}
      {showPreheader && (
        <Field label="Preheader" forId={`${idPrefix}-preheader`}>
          <input
            id={`${idPrefix}-preheader`}
            type="text"
            placeholder="Inbox preview text"
            value={value?.preheader ?? ""}
            onInput={(e) => patch({ preheader: e.currentTarget.value })}
          />
        </Field>
      )}
      <Field
        label="Custom headers"
        forId={`${idPrefix}-headers`}
        hint="One per line: X-Campaign: spring or List-Unsubscribe=<https://…>. Reserved system headers are ignored."
      >
        <textarea
          id={`${idPrefix}-headers`}
          rows={4}
          placeholder={"X-Campaign: welcome\nList-Id: <news.example.com>"}
          value={value?.headers ?? ""}
          onInput={(e) => patch({ headers: e.currentTarget.value })}
        />
      </Field>
    </div>
  );
}
