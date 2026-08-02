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

const STARTUP_FALLBACK_MS = 5_000;
const AUTOPLAY_RECOVERY_WINDOW_MS = 10_000;

const TwitchPlayerEmbed: FC<PlayerProps> = ({ channel, onReady }) => {
  const playerContainerId = useId();
  const hostname = useEmbedHostname();

  useEffect(() => {
    if (!hostname) return;

    let active = true;
    let playbackCheckTimeout: number | undefined;
    let playbackRecoveryTimeout: number | undefined;
    let recoveryWindowTimeout: number | undefined;
    let startupFallbackTimeout: number | undefined;
    let readyReported = false;

    const stabilizePlayback = (player: TwitchPlayer) => {
      let playbackStarted = false;
      let prePlaybackRecoveryAttempts = 0;
      let recoveredAfterPlayback = false;
      let recoveryWindowOpen = true;

      const reportReady = () => {
        if (!active || readyReported) return;

        readyReported = true;
        window.clearTimeout(startupFallbackTimeout);
        onReady();
      };

      const requestMutedPlayback = () => {
        if (!active) return;

        player.setMuted(true);
        player.play();
      };

      const schedulePlaybackRecovery = () => {
        if (!active || !recoveryWindowOpen || playbackRecoveryTimeout) return;

        if (playbackStarted) {
          if (recoveredAfterPlayback) return;
          recoveredAfterPlayback = true;
        } else {
          if (prePlaybackRecoveryAttempts >= 3) return;
          prePlaybackRecoveryAttempts += 1;
        }

        playbackRecoveryTimeout = window.setTimeout(() => {
          playbackRecoveryTimeout = undefined;
          requestMutedPlayback();
        }, 250);
      };

      const handlePlaying = () => {
        if (!active) return;

        playbackStarted = true;
        player.setMuted(true);
        reportReady();
      };

      const checkPlayback = () => {
        if (!active || readyReported) return;

        player.setMuted(true);
        if (player.isPaused()) {
          schedulePlaybackRecovery();
          playbackCheckTimeout = window.setTimeout(checkPlayback, 500);
        } else {
          handlePlaying();
        }
      };

      player.addEventListener(Twitch.Player.PLAYING, handlePlaying);
      player.addEventListener(Twitch.Player.PAUSE, schedulePlaybackRecovery);
      player.addEventListener(
        Twitch.Player.PLAYBACK_BLOCKED,
        schedulePlaybackRecovery,
      );

      requestMutedPlayback();
      playbackCheckTimeout = window.setTimeout(checkPlayback, 500);

      // Offline channels and provider errors cannot reach a playing state.
      // Reveal Twitch's own message after the short startup guard finishes.
      startupFallbackTimeout = window.setTimeout(
        reportReady,
        STARTUP_FALLBACK_MS,
      );
      recoveryWindowTimeout = window.setTimeout(() => {
        recoveryWindowOpen = false;
        window.clearTimeout(playbackRecoveryTimeout);
        playbackRecoveryTimeout = undefined;
      }, AUTOPLAY_RECOVERY_WINDOW_MS);
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
      window.clearTimeout(recoveryWindowTimeout);
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
