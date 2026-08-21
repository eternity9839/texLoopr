import { useEffect, useLayoutEffect, useRef } from "preact/hooks";
import { Icon, type IconName } from "./icons";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: IconName;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  action: () => void;
}

export type ContextMenuEntry =
  | ContextMenuItem
  | { id: string; type: "sep" };

interface AppContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export function AppContextMenu({ x, y, items, onClose }: AppContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pad = 8;
    const rect = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - rect.width - pad);
    }
    if (top + rect.height > window.innerHeight - pad) {
      top = Math.max(pad, window.innerHeight - rect.height - pad);
    }
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [x, y, items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      class="app-ctx-menu"
      role="menu"
      style={{ left: `${x}px`, top: `${y}px` }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((entry) => {
        if ("type" in entry && entry.type === "sep") {
          return <hr key={entry.id} class="app-ctx-menu__sep" />;
        }
        const item = entry as ContextMenuItem;
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            class={
              item.danger
                ? "app-ctx-menu__item app-ctx-menu__item--danger"
                : "app-ctx-menu__item"
            }
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.action();
              onClose();
            }}
          >
            <span class="app-ctx-menu__label">
              {item.icon && <Icon name={item.icon} size={14} />}
              <span>{item.label}</span>
            </span>
            {item.shortcut && (
              <span class="app-ctx-menu__hint">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
