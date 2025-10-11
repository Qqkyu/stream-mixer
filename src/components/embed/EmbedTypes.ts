export type Embed = {
  platform: "twitch" | "youtube" | "kick";
  type: "everything" | "chat" | "video";
  channel: string;
};
