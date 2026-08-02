import { useCallback, useEffect, useId, useRef, type FC } from "react";
import { useEmbedHostname } from "../../../../hooks/useEmbedHostname";
import type { Embed } from "../../EmbedTypes";
import {
  loadYoutubeIframeApi,
  type YoutubePlayer,
} from "./loadYoutubeIframeApi";

type Props = Pick<Embed, "type" | "channel"> & { onReady: () => void };

type PlayerProps = Pick<Props, "channel" | "onReady">;

const YOUTUBE_PLAYING_STATE = 1;
const MUTE_GUARD_DURATION_MS = 2_000;
const MUTE_GUARD_INTERVAL_MS = 250;

function requestMutedPlayback(player: YoutubePlayer) {
  player
    .getIframe()
    .setAttribute(
      "allow",
      "autoplay; encrypted-media; picture-in-picture; fullscreen",
    );
  player.mute();
  player.playVideo();
}

const YoutubePlayerEmbed: FC<PlayerProps> = ({ channel, onReady }) => {
  const playerContainerId = useId();

  useEffect(() => {
    const container = document.getElementById(playerContainerId);
    if (!container) return;

    let active = true;
    let player: YoutubePlayer | undefined;
    let muteGuardTimeout: number | undefined;
    let muteGuardDeadline = 0;

    const guardMutedState = (target: YoutubePlayer) => {
      window.clearTimeout(muteGuardTimeout);
      muteGuardDeadline = Date.now() + MUTE_GUARD_DURATION_MS;

      const checkMutedState = () => {
        if (!active) return;

        if (!target.isMuted()) target.mute();
        if (Date.now() < muteGuardDeadline) {
          muteGuardTimeout = window.setTimeout(
            checkMutedState,
            MUTE_GUARD_INTERVAL_MS,
          );
        }
      };

      checkMutedState();
    };

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

              requestMutedPlayback(target);
              guardMutedState(target);
              onReady();
            },
            onStateChange: ({ data, target }) => {
              if (!active || data !== YOUTUBE_PLAYING_STATE) return;

              guardMutedState(target);
            },
            onAutoplayBlocked: ({ target }) => {
              if (!active) return;

              requestMutedPlayback(target);
              guardMutedState(target);
              onReady();
            },
            onError: onReady,
          },
        });

        player
          .getIframe()
          .setAttribute(
            "allow",
            "autoplay; encrypted-media; picture-in-picture; fullscreen",
          );
      })
      .catch((error) => {
        console.error(error);
        onReady();
      });

    return () => {
      active = false;
      window.clearTimeout(muteGuardTimeout);
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
  const markVideoReady = useCallback(
    () => markPartReady("video"),
    [markPartReady],
  );
  const markChatReady = useCallback(
    () => markPartReady("chat"),
    [markPartReady],
  );

  if (type === "video") {
    return <YoutubePlayerEmbed channel={channel} onReady={markVideoReady} />;
  }

  if (type === "chat") {
    if (!hostname) return <div className="h-full" />;

    return (
      <iframe
        src={`https://www.youtube.com/live_chat?v=${encodeURIComponent(channel)}&embed_domain=${encodeURIComponent(hostname)}&dark_theme=1`}
        width="100%"
        height="100%"
        title={`${channel} YouTube chat`}
        onLoad={markChatReady}
      />
    );
  }

  return (
    <div className="flex h-full w-full">
      <YoutubePlayerEmbed channel={channel} onReady={markVideoReady} />

      {hostname && (
        <iframe
          src={`https://www.youtube.com/live_chat?v=${encodeURIComponent(channel)}&embed_domain=${encodeURIComponent(hostname)}&dark_theme=1`}
          width="100%"
          height="100%"
          title={`${channel} YouTube chat`}
          onLoad={markChatReady}
        />
      )}
    </div>
  );
};

export default YoutubeEmbed;
