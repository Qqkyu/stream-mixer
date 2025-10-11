import { useEffect, type FC } from "react";
import type { Embed } from "../EmbedTypes";

type Props = Pick<Embed, "type" | "channel">;

const TwitchEmbed: FC<Props> = ({ type }) => {
  const playerOptions = {
    width: 854,
    height: 480,
    channel: "gorgc",
    parent: ["localhost"],
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

  return (
    <>
      <div id="twitch-embed"></div>
      {type === "chat" && (
        <iframe
          src={`https://www.twitch.tv/embed/${playerOptions.channel}/chat?parent=localhost`}
          height="854"
          width="480"
        />
      )}
    </>
  );
};

export default TwitchEmbed;
