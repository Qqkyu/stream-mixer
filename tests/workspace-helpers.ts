import type { Page } from "@playwright/test";

export type TestWorkspaceEmbed = {
  id: string;
  platform: "twitch" | "youtube" | "kick";
  channel: string;
  type: "everything" | "video" | "chat";
  position: { x: number; y: number; w: number; h: number };
  minimized?: boolean;
};

export type SharedStream = Omit<TestWorkspaceEmbed, "id" | "minimized">;

export function encodeSharedLayout(streams: SharedStream[]): string {
  return Buffer.from(JSON.stringify({ v: 1, streams }), "utf8").toString(
    "base64url",
  );
}

export async function seedWorkspace(
  page: Page,
  workspace: TestWorkspaceEmbed[] = [],
): Promise<void> {
  await page.addInitScript((initialWorkspace) => {
    if (window.sessionStorage.getItem("playwright-workspace-seeded")) return;

    window.localStorage.clear();
    window.localStorage.setItem(
      "stream-embeds",
      JSON.stringify(initialWorkspace),
    );
    window.sessionStorage.setItem("playwright-workspace-seeded", "true");
  }, workspace);
}

export async function mockKickEmbeds(page: Page): Promise<void> {
  const fakeEmbed = "<!doctype html><title>Fake Kick embed</title>";

  await page.route("https://player.kick.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: fakeEmbed }),
  );
  await page.route("https://kick.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: fakeEmbed }),
  );
}

export async function readStoredWorkspace(
  page: Page,
): Promise<TestWorkspaceEmbed[]> {
  return page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("stream-embeds") ?? "[]"),
  );
}
