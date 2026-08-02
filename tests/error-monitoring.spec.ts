import { expect, test } from "@playwright/test";
import {
  removeUrlDetails,
  sanitizeSentryBreadcrumb,
  sanitizeSentryEvent,
} from "../src/monitoring/sentryPrivacy";

test("removes query strings and workspace fragments from reported URLs", () => {
  expect(
    removeUrlDetails(
      "https://streammix.app/?preview=true#layout=private-workspace",
    ),
  ).toBe("https://streammix.app/");

  expect(
    sanitizeSentryBreadcrumb({
      category: "navigation",
      data: {
        from: "https://streammix.app/#layout=old-workspace",
        to: "https://streammix.app/?source=shared#layout=new-workspace",
      },
    }),
  ).toMatchObject({
    data: {
      from: "https://streammix.app/",
      to: "https://streammix.app/",
    },
  });
});

test("removes request and user data from Sentry events", () => {
  const sanitized = sanitizeSentryEvent({
    exception: {
      values: [
        {
          stacktrace: {
            frames: [
              {
                filename:
                  "https://streammix.app/?source=share#layout=private-workspace",
              },
            ],
          },
        },
      ],
    },
    request: {
      url: "https://streammix.app/#layout=private-workspace",
      headers: { cookie: "secret" },
      cookies: { session: "secret" },
      data: { layout: "secret" },
    },
    user: { ip_address: "127.0.0.1" },
  });

  expect(sanitized).toMatchObject({
    exception: {
      values: [
        {
          stacktrace: {
            frames: [{ filename: "https://streammix.app/" }],
          },
        },
      ],
    },
    request: {
      url: "https://streammix.app/",
      headers: undefined,
      cookies: undefined,
      data: undefined,
    },
    user: undefined,
  });
});

test("reports sanitized browser errors when a production DSN is configured", async ({
  page,
}) => {
  const dsn = process.env.PUBLIC_SENTRY_DSN;
  test.skip(!dsn, "The production monitoring SDK is disabled without a DSN");

  const reports: string[] = [];
  const ingestOrigin = new URL(dsn as string).origin;
  await page.route(`${ingestOrigin}/**`, async (route) => {
    reports.push(route.request().postData() ?? "");
    await route.fulfill({ status: 200, body: "{}" });
  });

  await page.goto("/?private=secret-query#layout=secret-workspace", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator(".stream-embed-grid")).toHaveAttribute(
    "data-workspace-hydrated",
    "true",
  );
  await page.evaluate(() => {
    const error = new Error("Stream Mix monitoring verification");
    window.dispatchEvent(
      new ErrorEvent("error", {
        error,
        message: error.message,
        filename: window.location.href,
      }),
    );
  });

  await expect
    .poll(() => reports.join("\n"))
    .toContain("Stream Mix monitoring verification");

  const report = reports.join("\n");
  expect(report).not.toContain("secret-query");
  expect(report).not.toContain("secret-workspace");
});
