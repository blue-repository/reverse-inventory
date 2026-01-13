"use server";

import { supabase } from "@/app/lib/conections/supabase";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  const product = {
    name: formData.get("name") as string,
    barcode: formData.get("barcode") as string || null,
    description: formData.get("description") as string || null,
    stock: parseInt(formData.get("stock") as string) || 0,
    unit_of_measure: formData.get("unit_of_measure") as string || null,
    administration_route: formData.get("administration_route") as string || null,
    notes: formData.get("notes") as string || null,
    issue_date: formData.get("issue_date") as string || null,
    expiration_date: formData.get("expiration_date") as string || null,
    image_url: formData.get("image_url") as string || null,
  };

  const { error } = await supabase.from("products").insert([product]);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateProduct(id: string, formData: FormData) {
  const product = {
    name: formData.get("name") as string,
    barcode: formData.get("barcode") as string || null,
    description: formData.get("description") as string || null,
    stock: parseInt(formData.get("stock") as string) || 0,
    unit_of_measure: formData.get("unit_of_measure") as string || null,
    administration_route: formData.get("administration_route") as string || null,
    notes: formData.get("notes") as string || null,
    issue_date: formData.get("issue_date") as string || null,
    expiration_date: formData.get("expiration_date") as string || null,
    image_url: formData.get("image_url") as string || null,
  };

  const { error } = await supabase
    .from("products")
    .update(product)
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}
