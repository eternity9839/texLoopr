//! Workflow runner — canonical emit / dry-run path for desktop and future CLI.

use crate::template::{
    evaluate_condition, evaluate_expr, resolve_template, RuntimeContext,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StepLog {
    pub step_id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub step_type: String,
    pub skipped: bool,
    pub ok: bool,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowResult {
    pub ok: bool,
    pub skipped_row: bool,
    pub context: Value,
    pub script_results: Map<String, Value>,
    pub logs: Vec<StepLog>,
    pub emit: Option<Value>,
}

pub fn run_workflow(
    project: &Value,
    row: &Value,
    output: &Value,
    vars: Option<&Value>,
    preview: bool,
) -> WorkflowResult {
    let mut ctx = RuntimeContext::from_row(row, output, preview);
    if let Some(Value::Object(m)) = vars {
        ctx.vars = m.clone();
    }

    let steps = project
        .get("workflow")
        .and_then(|w| w.as_array())
        .cloned()
        .unwrap_or_default();

    let scripts = project
        .get("scripts")
        .and_then(|s| s.as_array())
        .cloned()
        .unwrap_or_default();

    let mut logs = Vec::new();
    let mut script_results = Map::new();
    let mut skipped_row = false;
    let mut emit = None;

    for step in &steps {
        let step_id = step
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let name = step
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let step_type = step
            .get("type")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let when = step.get("when").and_then(|v| v.as_str());
        let config = step.get("config").cloned().unwrap_or(json!({}));

        if let Some(w) = when {
            if !evaluate_condition(w, &Value::Object(ctx.data.clone()), Some(&ctx)) {
                logs.push(StepLog {
                    step_id,
                    name,
                    step_type,
                    skipped: true,
                    ok: true,
                    detail: Some("when=false".into()),
                });
                continue;
            }
        }

        match step_type.as_str() {
            "bind" => {
                logs.push(StepLog {
                    step_id,
                    name,
                    step_type,
                    skipped: false,
                    ok: true,
                    detail: Some(format!("{} fields", ctx.data.len())),
                });
            }
            "filter" => {
                let action = config
                    .get("action")
                    .and_then(|v| v.as_str())
                    .unwrap_or("skip-row");
                if action == "skip-row" {
                    skipped_row = true;
                    logs.push(StepLog {
                        step_id,
                        name,
                        step_type,
                        skipped: false,
                        ok: true,
                        detail: Some("row skipped".into()),
                    });
                    break;
                }
            }
            "condition" => {
                let expr = config
                    .get("expr")
                    .and_then(|v| v.as_str())
                    .unwrap_or("true");
                let pass = evaluate_condition(expr, &Value::Object(ctx.data.clone()), Some(&ctx));
                if !pass
                    && config.get("onFail").and_then(|v| v.as_str()) == Some("skip-row")
                {
                    skipped_row = true;
                }
                logs.push(StepLog {
                    step_id,
                    name,
                    step_type,
                    skipped: false,
                    ok: pass,
                    detail: Some(if pass { "passed" } else { "failed" }.into()),
                });
            }
            "script" => {
                let script_id = config
                    .get("scriptId")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let script = scripts.iter().find(|s| {
                    s.get("id").and_then(|v| v.as_str()) == Some(script_id)
                });
                match script {
                    None => logs.push(StepLog {
                        step_id,
                        name,
                        step_type,
                        skipped: false,
                        ok: false,
                        detail: Some(format!("missing script {script_id}")),
                    }),
                    Some(script) => {
                        let kind = script
                            .get("kind")
                            .and_then(|v| v.as_str())
                            .unwrap_or("expr");
                        let body = script
                            .get("body")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");
                        let value = if kind == "template" {
                            Value::String(resolve_template(
                                body,
                                &Value::Object(ctx.data.clone()),
                                Some(&ctx),
                                true,
                            ))
                        } else {
                            evaluate_expr(body, &ctx)
                        };
                        let sid = script
                            .get("id")
                            .and_then(|v| v.as_str())
                            .unwrap_or(script_id)
                            .to_string();
                        script_results.insert(sid, value.clone());
                        if let Some(sname) = script.get("name").and_then(|v| v.as_str()) {
                            let key = sname.replace(' ', "_").to_lowercase();
                            match &value {
                                Value::String(s) => {
                                    ctx.data.insert(key.clone(), Value::String(s.clone()));
                                    ctx.vars.insert(key, value.clone());
                                }
                                Value::Number(n) => {
                                    ctx.data
                                        .insert(key.clone(), Value::String(n.to_string()));
                                    ctx.vars.insert(key, value.clone());
                                }
                                other => {
                                    ctx.vars.insert(key, other.clone());
                                }
                            }
                        }
                        logs.push(StepLog {
                            step_id,
                            name,
                            step_type,
                            skipped: false,
                            ok: true,
                            detail: Some(short(&value)),
                        });
                    }
                }
            }
            "render" => {
                logs.push(StepLog {
                    step_id,
                    name,
                    step_type,
                    skipped: skipped_row,
                    ok: true,
                    detail: Some(
                        if skipped_row {
                            "skipped (row)"
                        } else {
                            "render ready"
                        }
                        .into(),
                    ),
                });
            }
            "emit" => {
                let kind = ctx
                    .output
                    .get("kind")
                    .and_then(|v| v.as_str())
                    .unwrap_or("preview")
                    .to_string();
                emit = Some(json!({
                    "kind": kind,
                    "payload": {
                        "outputId": ctx.output.get("id"),
                        "device": ctx.device,
                        "api": output.get("api"),
                        "data": ctx.data,
                        "scripts": script_results,
                    }
                }));
                logs.push(StepLog {
                    step_id,
                    name,
                    step_type,
                    skipped: false,
                    ok: true,
                    detail: Some(format!("emit {kind}")),
                });
            }
            other => {
                logs.push(StepLog {
                    step_id,
                    name,
                    step_type: other.into(),
                    skipped: false,
                    ok: false,
                    detail: Some("unknown step".into()),
                });
            }
        }
    }

    let ok = logs.iter().all(|l| l.ok || l.skipped);
    WorkflowResult {
        ok,
        skipped_row,
        context: ctx.to_json(),
        script_results,
        logs,
        emit,
    }
}

fn short(v: &Value) -> String {
    let s = match v {
        Value::String(s) => s.clone(),
        other => other.to_string(),
    };
    if s.len() > 80 {
        format!("{}…", &s[..77])
    } else {
        s
    }
}
