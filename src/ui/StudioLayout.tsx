import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { prefs, updatePrefs } from "../state/store";
import { Icon, type IconName } from "./icons";

const NARROW_QUERY = "(max-width: 880px)";
const TOOLS_W = 48;

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia?.(NARROW_QUERY).matches ?? false),
  );
  useEffect(() => {
    const mq = window.matchMedia?.(NARROW_QUERY);
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

interface StudioLayoutProps {
  variant?: "edit" | "aux";
  /** Left outline (Data / aux). Edit uses Layers in the inspector instead. */
  navigator?: ComponentChildren;
  /** Fixed left tool palette (Edit only). */
  tools?: ComponentChildren;
  main: ComponentChildren;
  inspector?: ComponentChildren;
  /** @deprecated Bottom property dock removed — use inspector Design tab. */
  asideBottom?: ComponentChildren;
}

const MIN_NAV = 160;
const MAX_NAV = 420;
const MIN_INSPECTOR = 200;
const MAX_INSPECTOR = 420;
const COLLAPSED = 44;

type ResizeTarget = "nav" | "inspector";
type PaneId = "nav" | "inspector" | "tools";

export function StudioLayout({
  variant = "edit",
  navigator,
  tools,
  main,
  inspector,
}: StudioLayoutProps) {
  const p = prefs.value;
  const aux = variant === "aux";
  const showTools = !aux && tools != null;
  const showNav = aux && navigator != null;
  const showInspector = !aux && inspector != null;
  const previewChrome = !aux && !showInspector && !showTools;
  const narrow = useNarrow();

  const [openPane, setOpenPane] = useState<PaneId | null>(null);

  const navCollapsed = narrow
    ? openPane !== "nav"
    : Boolean(p.navCollapsed);
  const inspectorCollapsed = narrow
    ? openPane !== "inspector"
    : Boolean(p.inspectorCollapsed);
  const toolsCollapsed = narrow ? openPane !== "tools" : false;

  const navW = !showNav
    ? 0
    : navCollapsed
      ? COLLAPSED
      : Math.min(MAX_NAV, Math.max(MIN_NAV, p.navWidth ?? 240));
  const toolsW = !showTools ? 0 : toolsCollapsed ? COLLAPSED : TOOLS_W;
  const inspW = !showInspector
    ? 0
    : inspectorCollapsed
      ? COLLAPSED
      : Math.min(
          MAX_INSPECTOR,
          Math.max(MIN_INSPECTOR, p.inspectorWidth ?? 280),
        );

  const dragRef = useRef<{
    target: ResizeTarget;
    startX: number;
    startW: number;
  } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      if (d.target === "nav") {
        updatePrefs({
          navWidth: Math.min(MAX_NAV, Math.max(MIN_NAV, d.startW + dx)),
          navCollapsed: false,
        });
      } else {
        updatePrefs({
          inspectorWidth: Math.min(
            MAX_INSPECTOR,
            Math.max(MIN_INSPECTOR, d.startW - dx),
          ),
          inspectorCollapsed: false,
        });
      }
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.classList.remove("is-resizing-panes");
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const startResize =
    (target: ResizeTarget, startPos: number) => (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        target,
        startX: e.clientX,
        startW: startPos,
      };
      document.body.classList.add("is-resizing-panes");
    };

  const togglePane = (
    id: PaneId,
    prefKey?: "navCollapsed" | "inspectorCollapsed",
  ) => {
    if (narrow) {
      setOpenPane((cur) => (cur === id ? null : id));
    } else if (prefKey) {
      updatePrefs({ [prefKey]: !p[prefKey] });
    }
  };

  const layoutClass = [
    "studio-layout",
    aux ? "studio-layout--aux" : "studio-layout--edit",
    previewChrome ? "studio-layout--preview" : "",
    narrow ? "studio-layout--stack" : "",
    "studio-layout--resizable",
  ]
    .filter(Boolean)
    .join(" ");

  const columns = (() => {
    if (narrow) return undefined;
    if (aux) return `${navW}px minmax(0, 1fr)`;
    if (previewChrome) return `minmax(0, 1fr)`;
    const parts: string[] = [];
    if (showTools) parts.push(`${toolsW}px`);
    parts.push("minmax(0, 1fr)");
    if (showInspector) parts.push(`${inspW}px`);
    return parts.join(" ");
  })();

  return (
    <div
      class={layoutClass}
      style={narrow ? undefined : { gridTemplateColumns: columns }}
    >
      {showTools && (
        <aside
          class={
            toolsCollapsed
              ? "studio-tools studio-rail--collapsed"
              : "studio-tools"
          }
          aria-label="Tools"
          data-collapsed={toolsCollapsed || undefined}
        >
          {narrow && (
            <RailHead
              label="Tools"
              collapsed={toolsCollapsed}
              collapseIcon="chevronLeft"
              expandIcon="chevronRight"
              onToggle={() => togglePane("tools")}
            />
          )}
          <div class="rail-reveal">
            <div class="studio-rail__body">{tools}</div>
          </div>
        </aside>
      )}

      {showNav && (
        <aside
          class={navCollapsed ? "studio-nav studio-rail--collapsed" : "studio-nav"}
          aria-label="Navigator"
          data-collapsed={navCollapsed || undefined}
        >
          <RailHead
            label="Outline"
            compact={!narrow && navCollapsed}
            collapsed={navCollapsed}
            collapseIcon="chevronLeft"
            expandIcon="chevronRight"
            onToggle={() => togglePane("nav", "navCollapsed")}
          />
          <div class="rail-reveal">
            <div class="studio-rail__body">{navigator}</div>
          </div>
          {!navCollapsed && (
            <div
              class="pane-resizer pane-resizer--east"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize navigator"
              onPointerDown={startResize("nav", navW)}
            />
          )}
        </aside>
      )}

      <section class="studio-main">
        <div class="studio-main__content">{main}</div>
      </section>

      {showInspector && (
        <aside
          class={
            inspectorCollapsed
              ? "studio-inspector studio-rail--collapsed"
              : "studio-inspector"
          }
          aria-label="Inspector"
          data-collapsed={inspectorCollapsed || undefined}
        >
          <RailHead
            label="Inspect"
            compact={!narrow && inspectorCollapsed}
            collapsed={inspectorCollapsed}
            collapseIcon="chevronRight"
            expandIcon="chevronLeft"
            onToggle={() => togglePane("inspector", "inspectorCollapsed")}
          />
          <div class="rail-reveal">
            <div class="studio-rail__body">{inspector}</div>
          </div>
          {!inspectorCollapsed && (
            <div
              class="pane-resizer pane-resizer--west"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize inspector"
              onPointerDown={startResize("inspector", inspW)}
            />
          )}
        </aside>
      )}
    </div>
  );
}

function RailHead({
  label,
  collapsed,
  compact,
  collapseIcon,
  expandIcon,
  onToggle,
}: {
  label: string;
  collapsed: boolean;
  compact?: boolean;
  collapseIcon: IconName;
  expandIcon: IconName;
  onToggle: () => void;
}) {
  return (
    <header
      class={
        collapsed && compact
          ? "rail-head rail-head--compact"
          : collapsed
            ? "rail-head rail-head--closed"
            : "rail-head"
      }
    >
      {!compact && <span class="rail-head__label">{label}</span>}
      <button
        type="button"
        class={compact ? "rail-head__btn rail-head__btn--solo" : "rail-head__btn"}
        title={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        onClick={onToggle}
      >
        <Icon
          name={compact ? expandIcon : collapsed ? "chevronDown" : collapseIcon}
          size={12}
        />
      </button>
    </header>
  );
}
