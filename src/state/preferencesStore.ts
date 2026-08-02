import { atom } from "nanostores";
import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from "./browserStorage";

const COMPACT_MODE_KEY = "compact-mode";

export const compactMode = atom(false);

export function hydratePreferences(): void {
  const storedCompactMode = getStorageItem(COMPACT_MODE_KEY);
  if (storedCompactMode === "true" || storedCompactMode === "false") {
    compactMode.set(storedCompactMode === "true");
    return;
  }

  compactMode.set(false);
  if (storedCompactMode != null) removeStorageItem(COMPACT_MODE_KEY);
}

export function setCompactMode(compact: boolean): void {
  compactMode.set(compact);
  setStorageItem(COMPACT_MODE_KEY, String(compact));
}
