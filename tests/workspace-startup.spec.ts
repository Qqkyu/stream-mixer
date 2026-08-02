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
  await page.route(
    "https://www.twitch.tv/embed/gorgc/chat**",
    async (route) => {
      await route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Fake Twitch chat</title>",
      });
    },
  );

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
      __twitchPlayRequests?: number;
      __markTwitchPlaying?: () => void;
      __markTwitchPaused?: () => void;
    };
    testWindow.__twitchEmbedMounts = 0;

    class FakeTwitchEmbed {
      static READY = "ready";
      static VIDEO_READY = "video-ready";
      static PLAYING = "playing";
      static PAUSE = "pause";
      static PLAYBACK_BLOCKED = "playback-blocked";
      static OFFLINE = "offline";

      private listeners: Record<string, () => void> = {};
      private paused = true;

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
          this.listeners[FakeTwitchEmbed.READY]?.();
        };
        testWindow.__markTwitchPlaying = () => {
          this.paused = false;
          this.listeners[FakeTwitchEmbed.PLAYING]?.();
        };
        testWindow.__markTwitchPaused = () => {
          this.paused = true;
          this.listeners[FakeTwitchEmbed.PAUSE]?.();
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
        testWindow.__twitchPlayRequests =
          (testWindow.__twitchPlayRequests ?? 0) + 1;
      }

      isPaused() {
        return this.paused;
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
  expect(playerBounds?.width).toBeGreaterThan(450);
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
  await page.evaluate(() => {
    (
      window as typeof window & {
        __markTwitchPlaying?: () => void;
      }
    ).__markTwitchPlaying?.();
  });
  await expect(embed).toHaveAttribute("data-embed-ready", "true");

  const twitchPlaybackState = await page.evaluate(() => {
    const testWindow = window as typeof window & {
      __twitchMuted?: boolean;
      __twitchPlayRequests?: number;
    };

    return {
      muted: testWindow.__twitchMuted,
      playRequests: testWindow.__twitchPlayRequests,
    };
  });
  expect(twitchPlaybackState).toEqual({
    muted: true,
    playRequests: 1,
  });
});

