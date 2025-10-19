import type { FC } from "react";
import type { Embed } from "../../EmbedTypes";

type Props = Pick<Embed, "channel">;

const KickEmbed: FC<Props> = ({ channel }) => {
  const playerOptions = {
    width: "100%",
    height: "100%",
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
