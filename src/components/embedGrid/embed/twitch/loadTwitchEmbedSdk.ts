const TWITCH_EMBED_SDK_URL = "https://embed.twitch.tv/embed/v1.js";

let twitchEmbedSdkPromise: Promise<void> | undefined;

export function loadTwitchEmbedSdk(): Promise<void> {
  if (typeof Twitch !== "undefined") {
    return Promise.resolve();
  }

  if (twitchEmbedSdkPromise) {
    return twitchEmbedSdkPromise;
  }

  twitchEmbedSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TWITCH_EMBED_SDK_URL;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load the Twitch embed SDK")),
      { once: true },
    );
    document.head.append(script);
  });

  return twitchEmbedSdkPromise;
}
