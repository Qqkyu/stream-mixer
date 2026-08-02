import { expect, test } from "@playwright/test";

const SAVED_WORKSPACE = [
  {
    id: "startup-test",
    platform: "twitch",
    channel: "gorgc",
    type: "everything",
    position: { x: 0, y: 0, w: 6, h: 13 },
  },
];

test("restores saved geometry before mounting the stream player", async ({
  page,
}) => {
  let releaseGridStack: (() => void) | undefined;
  const gridStackGate = new Promise<void>((resolve) => {
    releaseGridStack = resolve;
  });

  await page.route("**/gridstack.*.js", async (route) => {
    await gridStackGate;
    await route.continue();
  });

  await page.addInitScript((workspace) => {
    window.localStorage.setItem("stream-embeds", JSON.stringify(workspace));

    const testWindow = window as typeof window & {
      Twitch?: unknown;
      __twitchEmbedMounts?: number;
      __twitchEmbedOptions?: unknown;
      __markTwitchReady?: () => void;
      __twitchMuted?: boolean;
      __twitchPlayRequested?: boolean;
    };
    testWindow.__twitchEmbedMounts = 0;

    class FakeTwitchEmbed {
      static READY = "ready";
      static VIDEO_READY = "video-ready";

      private listeners: Record<string, () => void> = {};

      constructor(containerId: string, options: unknown) {
        testWindow.__twitchEmbedMounts =
          (testWindow.__twitchEmbedMounts ?? 0) + 1;
        testWindow.__twitchEmbedOptions = options;

        const iframe = document.createElement("iframe");
        iframe.dataset.testTwitchEmbed = "true";
        iframe.src = "about:blank#twitch-test";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "0";
        document.getElementById(containerId)?.append(iframe);

        testWindow.__markTwitchReady = () => {
          this.listeners[FakeTwitchEmbed.VIDEO_READY]?.();
        };
      }

      addEventListener(event: string, listener: () => void) {
        this.listeners[event] = listener;
      }

      getPlayer() {
        return this;
      }

      setMuted(muted: boolean) {
        testWindow.__twitchMuted = muted;
      }

      play() {
        testWindow.__twitchPlayRequested = true;
      }

      isPaused() {
        return !testWindow.__twitchPlayRequested;
      }
    }

    testWindow.Twitch = {
      Embed: FakeTwitchEmbed,
      Player: FakeTwitchEmbed,
    };
  }, SAVED_WORKSPACE);

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const grid = page.locator(".stream-embed-grid");
  const panel = page.locator("#embed-startup-test");
  const player = page.locator('iframe[data-test-twitch-embed="true"]');
  const embed = panel.locator("[data-embed-ready]");

  await expect(panel).toBeAttached();
  await expect(grid).toHaveAttribute("data-grid-loading", "true");
  await expect(panel).toHaveCSS("visibility", "hidden");
  await expect(player).toHaveCount(0);

  releaseGridStack?.();

  await expect(grid).toHaveAttribute("data-grid-loading", "false");
  await expect(panel).toHaveCSS("visibility", "visible");
  await expect(player).toHaveCount(1);
  await expect(embed).toHaveAttribute("data-embed-ready", "false");

  const panelBounds = await panel.boundingBox();
  const playerBounds = await player.boundingBox();
  expect(panelBounds?.width).toBeGreaterThan(900);
  expect(panelBounds?.height).toBeGreaterThan(500);
  expect(playerBounds?.width).toBeGreaterThan(900);
  expect(playerBounds?.height).toBeGreaterThan(500);

  await page.waitForTimeout(500);
  await expect(player).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __twitchEmbedMounts?: number })
            .__twitchEmbedMounts,
      ),
    )
    .toBe(1);

  const twitchOptions = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __twitchEmbedOptions?: unknown;
        }
      ).__twitchEmbedOptions,
  );
  expect(twitchOptions).toMatchObject({ autoplay: true, muted: true });

  await page.evaluate(() => {
    (
      window as typeof window & {
        __markTwitchReady?: () => void;
      }
    ).__markTwitchReady?.();
  });
  await expect(embed).toHaveAttribute("data-embed-ready", "true");

  const twitchPlaybackState = await page.evaluate(() => {
    const testWindow = window as typeof window & {
      __twitchMuted?: boolean;
      __twitchPlayRequested?: boolean;
    };

    return {
      muted: testWindow.__twitchMuted,
      playRequested: testWindow.__twitchPlayRequested,
    };
  });
  expect(twitchPlaybackState).toEqual({
    muted: true,
    playRequested: true,
  });
});

