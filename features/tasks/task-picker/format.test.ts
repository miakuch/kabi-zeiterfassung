import { describe, expect, it } from "vitest";
import {
  buildTaskPickerLabels,
  normalizeTaskSearch,
  taskPickerItemMatchesSearch,
} from "./format";

describe("task picker labels", () => {
  it("uses the project code in full and compact labels", () => {
    expect(
      buildTaskPickerLabels({
        customerName: "NDR",
        projectCode: "NDR-24",
        projectName: "Relaunch",
        taskName: "Konzeption",
      }),
    ).toMatchObject({
      fullLabel: "NDR / NDR-24 - Relaunch / Konzeption",
      compactLabel: "NDR / NDR-24 / Konzeption",
    });
  });

  it("falls back to the project name when no code exists", () => {
    expect(
      buildTaskPickerLabels({
        customerName: "Intern",
        projectCode: null,
        projectName: "Administration",
        taskName: "Organisation",
      }),
    ).toMatchObject({
      fullLabel: "Intern / Administration / Organisation",
      compactLabel: "Intern / Administration / Organisation",
    });
  });
});

describe("task picker search", () => {
  const task = {
    customerName: "KABI Consulting",
    projectCode: "KC-01",
    projectName: "Ueberarbeitung Website",
    taskName: "Qualitaetssicherung",
  };

  it("normalizes whitespace and case", () => {
    expect(normalizeTaskSearch("  UEBERARBEITUNG  ")).toBe("ueberarbeitung");
  });

  it("matches customer, project code, project name and task", () => {
    expect(taskPickerItemMatchesSearch(task, "consulting")).toBe(true);
    expect(taskPickerItemMatchesSearch(task, "kc-01")).toBe(true);
    expect(taskPickerItemMatchesSearch(task, "website")).toBe(true);
    expect(taskPickerItemMatchesSearch(task, "qualitaet")).toBe(true);
  });

  it("rejects unrelated queries", () => {
    expect(taskPickerItemMatchesSearch(task, "ndr")).toBe(false);
  });
});
