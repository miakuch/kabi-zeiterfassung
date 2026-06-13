type HeaderReader = {
  get(name: string): string | null;
};

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function defaultProtocolForHost(host: string) {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1")
    ? "http"
    : "https";
}

function safeProtocol(value: string | null) {
  const protocol = firstHeaderValue(value);
  return protocol === "http" || protocol === "https" ? protocol : null;
}

function safeOrigin(value: string | null) {
  const origin = firstHeaderValue(value);

  if (!origin) {
    return null;
  }

  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.origin
      : null;
  } catch {
    return null;
  }
}

export function resolveAppOrigin(
  headers: HeaderReader,
  fallbackAppUrl?: string,
  preferFallback = false,
) {
  const fallbackOrigin = safeOrigin(fallbackAppUrl ?? null);

  if (preferFallback && fallbackOrigin) {
    return fallbackOrigin;
  }

  const origin = safeOrigin(headers.get("origin"));

  if (origin) {
    return origin;
  }

  const host =
    firstHeaderValue(headers.get("host")) ??
    firstHeaderValue(headers.get("x-forwarded-host"));

  if (host) {
    const protocol =
      safeProtocol(headers.get("x-forwarded-proto")) ??
      defaultProtocolForHost(host);

    return `${protocol}://${host}`;
  }

  return fallbackOrigin;
}
