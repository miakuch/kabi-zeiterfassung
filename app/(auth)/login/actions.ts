"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { getPublicEnv } from "@/lib/env";
import { resolveAppOrigin } from "@/lib/auth/app-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export async function requestMagicLink(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirect("/login?error=ungueltige-email");
  }

  const env = getPublicEnv();
  const requestHeaders = await headers();
  const appUrl = resolveAppOrigin(
    requestHeaders,
    env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_ENV === "production",
  );

  if (!appUrl) {
    redirect("/login?error=magic-link");
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: new URL("/auth/callback", appUrl).toString(),
    },
  });

  if (error) {
    redirect("/login?error=magic-link");
  }

  redirect("/login?sent=1");
}
