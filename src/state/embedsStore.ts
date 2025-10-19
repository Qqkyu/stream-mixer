import { map } from "nanostores";
import type {
  EmbedPlatform,
  EmbedType,
  EmbedChannel,
} from "../components/embed/EmbedTypes";

type Embed = { channel: EmbedChannel; type: EmbedType };

type Embeds = Record<EmbedPlatform, Array<Embed>>;

export const embeds = map<Embeds>({
  twitch: getLocalStorageEmbeds("twitch"),
  youtube: getLocalStorageEmbeds("youtube"),
  kick: getLocalStorageEmbeds("kick"),
});

export function addEmbed({
  platform,
  type,
  channel,
}: {
  platform: EmbedPlatform;
  type: EmbedType;
  channel: EmbedChannel;
}) {
  const existingPlatformEmbeds = embeds.get()[platform];
  embeds.setKey(
    platform,
    existingPlatformEmbeds.toSpliced(existingPlatformEmbeds.length, 0, {
      type,
      channel,
    }),
  );
  setLocalStorageEmbeds({ platform, type, channel });
}

function getLocalStorageEmbedsKey(
  platform: EmbedPlatform,
): `${EmbedPlatform}-stream-embeds` {
  return `${platform}-stream-embeds`;
}

function getLocalStorageEmbeds(
  platform: EmbedPlatform,
): Array<{ channel: string; type: Embed["type"] }> {
  if (typeof window == "undefined") {
    return [];
  }

  const localStorageEmbeds = localStorage.getItem(
    getLocalStorageEmbedsKey(platform),
  );

  if (localStorageEmbeds == null) {
    return [];
  }

  const parsedStorageEmbeds = JSON.parse(localStorageEmbeds);

  return Array.isArray(parsedStorageEmbeds) ? parsedStorageEmbeds : [];
}

function setLocalStorageEmbeds({
  platform,
  type,
  channel,
}: {
  platform: EmbedPlatform;
  type: EmbedType;
  channel: EmbedChannel;
}): void {
  if (typeof window === "undefined") {
    return;
  }

  const localStorageEmbeds = getLocalStorageEmbeds(platform);

  localStorageEmbeds.push({ type, channel });

  localStorage.setItem(
    getLocalStorageEmbedsKey(platform),
    JSON.stringify(localStorageEmbeds),
  );
}
