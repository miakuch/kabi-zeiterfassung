import { z } from "zod";

export const projectIdSchema = z.string().uuid();
export const taskIdSchema = z.string().uuid();
export const customerIdSchema = z.string().uuid();
export const employeeIdSchema = z.string().uuid();

export const projectStatusSchema = z.enum(["active", "inactive"]);
export const budgetAlertBasisSchema = z.enum(["hours", "amount"]).nullable();
export const taskStatusSchema = z.enum(["active", "inactive"]);
export const assignmentModeSchema = z.enum(["all", "selected"]);

const nullableDecimalSchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value.replace(",", "."))))
  .pipe(z.number().min(0).nullable());

const optionalTextSchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

export const projectFormSchema = z
  .object({
    customerId: customerIdSchema,
    name: z.string().trim().min(1).max(160),
    code: optionalTextSchema,
    color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
    status: projectStatusSchema,
    hourlyBudget: nullableDecimalSchema,
    amountBudget: nullableDecimalSchema,
    budgetAlertBasis: z
      .string()
      .transform((value) => (value === "" ? null : value))
      .pipe(budgetAlertBasisSchema),
    defaultHourlyRate: nullableDecimalSchema,
    createGeneralTask: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.budgetAlertBasis === "hours" && value.hourlyBudget === null) {
      ctx.addIssue({
        code: "custom",
        message: "Stundenbudget fehlt für Budgetbasis Stunden.",
        path: ["hourlyBudget"],
      });
    }

    if (value.budgetAlertBasis === "amount" && value.amountBudget === null) {
      ctx.addIssue({
        code: "custom",
        message: "Betragsbudget fehlt für Budgetbasis Betrag.",
        path: ["amountBudget"],
      });
    }
  })
  .transform((value) => {
    let budgetAlertBasis = value.budgetAlertBasis;

    if (!budgetAlertBasis) {
      if (value.hourlyBudget !== null) {
        budgetAlertBasis = "hours";
      } else if (value.amountBudget !== null) {
        budgetAlertBasis = "amount";
      }
    }

    return {
      ...value,
      budgetAlertBasis,
    };
  });

export const taskFormSchema = z.object({
  projectId: projectIdSchema,
  taskId: taskIdSchema.optional(),
  name: z.string().trim().min(1).max(120),
  description: optionalTextSchema,
  status: taskStatusSchema,
  defaultBillable: z.boolean().default(true),
  assignmentMode: assignmentModeSchema,
  assignedEmployeeIds: z.array(employeeIdSchema).default([]),
});

export const memberRateFormSchema = z.object({
  projectId: projectIdSchema,
  employeeId: employeeIdSchema,
  hourlyRate: nullableDecimalSchema,
});

export function formValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export function formValues(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => {
    return typeof value === "string";
  });
}
