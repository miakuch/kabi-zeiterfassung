import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type HomeProps = {
  searchParams?: Promise<{
    code?: string | string[];
  }>;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const code = firstParam(params?.code);

  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/zeiten" : "/login");
}
