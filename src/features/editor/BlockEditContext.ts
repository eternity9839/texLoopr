import { createContext } from "preact";

/** Frame-level edit mode — double-click / second-click drives text & chip editors. */
export const BlockEditContext = createContext<{
  editing: boolean;
  requestEdit: () => void;
  endEdit: () => void;
} | null>(null);
