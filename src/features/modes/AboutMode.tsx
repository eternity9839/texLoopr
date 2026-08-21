import { useEffect, useState } from "preact/hooks";
import { getRuntimeInfo } from "../../model/backend";

const FALLBACK_VERSION = "0.1.0";

export function AboutMode() {
  const [version, setVersion] = useState(FALLBACK_VERSION);
  const [runtime, setRuntime] = useState<{
    version: string;
    backbone: string;
    engines: string[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const v = await invoke<string>("get_app_version");
        if (!cancelled && v) setVersion(v);
      } catch {
        // Web / non-Tauri runtime
      }
      const info = await getRuntimeInfo();
      if (!cancelled && info) setRuntime(info);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <p>
        Create tailored bulk documents with templating and simple data formats.
        Edit once, preview against many rows.
      </p>
      <p class="muted">Version {version}</p>
      <p class="muted">
        Studio views: Edit (with Preview toggle) and Data. Bind fields with{" "}
        <code>{"{{name}}"}</code>. Themes and density live in Settings.
      </p>
      {runtime && (
        <p class="muted" style={{ fontSize: "0.75rem" }}>
          Runtime backbone: {runtime.backbone}
          {runtime.engines?.length ? ` · ${runtime.engines.join(", ")}` : ""}
        </p>
      )}
      <p class="muted" style={{ fontSize: "0.75rem" }}>
        Tip: <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>.</kbd> toggles Preview on the
        Edit view.
      </p>
    </div>
  );
}
