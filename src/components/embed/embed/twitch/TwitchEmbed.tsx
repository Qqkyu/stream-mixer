import { useEffect, type FC } from "react";
import type { Embed } from "../../EmbedTypes";

type Props = Pick<Embed, "type" | "channel">;

const TwitchEmbed: FC<Props> = ({ type, channel }) => {
  const playerOptions = {
    width: "100%",
    height: "100%",
    channel,
    parent: ["localhost", "streammix.app"],
  };

  useEffect(() => {
    switch (type) {
      case "video":
        const player = new Twitch.Player("twitch-embed", playerOptions);
        player.setVolume(0.5);
        break;
      case "everything":
        new Twitch.Embed("twitch-embed", playerOptions);
        break;
      default:
        console.log("Unknown twitch embed type: ", type);
    }
  }, [type]);

  return type === "chat" ? (
    <iframe
      src={`https://www.twitch.tv/embed/${playerOptions.channel}/chat?parent=localhost`}
      height={playerOptions.height}
      width={playerOptions.width}
    />
  ) : (
    <div id="twitch-embed" className="h-full"></div>
  );
};

export default TwitchEmbed;
