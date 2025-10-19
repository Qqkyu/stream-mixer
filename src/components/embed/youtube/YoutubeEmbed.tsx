import type { FC } from "react";
import type { EmbedType, EmbedChannel } from "../EmbedTypes";

type Props = {
  type: EmbedType;
  channel: EmbedChannel;
};

const YoutubeEmbed: FC<Props> = ({ type, channel }) => {
  const playerOptions = {
    width: "100%",
    height: "100%",
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
        width={playerOptions.width}
        height={playerOptions.height}
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
          width={playerOptions.width}
          height={playerOptions.height}
        ></iframe>
      </div>
    );
  }
};

export default YoutubeEmbed;
