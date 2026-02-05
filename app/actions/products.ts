"use server";

import { supabase } from "@/app/lib/conections/supabase";
import { revalidatePath } from "next/cache";
import { InventoryMovement, MovementType, ProductBatch } from "@/app/types/product";
import { normalizeSearchText } from "@/app/lib/search-utils";

export async function searchProducts(
  query: string,
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    category?: string;
    specialty?: string;
    stockMin?: number;
    stockMax?: number;
    expirationDateFrom?: string;
    expirationDateTo?: string;
    hasImage?: boolean;
    hasBarcode?: boolean;
  }
) {
  const pageStart = (page - 1) * pageSize;
  const pageEnd = page * pageSize - 1;

  try {
    // Obtener todos los productos no eliminados (sin paginación inicial)
    const { data: allProducts, error } = await supabase
      .from("products")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error || !allProducts) {
      return { data: [], error: error?.message || "Error al buscar productos", count: 0 };
    }

    let filtered = [...allProducts];

    // Aplicar filtro de búsqueda por query
    if (query.trim()) {
      const normalizedQuery = normalizeSearchText(query);

      filtered = filtered.filter((product) => {
        const normalizedName = normalizeSearchText(product.name || "");
        const normalizedDescription = normalizeSearchText(product.description || "");
        const normalizedBarcode = normalizeSearchText(product.barcode || "");

        return (
          normalizedName.includes(normalizedQuery) ||
          normalizedDescription.includes(normalizedQuery) ||
          normalizedBarcode.includes(normalizedQuery)
        );
      });
    }

    // Aplicar filtros adicionales
    if (filters) {
      if (filters.category) {
        filtered = filtered.filter((product) => product.category === filters.category);
      }

      if (filters.specialty) {
        filtered = filtered.filter((product) => product.specialty === filters.specialty);
      }

      if (filters.stockMin !== undefined) {
        filtered = filtered.filter((product) => product.stock >= filters.stockMin!);
      }

      if (filters.stockMax !== undefined) {
        filtered = filtered.filter((product) => product.stock <= filters.stockMax!);
      }

      if (filters.expirationDateFrom) {
        filtered = filtered.filter((product) => {
          if (!product.expiration_date) return false;
          return new Date(product.expiration_date) >= new Date(filters.expirationDateFrom!);
        });
      }

      if (filters.expirationDateTo) {
        filtered = filtered.filter((product) => {
          if (!product.expiration_date) return false;
          return new Date(product.expiration_date) <= new Date(filters.expirationDateTo!);
        });
      }

      if (filters.hasImage) {
        filtered = filtered.filter((product) => product.image_url && product.image_url.trim() !== "");
      }

      if (filters.hasBarcode) {
        filtered = filtered.filter((product) => product.barcode && product.barcode.trim() !== "");
      }
    }

    // Ordenar: primero por stock (descendente para que stock > 0 aparezca primero), luego alfabéticamente
    filtered.sort((a, b) => {
      // Primero por stock (mayor a menor)
      if (b.stock !== a.stock) {
        return b.stock - a.stock;
      }
      // Luego alfabéticamente por nombre
      return (a.name || "").localeCompare(b.name || "");
    });

    // Aplicar paginación al resultado filtrado
    const paginatedData = filtered.slice(pageStart, pageEnd + 1);
    return { data: paginatedData, error: null, count: filtered.length };
  } catch (err: any) {
    return {
      data: [],
      error: err.message || "Error desconocido en búsqueda",
      count: 0,
    };
  }
}

export async function searchProductByBarcode(barcode: string) {
  if (!barcode.trim()) {
    return { data: null, error: "Código de barras vacío" };
  }

  const normalizedBarcode = normalizeSearchText(barcode);

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .is("deleted_at", null);

  if (error || !data) {
    return { data: null, error: "Producto no encontrado" };
  }

  // Buscar coincidencia exacta (normalizada) o aproximada
  const match = data.find(
    (product) =>
      normalizeSearchText(product.barcode || "") === normalizedBarcode ||
      normalizeSearchText(product.barcode || "") === barcode.trim()
  );

  if (!match) {
    return { data: null, error: "Producto no encontrado" };
  }

  return { data: match, error: null };
}

