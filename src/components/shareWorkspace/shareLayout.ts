import type { Embed } from "../embedGrid/EmbedTypes";
import { isValidEmbedChannel } from "../embedGrid/embedIdentifiers";

const SHARE_LAYOUT_VERSION = 1;
const SHARE_LAYOUT_KEY = "layout";
const MAX_SHARED_STREAMS = 20;
const MAX_ENCODED_LAYOUT_LENGTH = 20_000;
const GRID_COLUMN_COUNT = 12;
const MAX_GRID_ROW = 10_000;
const MAX_GRID_HEIGHT = 1_000;

type SharedStream = Pick<Embed, "platform" | "channel" | "type" | "position">;

type SharedLayout = {
  v: typeof SHARE_LAYOUT_VERSION;
  streams: Array<SharedStream>;
};

export type SharedLayoutResult =
  | { status: "absent" }
  | { status: "invalid" }
  | { status: "valid"; streams: Array<SharedStream> };

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Invalid base64url value");
  }

  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const paddedBase64 = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = atob(paddedBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
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

function parseSharedStream(value: unknown): SharedStream | null {
  if (!isRecord(value) || !isRecord(value.position)) return null;

  const { platform, channel, type, position } = value;
  if (platform !== "twitch" && platform !== "youtube" && platform !== "kick") {
    return null;
  }

  if (type !== "everything" && type !== "video" && type !== "chat") {
    return null;
  }

  if (!isValidEmbedChannel(platform, channel)) {
    return null;
  }

  const { x, y, w, h } = position;
  if (
    !isIntegerInRange(x, 0, GRID_COLUMN_COUNT - 1) ||
    !isIntegerInRange(y, 0, MAX_GRID_ROW) ||
    !isIntegerInRange(w, 1, GRID_COLUMN_COUNT) ||
    !isIntegerInRange(h, 1, MAX_GRID_HEIGHT) ||
    x + w > GRID_COLUMN_COUNT
  ) {
    return null;
  }

  return {
    platform,
    channel,
    type,
    position: { x, y, w, h },
  };
}

export function createShareUrl(
  currentUrl: string,
  embeds: Array<Embed>,
): string {
  if (embeds.length === 0 || embeds.length > MAX_SHARED_STREAMS) {
    throw new Error("Workspace cannot be shared");
  }

  const streams = embeds.map(({ platform, channel, type, position }) =>
    parseSharedStream({ platform, channel, type, position }),
  );
  if (streams.some((stream) => stream == null)) {
    throw new Error("Workspace contains invalid stream data");
  }

  const layout: SharedLayout = {
    v: SHARE_LAYOUT_VERSION,
    streams: streams as Array<SharedStream>,
  };
  const encodedLayout = encodeBase64Url(JSON.stringify(layout));
  if (encodedLayout.length > MAX_ENCODED_LAYOUT_LENGTH) {
    throw new Error("Workspace is too large to share");
  }

  const shareUrl = new URL(currentUrl);
  shareUrl.hash = new URLSearchParams({
    [SHARE_LAYOUT_KEY]: encodedLayout,
  }).toString();

  return shareUrl.toString();
}

export function parseSharedLayoutHash(hash: string): SharedLayoutResult {
  const encodedLayout = new URLSearchParams(hash.replace(/^#/, "")).get(
    SHARE_LAYOUT_KEY,
  );
  if (encodedLayout == null) return { status: "absent" };

  if (
    encodedLayout.length === 0 ||
    encodedLayout.length > MAX_ENCODED_LAYOUT_LENGTH
  ) {
    return { status: "invalid" };
  }

  try {
    const parsed: unknown = JSON.parse(decodeBase64Url(encodedLayout));
    if (
      !isRecord(parsed) ||
      parsed.v !== SHARE_LAYOUT_VERSION ||
      !Array.isArray(parsed.streams) ||
      parsed.streams.length === 0 ||
      parsed.streams.length > MAX_SHARED_STREAMS
    ) {
      return { status: "invalid" };
    }

    const streams = parsed.streams.map(parseSharedStream);
    if (streams.some((stream) => stream == null)) {
      return { status: "invalid" };
    }

    return {
      status: "valid",
      streams: streams as Array<SharedStream>,
    };
  } catch {
    return { status: "invalid" };
  }
}

export function createEmbedsFromSharedStreams(
  streams: Array<SharedStream>,
): Array<Embed> {
  return streams.map((stream) => ({
    ...stream,
    id: crypto.randomUUID(),
    minimized: false,
  }));
}

export function removeSharedLayoutHash(): void {
  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState(null, "", url);
}
