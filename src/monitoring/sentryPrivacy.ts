type SentryBreadcrumb = {
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

type SentryEvent = {
  breadcrumbs?: SentryBreadcrumb[];
  exception?: {
    values?: Array<{
      stacktrace?: { frames?: SentryFrame[] };
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  request?: {
    cookies?: unknown;
    data?: unknown;
    headers?: unknown;
    url?: string;
    [key: string]: unknown;
  };
  threads?: {
    values?: Array<{
      stacktrace?: { frames?: SentryFrame[] };
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  user?: unknown;
  [key: string]: unknown;
};

type SentryFrame = {
  filename?: string;
  [key: string]: unknown;
};

const URL_DATA_KEYS = ["url", "from", "to"] as const;

export function removeUrlDetails(value: unknown): unknown {
  if (typeof value !== "string") return value;

  try {
    const url = new URL(value, "https://streammix.app");
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

export function sanitizeSentryBreadcrumb<T extends SentryBreadcrumb>(
  breadcrumb: T,
): T {
  if (!breadcrumb.data) return breadcrumb;

  const data = { ...breadcrumb.data };
  for (const key of URL_DATA_KEYS) {
    data[key] = removeUrlDetails(data[key]);
  }

  return { ...breadcrumb, data };
}

export function sanitizeSentryEvent<T extends SentryEvent>(event: T): T {
  const sanitizeStacktrace = <
    V extends { stacktrace?: { frames?: SentryFrame[] } },
  >(
    value: V,
  ): V => ({
    ...value,
    stacktrace: value.stacktrace
      ? {
          ...value.stacktrace,
          frames: value.stacktrace.frames?.map((frame) => ({
            ...frame,
            filename: removeUrlDetails(frame.filename) as string | undefined,
          })),
        }
      : undefined,
  });

  const request = event.request
    ? {
        ...event.request,
        cookies: undefined,
        data: undefined,
        headers: undefined,
        url: removeUrlDetails(event.request.url) as string | undefined,
      }
    : undefined;

  return {
    ...event,
    breadcrumbs: event.breadcrumbs?.map(sanitizeSentryBreadcrumb),
    exception: event.exception
      ? {
          ...event.exception,
          values: event.exception.values?.map(sanitizeStacktrace),
        }
      : undefined,
    request,
    threads: event.threads
      ? {
          ...event.threads,
          values: event.threads.values?.map(sanitizeStacktrace),
        }
      : undefined,
    user: undefined,
  };
}
