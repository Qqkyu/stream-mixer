import { useEffect, useId, type FC } from "react";
import { useEmbedHostname } from "../../../../hooks/useEmbedHostname";
import type { Embed } from "../../EmbedTypes";

type Props = Pick<Embed, "type" | "channel">;

const TwitchEmbed: FC<Props> = ({ type, channel }) => {
  const embedId = useId();
  const hostname = useEmbedHostname();

  useEffect(() => {
    if (!hostname) return;

    const playerOptions = {
      width: "100%",
      height: "100%",
      channel,
      parent: [hostname],
    };

    switch (type) {
      case "video":
        const player = new Twitch.Player(embedId, playerOptions);
        player.setVolume(0.5);
        break;
      case "everything":
        new Twitch.Embed(embedId, playerOptions);
        break;
      default:
        console.log("Unknown twitch embed type: ", type);
    }
  }, [channel, embedId, hostname, type]);

  if (!hostname) {
    return <div className="h-full"></div>;
  }

  return type === "chat" ? (
    <iframe
      src={`https://www.twitch.tv/embed/${channel}/chat?parent=${encodeURIComponent(hostname)}`}
      height="100%"
      width="100%"
    />
  ) : (
    <div id={embedId} className="h-full"></div>
  );
};

export default TwitchEmbed;
