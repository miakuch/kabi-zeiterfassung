import { describe, expect, it } from "vitest";
import { resolveSelectedTimeEntryEmployeeId } from "./employee-selection";

const currentEmployeeId = "11111111-1111-4111-8111-111111111111";
const otherEmployeeId = "22222222-2222-4222-8222-222222222222";

const employeeOptions = [
  {
    id: currentEmployeeId,
    name: "Mia Kuch",
    email: "mia@example.com",
  },
  {
    id: otherEmployeeId,
    name: "Max Muster",
    email: "max@example.com",
  },
];

describe("time entry employee selection", () => {
  it("keeps non-admins on their own employee id", () => {
    expect(
      resolveSelectedTimeEntryEmployeeId({
        currentEmployeeId,
        employeeOptions,
        isAdmin: false,
        requestedEmployeeId: otherEmployeeId,
      }),
    ).toBe(currentEmployeeId);
  });

  it("allows admins to select a known employee option", () => {
    expect(
      resolveSelectedTimeEntryEmployeeId({
        currentEmployeeId,
        employeeOptions,
        isAdmin: true,
        requestedEmployeeId: otherEmployeeId,
      }),
    ).toBe(otherEmployeeId);
  });

  it("falls back to the current employee for unknown ids", () => {
    expect(
      resolveSelectedTimeEntryEmployeeId({
        currentEmployeeId,
        employeeOptions,
        isAdmin: true,
        requestedEmployeeId: "33333333-3333-4333-8333-333333333333",
      }),
    ).toBe(currentEmployeeId);
  });
});
