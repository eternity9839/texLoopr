import type { ComponentChildren } from "preact";
import { ContextBar } from "./ContextBar";
import { prefs } from "../state/store";

interface AppShellProps {
  children: ComponentChildren;
}

export function AppShell({ children }: AppShellProps) {
  const p = prefs.value;
  return (
    <div
      class="app-shell"
      data-density={p.density}
      data-theme={p.theme ?? "stone"}
    >
      <ContextBar />
      {children}
    </div>
  );
}
