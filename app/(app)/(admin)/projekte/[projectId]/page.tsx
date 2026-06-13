import { notFound } from "next/navigation";
import { ProjectDetailPage } from "@/features/projects/detail-page";
import {
  getProjectDetail,
  getProjectDetailOptions,
} from "@/features/projects/queries";
import { requireAdminSession } from "@/lib/auth/require-session";

type ExistingProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ExistingProjectPage({
  params,
  searchParams,
}: ExistingProjectPageProps) {
  await requireAdminSession();
  const routeParams = await params;
  const [project, options, query] = await Promise.all([
    getProjectDetail(routeParams.projectId),
    getProjectDetailOptions(),
    searchParams,
  ]);

  if (!project) {
    notFound();
  }

  return (
    <ProjectDetailPage
      mode="edit"
      options={options}
      project={project}
      searchParams={query}
    />
  );
}
