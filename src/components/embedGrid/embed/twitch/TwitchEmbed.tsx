import type { FC } from "react";
import { useEmbedHostname } from "../../../../hooks/useEmbedHostname";
import type { Embed } from "../../EmbedTypes";

type Props = Pick<Embed, "type" | "channel"> & { onReady: () => void };

const TwitchEmbed: FC<Props> = ({ type, channel, onReady }) => {
  const hostname = useEmbedHostname();

  if (!hostname) return <div className="h-full" />;

  const video = (
    <iframe
      src={`https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(hostname)}&autoplay=true&muted=true`}
      height="100%"
      width="100%"
      allow="autoplay; fullscreen"
      allowFullScreen
      title={`${channel} Twitch stream`}
      onLoad={onReady}
    />
  );

  if (type === "video") return video;

  const chat = (
    <iframe
      src={`https://www.twitch.tv/embed/${encodeURIComponent(channel)}/chat?parent=${encodeURIComponent(hostname)}&darkpopout`}
      height="100%"
      width="100%"
      title={`${channel} Twitch chat`}
      onLoad={type === "chat" ? onReady : undefined}
    />
  );

  if (type === "chat") return chat;

  return (
    <div className="flex h-full w-full">
      {video}
      {chat}
    </div>
  );
};

export default TwitchEmbed;
