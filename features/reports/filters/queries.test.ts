import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), server: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: mocks.admin }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.server }));
import { getReportFilterOptions } from "./queries";

const task = {
  id: "task-1", name: "Historische Aufgabe", project_id: "project-1",
  projects: {
    id: "project-1", name: "Abgeschlossenes Projekt", code: "P-01",
    archived_at: "2026-11-18T10:00:00Z",
    customers: { id: "customer-1", name: "Kunde" },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  const client = {
    from: (table: string) => ({
      select: () => ({ order: async () => ({ data: table === "tasks" ? [task] : [], error: null }) }),
    }),
  };
  mocks.admin.mockReturnValue(client);
  mocks.server.mockResolvedValue(client);
});

describe("historical project report filters", () => {
  it.each(["admin", "employee"] as const)("retains archived project and task options for %s", async (role) => {
    const result = await getReportFilterOptions({ id: "employee-1", name: "Test", email: "test@example.test", role });
    expect(result.projects).toEqual([{
      id: "project-1", customerId: "customer-1", name: "Abgeschlossenes Projekt",
      code: "P-01", archivedAt: "2026-11-18T10:00:00Z",
    }]);
    expect(result.tasks).toEqual([{ id: "task-1", projectId: "project-1", name: "Historische Aufgabe" }]);
    expect(result.customers).toEqual([{ id: "customer-1", name: "Kunde" }]);
    expect(role === "admin" ? mocks.admin : mocks.server).toHaveBeenCalledOnce();
  });
});
