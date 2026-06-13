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

export function resolveAppOrigin(headers: HeaderReader, fallbackAppUrl?: string) {
  const host =
    firstHeaderValue(headers.get("x-forwarded-host")) ??
    firstHeaderValue(headers.get("host"));

  if (host) {
    const protocol =
      safeProtocol(headers.get("x-forwarded-proto")) ??
      defaultProtocolForHost(host);

    return `${protocol}://${host}`;
  }

  return firstHeaderValue(headers.get("origin")) ?? fallbackAppUrl ?? null;
}
