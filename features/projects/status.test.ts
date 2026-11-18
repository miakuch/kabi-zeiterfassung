import { describe, expect, it } from "vitest";
import { projectStatusFromRow } from "./status";
import { projectStatusSchema, taskStatusSchema } from "./schema";

describe("project archive status", () => {
  it("keeps existing projects in their current state", () => {
    expect(projectStatusFromRow({ status: "active", archived_at: null })).toBe("active");
    expect(projectStatusFromRow({ status: "inactive", archived_at: null })).toBe("inactive");
  });

  it("distinguishes archived projects from planned or paused projects", () => {
    expect(projectStatusFromRow({ status: "inactive", archived_at: "2026-11-18T10:00:00Z" })).toBe("archived");
  });

  it("allows the archive state only for projects, not tasks", () => {
    expect(projectStatusSchema.safeParse("archived").success).toBe(true);
    expect(taskStatusSchema.safeParse("archived").success).toBe(false);
  });
});
