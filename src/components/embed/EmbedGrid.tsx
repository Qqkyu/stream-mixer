import type { FC } from "react";
import { useStore } from "@nanostores/react";
import { embeds } from "../../state/embedsStore";
import TwitchEmbed from "./twitch/TwitchEmbed";
import YoutubeEmbed from "./youtube/YoutubeEmbed";

const EmbedGrid: FC = () => {
  const embedsStore = useStore(embeds);

  return (
    <>
      {embedsStore.twitch.map((twitchEmbed) => {
        return (
          <TwitchEmbed channel={twitchEmbed.channel} type={twitchEmbed.type} />
        );
      })}
      {embedsStore.youtube.map((youtubeEmbed) => {
        return (
          <YoutubeEmbed
            channel={youtubeEmbed.channel}
            type={youtubeEmbed.type}
          />
        );
      })}
    </>
  );
};

export default EmbedGrid;
