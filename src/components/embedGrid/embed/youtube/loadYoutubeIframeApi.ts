const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";

export type YoutubePlayer = {
  destroy: () => void;
  getIframe: () => HTMLIFrameElement;
  mute: () => void;
  playVideo: () => void;
};

type YoutubePlayerEvent = { target: YoutubePlayer };
type YoutubePlayerStateEvent = YoutubePlayerEvent & { data: number };

export type YoutubePlayerOptions = {
  width: string;
  height: string;
  videoId: string;
  playerVars: {
    autoplay: 1;
    origin: string;
    playsinline: 1;
  };
  events: {
    onReady: (event: YoutubePlayerEvent) => void;
    onStateChange: (event: YoutubePlayerStateEvent) => void;
    onAutoplayBlocked: (event: YoutubePlayerEvent) => void;
    onError: () => void;
  };
};

export type YoutubeIframeApi = {
  Player: new (
    element: HTMLElement,
    options: YoutubePlayerOptions,
  ) => YoutubePlayer;
};

type YoutubeWindow = Window &
  typeof globalThis & {
    YT?: YoutubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  };

let youtubeIframeApiPromise: Promise<YoutubeIframeApi> | undefined;

export function loadYoutubeIframeApi(): Promise<YoutubeIframeApi> {
  const youtubeWindow = window as YoutubeWindow;

  if (youtubeWindow.YT?.Player) {
    return Promise.resolve(youtubeWindow.YT);
  }

  if (youtubeIframeApiPromise) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const previousReadyCallback = youtubeWindow.onYouTubeIframeAPIReady;

    youtubeWindow.onYouTubeIframeAPIReady = () => {
      previousReadyCallback?.();

      if (youtubeWindow.YT?.Player) {
        resolve(youtubeWindow.YT);
      } else {
        reject(new Error("YouTube iframe API loaded without a player"));
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${YOUTUBE_IFRAME_API_URL}"]`,
    );
    const script = existingScript ?? document.createElement("script");

    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load the YouTube iframe API")),
      { once: true },
    );

    if (!existingScript) {
      script.src = YOUTUBE_IFRAME_API_URL;
      script.async = true;
      document.head.append(script);
    }
  });

  return youtubeIframeApiPromise;
}
