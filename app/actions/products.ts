"use server";

import { supabase } from "@/app/lib/conections/supabase";
import { revalidatePath } from "next/cache";
import { InventoryMovement, MovementType } from "@/app/types/product";

export async function searchProducts(
  query: string,
  page: number = 1,
  pageSize: number = 20
) {
  const pageStart = (page - 1) * pageSize;
  const pageEnd = page * pageSize - 1;

  if (!query.trim()) {
    const { data, error, count } = await supabase
      .from("products")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(pageStart, pageEnd);

    return { data: data || [], error, count: count || 0 };
  }

  // Construir búsqueda en múltiples campos (sin id porque es UUID)
  const { data, error, count } = await supabase
    .from("products")
    .select("*", { count: "exact" })
    .or(`name.ilike.%${query}%,barcode.ilike.%${query}%,description.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .range(pageStart, pageEnd);

  return { data: data || [], error, count: count || 0 };
}

export async function searchProductByBarcode(barcode: string) {
  if (!barcode.trim()) {
    return { data: null, error: "Código de barras vacío" };
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("barcode", barcode.trim())
    .single();

  if (error) {
    return { data: null, error: "Producto no encontrado" };
  }

  return { data, error: null };
}

export async function createProduct(formData: FormData, createdBy?: string) {
  const stock_inicial = parseInt(formData.get("stock") as string) || 0;
  
  const product = {
    name: formData.get("name") as string,
    barcode: formData.get("barcode") as string || null,
    description: formData.get("description") as string || null,
    stock: stock_inicial,
    stock_inicial: stock_inicial,
    unit_of_measure: formData.get("unit_of_measure") as string || null,
    administration_route: formData.get("administration_route") as string || null,
    notes: formData.get("notes") as string || null,
    issue_date: formData.get("issue_date") as string || null,
    expiration_date: formData.get("expiration_date") as string || null,
    image_url: formData.get("image_url") as string || null,
    created_by: createdBy || "Sistema",
    updated_by: createdBy || "Sistema",
  };

  const { error } = await supabase.from("products").insert([product]);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateProduct(id: string, formData: FormData, updatedBy?: string) {
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
    updated_by: updatedBy || "Sistema",
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
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

// ============ FUNCIONES DE MOVIMIENTOS DE INVENTARIO ============

export async function recordInventoryMovement(
  productId: string,
  movementType: MovementType,
  quantity: number,
  reason?: string,
  notes?: string,
  recordedBy?: string
) {
  if (quantity <= 0) {
    return { success: false, error: "La cantidad debe ser mayor a 0" };
  }

  // Obtener stock actual del producto
  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("id, stock")
    .eq("id", productId)
    .is("deleted_at", null)
    .single();

  if (productError || !productData) {
    return { success: false, error: "Producto no encontrado" };
  }

  const delta = movementType === "entrada" ? quantity : -quantity;
  const newStock = (productData.stock || 0) + delta;

  if (newStock < 0) {
    return { success: false, error: "Stock insuficiente" };
  }

  const movement = {
    product_id: productId,
    movement_type: movementType,
    quantity,
    reason: reason || null,
    notes: notes || null,
    recorded_by: recordedBy || "Sistema",
  };

  const { data, error } = await supabase
    .from("inventory_movements")
    .insert([movement])
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  // Actualizar el stock directamente en products
  await supabase
    .from("products")
    .update({ stock: newStock, updated_at: new Date().toISOString(), updated_by: recordedBy || "Sistema" })
    .eq("id", productId);

  revalidatePath("/");
  return { success: true, data };
}

async function updateProductStock(productId: string) {
  // Obtener el stock actual desde la vista
  const { data, error } = await supabase
    .from("product_stock_summary")
    .select("stock_actual")
    .eq("id", productId)
    .single();

  if (error) {
    console.error("Error updating product stock:", error);
    return;
  }

  if (data) {
    await supabase
      .from("products")
      .update({ stock: data.stock_actual })
      .eq("id", productId);
  }
}

export async function getProductMovements(
  productId: string,
  limit: number = 50
) {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}

export async function getProductStockSummary(productId: string) {
  const { data, error } = await supabase
    .from("product_stock_summary")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getAllProductsStockSummary() {
  const { data, error } = await supabase
    .from("product_stock_summary")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}
