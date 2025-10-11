import type { FC } from "react";
import { useStore } from "@nanostores/react";
import { embeds } from "../../state/embedsStore";
import TwitchEmbed from "./twitch/TwitchEmbed";
import YoutubeEmbed from "./youtube/YoutubeEmbed";
import KickEmbed from "./kick/KickEmbed";

const EmbedGrid: FC = () => {
  const embedsStore = useStore(embeds);

  return (
    <>
      {embedsStore.twitch.map((twitchEmbed) => {
        return (
          <TwitchEmbed
            key={twitchEmbed.channel + twitchEmbed.type}
            channel={twitchEmbed.channel}
            type={twitchEmbed.type}
          />
        );
      })}
      {embedsStore.youtube.map((youtubeEmbed) => {
        return (
          <YoutubeEmbed
            key={youtubeEmbed.channel + youtubeEmbed.type}
            channel={youtubeEmbed.channel}
            type={youtubeEmbed.type}
          />
        );
      })}
      {embedsStore.kick.map((kickEmbed) => {
        return (
          <KickEmbed
            key={kickEmbed.channel + kickEmbed.type}
            channel={kickEmbed.channel}
            type={kickEmbed.type}
          />
        );
      })}
    </>
  );
};

export default EmbedGrid;
