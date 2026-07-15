import type { GridStackPosition } from "gridstack";

export type Embed = {
  id: string;
  platform: "twitch" | "youtube" | "kick";
  channel: string;
  type: "everything" | "chat" | "video";
  position: Required<GridStackPosition>;
};
