import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { prefs, updatePrefs } from "../state/store";
import { Icon, type IconName } from "./icons";

const NARROW_QUERY = "(max-width: 880px)";

/** True while the viewport fits the phone/tablet layout */
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
  navigator: ComponentChildren;
  /** @deprecated Blocks live in a floating toolbox over the canvas */
  tools?: ComponentChildren;
  main: ComponentChildren;
  inspector?: ComponentChildren;
  /** Bottom dock content (block appearance bar) */
  asideBottom?: ComponentChildren;
}

const MIN_NAV = 160;
const MAX_NAV = 420;
const MIN_INSPECTOR = 180;
const MAX_INSPECTOR = 480;
const COLLAPSED = 44;

type ResizeTarget = "nav" | "inspector";
type PaneId = "nav" | "inspector";

export function StudioLayout({
  variant = "edit",
  navigator,
  main,
  inspector,
  asideBottom,
}: StudioLayoutProps) {
  const p = prefs.value;
  const aux = variant === "aux";
  const showInspector = !aux && inspector != null;
  const previewChrome = !aux && !showInspector;
  const narrow = useNarrow();

  // Narrow screens: canvas first, rails collapsed to header bars that
  // slide open (one at a time). Desktop: prefs-driven side rails.
  const [openPane, setOpenPane] = useState<PaneId | null>(null);

  const navCollapsed = narrow
    ? openPane !== "nav"
    : Boolean(p.navCollapsed);
  const inspectorCollapsed = narrow
    ? openPane !== "inspector"
    : Boolean(p.inspectorCollapsed);

  const navW = navCollapsed
    ? COLLAPSED
    : Math.min(MAX_NAV, Math.max(MIN_NAV, p.navWidth ?? 240));
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
    startY: number;
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
        startY: e.clientY,
        startW: startPos,
      };
      document.body.classList.add("is-resizing-panes");
    };

  const togglePane = (id: PaneId, prefKey: "navCollapsed" | "inspectorCollapsed") => {
    if (narrow) {
      setOpenPane((cur) => (cur === id ? null : id));
    } else {
      updatePrefs({ [prefKey]: !p[prefKey] });
    }
  };

  const layoutClass = [
    "studio-layout",
    aux ? "studio-layout--aux" : "",
    previewChrome ? "studio-layout--preview" : "",
    narrow ? "studio-layout--stack" : "",
    "studio-layout--resizable",
  ]
    .filter(Boolean)
    .join(" ");

  const columns =
    aux || previewChrome
      ? `${navW}px minmax(0, 1fr)`
      : `${navW}px minmax(0, 1fr) ${inspW}px`;

  return (
    <div
      class={layoutClass}
      style={narrow ? undefined : { gridTemplateColumns: columns }}
    >
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

      <section class="studio-main">
        <div class="studio-main__content">{main}</div>
        {asideBottom}
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
  /** Slim strip mode (desktop collapsed rail): icon only */
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
        <Icon name={compact ? expandIcon : collapsed ? "chevronDown" : collapseIcon} size={12} />
      </button>
    </header>
  );
}
