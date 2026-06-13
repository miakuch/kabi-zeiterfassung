import { describe, expect, it } from "vitest";
import { projectFormSchema, taskFormSchema } from "./schema";

describe("project form validation", () => {
  it("infers hour budget as leading basis", () => {
    expect(
      projectFormSchema.parse({
        customerId: "41d09b8c-4b62-468c-8fa9-5cf4cc88ad11",
        name: "NDR Relaunch",
        code: "",
        color: "#2498ac",
        status: "active",
        hourlyBudget: "80",
        amountBudget: "",
        budgetAlertBasis: "",
        defaultHourlyRate: "120",
        createGeneralTask: true,
      }),
    ).toMatchObject({
      hourlyBudget: 80,
      amountBudget: null,
      budgetAlertBasis: "hours",
      defaultHourlyRate: 120,
      createGeneralTask: true,
    });
  });

  it("requires a matching budget for the selected basis", () => {
    expect(
      projectFormSchema.safeParse({
        customerId: "41d09b8c-4b62-468c-8fa9-5cf4cc88ad11",
        name: "NDR Relaunch",
        code: "",
        color: "#2498ac",
        status: "active",
        hourlyBudget: "",
        amountBudget: "",
        budgetAlertBasis: "amount",
        defaultHourlyRate: "",
        createGeneralTask: false,
      }).success,
    ).toBe(false);
  });
});

describe("task form validation", () => {
  it("keeps selected assignments explicit", () => {
    expect(
      taskFormSchema.parse({
        projectId: "41d09b8c-4b62-468c-8fa9-5cf4cc88ad11",
        name: "Allgemein",
        description: "",
        status: "active",
        defaultBillable: true,
        assignmentMode: "selected",
        assignedEmployeeIds: [],
      }),
    ).toMatchObject({
      name: "Allgemein",
      description: null,
      defaultBillable: true,
      assignmentMode: "selected",
      assignedEmployeeIds: [],
    });
  });
});
