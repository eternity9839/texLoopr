export type TourStepId =
  | "welcome"
  | "toolbox"
  | "place"
  | "ribbon"
  | "inspector"
  | "comments"
  | "data"
  | "preview"
  | "done";

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
      title: "Bienvenue dans l’atelier d’édition",
      body: "Cette visite couvre la palette, le canevas, la barre contextuelle, l’inspecteur, les données et l’aperçu. Vous pouvez quitter à tout moment.",
    },
    toolbox: {
      title: "Palette d’outils — insérer des blocs",
      body: "La bande gauche insère Paragraphe, Texte, Liste, Tableau, etc. Les objets personnalisés s’ouvrent via l’icône cube. Utilisez Apparence (curseurs) pour afficher ou masquer le chrome.",
    },
    place: {
      title: "Canevas — placer, déplacer, redimensionner",
      body: "Cliquez un outil pour placer. Faites glisser pour déplacer ; utilisez les poignées pour redimensionner. Flèches pour décaler ; Maj + flèches = 10 px. Clic droit sur une surface vide pour le menu de création.",
    },
    ribbon: {
      title: "Barre de sélection — arrangez et révisez",
      body: "Quand un bloc est sélectionné, la fine barre au-dessus du canevas propose presse-papiers, groupe, alignement, empilement, verrouillage et commentaires.",
    },
    inspector: {
      title: "Inspecteur — calques, design, données",
      body: "Calques montre la hiérarchie. Design édite l’apparence et la géométrie. Données lie les {{champs}} et conditions. Méta contient les métadonnées du projet.",
    },
    comments: {
      title: "Commentaires — revue façon Word",
      body: "Sélectionnez un bloc, ajoutez un commentaire depuis la barre de sélection, et laissez une note. Les marqueurs apparaissent sur la surface ; résolvez-les une fois terminé.",
    },
    data: {
      title: "Données — lignes pour le remplissage en masse",
      body: "Collez du CSV ou du JSON ici. Chaque ligne peut piloter un document rendu. L’aperçu choisit quelle ligne résoudre.",
    },
    preview: {
      title: "Aperçu — résoudre contre une sortie",
      body: "Basculez l’aperçu pour résoudre les champs de fusion. Choisissez une ligne, une pastille de langue (ou Depuis la ligne) et un type de sortie — Welcome SMS FR vs PDF EN utilise des conditions différentes.",
    },
    done: {
      title: "Vous êtes prêt",
      body: "Ouvrez Exemples pour des modèles complets, ou partez d’une surface vide. Relancez cette visite à tout moment via ··· → Visite guidée.",
    },
  },
  en: {
    welcome: {
      title: "Welcome to the edition studio",
      body: "This short tour covers the insert palette, canvas, contextual bar, inspector tabs, data, and preview. Skip anytime.",
    },
    toolbox: {
      title: "Tool palette — insert blocks",
      body: "The left strip inserts Paragraph, Text, List, Table, and more. Custom objects open from the cube icon. Use Appearance (sliders) to show or hide chrome.",
    },
    place: {
      title: "Canvas — place, move, resize",
      body: "Click a tool to insert. Drag to move; use corner handles to resize. Arrow keys nudge; Shift + arrows move by 10px. Right-click an empty surface for the create menu.",
    },
    ribbon: {
      title: "Selection bar — arrange & review",
      body: "When a block is selected, the thin bar above the canvas offers clipboard, group, align, stacking, lock, and comments.",
    },
    inspector: {
      title: "Inspector — layers, design, data",
      body: "Layers shows hierarchy. Design edits appearance and geometry. Data binds {{fields}} and conditions. Meta holds project metadata.",
    },
    comments: {
      title: "Comments — review like Word",
      body: "Select a block, add a comment from the selection bar, and leave a note. Markers appear on the surface; resolve them when done.",
    },
    data: {
      title: "Data — rows for bulk fill",
      body: "Paste CSV or JSON here. Each row can drive a rendered document. Preview picks which row to resolve.",
    },
    preview: {
      title: "Preview — resolve against output",
      body: "Toggle Preview to resolve merge fields on the same canvas. Pick a data row, a language chip (or From row), and an output kind — Welcome SMS FR vs PDF EN uses different conditions.",
    },
    done: {
      title: "You're ready",
      body: "Open Samples for full templates, or start from a blank surface. Restart this tour anytime from ··· → Edition tour.",
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
    id: "toolbox",
    target: '[data-tour="toolbox"]',
    view: "edit",
  },
  {
    id: "place",
    target: '[data-tour="canvas"]',
    view: "edit",
  },
  {
    id: "ribbon",
    target: '[data-tour="ribbon"]',
    view: "edit",
  },
  {
    id: "inspector",
    target: '[data-tour="inspector"]',
    view: "edit",
  },
  {
    id: "comments",
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
  {
    id: "done",
    target: null,
    view: "edit",
    preview: false,
    overlay: null,
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
