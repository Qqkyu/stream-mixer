import { chromium } from "@playwright/test";

const baseUrl = process.env.STREAM_MIX_URL ?? "https://streammix.app";
const twitchChannel = process.env.TWITCH_TEST_CHANNEL ?? "gorgc";
const youtubeVideo = process.env.YOUTUBE_TEST_VIDEO ?? "LTIqKDrjqr4";
const repetitions = Number(process.env.LIVE_TWITCH_REPETITIONS ?? 1);
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/google-chrome";

const workspace = [
  {
    id: "live-twitch-check",
    platform: "twitch",
    channel: twitchChannel,
    type: "everything",
    position: { x: 0, y: 0, w: 6, h: 13 },
  },
  {
    id: "live-youtube-check",
    platform: "youtube",
    channel: youtubeVideo,
    type: "everything",
    position: { x: 6, y: 0, w: 6, h: 13 },
  },
];

const browser = await chromium.launch({
  executablePath,
  headless: process.env.LIVE_HEADED !== "1",
});

async function verifyPlayback(iteration) {
  const context = await browser.newContext({
    viewport: { width: 1754, height: 770 },
    locale: "pl-PL",
  });
  const page = await context.newPage();
  const startedAt = Date.now();

  try {
    await page.addInitScript((savedWorkspace) => {
      window.localStorage.setItem(
        "stream-embeds",
        JSON.stringify(savedWorkspace),
      );
    }, workspace);

    await page.goto(`${baseUrl}/?live-twitch-check=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    const playerIframe = page.locator(
      '#embed-live-twitch-check iframe[src*="player.twitch.tv"]',
    );
    await playerIframe.waitFor({ state: "visible", timeout: 20_000 });

    const playerBounds = await playerIframe.boundingBox();
    if (!playerBounds) throw new Error("Twitch player has no visible bounds");

    const readPlayback = async () => {
      const frame = page
        .frames()
        .find((candidate) =>
          candidate.url().startsWith("https://player.twitch.tv/"),
        );
      if (!frame) return { frame: false, video: false };

      const video = frame.locator("video").first();
      if ((await video.count()) === 0) {
        return { frame: true, video: false };
      }

      return video.evaluate((element) => ({
        frame: true,
        video: true,
        paused: element.paused,
        currentTime: Number(element.currentTime.toFixed(2)),
        muted: element.muted,
        readyState: element.readyState,
      }));
    };

    let stableStart;
    let state;
    const startupDeadline = Date.now() + 25_000;
    while (Date.now() < startupDeadline) {
      state = await readPlayback();
      if (state.video && !state.paused) {
        stableStart ??= state.currentTime;
        if (state.currentTime - stableStart >= 1.5) break;
      } else {
        stableStart = undefined;
      }
      await page.waitForTimeout(250);
    }

    if (
      !state?.video ||
      state.paused ||
      stableStart === undefined ||
      state.currentTime - stableStart < 1.5
    ) {
      throw new Error(
        `Twitch never reached sustained playback: ${JSON.stringify(state)}`,
      );
    }

    const pointerX = playerBounds.x + playerBounds.width * 0.57;
    await page.mouse.move(pointerX, 32);
    await page.waitForTimeout(250);
    await page.mouse.move(pointerX, playerBounds.y + playerBounds.height / 2, {
      steps: 12,
    });

    const beforeHoverTime = state.currentTime;
    const hoverDeadline = Date.now() + 5_000;
    while (Date.now() < hoverDeadline) {
      state = await readPlayback();
      if (state.video && state.paused) {
        throw new Error(
          `Twitch paused after pointer entry: ${JSON.stringify(state)}`,
        );
      }
      await page.waitForTimeout(250);
    }

    if (
      !state?.video ||
      state.paused ||
      !state.muted ||
      state.currentTime - beforeHoverTime < 3
    ) {
      throw new Error(
        `Twitch did not remain muted and playing: ${JSON.stringify(state)}`,
      );
    }

    console.log(
      `PASS ${iteration}/${repetitions}: Twitch remained muted and playing ` +
        `for ${Math.round(Date.now() - startedAt)}ms through pointer entry`,
    );
  } catch (error) {
    await page.screenshot({
      path: `/tmp/stream-mix-live-twitch-failure-${iteration}.png`,
      fullPage: true,
    });
    throw error;
  } finally {
    await context.close();
  }
}

try {
  for (let iteration = 1; iteration <= repetitions; iteration += 1) {
    await verifyPlayback(iteration);
  }
} finally {
  await browser.close();
}
