import { expect, test } from "@playwright/test";
import {
  encodeSharedLayout,
  mockKickEmbeds,
  readStoredWorkspace,
  seedWorkspace,
  type SharedStream,
  type TestWorkspaceEmbed,
} from "./workspace-helpers";

const SHARED_STREAMS: SharedStream[] = [
  {
    platform: "kick",
    channel: "shared-video",
    type: "video",
    position: { x: 0, y: 0, w: 6, h: 8 },
  },
  {
    platform: "kick",
    channel: "shared-chat",
    type: "chat",
    position: { x: 6, y: 0, w: 6, h: 8 },
  },
];

test.beforeEach(async ({ page }) => {
  await mockKickEmbeds(page);
});

test("opens a shared layout in an empty workspace and persists it", async ({
  page,
}) => {
  await seedWorkspace(page);
  const layout = encodeSharedLayout(SHARED_STREAMS);

  await page.goto(`/#layout=${layout}`, { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("status").filter({ hasText: "Shared workspace opened" }),
  ).toBeVisible();
  await expect(page.locator(".grid-stack-item")).toHaveCount(2);
  await expect(
    page.getByText("kick.com/shared-video", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("kick.com/shared-chat", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => new URL(page.url()).hash).toBe("");

  const importedWorkspace = await readStoredWorkspace(page);
  expect(importedWorkspace).toHaveLength(2);
  expect(importedWorkspace).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        platform: "kick",
        channel: "shared-video",
        type: "video",
        minimized: false,
      }),
      expect.objectContaining({
        platform: "kick",
        channel: "shared-chat",
        type: "chat",
        minimized: false,
      }),
    ]),
  );
  expect(importedWorkspace.every(({ id }) => id.length > 0)).toBe(true);

  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.locator(".grid-stack-item")).toHaveCount(2);
  await expect(
    page.getByText("kick.com/shared-video", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("kick.com/shared-chat", { exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
});

test("asks before replacing an existing workspace", async ({ page }) => {
  const existingWorkspace: TestWorkspaceEmbed[] = [
    {
      id: "existing-panel",
      platform: "kick",
      channel: "existing-channel",
      type: "video",
      position: { x: 0, y: 0, w: 6, h: 8 },
      minimized: false,
    },
  ];
  await seedWorkspace(page, existingWorkspace);
  const layout = encodeSharedLayout([SHARED_STREAMS[0]]);

  await page.goto(`/#layout=${layout}`, { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Replace your current workspace?");
  await expect(
    page.getByText("kick.com/existing-channel", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  await expect(dialog).not.toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  expect(await readStoredWorkspace(page)).toEqual(existingWorkspace);

  await page.goto(`/#layout=${layout}`, { waitUntil: "domcontentloaded" });
  await expect(dialog).toContainText("Replace your current workspace?");
  await dialog.getByRole("button", { name: "Replace workspace" }).click();

  await expect(
    page.getByText("kick.com/shared-video", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("kick.com/existing-channel", { exact: true }),
  ).toHaveCount(0);
  expect(new URL(page.url()).hash).toBe("");

  const replacedWorkspace = await readStoredWorkspace(page);
  expect(replacedWorkspace).toHaveLength(1);
  expect(replacedWorkspace[0]).toMatchObject({
    platform: "kick",
    channel: "shared-video",
    type: "video",
    minimized: false,
  });
  expect(replacedWorkspace[0].id).not.toBe("existing-panel");
});

test("rejects an invalid shared layout without changing saved panels", async ({
  page,
}) => {
  const existingWorkspace: TestWorkspaceEmbed[] = [
    {
      id: "safe-panel",
      platform: "kick",
      channel: "safe-channel",
      type: "video",
      position: { x: 0, y: 0, w: 6, h: 8 },
      minimized: false,
    },
  ];
  await seedWorkspace(page, existingWorkspace);

  await page.goto("/#layout=not-a-valid-layout", {
    waitUntil: "domcontentloaded",
  });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Shared workspace couldn't be opened");
  await expect(
    page.getByText("kick.com/safe-channel", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).first().click();

  await expect(dialog).not.toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  expect(await readStoredWorkspace(page)).toEqual(existingWorkspace);
});
