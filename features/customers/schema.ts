import { z } from "zod";

export const customerIdSchema = z.string().uuid();

export const customerNameSchema = z
  .string()
  .trim()
  .min(1, "Kundenname ist Pflicht.")
  .max(120, "Kundenname ist zu lang.");

export const customerStatusSchema = z.enum(["active", "inactive"]);

export const createCustomerSchema = z.object({
  name: customerNameSchema,
});

export const updateCustomerSchema = z.object({
  id: customerIdSchema,
  name: customerNameSchema,
  status: customerStatusSchema,
});

export const customerStatusActionSchema = z.object({
  id: customerIdSchema,
  confirmed: z.boolean().default(false),
});

export function formValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}
