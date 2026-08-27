import { useEffect, useState } from "preact/hooks";
import { getRuntimeInfo, type RuntimeInfo } from "../../model/backend";
import { prefs } from "../../state/store";
import { t } from "../../i18n";

const FALLBACK_VERSION = __APP_VERSION__;

function formatBuiltAt(unix: number | undefined, locale: string): string | null {
  if (!unix) return null;
  const localeTag = locale === "fr" ? "fr-FR" : "en-GB";
  return new Date(unix * 1000).toLocaleString(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AboutMode() {
  const locale = prefs.value.locale;
  void locale;
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const info = await getRuntimeInfo();
      if (!cancelled && info) setRuntime(info);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const version = runtime?.version ?? FALLBACK_VERSION;
  const channel = runtime?.channel ?? __APP_CHANNEL__;
  const builtAt = formatBuiltAt(runtime?.builtAtUnix, locale ?? "en");
  const commit = runtime?.gitCommit;
  const profile = runtime?.profile;
  const target = runtime?.target;

  return (
    <div class="about-panel">
      <div class="about-panel__banner" role="status">
        <span class="about-panel__channel">{channel}</span>
        <span>{t("aboutAlphaNotice")}</span>
      </div>
      <p>{t("aboutLead")}</p>
      <dl class="about-panel__meta">
        <div class="about-panel__row">
          <dt>{t("aboutVersionLabel")}</dt>
          <dd>{version}</dd>
        </div>
        {commit && (
          <div class="about-panel__row">
            <dt>{t("aboutBuildLabel")}</dt>
            <dd>
              {runtime?.gitTag ? (
                <>
                  <code>{runtime.gitTag}</code>
                  {" · "}
                </>
              ) : null}
              <code>{commit}</code>
              {profile ? ` · ${profile}` : ""}
              {target ? ` · ${target}` : ""}
            </dd>
          </div>
        )}
        {builtAt && (
          <div class="about-panel__row">
            <dt>{t("aboutBuiltAtLabel")}</dt>
            <dd>{builtAt}</dd>
          </div>
        )}
      </dl>
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
