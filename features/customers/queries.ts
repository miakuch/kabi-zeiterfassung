import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerListItem = {
  id: string;
  name: string;
  status: "active" | "inactive";
  activeProjectCount: number;
  totalProjectCount: number;
};

type CustomerRow = {
  id: string;
  name: string;
  status: "active" | "inactive";
  projects: Array<{
    id: string;
    status: "active" | "inactive";
  }> | null;
};

export async function getCustomers(): Promise<CustomerListItem[]> {
  noStore();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, status, projects(id, status)")
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Kunden konnten nicht geladen werden.");
  }

  return ((data ?? []) as CustomerRow[]).map((customer) => {
    const projects = customer.projects ?? [];

    return {
      id: customer.id,
      name: customer.name,
      status: customer.status,
      activeProjectCount: projects.filter((project) => project.status === "active")
        .length,
      totalProjectCount: projects.length,
    };
  });
}

export async function getActiveProjectCount(customerId: string) {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("status", "active");

  if (error) {
    throw new Error("Aktive Projekte konnten nicht geprueft werden.");
  }

  return count ?? 0;
}
