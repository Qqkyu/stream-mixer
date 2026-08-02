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
  await page.route("https://player.twitch.tv/**", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Fake Twitch player</title>",
    });
  });
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
  }, SAVED_WORKSPACE);

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const grid = page.locator(".stream-embed-grid");
  const panel = page.locator("#embed-startup-test");
  const player = panel.locator('iframe[src^="https://player.twitch.tv/"]');
  const embed = panel.locator("[data-embed-ready]");

  await expect(panel).toBeAttached();
  await expect(grid).toHaveAttribute("data-grid-loading", "true");
  await expect(panel).toHaveCSS("visibility", "hidden");
  await expect(player).toHaveCount(0);

  releaseGridStack?.();

  await expect(grid).toHaveAttribute("data-grid-loading", "false");
  await expect(panel).toHaveCSS("visibility", "visible");
  await expect(player).toHaveCount(1);
  await expect(embed).toHaveAttribute("data-embed-ready", "true");

  const panelBounds = await panel.boundingBox();
  const playerBounds = await player.boundingBox();
  expect(panelBounds?.width).toBeGreaterThan(900);
  expect(panelBounds?.height).toBeGreaterThan(500);
  expect(playerBounds?.width).toBeGreaterThan(450);
  expect(playerBounds?.height).toBeGreaterThan(500);

  await page.waitForTimeout(500);
  await expect(player).toHaveCount(1);

  const playerUrl = new URL((await player.getAttribute("src")) ?? "");
  expect(playerUrl.searchParams.get("channel")).toBe("gorgc");
  expect(playerUrl.searchParams.get("parent")).toBe("127.0.0.1");
  expect(playerUrl.searchParams.get("autoplay")).toBe("true");
  expect(playerUrl.searchParams.get("muted")).toBe("true");
  await expect(player).toHaveAttribute("allow", "autoplay; fullscreen");
});

test("uses independent direct Twitch players without SDK playback commands", async ({
  page,
}) => {
  await page.route("https://player.twitch.tv/**", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Fake Twitch player</title>",
    });
  });
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
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const firstEmbed = page
    .locator("#embed-twitch-one")
    .locator("[data-embed-ready]");
  const secondEmbed = page
    .locator("#embed-twitch-two")
    .locator("[data-embed-ready]");

  const players = page.locator('iframe[src^="https://player.twitch.tv/"]');
  await expect(players).toHaveCount(2);
  await expect(firstEmbed).toHaveAttribute("data-embed-ready", "true");
  await expect(secondEmbed).toHaveAttribute("data-embed-ready", "true");

  const playerUrls = (
    await players.evaluateAll((iframes) =>
      iframes.map((iframe) => (iframe as HTMLIFrameElement).src),
    )
  ).map((src) => new URL(src));
  expect(playerUrls.map((url) => url.searchParams.get("channel"))).toEqual([
    "channel-one",
    "channel-two",
  ]);
  for (const url of playerUrls) {
    expect(url.searchParams.get("autoplay")).toBe("true");
    expect(url.searchParams.get("muted")).toBe("true");
  }
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
