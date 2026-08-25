import { useMemo, useState } from "preact/hooks";
import {
  createId,
  ensureProjectAutomation,
} from "../../model/document";
import {
  project,
  updateProjectAutomation,
  setActiveOutputId,
  previewRow,
  dataRows,
} from "../../state/store";
import type {
  OutputKind,
  OutputProfile,
  ProjectScript,
  ScriptKind,
  WorkflowStep,
  WorkflowStepType,
} from "../../model/workflow";
import { outputToCtx } from "../../model/workflow";
import { Icon, type IconName } from "../../ui/icons";

const OUTPUT_KINDS: OutputKind[] = ["preview", "pdf", "print", "api", "image"];
const STEP_TYPES: WorkflowStepType[] = [
  "bind",
  "filter",
  "condition",
  "script",
  "render",
  "emit",
];
const SCRIPT_KINDS: ScriptKind[] = ["expr", "template"];

const AUTO_TABS: {
  id: "outputs" | "workflow" | "scripts" | "run";
  label: string;
  icon: IconName;
}[] = [
  { id: "outputs", label: "Outputs", icon: "layout" },
  { id: "workflow", label: "Workflow", icon: "workflow" },
  { id: "scripts", label: "Scripts", icon: "code" },
  { id: "run", label: "Run", icon: "play" },
];

