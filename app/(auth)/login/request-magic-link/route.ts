import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveAppOrigin } from "@/lib/auth/app-origin";
import { getPublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

function loginRedirect(request: NextRequest, query: string) {
  return NextResponse.redirect(new URL(`/login?${query}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return loginRedirect(request, "error=ungueltige-email");
  }

  const env = getPublicEnv();
  const appUrl = resolveAppOrigin(
    request.headers,
    env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_ENV === "production",
  );

  if (!appUrl) {
    return loginRedirect(request, "error=magic-link");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: new URL("/auth/callback", appUrl).toString(),
    },
  });

  if (error) {
    console.error("Magic link request failed", error.message);
    return loginRedirect(request, "error=magic-link");
  }

  return loginRedirect(request, "sent=1");
}
