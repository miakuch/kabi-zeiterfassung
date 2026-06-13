import { describe, expect, it } from "vitest";
import { calculateProjectBudgetSummary } from "./budget";

describe("project budget calculation", () => {
  it("calculates used hours and open hour budget", () => {
    expect(
      calculateProjectBudgetSummary({
        hourlyBudget: 10,
        amountBudget: null,
        budgetAlertBasis: "hours",
        defaultHourlyRate: null,
        entries: [
          { employeeId: "a", durationMinutes: 120 },
          { employeeId: "b", durationMinutes: 180 },
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
    });
  });

  it("warns at 80 percent on the leading hour budget", () => {
    expect(
      calculateProjectBudgetSummary({
        hourlyBudget: 10,
        amountBudget: 5000,
        budgetAlertBasis: "hours",
        defaultHourlyRate: 100,
        entries: [{ employeeId: "a", durationMinutes: 480 }],
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
          { employeeId: "a", durationMinutes: 300 },
          { employeeId: "b", durationMinutes: 300 },
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
        entries: [{ employeeId: "a", durationMinutes: 60 }],
        memberRates: [],
      }).status,
    ).toBe("no-budget");
  });
});
