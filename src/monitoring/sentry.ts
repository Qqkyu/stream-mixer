import * as Sentry from "@sentry/react";
import { sanitizeSentryBreadcrumb, sanitizeSentryEvent } from "./sentryPrivacy";

const dsn = import.meta.env.PUBLIC_SENTRY_DSN?.trim();

if (import.meta.env.PROD && dsn) {
  Sentry.init({
    dsn,
    environment: "production",
    sendDefaultPii: false,
    sampleRate: 1,
    maxBreadcrumbs: 30,
    attachStacktrace: true,
    ignoreErrors: [
      /ResizeObserver loop (?:limit exceeded|completed with undelivered notifications)/i,
      /^Script error\.?$/i,
    ],
    denyUrls: [
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /\/extensions\//i,
      /^https:\/\/(?:embed|player|www)\.twitch\.tv\//i,
      /^https:\/\/www\.youtube\.com\//i,
      /^https:\/\/(?:player\.)?kick\.com\//i,
    ],
    beforeBreadcrumb: sanitizeSentryBreadcrumb,
    beforeSend: sanitizeSentryEvent,
  });
}
