import { ProjectDetailPage } from "@/features/projects/detail-page";
import { getProjectDetailOptions } from "@/features/projects/queries";
import { requireAdminSession } from "@/lib/auth/require-session";

type NewProjectPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function NewProjectPage({
  searchParams,
}: NewProjectPageProps) {
  await requireAdminSession();
  const [options, params] = await Promise.all([
    getProjectDetailOptions(),
    searchParams,
  ]);

  return (
    <ProjectDetailPage
      mode="create"
      options={options}
      project={null}
      searchParams={params}
    />
  );
}
