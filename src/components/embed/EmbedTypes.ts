export type Embed = {
  platform: "twitch" | "youtube" | "kick";
  channel: string;
  type: "everything" | "chat" | "video";
};
