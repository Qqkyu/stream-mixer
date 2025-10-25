import type { GridStackPosition } from "gridstack";

export type Embed = {
  platform: "twitch" | "youtube" | "kick";
  channel: string;
  type: "everything" | "chat" | "video";
  position: Required<GridStackPosition>;
};
