import type { FC } from "react";
import { useEmbedHostname } from "../../../../hooks/useEmbedHostname";
import type { Embed } from "../../EmbedTypes";

type Props = Pick<Embed, "type" | "channel">;

const YoutubeEmbed: FC<Props> = ({ type, channel }) => {
  const hostname = useEmbedHostname();

  if (type === "video") {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${channel}`}
        width="100%"
        height="100%"
      ></iframe>
    );
  } else if (type === "chat") {
    if (!hostname) return <div className="h-full"></div>;

    return (
      <iframe
        src={`https://www.youtube.com/live_chat?v=${channel}&embed_domain=${encodeURIComponent(hostname)}`}
        width="100%"
        height="100%"
      ></iframe>
    );
  } else {
    return (
      <div className="flex h-full w-full">
        <iframe
          src={`https://www.youtube.com/embed/${channel}`}
          width="100%"
          height="100%"
        ></iframe>

        {hostname && (
          <iframe
            src={`https://www.youtube.com/live_chat?v=${channel}&embed_domain=${encodeURIComponent(hostname)}`}
            width="100%"
            height="100%"
          ></iframe>
        )}
      </div>
    );
  }
};

export default YoutubeEmbed;
