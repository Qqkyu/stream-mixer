import { useEffect, useId, type FC } from "react";
import { useEmbedHostname } from "../../../../hooks/useEmbedHostname";
import type { Embed } from "../../EmbedTypes";
import { loadTwitchEmbedSdk } from "./loadTwitchEmbedSdk";

type Props = Pick<Embed, "type" | "channel">;

const TwitchEmbed: FC<Props> = ({ type, channel }) => {
  const embedId = useId();
  const hostname = useEmbedHostname();

  useEffect(() => {
    if (!hostname || type === "chat") return;

    let active = true;

    const playerOptions = {
      width: "100%",
      height: "100%",
      channel,
      parent: [hostname],
    };

    loadTwitchEmbedSdk()
      .then(() => {
        if (!active) return;

        if (type === "video") {
          const player = new Twitch.Player(embedId, playerOptions);
          player.setVolume(0.5);
        } else {
          new Twitch.Embed(embedId, playerOptions);
        }
      })
      .catch((error) => console.error(error));

    return () => {
      active = false;
    };
  }, [channel, embedId, hostname, type]);

  if (!hostname) {
    return <div className="h-full"></div>;
  }

  return type === "chat" ? (
    <iframe
      src={`https://www.twitch.tv/embed/${encodeURIComponent(channel)}/chat?parent=${encodeURIComponent(hostname)}`}
      height="100%"
      width="100%"
    />
  ) : (
    <div id={embedId} className="h-full"></div>
  );
};

export default TwitchEmbed;
