export type BudgetAlertBasis = "hours" | "amount" | null;

export type ProjectBudgetInput = {
  hourlyBudget: number | null;
  amountBudget: number | null;
  budgetAlertBasis: BudgetAlertBasis;
  defaultHourlyRate: number | null;
  entries: Array<{
    durationMinutes: number;
    employeeId: string;
  }>;
  memberRates: Array<{
    employeeId: string;
    hourlyRate: number;
  }>;
};

export type ProjectBudgetStatus =
  | "no-budget"
  | "ok"
  | "warning-80"
  | "exceeded";

export type ProjectBudgetSummary = {
  usedMinutes: number;
  usedHours: number;
  usedAmount: number;
  basis: BudgetAlertBasis;
  status: ProjectBudgetStatus;
  hoursUsagePercent: number | null;
  amountUsagePercent: number | null;
  remainingHours: number | null;
  remainingAmount: number | null;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

function usagePercent(used: number, budget: number | null) {
  if (!budget || budget <= 0) {
    return null;
  }

  return Math.round((used / budget) * 1000) / 10;
}

function inferBasis(input: ProjectBudgetInput): BudgetAlertBasis {
  if (input.budgetAlertBasis) {
    return input.budgetAlertBasis;
  }

  if (input.hourlyBudget !== null) {
    return "hours";
  }

  if (input.amountBudget !== null) {
    return "amount";
  }

  return null;
}

function statusFromPercent(percent: number | null): ProjectBudgetStatus {
  if (percent === null) {
    return "no-budget";
  }

  if (percent >= 100) {
    return "exceeded";
  }

  if (percent >= 80) {
    return "warning-80";
  }

  return "ok";
}

export function calculateProjectBudgetSummary(
  input: ProjectBudgetInput,
): ProjectBudgetSummary {
  const ratesByEmployee = new Map(
    input.memberRates.map((rate) => [rate.employeeId, rate.hourlyRate]),
  );
  const usedMinutes = input.entries.reduce(
    (sum, entry) => sum + entry.durationMinutes,
    0,
  );
  const usedHours = usedMinutes / 60;
  const usedAmount = input.entries.reduce((sum, entry) => {
    const hourlyRate =
      ratesByEmployee.get(entry.employeeId) ?? input.defaultHourlyRate ?? 0;

    return sum + (entry.durationMinutes / 60) * hourlyRate;
  }, 0);
  const basis = inferBasis(input);
  const hoursUsagePercent = usagePercent(usedHours, input.hourlyBudget);
  const amountUsagePercent = usagePercent(usedAmount, input.amountBudget);
  const relevantPercent =
    basis === "hours"
      ? hoursUsagePercent
      : basis === "amount"
        ? amountUsagePercent
        : null;

  return {
    usedMinutes,
    usedHours: roundHours(usedHours),
    usedAmount: roundCurrency(usedAmount),
    basis,
    status: statusFromPercent(relevantPercent),
    hoursUsagePercent,
    amountUsagePercent,
    remainingHours:
      input.hourlyBudget === null
        ? null
        : roundHours(input.hourlyBudget - usedHours),
    remainingAmount:
      input.amountBudget === null
        ? null
        : roundCurrency(input.amountBudget - usedAmount),
  };
}
