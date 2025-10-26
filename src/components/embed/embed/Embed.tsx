import type { FC } from "react";
import type { Embed as EmbedType } from "../EmbedTypes";
import TwitchEmbed from "./twitch/TwitchEmbed";
import YoutubeEmbed from "./youtube/YoutubeEmbed";
import KickEmbed from "./kick/KickEmbed";

export const Embed: FC<EmbedType> = (embed) => {
  switch (embed.platform) {
    case "twitch":
      return <TwitchEmbed {...embed} />;
    case "youtube":
      return <YoutubeEmbed {...embed} />;
    case "kick":
      return <KickEmbed {...embed} />;
    default:
      const exhaustiveCheck: never = embed.platform;
      console.log(exhaustiveCheck);
  }
};
