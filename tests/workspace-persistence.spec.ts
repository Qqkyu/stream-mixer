import { expect, test } from "@playwright/test";
import {
  mockKickEmbeds,
  readStoredWorkspace,
  seedWorkspace,
  type TestWorkspaceEmbed,
} from "./workspace-helpers";

const SAVED_PANEL: TestWorkspaceEmbed = {
  id: "persisted-panel",
  platform: "kick",
  channel: "test-channel",
  type: "video",
  position: { x: 0, y: 0, w: 6, h: 8 },
  minimized: false,
};

test.beforeEach(async ({ page }) => {
  await mockKickEmbeds(page);
});

test("adds a panel and writes it to storage", async ({ page }) => {
  await seedWorkspace(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.locator("select").first().selectOption("kick");
  await page.getByPlaceholder("Channel, video ID, or URL").fill("test-channel");
  await page.locator("select").nth(1).selectOption("video");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  const panel = page
    .locator(".grid-stack-item")
    .filter({ hasText: "kick.com/test-channel" });
  await expect(panel).toBeVisible();
  await expect
    .poll(() =>
      panel.evaluate((element) =>
        Boolean(
          (element as HTMLElement & { gridstackNode?: unknown }).gridstackNode,
        ),
      ),
    )
    .toBe(true);

  const storedWorkspace = await readStoredWorkspace(page);
  expect(storedWorkspace).toHaveLength(1);
  expect(storedWorkspace[0]).toMatchObject({
    platform: "kick",
    channel: "test-channel",
    type: "video",
  });
  expect(storedWorkspace[0].minimized ?? false).toBe(false);
});

test("minimizes a hydrated panel and persists its state", async ({ page }) => {
  await seedWorkspace(page, [SAVED_PANEL]);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const panel = page.locator("#embed-persisted-panel");
  await expect(panel.locator("[data-embed-ready]")).toHaveAttribute(
    "data-embed-ready",
    "true",
  );
  await page
    .getByRole("button", { name: "Minimize kick.com/test-channel" })
    .evaluate((button: HTMLButtonElement) => button.click());

  await expect(panel).toHaveCount(0);
  await expect(page.locator("[data-minimized-shelf]")).toBeAttached();
  await expect
    .poll(async () => (await readStoredWorkspace(page))[0]?.minimized)
    .toBe(true);
});

test("restores a minimized panel loaded from storage", async ({ page }) => {
  await seedWorkspace(page, [{ ...SAVED_PANEL, minimized: true }]);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".stream-embed-grid")).toHaveAttribute(
    "data-workspace-hydrated",
    "true",
  );
  await expect(page.locator("#embed-persisted-panel")).toHaveCount(0);
  const restoreButton = page.locator("[data-minimized-shelf] button");
  await expect(restoreButton).toHaveCount(1);
  const restoreClicked = await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>(
      "[data-minimized-shelf] button",
    );
    button?.click();
    return button != null;
  });
  expect(restoreClicked).toBe(true);

  await expect(page.locator("#embed-persisted-panel")).toBeVisible();
  await expect
    .poll(async () => (await readStoredWorkspace(page))[0]?.minimized)
    .toBe(false);
});

test("removes a hydrated panel from storage", async ({ page }) => {
  await seedWorkspace(page, [SAVED_PANEL]);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const panel = page.locator("#embed-persisted-panel");
  await expect(panel.locator("[data-embed-ready]")).toHaveAttribute(
    "data-embed-ready",
    "true",
  );
  await page
    .getByRole("button", { name: "Remove kick.com/test-channel" })
    .evaluate((button: HTMLButtonElement) => button.click());

  await expect(panel).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Watch multiple live streams at once",
    }),
  ).toBeVisible();
  await expect
    .poll(async () => (await readStoredWorkspace(page)).length)
    .toBe(0);
});
