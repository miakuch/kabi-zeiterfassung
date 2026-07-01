"use client";

import { useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

type PreservedParam = {
  name: string;
  value: string;
};

type ExportProjectOption = {
  id: string;
  name: string;
  code: string | null;
};

type ExportPreviewFormProps = {
  options: {
    projects: ExportProjectOption[];
  };
  preservedParams: PreservedParam[];
  projectId: string;
  monthValue: string;
};

function projectLabel(project: ExportProjectOption) {
  return project.code ? `${project.code} - ${project.name}` : project.name;
}

function previewUrl(form: HTMLFormElement) {
  const params = new URLSearchParams();
  const formData = new FormData(form);

  for (const [name, value] of formData.entries()) {
    if (typeof value === "string" && value) {
      params.set(name, value);
    }
  }

  const query = params.toString();

  return query ? `/berichte?${query}` : "/berichte";
}

export function ExportPreviewForm({
  options,
  preservedParams,
  projectId,
  monthValue,
}: ExportPreviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = previewUrl(event.currentTarget);

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <form
      action="/berichte#zeitnachweis-export"
      className="grid gap-4 lg:grid-cols-[1fr_180px_auto]"
      method="get"
      onSubmit={handleSubmit}
    >
      {preservedParams.map((param) => (
        <input
          key={`${param.name}:${param.value}`}
          name={param.name}
          type="hidden"
          value={param.value}
        />
      ))}

      <label className="grid gap-1 text-sm font-medium">
        Projekt
        <select
          className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
          defaultValue={projectId}
          name="exportProject"
        >
          <option value="">Projekt wählen</option>
          {options.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {projectLabel(project)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm font-medium">
        Monat
        <input
          className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
          defaultValue={monthValue}
          name="exportMonth"
          type="month"
        />
      </label>

      <Button className="self-end" disabled={isPending} type="submit">
        <Eye className="size-4" aria-hidden="true" />
        Vorschau
      </Button>
    </form>
  );
}
