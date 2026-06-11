import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { ensureEmployeeSession } from "@/lib/auth/ensure-employee-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    redirect("/login?error=login-nicht-erlaubt");
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    redirect("/login?error=login-nicht-erlaubt");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    redirect("/login?error=login-nicht-erlaubt");
  }

  try {
    await ensureEmployeeSession({
      authUserId: user.id,
      email: user.email,
      fallbackName:
        typeof user.user_metadata.name === "string"
          ? user.user_metadata.name
          : null,
    });
  } catch {
    await supabase.auth.signOut();
    redirect("/login?error=login-nicht-erlaubt");
  }

  return NextResponse.redirect(new URL("/zeiten", requestUrl.origin));
}
