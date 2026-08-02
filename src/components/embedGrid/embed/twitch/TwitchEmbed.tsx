import { useCallback, useEffect, useId, useRef, type FC } from "react";
import { useEmbedHostname } from "../../../../hooks/useEmbedHostname";
import type { Embed } from "../../EmbedTypes";
import { loadTwitchEmbedSdk } from "./loadTwitchEmbedSdk";

type Props = Pick<Embed, "type" | "channel"> & { onReady: () => void };
type PlayerProps = Pick<Props, "channel" | "onReady">;

type TwitchPlayer = {
  addEventListener: (event: string, listener: () => void) => void;
  isPaused: () => boolean;
  play: () => void;
  setMuted: (muted: boolean) => void;
};

const STARTUP_FALLBACK_MS = 12_000;
const PLAYBACK_STABILITY_MS = 1_500;
const PLAYBACK_RETRY_MS = 500;

const TwitchPlayerEmbed: FC<PlayerProps> = ({ channel, onReady }) => {
  const playerContainerId = useId();
  const hostname = useEmbedHostname();

  useEffect(() => {
    if (!hostname) return;

    let active = true;
    let playbackCheckTimeout: number | undefined;
    let playbackRecoveryTimeout: number | undefined;
    let playbackStableTimeout: number | undefined;
    let startupFallbackTimeout: number | undefined;
    let readyReported = false;

    const stabilizePlayback = (player: TwitchPlayer) => {
      const reportReady = () => {
        if (!active || readyReported) return;

        readyReported = true;
        window.clearTimeout(playbackCheckTimeout);
        window.clearTimeout(playbackRecoveryTimeout);
        window.clearTimeout(playbackStableTimeout);
        window.clearTimeout(startupFallbackTimeout);
        onReady();
      };

      const requestMutedPlayback = () => {
        if (!active) return;

        player.setMuted(true);
        player.play();
      };

      const schedulePlaybackRecovery = () => {
        if (!active || readyReported || playbackRecoveryTimeout) return;

        window.clearTimeout(playbackStableTimeout);
        playbackStableTimeout = undefined;

        playbackRecoveryTimeout = window.setTimeout(() => {
          playbackRecoveryTimeout = undefined;
          requestMutedPlayback();
        }, PLAYBACK_RETRY_MS);
      };

      const waitForStablePlayback = () => {
        if (!active || readyReported || playbackStableTimeout) return;

        player.setMuted(true);
        playbackStableTimeout = window.setTimeout(() => {
          playbackStableTimeout = undefined;

          if (player.isPaused()) {
            schedulePlaybackRecovery();
          } else {
            player.setMuted(true);
            reportReady();
          }
        }, PLAYBACK_STABILITY_MS);
      };

      const handlePlaying = () => {
        if (!active || readyReported) return;

        window.clearTimeout(playbackRecoveryTimeout);
        playbackRecoveryTimeout = undefined;
        waitForStablePlayback();
      };

      const handlePause = () => {
        if (!active || readyReported) return;

        window.clearTimeout(playbackStableTimeout);
        playbackStableTimeout = undefined;
        schedulePlaybackRecovery();
      };

      const checkPlayback = () => {
        if (!active || readyReported) return;

        player.setMuted(true);
        if (player.isPaused()) {
          handlePause();
        } else {
          waitForStablePlayback();
        }
        playbackCheckTimeout = window.setTimeout(checkPlayback, 500);
      };

      player.addEventListener(Twitch.Player.PLAYING, handlePlaying);
      player.addEventListener(Twitch.Player.PAUSE, handlePause);
      player.addEventListener(Twitch.Player.PLAYBACK_BLOCKED, handlePause);
      player.addEventListener(Twitch.Player.OFFLINE, reportReady);

      requestMutedPlayback();
      playbackCheckTimeout = window.setTimeout(checkPlayback, 500);

      // Offline channels and provider errors cannot reach a playing state.
      // Reveal Twitch's own message after the short startup guard finishes.
      startupFallbackTimeout = window.setTimeout(
        reportReady,
        STARTUP_FALLBACK_MS,
      );
    };

    loadTwitchEmbedSdk()
      .then(() => {
        if (!active) return;

        const player = new Twitch.Player(playerContainerId, {
          width: "100%",
          height: "100%",
          channel,
          parent: [hostname],
          autoplay: true,
          muted: true,
        });
        player.addEventListener(Twitch.Player.READY, () =>
          stabilizePlayback(player),
        );
      })
      .catch((error) => {
        console.error(error);
        onReady();
      });

    return () => {
      active = false;
      window.clearTimeout(playbackCheckTimeout);
      window.clearTimeout(playbackRecoveryTimeout);
      window.clearTimeout(playbackStableTimeout);
      window.clearTimeout(startupFallbackTimeout);
    };
  }, [channel, hostname, onReady, playerContainerId]);

  if (!hostname) return <div className="h-full" />;

  return <div id={playerContainerId} className="h-full w-full" />;
};

const TwitchEmbed: FC<Props> = ({ type, channel, onReady }) => {
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
    return <TwitchPlayerEmbed channel={channel} onReady={markVideoReady} />;
  }

  if (!hostname) return <div className="h-full" />;

  const chat = (
    <iframe
      src={`https://www.twitch.tv/embed/${encodeURIComponent(channel)}/chat?parent=${encodeURIComponent(hostname)}&darkpopout`}
      height="100%"
      width="100%"
      title={`${channel} Twitch chat`}
      onLoad={markChatReady}
    />
  );

  if (type === "chat") return chat;

  return (
    <div className="flex h-full w-full">
      <TwitchPlayerEmbed channel={channel} onReady={markVideoReady} />
      {chat}
    </div>
  );
};

export default TwitchEmbed;
