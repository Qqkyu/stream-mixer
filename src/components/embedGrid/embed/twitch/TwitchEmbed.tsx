import { useEffect, useId, type FC } from "react";
import { useEmbedHostname } from "../../../../hooks/useEmbedHostname";
import type { Embed } from "../../EmbedTypes";
import { loadTwitchEmbedSdk } from "./loadTwitchEmbedSdk";

type Props = Pick<Embed, "type" | "channel">;
type TwitchEmbedProps = Props & { onReady: () => void };
type TwitchPlayer = {
  isPaused: () => boolean;
  play: () => void;
  setMuted: (muted: boolean) => void;
};

const TwitchEmbed: FC<TwitchEmbedProps> = ({ type, channel, onReady }) => {
  const embedId = useId();
  const hostname = useEmbedHostname();

  useEffect(() => {
    if (!hostname || type === "chat") return;

    let active = true;
    let playbackCheckTimeout: number | undefined;
    let startupFallbackTimeout: number | undefined;
    let startupComplete = false;

    const stabilizePlayback = (player: TwitchPlayer) => {
      let consecutivePlayingChecks = 0;

      const finishStartup = () => {
        if (!active || startupComplete) return;

        startupComplete = true;
        window.clearTimeout(playbackCheckTimeout);
        window.clearTimeout(startupFallbackTimeout);
        onReady();
      };

      const checkPlayback = () => {
        if (!active || startupComplete) return;

        player.setMuted(true);

        if (player.isPaused()) {
          consecutivePlayingChecks = 0;
          player.play();
        } else {
          consecutivePlayingChecks += 1;
        }

        if (consecutivePlayingChecks >= 2) {
          finishStartup();
        } else {
          playbackCheckTimeout = window.setTimeout(checkPlayback, 500);
        }
      };

      player.setMuted(true);
      player.play();
      playbackCheckTimeout = window.setTimeout(checkPlayback, 500);

      // Offline channels and provider errors cannot reach a playing state.
      // Reveal Twitch's own message after the short startup guard finishes.
      startupFallbackTimeout = window.setTimeout(finishStartup, 5_000);
    };

    const playerOptions = {
      width: "100%",
      height: "100%",
      channel,
      parent: [hostname],
      autoplay: true,
      muted: true,
    };

    loadTwitchEmbedSdk()
      .then(() => {
        if (!active) return;

        if (type === "video") {
          const player = new Twitch.Player(embedId, playerOptions);
          player.addEventListener(Twitch.Player.READY, () =>
            stabilizePlayback(player),
          );
        } else {
          const twitchEmbed = new Twitch.Embed(embedId, playerOptions);
          twitchEmbed.addEventListener(Twitch.Embed.VIDEO_READY, () =>
            stabilizePlayback(twitchEmbed.getPlayer()),
          );
        }
      })
      .catch((error) => {
        console.error(error);
        onReady();
      });

    return () => {
      active = false;
      window.clearTimeout(playbackCheckTimeout);
      window.clearTimeout(startupFallbackTimeout);
    };
  }, [channel, embedId, hostname, onReady, type]);

  if (!hostname) {
    return <div className="h-full"></div>;
  }

  return type === "chat" ? (
    <iframe
      src={`https://www.twitch.tv/embed/${encodeURIComponent(channel)}/chat?parent=${encodeURIComponent(hostname)}`}
      height="100%"
      width="100%"
      title={`${channel} Twitch chat`}
      onLoad={onReady}
    />
  ) : (
    <div id={embedId} className="h-full"></div>
  );
};

export default TwitchEmbed;
