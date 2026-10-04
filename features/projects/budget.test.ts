import { describe, expect, it } from "vitest";
import { calculateProjectBudgetSummary } from "./budget";

describe("project budget calculation", () => {
  it("calculates used hours and open hour budget", () => {
    expect(
      calculateProjectBudgetSummary({
        hourlyBudget: 10,
        amountBudget: null,
        budgetAlertBasis: "hours",
        defaultHourlyRate: 100,
        entries: [
          { employeeId: "a", durationMinutes: 120, billable: true },
          { employeeId: "b", durationMinutes: 180, billable: true },
        ],
        memberRates: [],
      }),
    ).toMatchObject({
      usedMinutes: 300,
      usedHours: 5,
      basis: "hours",
      status: "ok",
      hoursUsagePercent: 50,
      remainingHours: 5,
      remainingAmount: 500,
    });
  });

  it("derives open hours from amount budget and default rate", () => {
    expect(
      calculateProjectBudgetSummary({
        hourlyBudget: null,
        amountBudget: 1200,
        budgetAlertBasis: "amount",
        defaultHourlyRate: 100,
        entries: [{ employeeId: "a", durationMinutes: 180, billable: true }],
        memberRates: [],
      }),
    ).toMatchObject({
      usedHours: 3,
      usedAmount: 300,
      remainingHours: 9,
      remainingAmount: 900,
    });
  });

  it("warns at 80 percent on the leading hour budget", () => {
    expect(
      calculateProjectBudgetSummary({
        hourlyBudget: 10,
        amountBudget: 5000,
        budgetAlertBasis: "hours",
        defaultHourlyRate: 100,
        entries: [{ employeeId: "a", durationMinutes: 480, billable: true }],
        memberRates: [],
      }).status,
    ).toBe("warning-80");
  });

  it("marks amount budgets as exceeded with member rates", () => {
    expect(
      calculateProjectBudgetSummary({
        hourlyBudget: null,
        amountBudget: 900,
        budgetAlertBasis: "amount",
        defaultHourlyRate: 100,
        entries: [
          { employeeId: "a", durationMinutes: 300, billable: true },
          { employeeId: "b", durationMinutes: 300, billable: true },
        ],
        memberRates: [{ employeeId: "b", hourlyRate: 120 }],
      }),
    ).toMatchObject({
      usedHours: 10,
      usedAmount: 1100,
      amountUsagePercent: 122.2,
      remainingAmount: -200,
      status: "exceeded",
    });
  });

  it("does not create budget hints without a budget", () => {
    expect(
      calculateProjectBudgetSummary({
        hourlyBudget: null,
        amountBudget: null,
        budgetAlertBasis: null,
        defaultHourlyRate: null,
        entries: [{ employeeId: "a", durationMinutes: 60, billable: true }],
        memberRates: [],
      }).status,
    ).toBe("no-budget");
  });

  it("tracks non-billable hours without consuming the project budget", () => {
    expect(
      calculateProjectBudgetSummary({
        hourlyBudget: 10,
        amountBudget: 1000,
        budgetAlertBasis: "hours",
        defaultHourlyRate: 100,
        entries: [
          { employeeId: "a", durationMinutes: 240, billable: true },
          { employeeId: "a", durationMinutes: 120, billable: false },
        ],
        memberRates: [],
      }),
    ).toMatchObject({
      usedMinutes: 240,
      usedHours: 4,
      usedAmount: 400,
      nonBillableMinutes: 120,
      nonBillableHours: 2,
      hoursUsagePercent: 40,
      remainingHours: 6,
      remainingAmount: 600,
    });
  });
});
