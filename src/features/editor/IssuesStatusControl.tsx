import { categoryLabel, type AppIssue } from "../../model/issueLog";
import {
  appIssues,
  clearAllIssues,
  dismissIssue,
  issuesPanelOpen,
  openIssuesPanel,
} from "../../state/issueLog";
import { select } from "../../state/store";
import { Icon } from "../../ui/icons";
import { t } from "../../i18n";

export function IssuesStatusControl() {
  const issues = appIssues.value;
  const open = issuesPanelOpen.value;
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.length - errors;

  return (
    <span class="status-bar__pop-anchor">
      <button
        type="button"
        class={[
          "status-bar__btn",
          open ? "status-bar__btn--on" : "",
          issues.length > 0 ? "status-bar__btn--issues" : "",
          errors > 0 ? "status-bar__btn--issues-error" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        title={t("issues")}
        aria-label={t("issues")}
        aria-expanded={open}
        onClick={() => openIssuesPanel(!open)}
      >
        <Icon name="alert" size={12} />
        {issues.length > 0 && (
          <span class="status-bar__badge">{issues.length}</span>
        )}
      </button>
      {open && (
        <div class="status-bar__pop status-bar__pop--issues" role="dialog" aria-label={t("issues")}>
          <div class="issues-panel__head">
            <strong>{t("issues")}</strong>
            <span class="muted issues-panel__counts">
              {errors > 0 ? `${errors} err` : ""}
              {errors > 0 && warnings > 0 ? " · " : ""}
              {warnings > 0 ? `${warnings} warn` : ""}
              {issues.length === 0 ? t("issuesEmpty") : ""}
            </span>
            <button
              type="button"
              class="btn btn--ghost btn--small"
              disabled={issues.length === 0}
              onClick={() => clearAllIssues()}
            >
              {t("issuesClear")}
            </button>
          </div>
          <ul class="issues-panel__list">
            {issues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}

function IssueRow({ issue }: { issue: AppIssue }) {
  return (
    <li
      class={[
        "issues-panel__row",
        issue.severity === "error"
          ? "issues-panel__row--error"
          : "issues-panel__row--warning",
      ].join(" ")}
    >
      <button
        type="button"
        class="issues-panel__main"
        onClick={() => {
          if (issue.blockId) select({ kind: "block", id: issue.blockId });
        }}
        title={issue.blockId ? t("issuesSelectBlock") : undefined}
      >
        <span class="issues-panel__cat">{categoryLabel(issue.category)}</span>
        <span class="issues-panel__msg">{issue.message}</span>
        {issue.detail && (
          <span class="issues-panel__detail muted">{issue.detail}</span>
        )}
      </button>
      <button
        type="button"
        class="status-bar__btn"
        aria-label={t("issuesDismiss")}
        title={t("issuesDismiss")}
        onClick={() => dismissIssue(issue.id)}
      >
        <Icon name="close" size={10} />
      </button>
    </li>
  );
}
