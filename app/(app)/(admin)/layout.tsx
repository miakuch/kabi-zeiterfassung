import { requireAdminSession } from "@/lib/auth/require-session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return children;
}
