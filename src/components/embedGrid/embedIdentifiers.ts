import type { Embed } from "./EmbedTypes";

export const MAX_STREAM_INPUT_LENGTH = 2_048;

const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_CHANNEL_LENGTH = 100;
const YOUTUBE_VIDEO_ID_LENGTH = 11;

export function isValidEmbedChannel(
  platform: Embed["platform"],
  channel: unknown,
): channel is string {
  if (
    typeof channel !== "string" ||
    channel.length === 0 ||
    channel.length > MAX_CHANNEL_LENGTH ||
    !SAFE_IDENTIFIER_PATTERN.test(channel)
  ) {
    return false;
  }

  return platform !== "youtube" || channel.length === YOUTUBE_VIDEO_ID_LENGTH;
}
