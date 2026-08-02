import { useCallback, useEffect, useId, useRef, type FC } from "react";
import { useEmbedHostname } from "../../../../hooks/useEmbedHostname";
import type { Embed } from "../../EmbedTypes";
import {
  loadYoutubeIframeApi,
  type YoutubePlayer,
} from "./loadYoutubeIframeApi";

type Props = Pick<Embed, "type" | "channel"> & { onReady: () => void };

type PlayerProps = Pick<Props, "channel" | "onReady">;

const YoutubePlayerEmbed: FC<PlayerProps> = ({ channel, onReady }) => {
  const playerContainerId = useId();

  useEffect(() => {
    const container = document.getElementById(playerContainerId);
    if (!container) return;

    let active = true;
    let player: YoutubePlayer | undefined;

    loadYoutubeIframeApi()
      .then((youtube) => {
        if (!active) return;

        player = new youtube.Player(container, {
          width: "100%",
          height: "100%",
          videoId: channel,
          playerVars: {
            autoplay: 1,
            origin: window.location.origin,
            playsinline: 1,
          },
          events: {
            onReady: ({ target }) => {
              if (!active) return;

              target
                .getIframe()
                .setAttribute(
                  "allow",
                  "autoplay; encrypted-media; picture-in-picture; fullscreen",
                );
              target.mute();
              target.playVideo();
              onReady();
            },
            onAutoplayBlocked: onReady,
            onError: onReady,
          },
        });
      })
      .catch((error) => {
        console.error(error);
        onReady();
      });

    return () => {
      active = false;
      player?.destroy();
    };
  }, [channel, onReady, playerContainerId]);

  return <div id={playerContainerId} className="h-full w-full" />;
};

const YoutubeEmbed: FC<Props> = ({ type, channel, onReady }) => {
  const hostname = useEmbedHostname();
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

  if (type === "video") {
    return (
      <YoutubePlayerEmbed
        channel={channel}
        onReady={() => markPartReady("video")}
      />
    );
  }

  if (type === "chat") {
    if (!hostname) return <div className="h-full" />;

    return (
      <iframe
        src={`https://www.youtube.com/live_chat?v=${encodeURIComponent(channel)}&embed_domain=${encodeURIComponent(hostname)}&dark_theme=1`}
        width="100%"
        height="100%"
        title={`${channel} YouTube chat`}
        onLoad={() => markPartReady("chat")}
      />
    );
  }

  return (
    <div className="flex h-full w-full">
      <YoutubePlayerEmbed
        channel={channel}
        onReady={() => markPartReady("video")}
      />

      {hostname && (
        <iframe
          src={`https://www.youtube.com/live_chat?v=${encodeURIComponent(channel)}&embed_domain=${encodeURIComponent(hostname)}&dark_theme=1`}
          width="100%"
          height="100%"
          title={`${channel} YouTube chat`}
          onLoad={() => markPartReady("chat")}
        />
      )}
    </div>
  );
};

export default YoutubeEmbed;
