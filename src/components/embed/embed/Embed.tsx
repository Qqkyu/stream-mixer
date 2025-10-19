import type { FC } from "react";
import type { Embed as EmbedType } from "../EmbedTypes";
import TwitchEmbed from "./twitch/TwitchEmbed";
import YoutubeEmbed from "./youtube/YoutubeEmbed";
import KickEmbed from "./kick/KickEmbed";

export const Embed: FC<EmbedType> = (embed) => {
  switch (embed.platform) {
    case "twitch":
      return <TwitchEmbed channel={embed.channel} type={embed.type} />;
    case "youtube":
      return <YoutubeEmbed channel={embed.channel} type={embed.type} />;
    case "kick":
      return <KickEmbed channel={embed.channel} />;
    default:
      const exhaustiveCheck: never = embed.platform;
      console.log(exhaustiveCheck);
  }
};
