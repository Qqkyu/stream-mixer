import { atom } from "nanostores";

const COMPACT_EMBED_HEADERS_KEY = "compact-embed-headers";

export const compactEmbedHeaders = atom(false);

export function hydratePreferences(): void {
  compactEmbedHeaders.set(
    localStorage.getItem(COMPACT_EMBED_HEADERS_KEY) === "true",
  );
}

export function setCompactEmbedHeaders(compact: boolean): void {
  compactEmbedHeaders.set(compact);

  if (typeof window !== "undefined") {
    localStorage.setItem(COMPACT_EMBED_HEADERS_KEY, String(compact));
  }
}
