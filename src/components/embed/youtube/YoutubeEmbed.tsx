import type { FC } from "react";
import type { Embed } from "../EmbedTypes";

type Props = Pick<Embed, "type" | "channel">;

const YoutubeEmbed: FC<Props> = ({ type, channel }) => {
  const playerOptions = {
    width: 854,
    height: 480,
    channel,
    parent: ["localhost"],
  };

  if (type === "video") {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${channel}`}
        width={playerOptions.width}
        height={playerOptions.height}
      ></iframe>
    );
  } else if (type === "chat") {
    return (
      <iframe
        src={`https://www.youtube.com/live_chat?v=${channel}&embed_domain=localhost`}
        width="854"
        height="480"
      ></iframe>
    );
  } else {
    return (
      <div className="flex">
        <iframe
          src={`https://www.youtube.com/embed/${channel}`}
          width={playerOptions.width}
          height={playerOptions.height}
        ></iframe>

        <iframe
          src={`https://www.youtube.com/live_chat?v=${channel}&embed_domain=localhost`}
          width="854"
          height="480"
        ></iframe>
      </div>
    );
  }
};

export default YoutubeEmbed;
