import { atom } from "nanostores";

const COMPACT_MODE_KEY = "compact-mode";

export const compactMode = atom(false);

export function hydratePreferences(): void {
  compactMode.set(localStorage.getItem(COMPACT_MODE_KEY) === "true");
}

export function setCompactMode(compact: boolean): void {
  compactMode.set(compact);

  if (typeof window !== "undefined") {
    localStorage.setItem(COMPACT_MODE_KEY, String(compact));
  }
}
