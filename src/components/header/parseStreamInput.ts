import type { Embed } from "../embedGrid/EmbedTypes";

export type ParsedStreamInput = Pick<Embed, "platform" | "channel">;

const SUPPORTED_HOST_PATTERN =
  /^(?:(?:(?:www|m)\.)?(?:twitch\.tv|youtube\.com|youtu\.be|kick\.com)|player\.(?:twitch\.tv|kick\.com))(?:\/|\?|$)/i;

function cleanIdentifier(identifier: string | null | undefined): string | null {
  if (!identifier) return null;

  let decodedIdentifier: string;
  try {
    decodedIdentifier = decodeURIComponent(identifier);
  } catch {
    return null;
  }

  const cleaned = decodedIdentifier.trim().replace(/^@/, "");
  return cleaned || null;
}

function parseUrl(input: string): URL | null {
  const candidate = SUPPORTED_HOST_PATTERN.test(input)
    ? `https://${input}`
    : input;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function parseTwitchUrl(url: URL): ParsedStreamInput | null {
  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

  if (hostname === "player.twitch.tv") {
    const channel = cleanIdentifier(url.searchParams.get("channel"));
    return channel ? { platform: "twitch", channel } : null;
  }

  if (hostname !== "twitch.tv" && hostname !== "m.twitch.tv") return null;

  const channel = cleanIdentifier(url.pathname.split("/").filter(Boolean)[0]);
  const reservedPaths = new Set([
    "directory",
    "downloads",
    "inventory",
    "search",
    "settings",
    "subscriptions",
    "turbo",
    "videos",
    "wallet",
  ]);

  return channel && !reservedPaths.has(channel.toLowerCase())
    ? { platform: "twitch", channel }
    : null;
}

function parseYoutubeUrl(url: URL): ParsedStreamInput | null {
  const hostname = url.hostname.replace(/^(?:www|m)\./, "").toLowerCase();
  const pathParts = url.pathname.split("/").filter(Boolean);
  let channel: string | null = null;

  if (hostname === "youtu.be") {
    channel = cleanIdentifier(pathParts[0]);
  } else if (hostname === "youtube.com") {
    if (url.pathname === "/watch") {
      channel = cleanIdentifier(url.searchParams.get("v"));
    } else if (["embed", "live", "shorts"].includes(pathParts[0])) {
      channel = cleanIdentifier(pathParts[1]);
    }
  }

  return channel ? { platform: "youtube", channel } : null;
}

function parseKickUrl(url: URL): ParsedStreamInput | null {
  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  if (hostname !== "kick.com" && hostname !== "player.kick.com") return null;

  const pathParts = url.pathname.split("/").filter(Boolean);
  const channel = cleanIdentifier(
    pathParts[0] === "popout" ? pathParts[1] : pathParts[0],
  );
  const reservedPaths = new Set([
    "categories",
    "dashboard",
    "following",
    "popout",
    "search",
  ]);

  return channel && !reservedPaths.has(channel.toLowerCase())
    ? { platform: "kick", channel }
    : null;
}

export function parseStreamInput(
  input: string,
  selectedPlatform: Embed["platform"],
): ParsedStreamInput | null {
  const value = input.trim();
  if (!value) return null;

  const url = parseUrl(value);
  if (url) {
    return parseTwitchUrl(url) ?? parseYoutubeUrl(url) ?? parseKickUrl(url);
  }

  if (
    value.includes("://") ||
    value.startsWith("www.") ||
    SUPPORTED_HOST_PATTERN.test(value)
  ) {
    return null;
  }

  const channel = cleanIdentifier(value);
  return channel ? { platform: selectedPlatform, channel } : null;
}
