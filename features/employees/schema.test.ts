import { describe, expect, it } from "vitest";
import { wouldRemoveLastActiveAdmin } from "./domain";
import { createEmployeeSchema, updateEmployeeSchema } from "./schema";

describe("employee validation", () => {
  it("requires name and a valid email", () => {
    expect(
      createEmployeeSchema.safeParse({
        name: "",
        email: "keine-mail",
        role: "employee",
      }).success,
    ).toBe(false);
  });

  it("normalizes employee emails", () => {
    expect(
      createEmployeeSchema.parse({
        name: "Mia Kuch",
        email: "  MIA@KABI-CONSULTING.DE  ",
        role: "admin",
      }),
    ).toEqual({
      name: "Mia Kuch",
      email: "mia@kabi-consulting.de",
      role: "admin",
    });
  });

  it("accepts editing role and status", () => {
    expect(
      updateEmployeeSchema.safeParse({
        id: "41d09b8c-4b62-468c-8fa9-5cf4cc88ad11",
        name: "Mitarbeitende Person",
        email: "person@kabi-consulting.de",
        role: "employee",
        status: "inactive",
      }).success,
    ).toBe(true);
  });
});

describe("last active admin rule", () => {
  it("blocks degrading the last active admin", () => {
    expect(
      wouldRemoveLastActiveAdmin({
        activeAdminCount: 1,
        current: {
          id: "admin-id",
          role: "admin",
          status: "active",
        },
        nextRole: "employee",
        nextStatus: "active",
      }),
    ).toBe(true);
  });

  it("blocks deactivating the last active admin", () => {
    expect(
      wouldRemoveLastActiveAdmin({
        activeAdminCount: 1,
        current: {
          id: "admin-id",
          role: "admin",
          status: "active",
        },
        nextRole: "admin",
        nextStatus: "inactive",
      }),
    ).toBe(true);
  });

  it("allows changes when another active admin remains", () => {
    expect(
      wouldRemoveLastActiveAdmin({
        activeAdminCount: 2,
        current: {
          id: "admin-id",
          role: "admin",
          status: "active",
        },
        nextRole: "employee",
        nextStatus: "active",
      }),
    ).toBe(false);
  });
});
