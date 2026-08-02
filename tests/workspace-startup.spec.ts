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
    };
    testWindow.__twitchEmbedMounts = 0;

    class FakeTwitchEmbed {
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

  await expect(panel).toBeAttached();
  await expect(grid).toHaveAttribute("data-grid-loading", "true");
  await expect(panel).toHaveCSS("visibility", "hidden");
  await expect(player).toHaveCount(0);

  releaseGridStack?.();

  await expect(grid).toHaveAttribute("data-grid-loading", "false");
  await expect(panel).toHaveCSS("visibility", "visible");
  await expect(player).toHaveCount(1);

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
});