export function AutomationPanel() {
  const raw = project.value;
  const proj = ensureProjectAutomation(raw);
  const outputs = proj.outputs ?? [];
  const workflow = proj.workflow ?? [];
  const scripts = proj.scripts ?? [];
  const [tab, setTab] = useState<"outputs" | "workflow" | "scripts" | "run">(
    "outputs",
  );
  const [runLog, setRunLog] = useState<string>("");

  const activeOutput =
    outputs.find((o) => o.id === proj.activeOutputId) ?? outputs[0];

  const patchOutputs = (next: OutputProfile[]) => {
    updateProjectAutomation({ outputs: next });
  };

  const patchWorkflow = (next: WorkflowStep[]) => {
    updateProjectAutomation({ workflow: next });
  };

  const patchScripts = (next: ProjectScript[]) => {
    updateProjectAutomation({ scripts: next });
  };

  const onRun = async () => {
    if (!activeOutput) {
      setRunLog("No output selected.");
      return;
    }
    const row = previewRow.value ?? dataRows.value[0] ?? {};
    const { runWorkflowBackend } = await import("../../model/backend");
    const result = await runWorkflowBackend({
      project: proj,
      row,
      output: activeOutput,
      preview: activeOutput.kind === "preview",
    });
    setRunLog(
      [
        result.skippedRow ? "Row skipped by filter." : "Row processed.",
        ...result.logs.map(
          (l) =>
            `${l.skipped ? "·" : l.ok ? "✓" : "✗"} [${l.type}] ${l.name}${l.detail ? ` — ${l.detail}` : ""}`,
        ),
        result.emit
          ? `Emit: ${result.emit.kind} → ${JSON.stringify(result.emit.payload).slice(0, 200)}…`
          : "No emit.",
      ].join("\n"),
    );
  };

  const deviceHint = useMemo(() => {
    if (!activeOutput) return "";
    const { device } = outputToCtx(activeOutput);
    return device.media
      ? `${device.label ?? device.id} · ${device.media} · ${device.dpi ?? "?"}dpi`
      : activeOutput.kind;
  }, [activeOutput]);

  return (
    <div class="automation-panel panel-pad">
      <p class="muted" style={{ marginTop: 0 }}>
        Outputs, workflow steps, and sandboxed scripts (ADR 0005). Conditions
        can use <code>data.*</code>, <code>output.*</code>,{" "}
        <code>device.*</code>, <code>vars.*</code>, <code>env.*</code>.
      </p>

      <div class="studio-switch" role="tablist" aria-label="Automation sections">
        {AUTO_TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            class="studio-switch__btn studio-switch__btn--icon"
            title={t.label}
            aria-label={t.label}
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={14} />
          </button>
        ))}
      </div>

      {tab === "outputs" && (
        <div class="automation-section">
          <div class="field">
            <label for="active-output">Active output</label>
            <select
              id="active-output"
              value={proj.activeOutputId ?? ""}
              onChange={(e) => setActiveOutputId(e.currentTarget.value)}
            >
              {outputs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.kind})
                </option>
              ))}
            </select>
            <p class="muted">{deviceHint}</p>
          </div>

          {outputs.map((o, i) => (
            <div class="automation-card" key={o.id}>
              <div class="field-row">
                <input
                  aria-label="Output name"
                  value={o.name}
                  onInput={(e) => {
                    const nextOutputs = [...outputs];
                    nextOutputs[i] = { ...o, name: e.currentTarget.value };
                    patchOutputs(nextOutputs);
                  }}
                />
                <select
                  aria-label="Output kind"
                  value={o.kind}
                  onChange={(e) => {
                    const nextOutputs = [...outputs];
                    nextOutputs[i] = {
                      ...o,
                      kind: e.currentTarget.value as OutputKind,
                    };
                    patchOutputs(nextOutputs);
                  }}
                >
                  {OUTPUT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  class="btn btn--ghost btn--small"
                  onClick={() =>
                    patchOutputs(outputs.filter((x) => x.id !== o.id))
                  }
                >
                  Remove
                </button>
              </div>
              {o.kind === "print" && (
                <div class="field-row">
                  <input
                    placeholder="device id"
                    value={o.device?.id ?? ""}
                    onInput={(e) => {
                      const nextOutputs = [...outputs];
                      nextOutputs[i] = {
                        ...o,
                        device: {
                          ...o.device,
                          id: e.currentTarget.value,
                          media: o.device?.media ?? "label",
                        },
                      };
                      patchOutputs(nextOutputs);
                    }}
                  />
                  <input
                    placeholder="media"
                    value={o.device?.media ?? ""}
                    onInput={(e) => {
                      const nextOutputs = [...outputs];
                      nextOutputs[i] = {
                        ...o,
                        device: {
                          id: o.device?.id ?? "device",
                          ...o.device,
                          media: e.currentTarget.value,
                        },
                      };
                      patchOutputs(nextOutputs);
                    }}
                  />
                  <input
                    type="number"
                    placeholder="dpi"
                    value={o.device?.dpi ?? ""}
                    onInput={(e) => {
                      const nextOutputs = [...outputs];
                      nextOutputs[i] = {
                        ...o,
                        device: {
                          id: o.device?.id ?? "device",
                          ...o.device,
                          dpi: Number(e.currentTarget.value) || undefined,
                        },
                      };
                      patchOutputs(nextOutputs);
                    }}
                  />
                </div>
              )}
              {o.kind === "api" && (
                <div class="field-row">
                  <select
                    value={o.api?.method ?? "POST"}
                    onChange={(e) => {
                      const nextOutputs = [...outputs];
                      nextOutputs[i] = {
                        ...o,
                        api: {
                          url: o.api?.url ?? "",
                          method: e.currentTarget.value as "GET" | "POST" | "PUT",
                        },
                      };
                      patchOutputs(nextOutputs);
                    }}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                  </select>
                  <input
                    style={{ flex: 1 }}
                    placeholder="https://…"
                    value={o.api?.url ?? ""}
                    onInput={(e) => {
                      const nextOutputs = [...outputs];
                      nextOutputs[i] = {
                        ...o,
                        api: {
                          method: o.api?.method ?? "POST",
                          url: e.currentTarget.value,
                        },
                      };
                      patchOutputs(nextOutputs);
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            class="btn btn--small"
            onClick={() =>
              patchOutputs([
                ...outputs,
                {
                  id: createId(),
                  name: "New output",
                  kind: "pdf",
                  enabled: true,
                },
              ])
            }
          >
            Add output
          </button>
        </div>
      )}

      {tab === "workflow" && (
        <div class="automation-section">
          {workflow.map((step, i) => (
            <div class="automation-card" key={step.id}>
              <div class="field-row">
                <select
                  value={step.type}
                  onChange={(e) => {
                    const nextWorkflow = [...workflow];
                    nextWorkflow[i] = {
                      ...step,
                      type: e.currentTarget.value as WorkflowStepType,
                    };
                    patchWorkflow(nextWorkflow);
                  }}
                >
                  {STEP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  style={{ flex: 1 }}
                  value={step.name}
                  onInput={(e) => {
                    const nextWorkflow = [...workflow];
                    nextWorkflow[i] = { ...step, name: e.currentTarget.value };
                    patchWorkflow(nextWorkflow);
                  }}
                />
                <button
                  type="button"
                  class="btn btn--ghost btn--small"
                  onClick={() =>
                    patchWorkflow(workflow.filter((s) => s.id !== step.id))
                  }
                >
                  Remove
                </button>
              </div>
              <input
                placeholder="when: expression (optional)"
                value={step.when ?? ""}
                onInput={(e) => {
                  const nextWorkflow = [...workflow];
                  nextWorkflow[i] = {
                    ...step,
                    when: e.currentTarget.value || undefined,
                  };
                  patchWorkflow(nextWorkflow);
                }}
              />
              {step.type === "script" && (
                <select
                  value={String(step.config.scriptId ?? "")}
                  onChange={(e) => {
                    const nextWorkflow = [...workflow];
                    nextWorkflow[i] = {
                      ...step,
                      config: { ...step.config, scriptId: e.currentTarget.value },
                    };
                    patchWorkflow(nextWorkflow);
                  }}
                >
                  <option value="">Select script…</option>
                  {scripts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              {step.type === "filter" && (
                <select
                  value={String(step.config.action ?? "skip-row")}
                  onChange={(e) => {
                    const nextWorkflow = [...workflow];
                    nextWorkflow[i] = {
                      ...step,
                      config: { ...step.config, action: e.currentTarget.value },
                    };
                    patchWorkflow(nextWorkflow);
                  }}
                >
                  <option value="skip-row">skip-row</option>
                </select>
              )}
              {step.type === "condition" && (
                <input
                  placeholder="config.expr"
                  value={String(step.config.expr ?? "")}
                  onInput={(e) => {
                    const nextWorkflow = [...workflow];
                    nextWorkflow[i] = {
                      ...step,
                      config: { ...step.config, expr: e.currentTarget.value },
                    };
                    patchWorkflow(nextWorkflow);
                  }}
                />
              )}
            </div>
          ))}
          <button
            type="button"
            class="btn btn--small"
            onClick={() =>
              patchWorkflow([
                ...workflow,
                {
                  id: createId(),
                  type: "condition",
                  name: "New step",
                  config: { expr: "true" },
                },
              ])
            }
          >
            Add step
          </button>
        </div>
      )}

      {tab === "scripts" && (
        <div class="automation-section">
          {scripts.map((script, i) => (
            <div class="automation-card" key={script.id}>
              <div class="field-row">
                <input
                  value={script.name}
                  onInput={(e) => {
                    const nextScripts = [...scripts];
                    nextScripts[i] = { ...script, name: e.currentTarget.value };
                    patchScripts(nextScripts);
                  }}
                />
                <select
                  value={script.kind}
                  onChange={(e) => {
                    const nextScripts = [...scripts];
                    nextScripts[i] = {
                      ...script,
                      kind: e.currentTarget.value as ScriptKind,
                    };
                    patchScripts(nextScripts);
                  }}
                >
                  {SCRIPT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  class="btn btn--ghost btn--small"
                  onClick={() =>
                    patchScripts(scripts.filter((s) => s.id !== script.id))
                  }
                >
                  Remove
                </button>
              </div>
              <textarea
                rows={3}
                value={script.body}
                onInput={(e) => {
                  const nextScripts = [...scripts];
                  nextScripts[i] = { ...script, body: e.currentTarget.value };
                  patchScripts(nextScripts);
                }}
              />
            </div>
          ))}
          <button
            type="button"
            class="btn btn--small"
            onClick={() =>
              patchScripts([
                ...scripts,
                {
                  id: createId(),
                  name: "New script",
                  kind: "expr",
                  body: "data.name",
                },
              ])
            }
          >
            Add script
          </button>
        </div>
      )}

      {tab === "run" && (
        <div class="automation-section">
          <p class="muted">
            Dry-run the workflow against the current preview row and active
            output. Emit does not hit the network yet — it builds a payload.
          </p>
          <button type="button" class="btn" onClick={onRun}>
            Run workflow
          </button>
          {runLog && <pre class="automation-log">{runLog}</pre>}
        </div>
      )}
    </div>
  );
}
