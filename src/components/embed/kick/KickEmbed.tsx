import type { FC } from "react";
import type { EmbedType, EmbedChannel } from "../EmbedTypes";

type Props = {
  type: EmbedType;
  channel: EmbedChannel;
};

const KickEmbed: FC<Props> = ({ type, channel }) => {
  const playerOptions = {
    width: 854,
    height: 480,
    channel,
    parent: ["localhost"],
  };

  return (
    <iframe
      src={`https://player.kick.com/${channel}`}
      width={playerOptions.width}
      height={playerOptions.height}
      allowFullScreen
    ></iframe>
  );
};

export default KickEmbed;
