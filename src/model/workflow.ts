import type { ExprValue } from "./expr";

export type OutputKind = "preview" | "pdf" | "print" | "api" | "image" | "email" | "sms" | "mobile";

/** Canonical order for chrome + Automation selectors */
export const OUTPUT_KINDS: OutputKind[] = [
  "preview",
  "pdf",
  "print",
  "email",
  "sms",
  "mobile",
  "api",
  "image",
];

export const OUTPUT_KIND_LABEL: Record<OutputKind, string> = {
  preview: "Screen",
  pdf: "PDF",
  print: "Print",
  email: "Email",
  sms: "SMS",
  mobile: "Push",
  api: "API",
  image: "Image",
};

export interface OutputDevice {
  id: string;
  label?: string;
  media?: string;
  dpi?: number;
}

export interface OutputApi {
  url: string;
  method: "GET" | "POST" | "PUT";
  headers?: Record<string, string>;
}

export interface OutputProfile {
  id: string;
  name: string;
  kind: OutputKind;
  device?: OutputDevice;
  api?: OutputApi;
  pageSize?: "A4" | "Letter" | "custom";
  enabled?: boolean;
}

export type WorkflowStepType =
  | "bind"
  | "filter"
  | "condition"
  | "script"
  | "render"
  | "emit";

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  /** Expression; skip step when false */
  when?: string;
  config: Record<string, unknown>;
}

export type ScriptKind = "expr" | "template";

export interface ProjectScript {
  id: string;
  name: string;
  kind: ScriptKind;
  body: string;
}

export function defaultOutputs(): OutputProfile[] {
  return [
    {
      id: "out-preview",
      name: "Screen preview",
      kind: "preview",
      enabled: true,
    },
    {
      id: "out-pdf-a4",
      name: "PDF A4",
      kind: "pdf",
      pageSize: "A4",
      enabled: true,
    },
    {
      id: "out-print-label",
      name: "Label printer",
      kind: "print",
      device: { id: "label-203dpi", label: "Label", media: "label", dpi: 203 },
      enabled: true,
    },
    {
      id: "out-email",
      name: "Email HTML",
      kind: "email",
      enabled: true,
    },
    {
      id: "out-sms",
      name: "SMS notification",
      kind: "sms",
      enabled: true,
    },
    {
      id: "out-mobile",
      name: "Mobile push",
      kind: "mobile",
      enabled: true,
    },
    {
      id: "out-api",
      name: "API webhook",
      kind: "api",
      api: { url: "https://example.com/hooks/texlooper", method: "POST" },
      enabled: true,
    },
    {
      id: "out-image",
      name: "Image export",
      kind: "image",
      enabled: true,
    },
  ];
}

export function defaultWorkflow(): WorkflowStep[] {
  return [
    {
      id: "step-bind",
      type: "bind",
      name: "Bind row data",
      config: {},
    },
    {
      id: "step-filter",
      type: "filter",
      name: "Skip empty names",
      when: "empty(data.name)",
      config: { action: "skip-row" },
    },
    {
      id: "step-script",
      type: "script",
      name: "Format greeting",
      config: { scriptId: "script-greeting" },
    },
    {
      id: "step-render",
      type: "render",
      name: "Render page",
      config: {},
    },
    {
      id: "step-emit",
      type: "emit",
      name: "Emit to output",
      when: "output.kind != 'preview'",
      config: {},
    },
  ];
}

export function defaultScripts(): ProjectScript[] {
  return [
    {
      id: "script-greeting",
      name: "Greeting line",
      kind: "template",
      body: "Hello {{name|upper}} — {{role|default:Guest}} @ {{company}}",
    },
    {
      id: "script-print-only",
      name: "Print gate",
      kind: "expr",
      body: "output.kind == 'print' && device.media == 'label'",
    },
  ];
}

export function outputToCtx(output: OutputProfile): {
  output: Record<string, ExprValue>;
  device: Record<string, ExprValue>;
} {
  return {
    output: {
      id: output.id,
      name: output.name,
      kind: output.kind,
      pageSize: output.pageSize ?? null,
      enabled: output.enabled !== false,
      apiUrl: output.api?.url ?? null,
      apiMethod: output.api?.method ?? null,
    },
    device: {
      id: output.device?.id ?? null,
      label: output.device?.label ?? null,
      media: output.device?.media ?? null,
      dpi: output.device?.dpi ?? null,
    },
  };
}
