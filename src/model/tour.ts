export type TourStepId =
  | "welcome"
  | "edit"
  | "inspector"
  | "data"
  | "preview";

export interface TourStep {
  id: TourStepId;
  title: string;
  body: string;
  /** CSS selector for spotlight; null = centered card */
  target: string | null;
  /** Studio view to open before showing */
  view?: "edit" | "data";
  preview?: boolean;
  overlay?: null;
}

export const TOUR_STORAGE_KEY = "texlooper.tour.done.v1";

type Locale = "en" | "fr";

type TourCopy = Record<TourStepId, { title: string; body: string }>;

const COPY: Record<Locale, TourCopy> = {
  fr: {
    welcome: {
      title: "Bienvenue dans l’atelier",
      body: "Cinq étapes rapides : insérer, inspecter, données et aperçu. Quittez à tout moment.",
    },
    edit: {
      title: "Insérer et arrangez",
      body: "La bande gauche place des blocs. Glissez pour déplacer, poignées pour redimensionner. La barre au-dessus du canevas aligne, groupe et commente.",
    },
    inspector: {
      title: "Inspecteur",
      body: "Calques, Design et Données pour l’apparence et les {{champs}}. Les commentaires se gèrent aussi depuis la barre de sélection.",
    },
    data: {
      title: "Données",
      body: "Collez du CSV ou JSON : chaque ligne peut remplir un document. L’aperçu choisit la ligne à résoudre.",
    },
    preview: {
      title: "Aperçu — et c’est tout",
      body: "Basculez l’aperçu pour résoudre les fusions. Relancez la visite via ··· → Visite guidée.",
    },
  },
  en: {
    welcome: {
      title: "Welcome to the studio",
      body: "Five short steps: insert, inspect, data, and preview. Skip anytime.",
    },
    edit: {
      title: "Insert and arrange",
      body: "The left strip places blocks. Drag to move; use handles to resize. The bar above the canvas aligns, groups, and comments.",
    },
    inspector: {
      title: "Inspector",
      body: "Layers, Design, and Data control appearance and {{fields}}. Comments also live on the selection bar.",
    },
    data: {
      title: "Data",
      body: "Paste CSV or JSON — each row can fill a document. Preview picks which row to resolve.",
    },
    preview: {
      title: "Preview — you're set",
      body: "Toggle Preview to resolve merge fields. Restart this tour anytime from ··· → Edition tour.",
    },
  },
};

const STRUCTURE: Omit<TourStep, "title" | "body">[] = [
  {
    id: "welcome",
    target: null,
    view: "edit",
    preview: false,
  },
  {
    id: "edit",
    target: '[data-tour="toolbox"]',
    view: "edit",
  },
  {
    id: "inspector",
    target: '[data-tour="inspector"]',
    view: "edit",
  },
  {
    id: "data",
    target: '[data-tour="data-studio"]',
    view: "data",
  },
  {
    id: "preview",
    target: '[data-tour="preview-toggle"]',
    view: "edit",
    preview: true,
  },
];

/** Localized tour steps (defaults to French). */
export function getTourSteps(locale: Locale = "fr"): TourStep[] {
  const copy = COPY[locale] ?? COPY.fr;
  return STRUCTURE.map((step) => ({
    ...step,
    title: copy[step.id].title,
    body: copy[step.id].body,
  }));
}

/** @deprecated Prefer getTourSteps(locale) — kept for tests / length checks. */
export const TOUR_STEPS: TourStep[] = getTourSteps("fr");

export function isTourCompleted(): boolean {
  try {
    if (typeof window !== "undefined" && window.__TEXLOOPER__?.ephemeral) {
      return false;
    }
    return (
      localStorage.getItem(TOUR_STORAGE_KEY) === "1" ||
      localStorage.getItem("texloopr.tour.done.v1") === "1"
    );
  } catch {
    return false;
  }
}

export function markTourCompleted(): void {
  try {
    if (typeof window !== "undefined" && window.__TEXLOOPER__?.ephemeral) return;
    localStorage.setItem(TOUR_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}
