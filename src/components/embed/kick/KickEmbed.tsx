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

  if (type === "video") {
    return (
      <iframe
        src={`https://player.kick.com/${channel}`}
        width={playerOptions.width}
        height={playerOptions.height}
        allowFullScreen
      ></iframe>
    );
  } else if (type === "chat") {
    return (
      <iframe
        src={`https://kick.com/${channel}/chatroom`}
        width="854"
        height="480"
      ></iframe>
    );
  } else {
    return (
      <div className="flex">
        <iframe
          src={`https://player.kick.com/${channel}`}
          width={playerOptions.width}
          height={playerOptions.height}
          allowFullScreen
        ></iframe>

        <iframe
          src={`https://kick.com/${channel}/chatroom`}
          width="854"
          height="480"
        ></iframe>
      </div>
    );
  }
};

export default KickEmbed;
