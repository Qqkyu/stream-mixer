import { atom } from "nanostores";
import type { Embed } from "../components/embedGrid/EmbedTypes";
import { DEFAULT_POSITION } from "../components/embedGrid/embed/position";
import { isValidEmbedChannel } from "../components/embedGrid/embedIdentifiers";
import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from "./browserStorage";

const EMBEDS_STORAGE_KEY = "stream-embeds";
const MAX_STORED_EMBEDS = 100;
const MAX_STORAGE_LENGTH = 1_000_000;
const MAX_ID_LENGTH = 128;
const GRID_COLUMN_COUNT = 12;
const MAX_GRID_ROW = 10_000;
const MAX_GRID_HEIGHT = 1_000;

export const embeds = atom<Array<Embed>>([]);
export const workspaceHydrated = atom(false);

export function addEmbed(embed: Embed) {
  embeds.set(embeds.get().toSpliced(embeds.get().length, 0, embed));
  setLocalStorageEmbeds();
}

export function setEmbeds(newEmbeds: Array<Embed>) {
  embeds.set(newEmbeds);
  setLocalStorageEmbeds();
}

export function hydrateEmbeds(): void {
  if (typeof window === "undefined") return;

  embeds.set(getLocalStorageEmbeds());
}

function getLocalStorageEmbeds(): Array<Embed> {
  const localStorageEmbeds = getStorageItem(EMBEDS_STORAGE_KEY);

  if (localStorageEmbeds == null) {
    return [];
  }

  if (localStorageEmbeds.length > MAX_STORAGE_LENGTH) {
    removeStorageItem(EMBEDS_STORAGE_KEY);
    return [];
  }

  let parsedStorageEmbeds: unknown;
  try {
    parsedStorageEmbeds = JSON.parse(localStorageEmbeds);
  } catch {
    removeStorageItem(EMBEDS_STORAGE_KEY);
    return [];
  }

  if (!Array.isArray(parsedStorageEmbeds)) {
    removeStorageItem(EMBEDS_STORAGE_KEY);
    return [];
  }

  const usedIds = new Set<string>();
  const storedEmbeds = parsedStorageEmbeds
    .slice(0, MAX_STORED_EMBEDS)
    .flatMap((value) => {
      const embed = parseStoredEmbed(value, usedIds);
      return embed ? [embed] : [];
    });

  storeEmbeds(storedEmbeds);

  return storedEmbeds;
}

function setLocalStorageEmbeds(): void {
  storeEmbeds(embeds.get());
}

function storeEmbeds(storedEmbeds: Array<Embed>): void {
  try {
    setStorageItem(EMBEDS_STORAGE_KEY, JSON.stringify(storedEmbeds));
  } catch {
    // JSON serialization should not break the in-memory workspace.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function parsePosition(value: unknown): Embed["position"] {
  if (!isRecord(value)) return { ...DEFAULT_POSITION };

  const { x, y, w, h } = value;
  if (
    !isIntegerInRange(x, 0, GRID_COLUMN_COUNT - 1) ||
    !isIntegerInRange(y, 0, MAX_GRID_ROW) ||
    !isIntegerInRange(w, 1, GRID_COLUMN_COUNT) ||
    !isIntegerInRange(h, 1, MAX_GRID_HEIGHT) ||
    x + w > GRID_COLUMN_COUNT
  ) {
    return { ...DEFAULT_POSITION };
  }

  return { x, y, w, h };
}

function createUniqueId(value: unknown, usedIds: Set<string>): string {
  const storedId =
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_ID_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(value)
      ? value
      : null;

  if (storedId && !usedIds.has(storedId)) {
    usedIds.add(storedId);
    return storedId;
  }

  let generatedId = crypto.randomUUID();
  while (usedIds.has(generatedId)) generatedId = crypto.randomUUID();
  usedIds.add(generatedId);
  return generatedId;
}

function parseStoredEmbed(value: unknown, usedIds: Set<string>): Embed | null {
  if (!isRecord(value)) return null;

  const { platform, channel, type, position, minimized, id } = value;
  if (platform !== "twitch" && platform !== "youtube" && platform !== "kick") {
    return null;
  }

  if (type !== "everything" && type !== "video" && type !== "chat") {
    return null;
  }

  if (typeof channel !== "string") return null;

  const normalizedChannel = channel.trim();
  if (!isValidEmbedChannel(platform, normalizedChannel)) return null;

  return {
    id: createUniqueId(id, usedIds),
    platform,
    channel: normalizedChannel,
    type,
    position: parsePosition(position),
    minimized: minimized === true,
  };
}
