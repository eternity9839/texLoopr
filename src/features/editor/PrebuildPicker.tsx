import { PREBUILD_RECIPES } from "../../model/prebuild/library";
import {
  closePrebuildPicker,
  insertPrebuildRecipe,
  insertPlacement,
  prebuildPickerOpen,
  setInsertPlacement,
  type InsertPlacement,
} from "../../state/store";

const PLACEMENTS: { value: InsertPlacement; label: string }[] = [
  { value: "cascade", label: "Cascade" },
  { value: "center", label: "Center" },
  { value: "margins", label: "At margins" },
];

/** Floating chooser listing every saved prebuild recipe */
export function PrebuildPicker() {
  if (!prebuildPickerOpen.value) return null;
  return (
    <>
      <div
        class="prebuild-picker__scrim"
        aria-hidden="true"
        onClick={closePrebuildPicker}
      />
      <div
        class="prebuild-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Insert prebuild"
      >
        <div class="prebuild-picker__head">
          <strong>Prebuilds</strong>
          <button
            type="button"
            class="prebuild-picker__close"
            aria-label="Close prebuild picker"
            onClick={closePrebuildPicker}
          >
            ✕
          </button>
        </div>
        <p class="prebuild-picker__hint muted">
          Saved block recipes expand onto the page.
        </p>
        <ul class="prebuild-picker__list">
          {PREBUILD_RECIPES.map((recipe) => (
            <li key={recipe.id}>
              <button
                type="button"
                class="prebuild-picker__item"
                title={`${recipe.label} — ${recipe.blurb}`}
                onClick={() => insertPrebuildRecipe(recipe.id)}
              >
                <span class="prebuild-picker__name">{recipe.label}</span>
                <span class="prebuild-picker__blurb">{recipe.blurb}</span>
                <span class="prebuild-picker__size">
                  {recipe.w}×{recipe.h}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <label class="prebuild-picker__place">
          <span>Place</span>
          <select
            value={insertPlacement.value}
            onChange={(e) =>
              setInsertPlacement(e.currentTarget.value as InsertPlacement)
            }
          >
            {PLACEMENTS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}