export async function getProduct(productId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message || "Producto no encontrado" };
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
    shelf: formData.get("shelf") as string || null,
    drawer: formData.get("drawer") as string || null,
    section: formData.get("section") as string || null,
    location_notes: formData.get("location_notes") as string || null,
    category: formData.get("category") as string || null,
    specialty: formData.get("specialty") as string || null,
    reporting_unit: formData.get("reporting_unit") as string || null,
    created_by: createdBy || "Sistema",
    updated_by: createdBy || "Sistema",
  };

  const { data: createdProduct, error } = await supabase
    .from("products")
    .insert([product])
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Crear lote inicial automático si hay stock inicial
  if (createdProduct && stock_inicial > 0) {
    const today = new Date().toISOString().split("T")[0];
    const expirationDate = formData.get("expiration_date") as string || 
      new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0];

    const batch = {
      product_id: createdProduct.id,
      batch_number: `STOCK-INICIAL-${Date.now()}`,
      stock: stock_inicial,
      initial_stock: stock_inicial,
      issue_date: formData.get("issue_date") as string || today,
      expiration_date: expirationDate,
      shelf: formData.get("shelf") as string || null,
      drawer: formData.get("drawer") as string || null,
      section: formData.get("section") as string || null,
      location_notes: formData.get("location_notes") as string || null,
      is_active: true,
      created_by: createdBy || "Sistema",
      updated_by: createdBy || "Sistema",
    };

    await supabase.from("product_batches").insert([batch]);
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
    shelf: formData.get("shelf") as string || null,
    drawer: formData.get("drawer") as string || null,
    section: formData.get("section") as string || null,
    location_notes: formData.get("location_notes") as string || null,
    category: formData.get("category") as string || null,
    specialty: formData.get("specialty") as string || null,
    reporting_unit: formData.get("reporting_unit") as string || null,
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
  // Primero obtener el producto para ver si tiene imagen
  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("image_url")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchError) {
    return { success: false, error: "Producto no encontrado" };
  }

  // Extraer path de la imagen si existe
  const extractPathFromUrl = (url: string | null) => {
    if (!url) return null;
    const bucket = "bagatela-inventory-bucket";
    const bucketIndex = url.indexOf(bucket);
    if (bucketIndex === -1) return null;
    const startIndex = bucketIndex + bucket.length + 1;
    const path = url.substring(startIndex);
    return path.split("?")[0];
  };

  // Eliminar imagen del bucket si existe
  if (product?.image_url) {
    const imagePath = extractPathFromUrl(product.image_url);
    if (imagePath) {
      try {
        await supabase.storage
          .from("bagatela-inventory-bucket")
          .remove([imagePath]);
      } catch (err) {
        console.warn("No se pudo eliminar la imagen del bucket:", err);
      }
    }
  }

  // Soft delete: actualizar deleted_at y limpiar image_url
  const { error } = await supabase
    .from("products")
    .update({ 
      deleted_at: new Date().toISOString(),
      image_url: null 
    })
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

