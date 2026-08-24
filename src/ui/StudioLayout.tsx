import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { prefs, updatePrefs } from "../state/store";
import { Icon, type IconName } from "./icons";

const NARROW_QUERY = "(max-width: 880px)";

/** True while the viewport fits the phone/tablet drawer layout */
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
const MIN_PROPS = 120;
const MAX_PROPS = 520;
const COLLAPSED = 44;

type ResizeTarget = "nav" | "inspector" | "props";

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
  const propsH = Math.min(MAX_PROPS, Math.max(MIN_PROPS, p.propsHeight ?? 240));

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
      } else if (d.target === "props") {
        updatePrefs({
          propsHeight: Math.min(MAX_PROPS, Math.max(MIN_PROPS, d.startY - e.clientY)),
          propsCollapsed: false,
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

  const layoutClass = [
    "studio-layout",
    aux ? "studio-layout--aux" : "",
    previewChrome ? "studio-layout--preview" : "",
    "studio-layout--resizable",
  ]
    .filter(Boolean)
    .join(" ");

  // Phone/tablet: rails become overlay drawers instead of grid columns
  if (!aux && narrow) {
    const anyDrawer = !navCollapsed || (showInspector && !inspectorCollapsed);
    const closeDrawers = () =>
      updatePrefs({
        navCollapsed: true,
        inspectorCollapsed: showInspector ? true : p.inspectorCollapsed,
      });
    return (
      <div class="studio-layout studio-layout--narrow">
        {anyDrawer && (
          <div class="drawer-scrim" aria-hidden="true" onClick={closeDrawers} />
        )}
        {!navCollapsed && (
          <div class="studio-drawer studio-drawer--left" aria-label="Navigator">
            <RailChrome
              collapsed={false}
              label="Outline"
              icon="panelLeft"
              expandIcon="chevronRight"
              collapseIcon="chevronLeft"
              onToggle={() => updatePrefs({ navCollapsed: true })}
            />
            <div class="studio-rail__body">{navigator}</div>
          </div>
        )}

        <section class="studio-main">
          <div class="studio-main__content">{main}</div>
          {asideBottom && (
            <div
              class={
                p.propsCollapsed ? "prop-dock prop-dock--collapsed" : "prop-dock"
              }
              style={{ height: p.propsCollapsed ? undefined : `${propsH}px` }}
            >
              {!p.propsCollapsed && (
                <div
                  class="pane-resizer pane-resizer--north"
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label="Resize properties dock"
                  onPointerDown={startResize("props", propsH)}
                />
              )}
              <div class="prop-dock__body">{asideBottom}</div>
              <button
                type="button"
                class="prop-dock__toggle"
                title={p.propsCollapsed ? "Expand properties" : "Collapse properties"}
                aria-expanded={!p.propsCollapsed}
                onClick={() => updatePrefs({ propsCollapsed: !p.propsCollapsed })}
              >
                <Icon name={p.propsCollapsed ? "chevronUp" : "chevronDown"} size={12} />
              </button>
            </div>
          )}
        </section>

        {showInspector && !inspectorCollapsed && (
          <div class="studio-drawer studio-drawer--right" aria-label="Inspector">
            <RailChrome
              collapsed={false}
              label="Inspect"
              icon="sliders"
              expandIcon="chevronRight"
              collapseIcon="chevronRight"
              onToggle={() => updatePrefs({ inspectorCollapsed: true })}
            />
            <div class="studio-rail__body">{inspector}</div>
          </div>
        )}

        {navCollapsed && (
          <button
            type="button"
            class="drawer-tab drawer-tab--left"
            title="Open outline"
            aria-label="Open outline"
            onClick={() => updatePrefs({ navCollapsed: false })}
          >
            <Icon name="panelLeft" size={14} />
          </button>
        )}
        {showInspector && inspectorCollapsed && (
          <button
            type="button"
            class="drawer-tab drawer-tab--right"
            title="Open inspector"
            aria-label="Open inspector"
            onClick={() => updatePrefs({ inspectorCollapsed: false })}
          >
            <Icon name="sliders" size={14} />
          </button>
        )}
      </div>
    );
  }

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

      <section class="studio-main">
        <div class="studio-main__content">{main}</div>
        {asideBottom && (
          <div
            class={p.propsCollapsed ? "prop-dock prop-dock--collapsed" : "prop-dock"}
            style={{ height: p.propsCollapsed ? undefined : `${propsH}px` }}
          >
            {!p.propsCollapsed && (
              <div
                class="pane-resizer pane-resizer--north"
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize properties dock"
                onPointerDown={startResize("props", propsH)}
              />
            )}
            <div class="prop-dock__body">{asideBottom}</div>
            <button
              type="button"
              class="prop-dock__toggle"
              title={p.propsCollapsed ? "Expand properties" : "Collapse properties"}
              aria-expanded={!p.propsCollapsed}
              onClick={() => updatePrefs({ propsCollapsed: !p.propsCollapsed })}
            >
              <Icon name={p.propsCollapsed ? "chevronUp" : "chevronDown"} size={12} />
            </button>
          </div>
        )}
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
