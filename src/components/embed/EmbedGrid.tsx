import { useEffect, type FC } from "react";
import { useStore } from "@nanostores/react";
import { embeds } from "../../state/embedsStore";
import TwitchEmbed from "./twitch/TwitchEmbed";

const EmbedGrid: FC = () => {
  const embedsStore = useStore(embeds);

  useEffect(() => {
    console.log({ embedsStore });
  }, [embedsStore]);

  return (
    <>
      {embedsStore.twitch.map((twitchEmbed) => {
        return (
          <TwitchEmbed channel={twitchEmbed.channel} type={twitchEmbed.type} />
        );
      })}
    </>
  );
};

export default EmbedGrid;