export async function recordBulkInventoryMovements(
  movements: Array<{
    product_id: string;
    quantity: number;
    type: MovementType;
    reason?: string;
    notes?: string;
    user_id: string;
    // Campos automáticos
    movement_group_id?: string;
    movement_date?: string;
    is_recipe_movement?: boolean;
    // Datos de lote para entradas
    batch_number?: string;
    issue_date?: string;
    expiration_date?: string;
    shelf?: string;
    drawer?: string;
    section?: string;
    location_notes?: string;
    // Campos de receta médica
    prescription_group_id?: string;
    recipe_code?: string;
    recipe_date?: string;
    patient_name?: string;
    prescribed_by?: string;
    cie_code?: string;
    recipe_notes?: string;
  }>
) {
  try {
    // Validar todos los movimientos antes de procesarlos
    for (const movement of movements) {
      if (movement.quantity <= 0) {
        return { success: false, error: `Cantidad inválida para producto: ${movement.product_id}` };
      }

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id, stock")
        .eq("id", movement.product_id)
        .is("deleted_at", null)
        .single();

      if (productError || !productData) {
        return { success: false, error: `Producto no encontrado: ${movement.product_id}` };
      }

      const delta = movement.type === "entrada" ? movement.quantity : -movement.quantity;
      const newStock = (productData.stock || 0) + delta;

      // Solo validar stock insuficiente para salidas (no para entradas)
      if (movement.type !== "entrada" && newStock < 0) {
        return { success: false, error: `Stock insuficiente para producto: ${movement.product_id}` };
      }
    }

    // Procesar cada movimiento
    const insertData = [];
    const updatePromises = [];

    for (const movement of movements) {
      // Obtener el producto actual para calcular nuevo stock
      const { data: productData } = await supabase
        .from("products")
        .select("stock")
        .eq("id", movement.product_id)
        .single();

      const delta = movement.type === "entrada" ? movement.quantity : -movement.quantity;
      const newStock = (productData?.stock || 0) + delta;

      // Registrar movimiento de inventario
      insertData.push({
        product_id: movement.product_id,
        movement_type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason || null,
        notes: movement.notes || null,
        recorded_by: movement.user_id || "Sistema",
        // Campos automáticos
        movement_group_id: movement.movement_group_id || null,
        movement_date: movement.movement_date || null,
        is_recipe_movement: movement.is_recipe_movement || false,
        // Campos de receta médica
        prescription_group_id: movement.prescription_group_id || null,
        recipe_code: movement.recipe_code || null,
        recipe_date: movement.recipe_date || null,
        patient_name: movement.patient_name || null,
        prescribed_by: movement.prescribed_by || null,
        cie_code: movement.cie_code || null,
        recipe_notes: movement.recipe_notes || null,
      });

      // Si es entrada y tienen datos de lote, crear el batch
      if (movement.type === "entrada" && movement.batch_number) {
        insertData.push({
          product_id: movement.product_id,
          batch_number: movement.batch_number,
          stock: movement.quantity,
          initial_stock: movement.quantity,
          issue_date: movement.issue_date || new Date().toISOString().split("T")[0],
          expiration_date: movement.expiration_date,
          shelf: movement.shelf || null,
          drawer: movement.drawer || null,
          section: movement.section || null,
          location_notes: movement.location_notes || null,
          is_active: true,
        });
      }

      // Actualizar stock del producto
      updatePromises.push(
        supabase
          .from("products")
          .update({
            stock: newStock,
            updated_at: new Date().toISOString(),
            updated_by: movement.user_id || "Sistema",
          })
          .eq("id", movement.product_id)
      );
    }

    // Insertar movimientos de inventario
    const { error: insertError } = await supabase
      .from("inventory_movements")
      .insert(
        insertData.filter(
          (item) => item.movement_type !== undefined
        ) as Array<{
          product_id: string;
          movement_type: MovementType;
          quantity: number;
          reason: string | null;
          notes: string | null;
          recorded_by: string;
          movement_group_id: string | null;
          movement_date: string | null;
          is_recipe_movement: boolean;
          prescription_group_id: string | null;
          recipe_code: string | null;
          recipe_date: string | null;
          patient_name: string | null;
          prescribed_by: string | null;
          cie_code: string | null;
          recipe_notes: string | null;
        }>
      );

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Insertar batches si hay
    const batches = insertData.filter((item) => item.batch_number !== undefined);
    if (batches.length > 0) {
      const { error: batchError } = await supabase
        .from("product_batches")
        .insert(
          batches as Array<{
            product_id: string;
            batch_number: string;
            stock: number;
            initial_stock: number;
            issue_date: string;
            expiration_date: string;
            shelf: string | null;
            drawer: string | null;
            section: string | null;
            location_notes: string | null;
            is_active: boolean;
          }>
        );

      if (batchError) {
        return { success: false, error: batchError.message };
      }
    }

    // Ejecutar todas las actualizaciones de stock
    await Promise.all(updatePromises);

    revalidatePath("/");
    return { success: true, count: movements.length };
  } catch (error) {
    console.error("Error in recordBulkInventoryMovements:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
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

// ============ FUNCIONES DE GESTIÓN DE LOTES ============

export async function getProductBatches(productId: string) {
  const { data, error } = await supabase
    .from("product_batches")
    .select("*")
    .eq("product_id", productId)
    .order("expiration_date", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}

export async function createBatch(
  productId: string,
  formData: FormData,
  createdBy?: string
) {
  const batch = {
    product_id: productId,
    batch_number: formData.get("batch_number") as string,
    stock: parseInt(formData.get("stock") as string) || 0,
    initial_stock: parseInt(formData.get("stock") as string) || 0,
    issue_date: formData.get("issue_date") as string || null,
    expiration_date: formData.get("expiration_date") as string,
    shelf: formData.get("shelf") as string || null,
    drawer: formData.get("drawer") as string || null,
    section: formData.get("section") as string || null,
    location_notes: formData.get("location_notes") as string || null,
    is_active: true,
    created_by: createdBy || "Sistema",
    updated_by: createdBy || "Sistema",
  };

  const { error } = await supabase
    .from("product_batches")
    .insert([batch]);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateBatch(
  batchId: string,
  formData: FormData,
  updatedBy?: string
) {
  const batch = {
    batch_number: formData.get("batch_number") as string,
    stock: parseInt(formData.get("stock") as string) || 0,
    issue_date: formData.get("issue_date") as string || null,
    expiration_date: formData.get("expiration_date") as string,
    shelf: formData.get("shelf") as string || null,
    drawer: formData.get("drawer") as string || null,
    section: formData.get("section") as string || null,
    location_notes: formData.get("location_notes") as string || null,
    updated_by: updatedBy || "Sistema",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("product_batches")
    .update(batch)
    .eq("id", batchId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteBatch(batchId: string) {
  // Soft delete: desactivar el lote
  const { error } = await supabase
    .from("product_batches")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", batchId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function getBatchesExparingSoon(days: number = 30) {
  const { data, error } = await supabase
    .from("batches_expiring_soon")
    .select("*")
    .order("expiration_date", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}

export async function getProductBatchSummary(productId: string) {
  const { data, error } = await supabase
    .from("product_batch_summary")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function deleteBatchWithMovement(
  batchId: string,
  productId: string,
  quantity: number,
  reason: string,
  observations?: string,
  recordedBy?: string
) {
  try {
    // Obtener información del producto
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("id, stock")
      .eq("id", productId)
      .is("deleted_at", null)
      .single();

    if (productError || !productData) {
      return { success: false, error: "Producto no encontrado" };
    }

    // Registrar movimiento de salida
    const movement = {
      product_id: productId,
      movement_type: "salida",
      quantity,
      reason: reason || "Eliminación de lote",
      notes: observations || null,
      recorded_by: recordedBy || "Sistema",
    };

    const { error: movementError } = await supabase
      .from("inventory_movements")
      .insert([movement]);

    if (movementError) {
      return { success: false, error: `Error al registrar movimiento: ${movementError.message}` };
    }

    // Actualizar stock del producto (restar la cantidad del lote)
    const newStock = Math.max(0, (productData.stock || 0) - quantity);
    await supabase
      .from("products")
      .update({ 
        stock: newStock, 
        updated_at: new Date().toISOString(),
        updated_by: recordedBy || "Sistema"
      })
      .eq("id", productId);

    // Desactivar (soft delete) el lote
    const { error: deleteError } = await supabase
      .from("product_batches")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", batchId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error desconocido" };
  }
}

export async function getAllCategoriesAndSpecialties() {
  try {
    // Obtener todos los productos no eliminados
    const { data: allProducts, error } = await supabase
      .from("products")
      .select("category, specialty")
      .is("deleted_at", null);

    if (error || !allProducts) {
      return { categories: [], specialties: [] };
    }

    // Extraer categorías únicas
    const categories = Array.from(
      new Set(allProducts.map((p) => p.category).filter(Boolean))
    ) as string[];
    categories.sort();

    // Extraer especialidades únicas
    const specialties = Array.from(
      new Set(allProducts.map((p) => p.specialty).filter(Boolean))
    ) as string[];
    specialties.sort();

    // Las especialidades predeterminadas siempre disponibles
    const PREDEFINED_SPECIALTIES = [
      "Enfermería",
      "Cirugía",
      "Traumatología",
      "Enfermería/Laboratorio clínico y microbiología",
      "Anestesiología / Cuidados intensivos",
      "Ginecología / Obstetricia",
      "Central de esterilización",
      "Atención Pre-hospitalaria",
      "Uso General",
      "Enfermería/Terapia respiratoria",
      "Especialidades quirúrgicas",
    ];

    // Combinar especialidades de BD con las predefinidas
    const allSpecialties = Array.from(
      new Set([...specialties, ...PREDEFINED_SPECIALTIES])
    ) as string[];
    allSpecialties.sort();

    return { categories, specialties: allSpecialties };
  } catch (err: any) {
    return { categories: [], specialties: [] };
  }
}