test("waits for every Twitch player to sustain autoplay independently", async ({
  page,
}) => {
  await page.route("https://www.twitch.tv/embed/**/chat**", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Fake Twitch chat</title>",
    });
  });

  await page.addInitScript(() => {
    window.localStorage.setItem(
      "stream-embeds",
      JSON.stringify([
        {
          id: "twitch-one",
          platform: "twitch",
          channel: "channel-one",
          type: "everything",
          position: { x: 0, y: 0, w: 6, h: 13 },
        },
        {
          id: "twitch-two",
          platform: "twitch",
          channel: "channel-two",
          type: "everything",
          position: { x: 6, y: 0, w: 6, h: 13 },
        },
      ]),
    );

    type FakeState = {
      muted: boolean;
      paused: boolean;
      playRequests: number;
    };
    const testWindow = window as typeof window & {
      Twitch?: unknown;
      __emitTwitchEvent?: (index: number, event: string) => void;
      __getTwitchStates?: () => FakeState[];
    };
    const players: FakeTwitchPlayer[] = [];

    class FakeTwitchPlayer {
      static READY = "ready";
      static PLAYING = "playing";
      static PAUSE = "pause";
      static PLAYBACK_BLOCKED = "playback-blocked";
      static OFFLINE = "offline";

      private listeners: Record<string, () => void> = {};
      private state: FakeState = {
        muted: false,
        paused: true,
        playRequests: 0,
      };

      constructor(containerId: string) {
        players.push(this);

        const iframe = document.createElement("iframe");
        iframe.dataset.testTwitchPlayer = String(players.length - 1);
        iframe.src = `about:blank#twitch-${players.length}`;
        document.getElementById(containerId)?.append(iframe);
      }

      addEventListener(event: string, listener: () => void) {
        this.listeners[event] = listener;
      }

      setMuted(muted: boolean) {
        this.state.muted = muted;
      }

      play() {
        this.state.playRequests += 1;
      }

      isPaused() {
        return this.state.paused;
      }

      emit(event: string) {
        if (event === FakeTwitchPlayer.PLAYING) this.state.paused = false;
        if (event === FakeTwitchPlayer.PAUSE) this.state.paused = true;
        this.listeners[event]?.();
      }

      snapshot(): FakeState {
        return { ...this.state };
      }
    }

    testWindow.__emitTwitchEvent = (index, event) => {
      players[index]?.emit(event);
    };
    testWindow.__getTwitchStates = () =>
      players.map((player) => player.snapshot());
    testWindow.Twitch = { Player: FakeTwitchPlayer };
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const firstEmbed = page
    .locator("#embed-twitch-one")
    .locator("[data-embed-ready]");
  const secondEmbed = page
    .locator("#embed-twitch-two")
    .locator("[data-embed-ready]");

  await expect(page.locator("iframe[data-test-twitch-player]")).toHaveCount(2);
  await expect(firstEmbed).toHaveAttribute("data-embed-ready", "false");
  await expect(secondEmbed).toHaveAttribute("data-embed-ready", "false");

  await page.evaluate(() => {
    const emit = (
      window as typeof window & {
        __emitTwitchEvent?: (index: number, event: string) => void;
      }
    ).__emitTwitchEvent;
    emit?.(0, "ready");
    emit?.(1, "ready");
    emit?.(0, "playing");
    emit?.(1, "playing");
  });

  // The SDK can briefly claim playback started before pausing again. Neither
  // loader should disappear on that first transient PLAYING event.
  await page.waitForTimeout(750);
  await expect(firstEmbed).toHaveAttribute("data-embed-ready", "false");
  await expect(secondEmbed).toHaveAttribute("data-embed-ready", "false");

  await page.evaluate(() => {
    (
      window as typeof window & {
        __emitTwitchEvent?: (index: number, event: string) => void;
      }
    ).__emitTwitchEvent?.(0, "pause");
  });

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __getTwitchStates?: () => Array<{ playRequests: number }>;
            }
          ).__getTwitchStates?.()[0]?.playRequests,
      ),
    )
    .toBeGreaterThan(1);
  await expect(firstEmbed).toHaveAttribute("data-embed-ready", "false");

  // The second player has remained playing, so it can become ready without
  // waiting for or being affected by the first player.
  await expect(secondEmbed).toHaveAttribute("data-embed-ready", "true");

  await page.evaluate(() => {
    (
      window as typeof window & {
        __emitTwitchEvent?: (index: number, event: string) => void;
      }
    ).__emitTwitchEvent?.(0, "playing");
  });
  await expect(firstEmbed).toHaveAttribute("data-embed-ready", "true");

  const states = await page.evaluate(() =>
    (
      window as typeof window & {
        __getTwitchStates?: () => Array<{
          muted: boolean;
          paused: boolean;
          playRequests: number;
        }>;
      }
    ).__getTwitchStates?.(),
  );
  expect(states).toEqual([
    expect.objectContaining({ muted: true, paused: false }),
    expect.objectContaining({ muted: true, paused: false }),
  ]);
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
          onStateChange?: (event: {
            data: number;
            target: FakeYoutubePlayer;
          }) => void;
        };
      };
      __markYoutubeReady?: () => void;
      __youtubeMuted?: boolean;
      __youtubePlayRequested?: boolean;
      __youtubePlayerMounts?: number;
      __markYoutubePlaying?: () => void;
    };

    class FakeYoutubePlayer {
      private iframe: HTMLIFrameElement;

      constructor(
        element: HTMLElement,
        options: NonNullable<typeof testWindow.__youtubePlayerOptions>,
      ) {
        testWindow.__youtubePlayerMounts =
          (testWindow.__youtubePlayerMounts ?? 0) + 1;
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
        testWindow.__markYoutubePlaying = () => {
          options.events?.onStateChange?.({ data: 1, target: this });
        };
      }

      getIframe() {
        return this.iframe;
      }

      mute() {
        testWindow.__youtubeMuted = true;
      }

      isMuted() {
        return testWindow.__youtubeMuted ?? false;
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

  await page.evaluate(() => {
    const testWindow = window as typeof window & {
      __youtubeMuted?: boolean;
      __markYoutubePlaying?: () => void;
    };
    testWindow.__youtubeMuted = false;
    testWindow.__markYoutubePlaying?.();
  });

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

  await page.waitForTimeout(500);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __youtubePlayerMounts?: number })
            .__youtubePlayerMounts,
      ),
    )
    .toBe(1);

  // Provider initialization can overwrite mute after the first playing event.
  // The startup guard must restore the actual muted state, not only volume 0.
  await page.evaluate(() => {
    (window as typeof window & { __youtubeMuted?: boolean }).__youtubeMuted =
      false;
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __youtubeMuted?: boolean })
            .__youtubeMuted,
      ),
    )
    .toBe(true);
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
