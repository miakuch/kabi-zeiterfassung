import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { getPublicEnv, getServerEnv } from "./env";

describe("environment validation", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.INITIAL_ADMIN_EMAIL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

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

  it("does not require the app URL for Supabase session handling", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
  });

  it("requires server-only environment variables", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.INITIAL_ADMIN_EMAIL = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";

    expect(() => getServerEnv()).toThrow(z.ZodError);
  });
});
