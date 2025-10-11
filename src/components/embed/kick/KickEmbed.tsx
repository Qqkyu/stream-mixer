import type { FC } from "react";
import type { Embed } from "../EmbedTypes";

type Props = Pick<Embed, "type" | "channel">;

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
