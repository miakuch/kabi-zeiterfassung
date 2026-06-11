import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getPublicEnv, getServerEnv } from "./env";

describe("environment validation", () => {
  it("validates public environment variables", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
  });

  it("requires server-only environment variables", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.INITIAL_ADMIN_EMAIL = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";

    expect(() => getServerEnv()).toThrow(z.ZodError);
  });
});
