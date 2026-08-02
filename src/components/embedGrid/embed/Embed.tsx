import { useCallback, useEffect, useState, type FC } from "react";
import type { Embed as EmbedType } from "../EmbedTypes";
import { PLATFORM_STYLES } from "../platformStyles";
import TwitchEmbed from "./twitch/TwitchEmbed";
import YoutubeEmbed from "./youtube/YoutubeEmbed";
import KickEmbed from "./kick/KickEmbed";

export const Embed: FC<EmbedType> = (embed) => {
  const [isReady, setIsReady] = useState(false);
  const markReady = useCallback(() => setIsReady(true), []);

  useEffect(() => {
    setIsReady(false);

    // If a platform never emits its ready event, reveal its own error state
    // instead of leaving the panel behind a permanent loading indicator.
    const fallback = window.setTimeout(markReady, 30_000);
    return () => window.clearTimeout(fallback);
  }, [embed.channel, embed.platform, embed.type, markReady]);

  let platformEmbed;

  switch (embed.platform) {
    case "twitch":
      platformEmbed = <TwitchEmbed {...embed} onReady={markReady} />;
      break;
    case "youtube":
      platformEmbed = <YoutubeEmbed {...embed} onReady={markReady} />;
      break;
    case "kick":
      platformEmbed = <KickEmbed {...embed} onReady={markReady} />;
      break;
    default:
      const exhaustiveCheck: never = embed.platform;
      console.log(exhaustiveCheck);
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-base-200"
      data-embed-ready={isReady}
    >
      {platformEmbed}
      <div
        className={`absolute inset-0 z-10 flex items-center justify-center bg-base-200 transition-opacity duration-200 ${
          isReady ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        role="status"
        aria-label={`Loading ${embed.platform} embed`}
        aria-hidden={isReady}
      >
        <span
          className={`loading loading-spinner loading-md ${PLATFORM_STYLES[embed.platform].text}`}
        />
        <span className="sr-only">Loading stream</span>
      </div>
    </div>
  );
};
