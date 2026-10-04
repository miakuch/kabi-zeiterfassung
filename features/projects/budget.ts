export type BudgetAlertBasis = "hours" | "amount" | null;

export type ProjectBudgetInput = {
  hourlyBudget: number | null;
  amountBudget: number | null;
  budgetAlertBasis: BudgetAlertBasis;
  defaultHourlyRate: number | null;
  entries: Array<{
    billable: boolean;
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
  nonBillableMinutes: number;
  nonBillableHours: number;
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

function derivedHourlyBudget(input: ProjectBudgetInput) {
  if (input.hourlyBudget !== null) {
    return input.hourlyBudget;
  }

  if (
    input.amountBudget !== null &&
    input.defaultHourlyRate !== null &&
    input.defaultHourlyRate > 0
  ) {
    return input.amountBudget / input.defaultHourlyRate;
  }

  return null;
}

function derivedAmountBudget(input: ProjectBudgetInput) {
  if (input.amountBudget !== null) {
    return input.amountBudget;
  }

  if (input.hourlyBudget !== null && input.defaultHourlyRate !== null) {
    return input.hourlyBudget * input.defaultHourlyRate;
  }

  return null;
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
  const totals = input.entries.reduce(
    (current, entry) => {
      if (!entry.billable) {
        current.nonBillableMinutes += entry.durationMinutes;
        return current;
      }

      const hourlyRate =
        ratesByEmployee.get(entry.employeeId) ?? input.defaultHourlyRate ?? 0;

      current.usedMinutes += entry.durationMinutes;
      current.usedAmount += (entry.durationMinutes / 60) * hourlyRate;
      return current;
    },
    {
      usedMinutes: 0,
      usedAmount: 0,
      nonBillableMinutes: 0,
    },
  );
  const usedMinutes = totals.usedMinutes;
  const usedHours = usedMinutes / 60;
  const usedAmount = totals.usedAmount;
  const effectiveHourlyBudget = derivedHourlyBudget(input);
  const effectiveAmountBudget = derivedAmountBudget(input);
  const basis = inferBasis(input);
  const hoursUsagePercent = usagePercent(usedHours, effectiveHourlyBudget);
  const amountUsagePercent = usagePercent(usedAmount, effectiveAmountBudget);
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
    nonBillableMinutes: totals.nonBillableMinutes,
    nonBillableHours: roundHours(totals.nonBillableMinutes / 60),
    basis,
    status: statusFromPercent(relevantPercent),
    hoursUsagePercent,
    amountUsagePercent,
    remainingHours:
      effectiveHourlyBudget === null
        ? null
        : roundHours(effectiveHourlyBudget - usedHours),
    remainingAmount:
      effectiveAmountBudget === null
        ? null
        : roundCurrency(effectiveAmountBudget - usedAmount),
  };
}
