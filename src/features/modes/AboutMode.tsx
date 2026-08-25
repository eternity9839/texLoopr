import { useEffect, useState } from "preact/hooks";
import { getRuntimeInfo } from "../../model/backend";
import { prefs } from "../../state/store";
import { t } from "../../i18n";

const FALLBACK_VERSION = "0.1.0";

export function AboutMode() {
  void prefs.value.locale;
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
      <p>{t("aboutLead")}</p>
      <p class="muted">{t("aboutVersion", { version })}</p>
      <p class="muted">{t("aboutStudio")}</p>
      {runtime && (
        <p class="muted" style={{ fontSize: "0.75rem" }}>
          {t("aboutRuntime", { backbone: runtime.backbone })}
          {runtime.engines?.length ? ` · ${runtime.engines.join(", ")}` : ""}
        </p>
      )}
      <p class="muted" style={{ fontSize: "0.75rem" }}>
        {t("aboutTip")}
      </p>
    </div>
  );
}
