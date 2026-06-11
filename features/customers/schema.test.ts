import { describe, expect, it } from "vitest";
import { createCustomerSchema, updateCustomerSchema } from "./schema";

describe("customer validation", () => {
  it("requires a customer name", () => {
    expect(createCustomerSchema.safeParse({ name: " " }).success).toBe(false);
  });

  it("trims valid customer names", () => {
    expect(createCustomerSchema.parse({ name: "  KABI intern  " })).toEqual({
      name: "KABI intern",
    });
  });

  it("accepts status changes for existing customers", () => {
    expect(
      updateCustomerSchema.safeParse({
        id: "41d09b8c-4b62-468c-8fa9-5cf4cc88ad11",
        name: "Kunde",
        status: "inactive",
      }).success,
    ).toBe(true);
  });
});
