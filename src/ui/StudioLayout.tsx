import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { prefs, updatePrefs } from "../state/store";
import { Icon, type IconName } from "./icons";

interface StudioLayoutProps {
  variant?: "edit" | "aux";
  navigator: ComponentChildren;
  /** @deprecated Blocks live in a floating toolbox over the canvas */
  tools?: ComponentChildren;
  main: ComponentChildren;
  inspector?: ComponentChildren;
}

const MIN_NAV = 160;
const MAX_NAV = 420;
const MIN_INSPECTOR = 180;
const MAX_INSPECTOR = 480;
const COLLAPSED = 44;

type ResizeTarget = "nav" | "inspector";

export function StudioLayout({
  variant = "edit",
  navigator,
  main,
  inspector,
}: StudioLayoutProps) {
  const p = prefs.value;
  const aux = variant === "aux";
  const showInspector = !aux && inspector != null;
  const previewChrome = !aux && !showInspector;

  const navCollapsed = Boolean(p.navCollapsed);
  const inspectorCollapsed = Boolean(p.inspectorCollapsed);

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
    (target: ResizeTarget, startW: number) => (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { target, startX: e.clientX, startW };
      document.body.classList.add("is-resizing-panes");
    };

  const layoutClass = [
    "studio-layout",
    aux ? "studio-layout--aux" : "",
    previewChrome ? "studio-layout--preview" : "",
    "studio-layout--resizable",
  ]
    .filter(Boolean)
    .join(" ");

  const columns =
    aux || previewChrome
      ? `${navW}px minmax(0, 1fr)`
      : `${navW}px minmax(0, 1fr) ${inspW}px`;

  return (
    <div class={layoutClass} style={{ gridTemplateColumns: columns }}>
      <aside
        class={navCollapsed ? "studio-nav studio-rail--collapsed" : "studio-nav"}
        aria-label="Navigator"
        data-collapsed={navCollapsed || undefined}
      >
        <RailChrome
          collapsed={navCollapsed}
          label="Outline"
          icon="panelLeft"
          expandIcon="chevronRight"
          collapseIcon="chevronLeft"
          onToggle={() => updatePrefs({ navCollapsed: !navCollapsed })}
        />
        <div class="studio-rail__body">{navigator}</div>
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

      <section class="studio-main">{main}</section>

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
          <RailChrome
            collapsed={inspectorCollapsed}
            label="Inspect"
            icon="sliders"
            expandIcon="chevronLeft"
            collapseIcon="chevronRight"
            onToggle={() =>
              updatePrefs({ inspectorCollapsed: !inspectorCollapsed })
            }
          />
          <div class="studio-rail__body">{inspector}</div>
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

function RailChrome({
  collapsed,
  label,
  onToggle,
  expandIcon,
  collapseIcon,
}: {
  collapsed: boolean;
  label: string;
  onToggle: () => void;
  icon: IconName;
  expandIcon: IconName;
  collapseIcon: IconName;
}) {
  return (
    <div class="rail-chrome">
      <button
        type="button"
        class={collapsed ? "rail-toggle rail-toggle--collapsed" : "rail-toggle"}
        title={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        onClick={onToggle}
      >
        <Icon name={collapsed ? expandIcon : collapseIcon} size={12} />
        {!collapsed && <span class="rail-toggle__label">{label}</span>}
      </button>
    </div>
  );
}
