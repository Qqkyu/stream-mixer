import { map } from "nanostores";
import type { Embed } from "../components/embed/EmbedTypes";

type Embeds = Record<
  Embed["platform"],
  Array<{ channel: string; type: Embed["type"] }>
>;

export const embeds = map<Embeds>({
  twitch: [],
  youtube: [],
  kick: [],
});

export function addEmbed({ platform, type, channel }: Embed) {
  const existingPlatformEmbeds = embeds.get()[platform];
  embeds.setKey(
    platform,
    existingPlatformEmbeds.toSpliced(existingPlatformEmbeds.length, 0, {
      type,
      channel,
    }),
  );
}
