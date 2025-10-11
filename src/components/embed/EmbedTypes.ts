export type Embed = {
  platform: "twitch" | "youtube";
  type: "everything" | "chat" | "video";
  channel: string;
};
