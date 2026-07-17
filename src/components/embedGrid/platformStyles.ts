import type { Embed } from "./EmbedTypes";

type PlatformStyle = {
  background: string;
  border: string;
  text: string;
};

export const PLATFORM_STYLES: Record<Embed["platform"], PlatformStyle> = {
  twitch: {
    background: "bg-twitch",
    border: "border-twitch",
    text: "text-twitch",
  },
  youtube: {
    background: "bg-youtube",
    border: "border-youtube",
    text: "text-youtube",
  },
  kick: {
    background: "bg-kick",
    border: "border-kick",
    text: "text-kick",
  },
};
