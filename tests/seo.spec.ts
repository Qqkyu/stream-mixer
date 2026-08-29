import { expect, test, type APIRequestContext } from "@playwright/test";

const CONTENT_PATHS = [
  "/about/",
  "/faq/",
  "/privacy/",
  "/guides/watch-multiple-streams/",
  "/guides/watch-multiple-twitch-streams/",
  "/guides/watch-multiple-youtube-streams/",
  "/guides/watch-multiple-kick-streams/",
];

const PUBLIC_PATHS = ["/", ...CONTENT_PATHS];

async function getHtml(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  expect(response.ok(), `${path} should return a successful response`).toBe(
    true,
  );
  return response.text();
}

test("keeps mixer help text out of content pages", async ({ request }) => {
  const homeHtml = await getHtml(request, "/");
  expect(homeHtml).toContain('id="help-modal"');

  for (const path of CONTENT_PATHS) {
    const html = await getHtml(request, path);
    expect(html, `${path} should not contain mixer-only help`).not.toContain(
      'id="help-modal"',
    );
  }
});

test("uses canonical trailing slashes for internal page links", async ({
  request,
}) => {
  for (const path of PUBLIC_PATHS) {
    const html = await getHtml(request, path);
    const hrefs = [...html.matchAll(/\shref="(\/[^"#]*)"/g)].map(
      ([, href]) => href,
    );

    for (const href of hrefs) {
      const pathname = new URL(href, "https://streammix.app").pathname;
      const isPage = pathname !== "/" && !/\.[^/]+$/.test(pathname);
      if (isPage) {
        expect(href, `${path} links to ${href}`).toMatch(/\/$/);
      }
    }
  }
});

test("shows a real workspace on the main setup guide", async ({ request }) => {
  const html = await getHtml(request, "/guides/watch-multiple-streams/");

  expect(html).toContain("A real Stream Mix workspace");
  expect(html).toContain(
    'alt="Stream Mix workspace with two Twitch streams and live chats side by side"',
  );
});
