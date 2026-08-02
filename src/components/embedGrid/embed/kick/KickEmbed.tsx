import { useCallback, useRef, type FC } from "react";
import type { Embed } from "../../EmbedTypes";

type Props = Pick<Embed, "type" | "channel"> & { onReady: () => void };

const KickEmbed: FC<Props> = ({ type, channel, onReady }) => {
  const readiness = useRef({ key: "", video: false, chat: false });
  const readinessKey = `${type}:${channel}`;

  if (readiness.current.key !== readinessKey) {
    readiness.current = { key: readinessKey, video: false, chat: false };
  }

  const markPartReady = useCallback(
    (part: "video" | "chat") => {
      const current = readiness.current;
      if (current.key !== readinessKey) return;

      current[part] = true;
      if (type !== "everything" || (current.video && current.chat)) {
        onReady();
      }
    },
    [onReady, readinessKey, type],
  );

  const playerOptions = {
    width: "100%",
    height: "100%",
    channel,
  };

  if (type === "video") {
    return (
      <iframe
        src={`https://player.kick.com/${encodeURIComponent(channel)}?autoplay=true&muted=true`}
        width={playerOptions.width}
        height={playerOptions.height}
        allowFullScreen
        allow="autoplay; fullscreen"
        title={`${channel} Kick stream`}
        onLoad={() => markPartReady("video")}
      ></iframe>
    );
  } else if (type === "chat") {
    return (
      <iframe
        src={`https://kick.com/popout/${encodeURIComponent(channel)}/chat`}
        width={playerOptions.width}
        height={playerOptions.height}
        allowFullScreen
        title={`${channel} Kick chat`}
        onLoad={() => markPartReady("chat")}
      ></iframe>
    );
  } else {
    return (
      <div className="flex h-full w-full">
        <iframe
          src={`https://player.kick.com/${encodeURIComponent(channel)}?autoplay=true&muted=true`}
          width={playerOptions.width}
          height={playerOptions.height}
          allowFullScreen
          allow="autoplay; fullscreen"
          title={`${channel} Kick stream`}
          onLoad={() => markPartReady("video")}
        ></iframe>

        <iframe
          src={`https://kick.com/popout/${encodeURIComponent(channel)}/chat`}
          width={playerOptions.width}
          height={playerOptions.height}
          allowFullScreen
          title={`${channel} Kick chat`}
          onLoad={() => markPartReady("chat")}
        ></iframe>
      </div>
    );
  }
};

export default KickEmbed;
