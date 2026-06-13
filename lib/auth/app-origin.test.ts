import { describe, expect, it } from "vitest";
import { resolveAppOrigin } from "./app-origin";

function headers(values: Record<string, string | undefined>) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}

describe("resolveAppOrigin", () => {
  it("prefers the request host over a configured fallback URL", () => {
    expect(
      resolveAppOrigin(
        headers({
          "x-forwarded-host": "kabi-zeiterfassung-h7c228wej-kabmia.vercel.app",
          "x-forwarded-proto": "https",
        }),
        "https://kabi-zeiterfassung.vercel.app",
      ),
    ).toBe("https://kabi-zeiterfassung-h7c228wej-kabmia.vercel.app");
  });

  it("uses http for local development when no forwarded protocol is present", () => {
    expect(
      resolveAppOrigin(
        headers({
          host: "localhost:3000",
        }),
      ),
    ).toBe("http://localhost:3000");
  });

  it("falls back to the configured URL when request host headers are missing", () => {
    expect(
      resolveAppOrigin(headers({}), "https://kabi-zeiterfassung.vercel.app"),
    ).toBe("https://kabi-zeiterfassung.vercel.app");
  });
});
