import type { FC } from "react";
import type { Embed } from "./EmbedTypes";

type Props = Pick<Embed, "type" | "channel" | "platform">;

const EmbedHeader: FC<Props> = ({ type, channel, platform }) => {
  return (
    <p
      className="grid-stack-item-drag-handle text-center bg-base-300 text-primary-content"
      style={{
        cursor: "move",
      }}
    >
      {platform === "twitch" && `twitch.tv/${channel} (${type})`}
      {platform === "youtube" && `youtube.com/watch?v=${channel} (${type})`}
      {platform === "kick" && `kick.com/${channel} (${type})`}
    </p>
  );
};

export default EmbedHeader;