test("keeps YouTube covered until muted autoplay is requested", async ({
  page,
}) => {
  const savedWorkspace = [
    {
      id: "youtube-startup-test",
      platform: "youtube",
      channel: "aqz-KE-bpKQ",
      type: "video",
      position: { x: 0, y: 0, w: 6, h: 13 },
    },
  ];

  await page.addInitScript((workspace) => {
    window.localStorage.setItem("stream-embeds", JSON.stringify(workspace));

    const testWindow = window as typeof window & {
      YT?: unknown;
      __youtubePlayerOptions?: {
        playerVars?: { autoplay?: number };
        events?: {
          onReady?: (event: { target: FakeYoutubePlayer }) => void;
        };
      };
      __markYoutubeReady?: () => void;
      __youtubeMuted?: boolean;
      __youtubePlayRequested?: boolean;
    };

    class FakeYoutubePlayer {
      private iframe: HTMLIFrameElement;

      constructor(
        element: HTMLElement,
        options: NonNullable<typeof testWindow.__youtubePlayerOptions>,
      ) {
        testWindow.__youtubePlayerOptions = options;
        this.iframe = document.createElement("iframe");
        this.iframe.dataset.testYoutubeEmbed = "true";
        this.iframe.src = "about:blank#youtube-test";
        this.iframe.style.width = "100%";
        this.iframe.style.height = "100%";
        element.append(this.iframe);

        testWindow.__markYoutubeReady = () => {
          options.events?.onReady?.({ target: this });
        };
      }

      getIframe() {
        return this.iframe;
      }

      mute() {
        testWindow.__youtubeMuted = true;
      }

      playVideo() {
        testWindow.__youtubePlayRequested = true;
      }

      destroy() {
        this.iframe.remove();
      }
    }

    testWindow.YT = { Player: FakeYoutubePlayer };
  }, savedWorkspace);

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const panel = page.locator("#embed-youtube-startup-test");
  const embed = panel.locator("[data-embed-ready]");
  const player = page.locator('iframe[data-test-youtube-embed="true"]');

  await expect(player).toHaveCount(1);
  await expect(embed).toHaveAttribute("data-embed-ready", "false");

  await page.evaluate(() => {
    (
      window as typeof window & {
        __markYoutubeReady?: () => void;
      }
    ).__markYoutubeReady?.();
  });

  await expect(embed).toHaveAttribute("data-embed-ready", "true");

  const youtubeState = await page.evaluate(() => {
    const testWindow = window as typeof window & {
      __youtubePlayerOptions?: { playerVars?: { autoplay?: number } };
      __youtubeMuted?: boolean;
      __youtubePlayRequested?: boolean;
    };

    return {
      autoplay: testWindow.__youtubePlayerOptions?.playerVars?.autoplay,
      muted: testWindow.__youtubeMuted,
      playRequested: testWindow.__youtubePlayRequested,
    };
  });

  expect(youtubeState).toEqual({
    autoplay: 1,
    muted: true,
    playRequested: true,
  });
});

test("requests muted autoplay from Kick", async ({ page }) => {
  await page.route("https://player.kick.com/**", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Fake Kick player</title>",
    });
  });

  await page.addInitScript(() => {
    window.localStorage.setItem(
      "stream-embeds",
      JSON.stringify([
        {
          id: "kick-startup-test",
          platform: "kick",
          channel: "test-channel",
          type: "video",
          position: { x: 0, y: 0, w: 6, h: 13 },
        },
      ]),
    );
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const panel = page.locator("#embed-kick-startup-test");
  const embed = panel.locator("[data-embed-ready]");
  const player = panel.locator('iframe[src^="https://player.kick.com/"]');

  await expect(player).toHaveAttribute(
    "src",
    "https://player.kick.com/test-channel?autoplay=true&muted=true",
  );
  await expect(embed).toHaveAttribute("data-embed-ready", "true");
});
