import { z } from "zod";

export const employeeIdSchema = z.string().uuid();

export const employeeNameSchema = z
  .string()
  .trim()
  .min(1, "Name ist Pflicht.")
  .max(120, "Name ist zu lang.");

export const employeeEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Bitte gib eine gueltige E-Mail-Adresse ein.")
  .max(180, "E-Mail-Adresse ist zu lang.");

export const employeeRoleSchema = z.enum(["admin", "employee"]);
export const employeeStatusSchema = z.enum(["active", "inactive"]);

export const createEmployeeSchema = z.object({
  name: employeeNameSchema,
  email: employeeEmailSchema,
  role: employeeRoleSchema,
});

export const updateEmployeeSchema = z.object({
  id: employeeIdSchema,
  name: employeeNameSchema,
  email: employeeEmailSchema,
  role: employeeRoleSchema,
  status: employeeStatusSchema,
});

export const employeeStatusActionSchema = z.object({
  id: employeeIdSchema,
});

export function formValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}
