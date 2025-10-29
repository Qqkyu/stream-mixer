import type { FC } from "react";
import type { Embed } from "../../EmbedTypes";

type Props = Pick<Embed, "type" | "channel">;

const KickEmbed: FC<Props> = ({ type, channel }) => {
  const playerOptions = {
    width: "100%",
    height: "100%",
    channel,
    parent: ["localhost", "streammix.app"],
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
        src={`https://kick.com/popout/${channel}/chat`}
        width={playerOptions.width}
        height={playerOptions.height}
        allowFullScreen
      ></iframe>
    );
  } else {
    return (
      <div className="flex h-full w-full">
        <iframe
          src={`https://player.kick.com/${channel}`}
          width={playerOptions.width}
          height={playerOptions.height}
          allowFullScreen
        ></iframe>

        <iframe
          src={`https://kick.com/popout/${channel}/chat`}
          width={playerOptions.width}
          height={playerOptions.height}
          allowFullScreen
        ></iframe>
      </div>
    );
  }
};

export default KickEmbed;
