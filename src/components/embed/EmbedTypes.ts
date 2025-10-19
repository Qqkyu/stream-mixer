import type { Layout } from "react-grid-layout";

export type Embed = {
  platform: "twitch" | "youtube" | "kick";
  channel: string;
  type: "everything" | "chat" | "video";
  layout: Layout;
};
