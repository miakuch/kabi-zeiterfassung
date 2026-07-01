"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/require-session";
import {
  CACHE_TAG_PROJECT_DETAIL_OPTIONS,
  CACHE_TAG_REPORT_FILTER_OPTIONS,
  CACHE_TAG_TASK_PICKER_ITEMS,
} from "@/lib/cache/tags";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveProjectCount } from "./queries";
import {
  createCustomerSchema,
  customerStatusActionSchema,
  formValue,
  updateCustomerSchema,
} from "./schema";

function customersPath(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);

  return `/kunden?${searchParams.toString()}`;
}

function customerErrorPath(error: string) {
  return customersPath({ error });
}

function customerSuccessPath(success: string) {
  return customersPath({ success });
}

function isUniqueViolation(error: { code?: string }) {
  return error.code === "23505";
}

function revalidateCustomerMasterData() {
  updateTag(CACHE_TAG_PROJECT_DETAIL_OPTIONS);
  updateTag(CACHE_TAG_REPORT_FILTER_OPTIONS);
  updateTag(CACHE_TAG_TASK_PICKER_ITEMS);
}

export async function createCustomer(formData: FormData) {
  await requireAdminSession();

  const parsed = createCustomerSchema.safeParse({
    name: formValue(formData, "name"),
  });

  if (!parsed.success) {
    redirect(customerErrorPath("ungueltiger-name"));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("customers").insert({
    name: parsed.data.name,
    status: "active",
  });

  if (error) {
    redirect(
      customerErrorPath(isUniqueViolation(error) ? "name-vergeben" : "speichern"),
    );
  }

  revalidatePath("/kunden");
  revalidateCustomerMasterData();
  redirect(customerSuccessPath("angelegt"));
}

export async function updateCustomer(formData: FormData) {
  await requireAdminSession();

  const parsed = updateCustomerSchema.safeParse({
    id: formValue(formData, "id"),
    name: formValue(formData, "name"),
    status: formValue(formData, "status"),
  });

  if (!parsed.success) {
    redirect(customerErrorPath("ungueltige-eingabe"));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: parsed.data.name,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.id);

  if (error) {
    redirect(
      customerErrorPath(isUniqueViolation(error) ? "name-vergeben" : "speichern"),
    );
  }

  revalidatePath("/kunden");
  revalidateCustomerMasterData();
  redirect(customerSuccessPath("aktualisiert"));
}

export async function deactivateCustomer(formData: FormData) {
  await requireAdminSession();

  const parsed = customerStatusActionSchema.safeParse({
    id: formValue(formData, "id"),
    confirmed: formData.get("confirmed") === "1",
  });

  if (!parsed.success) {
    redirect(customerErrorPath("ungueltige-eingabe"));
  }

  const activeProjectCount = await getActiveProjectCount(parsed.data.id);

  if (activeProjectCount > 0 && !parsed.data.confirmed) {
    redirect(
      customersPath({
        deactivate: parsed.data.id,
        warning: "aktive-projekte",
      }),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("customers")
    .update({ status: "inactive" })
    .eq("id", parsed.data.id);

  if (error) {
    redirect(customerErrorPath("speichern"));
  }

  revalidatePath("/kunden");
  revalidateCustomerMasterData();
  redirect(customerSuccessPath("deaktiviert"));
}

export async function activateCustomer(formData: FormData) {
  await requireAdminSession();

  const parsed = customerStatusActionSchema.safeParse({
    id: formValue(formData, "id"),
    confirmed: true,
  });

  if (!parsed.success) {
    redirect(customerErrorPath("ungueltige-eingabe"));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("customers")
    .update({ status: "active" })
    .eq("id", parsed.data.id);

  if (error) {
    redirect(customerErrorPath("speichern"));
  }

  revalidatePath("/kunden");
  revalidateCustomerMasterData();
  redirect(customerSuccessPath("aktiviert"));
}
