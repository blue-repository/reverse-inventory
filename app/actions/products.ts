"use server";

import { supabase } from "@/app/lib/conections/supabase";
import { revalidatePath } from "next/cache";
import { InventoryMovement, MovementType, ProductBatch } from "@/app/types/product";
import { normalizeSearchText } from "@/app/lib/search-utils";

// ============ TIPOS PARA MOVIMIENTOS CENTRALIZADOS ============

export interface BatchHandlingInfo {
  // Para salidas: lote existente a descontar
  batchId?: string;
  
  // Para entradas: datos para crear nuevo lote
  batchInfo?: {
    batch_number: string;
    issue_date?: string;
    expiration_date?: string;
    shelf?: string;
    drawer?: string;
    section?: string;
    location_notes?: string;
  };
  
  // Para recetas: buscar lote por número específico
  batchSearchNumber?: string;
  expirationDate?: string; // Para mostrar en notas si no se encuentra
}

export interface MovementWithBatchHandling {
  product_id: string;
  quantity: number;
  type: MovementType;
  reason?: string;
  notes?: string;
  recorded_by?: string;
  
  // Campos de agrupación (para múltiples movimientos)
  movement_group_id?: string;
  movement_date?: string;
  
  // Datos de receta médica
  is_recipe_movement?: boolean;
  prescription_group_id?: string;
  recipe_code?: string;
  recipe_date?: string;
  patient_name?: string;
  prescribed_by?: string;
  cie_code?: string;
  recipe_notes?: string;
  patient_identification?: string;
  allowNegativeStock?: boolean;
  from_pdf_movement?: boolean;
  
  // Manejo de lotes
  batchHandling?: BatchHandlingInfo;
}

export interface MovementsResult {
  success: boolean;
  error?: string;
  batchIssues?: string[]; // Advertencias de lotes
  count?: number;
  data?: any;
}

/**
 * Función centralizada para registrar movimientos de inventario con manejo automático de lotes
 * 
 * Soporta:
 * - Entradas con creación automática de lotes
 * - Salidas con desconexión de lotes específicos
 * - Búsqueda dinámica de lotes (para recetas)
 * - Ajuste automático de cantidad si el lote no tiene suficiente stock
 * - Registro automático en movement_batch_details
 * 
 * @param movements Array de movimientos a procesar
 * @returns Resultado con status, errores y advertencias
 */
export async function recordMovementsWithBatchHandling(
  movements: MovementWithBatchHandling[]
): Promise<MovementsResult> {
  try {
    if (!movements || movements.length === 0) {
      return { success: false, error: "No hay movimientos para procesar" };
    }

    const batchIssues: string[] = [];

    // Validar que todos los productos existan
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

      // Pre-validación: si es salida sin manejo de lote específico, validar stock general
      if (movement.type === "salida" && !movement.batchHandling?.batchId && !movement.batchHandling?.batchSearchNumber) {
        if (productData.stock < movement.quantity) {
          if (!movement.allowNegativeStock) {
            return { success: false, error: `Stock insuficiente para producto: ${movement.product_id}` };
          }
        }
      }
    }

    // Procesar cada movimiento
    for (const movement of movements) {
      // Obtener stock actual del producto (puede haber cambiado)
      const { data: productData } = await supabase
        .from("products")
        .select("stock")
        .eq("id", movement.product_id)
        .single();

      const delta = movement.type === "entrada" ? movement.quantity : -movement.quantity;
      const newStock = (productData?.stock || 0) + delta;

      if (newStock < 0 && !movement.allowNegativeStock) {
        return { success: false, error: `Stock insuficiente para producto: ${movement.product_id}` };
      }

      // Construir datos base del movimiento
      const movementData: any = {
        product_id: movement.product_id,
        movement_type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason || null,
        notes: movement.notes || null,
        recorded_by: movement.recorded_by || "Sistema",
        movement_group_id: movement.movement_group_id || null,
        movement_date: movement.movement_date || null,
        is_recipe_movement: movement.is_recipe_movement || false,
        prescription_group_id: movement.prescription_group_id || null,
        recipe_code: movement.recipe_code || null,
        recipe_date: movement.recipe_date || null,
        patient_name: movement.patient_name || null,
        prescribed_by: movement.prescribed_by || null,
        cie_code: movement.cie_code || null,
        recipe_notes: movement.recipe_notes || null,
        patient_identification: movement.patient_identification || null,
        from_pdf_movement: movement.from_pdf_movement === true ? true : null,
      };

      // Insertar movimiento
      const { data: insertedMovement, error: movementError } = await supabase
        .from("inventory_movements")
        .insert([movementData])
        .select("id")
        .single();

      if (movementError || !insertedMovement) {
        return { success: false, error: movementError?.message || "Error al insertar movimiento" };
      }

      // ==================== MANEJO DE LOTES ====================

      // 1. ENTRADA: Crear nuevo lote e insertar relación
      if (movement.type === "entrada" && movement.batchHandling?.batchInfo) {
        // Validar que tenga fecha de vencimiento (obligatoria para lotes)
        if (!movement.batchHandling.batchInfo.expiration_date) {
          return { success: false, error: "La fecha de vencimiento es obligatoria para crear un lote" };
        }

        const normalizedBatchNumber = movement.batchHandling.batchInfo.batch_number.trim();
        const { data: existingBatch, error: existingBatchError } = await supabase
          .from("product_batches")
          .select("id, stock")
          .eq("product_id", movement.product_id)
          .eq("batch_number", normalizedBatchNumber)
          .eq("is_active", true)
          .maybeSingle();

        if (existingBatchError) {
          return { success: false, error: existingBatchError.message };
        }

        let targetBatchId = "";
        let batchStockBefore = 0;
        let batchStockAfter = movement.quantity;

        if (existingBatch) {
          targetBatchId = existingBatch.id;
          batchStockBefore = existingBatch.stock || 0;
          batchStockAfter = batchStockBefore + movement.quantity;

          const { error: updateBatchError } = await supabase
            .from("product_batches")
            .update({
              stock: batchStockAfter,
              expiration_date: movement.batchHandling.batchInfo.expiration_date,
              issue_date:
                movement.batchHandling.batchInfo.issue_date ||
                new Date().toISOString().split("T")[0],
              shelf: movement.batchHandling.batchInfo.shelf || null,
              drawer: movement.batchHandling.batchInfo.drawer || null,
              section: movement.batchHandling.batchInfo.section || null,
              location_notes: movement.batchHandling.batchInfo.location_notes || null,
              updated_at: new Date().toISOString(),
              updated_by: movement.recorded_by || "Sistema",
            })
            .eq("id", targetBatchId);

          if (updateBatchError) {
            return { success: false, error: updateBatchError.message };
          }
        } else {
          const batchData = {
            product_id: movement.product_id,
            batch_number: normalizedBatchNumber,
            stock: movement.quantity,
            initial_stock: movement.quantity,
            issue_date: movement.batchHandling.batchInfo.issue_date || new Date().toISOString().split("T")[0],
            expiration_date: movement.batchHandling.batchInfo.expiration_date,
            shelf: movement.batchHandling.batchInfo.shelf || null,
            drawer: movement.batchHandling.batchInfo.drawer || null,
            section: movement.batchHandling.batchInfo.section || null,
            location_notes: movement.batchHandling.batchInfo.location_notes || null,
            is_active: true,
            created_by: movement.recorded_by || "Sistema",
            updated_by: movement.recorded_by || "Sistema",
          };

          const { data: insertedBatch, error: batchError } = await supabase
            .from("product_batches")
            .insert([batchData])
            .select("id")
            .single();

          if (batchError || !insertedBatch) {
            return { success: false, error: batchError?.message || "Error al create lote" };
          }

          targetBatchId = insertedBatch.id;
        }

        const { error: movementBatchDetailError } = await supabase
          .from("movement_batch_details")
          .insert([
            {
              movement_id: insertedMovement.id,
              batch_id: targetBatchId,
              quantity: movement.quantity,
              batch_stock_before: batchStockBefore,
              batch_stock_after: batchStockAfter,
            },
          ]);

        if (movementBatchDetailError) {
          return { success: false, error: movementBatchDetailError.message };
        }
      }
      // 2. SALIDA CON LOTE ESPECÍFICO POR ID: Descontar de lote existente
      else if (movement.type === "salida" && movement.batchHandling?.batchId) {
        const { data: batch, error: batchError } = await supabase
          .from("product_batches")
          .select("id, stock, batch_number")
          .eq("id", movement.batchHandling.batchId)
          .eq("is_active", true)
          .single();

        if (!batch || batchError) {
          batchIssues.push(`Lote no encontrado: ${movement.batchHandling.batchId}`);
          // Continuar sin actualizar lote (solo se descuenta del stock general)
        } else {
          // Validar stock disponible en el lote
          const quantityToDeduct = Math.min(batch.stock, movement.quantity);
          const newBatchStock = batch.stock - quantityToDeduct;

          // Actualizar stock del lote
          await supabase
            .from("product_batches")
            .update({
              stock: newBatchStock,
              updated_at: new Date().toISOString(),
              updated_by: movement.recorded_by || "Sistema"
            })
            .eq("id", movement.batchHandling.batchId);

          // Registrar relación movement_batch_details
          await supabase.from("movement_batch_details").insert([{
            movement_id: insertedMovement.id,
            batch_id: movement.batchHandling.batchId,
            quantity: quantityToDeduct,
            batch_stock_before: batch.stock,
            batch_stock_after: newBatchStock,
          }]);
        }
      }
      // 3. SALIDA CON BÚSQUEDA DE LOTE POR NÚMERO: Buscar y descontar
      else if (movement.type === "salida" && movement.batchHandling?.batchSearchNumber) {
        const searchBatchNumber = movement.batchHandling.batchSearchNumber.trim();

        const { data: existingBatch, error: batchLookupError } = await supabase
          .from("product_batches")
          .select("id, stock, batch_number, expiration_date")
          .eq("product_id", movement.product_id)
          .eq("batch_number", searchBatchNumber)
          .eq("is_active", true)
          .maybeSingle();

        if (batchLookupError) {
          return {
            success: false,
            error: `Error consultando lote ${searchBatchNumber} para producto ${movement.product_id}: ${batchLookupError.message}`,
          };
        }

        const today = new Date().toISOString().split("T")[0];
        const fallbackExpiration = new Date(
          new Date().setFullYear(new Date().getFullYear() + 1)
        )
          .toISOString()
          .split("T")[0];

        let batch = existingBatch;

        if (!batch) {
          const expirationFromPdf = movement.batchHandling.expirationDate?.trim();
          const { data: createdBatch, error: createBatchError } = await supabase
            .from("product_batches")
            .insert([
              {
                product_id: movement.product_id,
                batch_number: searchBatchNumber,
                stock: 0,
                initial_stock: 0,
                issue_date: movement.movement_date || today,
                expiration_date: expirationFromPdf || fallbackExpiration,
                is_active: true,
                created_by: movement.recorded_by || "Sistema",
                updated_by: movement.recorded_by || "Sistema",
              },
            ])
            .select("id, stock, batch_number, expiration_date")
            .single();

          if (createBatchError || !createdBatch) {
            return {
              success: false,
              error:
                createBatchError?.message ||
                `No se pudo crear lote ${searchBatchNumber} para producto ${movement.product_id}`,
            };
          }

          batch = createdBatch;
        }

        const quantityToDeduct = movement.quantity;
        const currentBatchStock = batch.stock ?? 0;
        const newBatchStock = currentBatchStock - quantityToDeduct;

        if (currentBatchStock < movement.quantity) {
          batchIssues.push(
            `${movement.product_id} (Lote ${searchBatchNumber}): disponible ${currentBatchStock}, solicitado ${movement.quantity}. Se registra egreso en ese lote.`
          );
        }

        const { error: updateBatchError } = await supabase
          .from("product_batches")
          .update({
            stock: newBatchStock,
            updated_at: new Date().toISOString(),
            updated_by: movement.recorded_by || "Sistema",
          })
          .eq("id", batch.id);

        if (updateBatchError) {
          return {
            success: false,
            error: updateBatchError.message,
          };
        }

        const { error: movementBatchDetailError } = await supabase
          .from("movement_batch_details")
          .insert([
            {
              movement_id: insertedMovement.id,
              batch_id: batch.id,
              quantity: quantityToDeduct,
              batch_stock_before: currentBatchStock,
              batch_stock_after: newBatchStock,
            },
          ]);

        if (movementBatchDetailError) {
          return {
            success: false,
            error: movementBatchDetailError.message,
          };
        }
      }

      // Actualizar stock general del producto
      const { data: updatedProduct, error: updateProductError } = await supabase
        .from("products")
        .update({
          stock: newStock,
          updated_at: new Date().toISOString(),
          updated_by: movement.recorded_by || "Sistema",
        })
        .eq("id", movement.product_id)
        .select("id, stock")
        .single();

      if (updateProductError || !updatedProduct) {
        return {
          success: false,
          error: updateProductError?.message || `No se pudo actualizar stock para producto: ${movement.product_id}`,
        };
      }

      if (updatedProduct.stock !== newStock) {
        return {
          success: false,
          error: `Stock no persistido correctamente para producto ${movement.product_id}. Esperado: ${newStock}, actual: ${updatedProduct.stock}`,
        };
      }
    }

    revalidatePath("/");
    return {
      success: true,
      count: movements.length,
      batchIssues: batchIssues.length > 0 ? batchIssues : undefined,
    };
  } catch (error) {
    console.error("Error en recordMovementsWithBatchHandling:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

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
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error: error?.message || "Producto no encontrado" };
  }

  return { data, error: null };
}

export async function createProduct(formData: FormData, createdBy?: string) {
  const stock_inicial = parseInt(formData.get("stock") as string) || 0;
  const providedBatchNumber = (formData.get("batch_number") as string | null)?.trim() || "";
  const fromPdfMovement = formData.get("from_pdf_movement") === "true";
  const recipeCode = (formData.get("recipe_code") as string | null)?.trim() || undefined;
  const recipeDate = (formData.get("recipe_date") as string | null)?.trim() || undefined;
  const patientName = (formData.get("patient_name") as string | null)?.trim() || undefined;
  
  const product = {
    name: formData.get("name") as string,
    barcode: formData.get("barcode") as string || null,
    description: formData.get("description") as string || null,
    // El stock real se registra por movimiento centralizado de entrada.
    stock: 0,
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

  // Registrar ingreso inicial usando el flujo centralizado (movimiento + lote + stock).
  if (createdProduct && stock_inicial > 0) {
    const today = new Date().toISOString().split("T")[0];
    const expirationDate = formData.get("expiration_date") as string ||
      new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0];
    const initialBatchNumber = providedBatchNumber || `STOCK-INICIAL-${Date.now()}`;

    const movementResult = await recordMovementsWithBatchHandling([
      {
        product_id: createdProduct.id,
        quantity: stock_inicial,
        type: "entrada",
        reason: "Stock inicial",
        notes: "Ingreso inicial al crear producto",
        recorded_by: createdBy || "Sistema",
        movement_date: formData.get("issue_date") as string || today,
        recipe_code: recipeCode,
        recipe_date: recipeDate,
        patient_name: patientName,
        from_pdf_movement: fromPdfMovement,
        batchHandling: {
          batchInfo: {
            batch_number: initialBatchNumber,
            issue_date: formData.get("issue_date") as string || today,
            expiration_date: expirationDate,
            shelf: formData.get("shelf") as string || undefined,
            drawer: formData.get("drawer") as string || undefined,
            section: formData.get("section") as string || undefined,
            location_notes: formData.get("location_notes") as string || undefined,
          },
        },
      },
    ]);

    if (!movementResult.success) {
      // Si no se pudo registrar el ingreso inicial, no dejar producto huérfano sin movimiento.
      await supabase
        .from("products")
        .delete()
        .eq("id", createdProduct.id);

      return {
        success: false,
        error: movementResult.error || "No se pudo registrar el ingreso inicial del producto",
      };
    }
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
  recordedBy?: string,
  recipeData?: {
    recipeCode?: string;
    recipeDate?: string;
    patientName?: string;
    prescribedBy?: string;
    cieCode?: string;
    recipeNotes?: string;
  },
  specificBatches?: { batchId: string; quantity: number }[],
  entryBatchId?: string // ID del lote para entradas
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

  // Si se especifican lotes para salida, procesar con FEFO avanzado
  if (movementType === "salida" && specificBatches && specificBatches.length > 0) {
    try {
      // Obtener todos los lotes del producto ordenados por fecha de vencimiento (FEFO)
      const { data: allBatches, error: batchesError } = await supabase
        .from("product_batches")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .gt("stock", 0) // Solo lotes con stock > 0
        .order("expiration_date", { ascending: true });

      if (batchesError || !allBatches) {
        return { success: false, error: "Error al obtener los lotes" };
      }

      // Calcular cantidad total especificada por el usuario
      const totalFromSpecified = specificBatches.reduce((sum, b) => sum + b.quantity, 0);
      let remainingQuantity = quantity - totalFromSpecified;

      // Crear un mapa de actualizaciones de lotes
      const batchUpdates = new Map<string, number>();
      const batchChanges = new Map<string, { before: number; after: number; quantity: number }>();

      const addBatchChange = (batchId: string, before: number, after: number, quantity: number) => {
        const existing = batchChanges.get(batchId);
        if (existing) {
          batchChanges.set(batchId, {
            before: existing.before,
            after,
            quantity: existing.quantity + quantity,
          });
          return;
        }
        batchChanges.set(batchId, { before, after, quantity });
      };

      // 1. Procesar lotes especificados por el usuario
      for (const batchSelection of specificBatches) {
        const batch = allBatches.find(b => b.id === batchSelection.batchId);
        if (!batch) {
          return { success: false, error: `Lote no encontrado: ${batchSelection.batchId}` };
        }

        if (batch.stock < batchSelection.quantity) {
          return { success: false, error: `Stock insuficiente en el lote ${batch.batch_number}. Disponible: ${batch.stock}` };
        }

        const newStock = batch.stock - batchSelection.quantity;
        batchUpdates.set(batch.id, newStock);
        addBatchChange(batch.id, batch.stock, newStock, batchSelection.quantity);
      }

      // 2. Si hay cantidad restante, aplicar FEFO 
      if (remainingQuantity > 0) {
        // Obtener lotes disponibles excluyendo los ya especificados
        // Ordenar por fecha de vencimiento (más cercana primero)
        const batchesForFefo = allBatches
          .filter(b => !specificBatches.some(s => s.batchId === b.id))
          .sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime());

        // Intentar descontar de otros lotes (FEFO)
        for (const batch of batchesForFefo) {
          if (remainingQuantity <= 0) break;

          const currentStock = batchUpdates.get(batch.id) ?? batch.stock;
          if (currentStock > 0) {
            const quantityFromBatch = Math.min(currentStock, remainingQuantity);
            const newStock = currentStock - quantityFromBatch;
            batchUpdates.set(batch.id, newStock);
            addBatchChange(batch.id, currentStock, newStock, quantityFromBatch);
            remainingQuantity -= quantityFromBatch;
          }
        }

        // 3. Si todavía queda cantidad restante, volver a sacar de los lotes especificados originalmente
        if (remainingQuantity > 0) {
          for (const batchSelection of specificBatches) {
            if (remainingQuantity <= 0) break;

            const batch = allBatches.find(b => b.id === batchSelection.batchId);
            if (!batch) continue;

            const currentStock = batchUpdates.get(batch.id) ?? batch.stock;
            if (currentStock > 0) {
              const additionalQuantity = Math.min(currentStock, remainingQuantity);
              const newStock = currentStock - additionalQuantity;
              batchUpdates.set(batch.id, newStock);
              addBatchChange(batch.id, currentStock, newStock, additionalQuantity);
              remainingQuantity -= additionalQuantity;
            }
          }
        }

        // 4. Si aún queda cantidad restante, se descuenta solo del stock general del producto
        // (No se hace nada con los lotes, el stock general siempre se actualiza al final)
      }

      // Validar que ningún lote quede con stock negativo
      for (const [batchId, newStock] of batchUpdates) {
        if (newStock < 0) {
          return { success: false, error: "Error interno: stock negativo calculado en lote" };
        }
      }

      // Aplicar todas las actualizaciones de lotes
      for (const [batchId, newStock] of batchUpdates) {
        await supabase
          .from("product_batches")
          .update({
            stock: newStock,
            updated_at: new Date().toISOString(),
            updated_by: recordedBy || "Sistema"
          })
          .eq("id", batchId);
      }

      // Decrementar stock total del producto SIEMPRE por la cantidad total solicitada
      const newStock = (productData.stock || 0) - quantity;
      if (newStock < 0) {
        return { success: false, error: "Stock insuficiente en el producto" };
      }

      await supabase
        .from("products")
        .update({
          stock: newStock,
          updated_at: new Date().toISOString(),
          updated_by: recordedBy || "Sistema"
        })
        .eq("id", productId);

      // Registrar el movimiento
      const isRecipeMovement = reason === "Entrega de receta";

      const movement: any = {
        product_id: productId,
        movement_type: movementType,
        quantity,
        reason: reason || null,
        notes: notes || null,
        recorded_by: recordedBy || "Sistema",
      };

      if (isRecipeMovement && recipeData) {
        movement.is_recipe_movement = true;
        movement.prescription_group_id = crypto.randomUUID();
        movement.recipe_code = recipeData.recipeCode || null;
        movement.recipe_date = recipeData.recipeDate || null;
        movement.patient_name = recipeData.patientName || null;
        movement.prescribed_by = recipeData.prescribedBy || null;
        movement.cie_code = recipeData.cieCode || null;
        movement.recipe_notes = recipeData.recipeNotes || null;
      }

      const { data, error } = await supabase
        .from("inventory_movements")
        .insert([movement])
        .select();

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.length > 0 && batchChanges.size > 0) {
        await recordBatchDetails(data[0].id, batchChanges);
      }

      revalidatePath("/");
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || "Error al procesar los lotes" };
    }
  }

  // Lógica para cuando no se especifican lotes
  // Si es una salida, aplicar FEFO automáticamente
  if (movementType === "salida") {
    try {
      // Obtener todos los lotes del producto ordenados por fecha de vencimiento (FEFO)
      const { data: allBatches, error: batchesError } = await supabase
        .from("product_batches")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .gt("stock", 0)
        .order("expiration_date", { ascending: true });

      if (batchesError) {
        return { success: false, error: "Error al obtener los lotes" };
      }

      // Aplicar FEFO automático
      let remainingToAllocate = quantity;
      const batchUpdates = new Map<string, number>();
      const batchChanges = new Map<string, { before: number; after: number; quantity: number }>();

      if (allBatches && allBatches.length > 0) {
        for (const batch of allBatches) {
          if (remainingToAllocate <= 0) break;

          const quantityFromBatch = Math.min(batch.stock, remainingToAllocate);
          const newStock = batch.stock - quantityFromBatch;
          batchUpdates.set(batch.id, newStock);
          batchChanges.set(batch.id, {
            before: batch.stock,
            after: newStock,
            quantity: quantityFromBatch,
          });
          remainingToAllocate -= quantityFromBatch;
        }

        // Aplicar actualizaciones a los lotes
        for (const [batchId, newStock] of batchUpdates) {
          if (newStock < 0) {
            return { success: false, error: "Error interno: stock negativo calculado" };
          }

          await supabase
            .from("product_batches")
            .update({
              stock: newStock,
              updated_at: new Date().toISOString(),
              updated_by: recordedBy || "Sistema"
            })
            .eq("id", batchId);
        }
      }

      // Si quedó cantidad sin asignar a lotes, se descuenta solo del stock general
      // (esto puede pasar si no hay suficientes lotes)

      // Actualizar stock total del producto
      const newStock = (productData.stock || 0) - quantity;
      if (newStock < 0) {
        return { success: false, error: "Stock insuficiente" };
      }

      await supabase
        .from("products")
        .update({
          stock: newStock,
          updated_at: new Date().toISOString(),
          updated_by: recordedBy || "Sistema"
        })
        .eq("id", productId);

      // Registrar el movimiento
      const isRecipeMovement = reason === "Entrega de receta";

      const movement: any = {
        product_id: productId,
        movement_type: movementType,
        quantity,
        reason: reason || null,
        notes: notes || null,
        recorded_by: recordedBy || "Sistema",
      };

      if (isRecipeMovement && recipeData) {
        movement.is_recipe_movement = true;
        movement.prescription_group_id = crypto.randomUUID();
        movement.recipe_code = recipeData.recipeCode || null;
        movement.recipe_date = recipeData.recipeDate || null;
        movement.patient_name = recipeData.patientName || null;
        movement.prescribed_by = recipeData.prescribedBy || null;
        movement.cie_code = recipeData.cieCode || null;
        movement.recipe_notes = recipeData.recipeNotes || null;
      }

      const { data, error } = await supabase
        .from("inventory_movements")
        .insert([movement])
        .select();

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.length > 0 && batchChanges.size > 0) {
        await recordBatchDetails(data[0].id, batchChanges);
      }

      revalidatePath("/");
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || "Error al procesar la salida" };
    }
  }

  // Para entradas y ajustes, lógica normal (no afecta lotes)
  const delta = movementType === "entrada" ? quantity : -quantity;
  const newStock = (productData.stock || 0) + delta;

  if (newStock < 0) {
    return { success: false, error: "Stock insuficiente" };
  }

  // Nota: En este punto, movementType podría ser "entrada" o "ajuste" porque
  // las salidas se manejan en bloques anteriores, por lo que isRecipeMovement siempre será false
  const isRecipeMovement = false; // Solo salidas pueden ser recetas, y ya se manejaron arriba

  const movement: any = {
    product_id: productId,
    movement_type: movementType,
    quantity,
    reason: reason || null,
    notes: notes || null,
    recorded_by: recordedBy || "Sistema",
  };

  // Agregar campos de receta si es una entrega de receta
  if (isRecipeMovement && recipeData) {
    movement.is_recipe_movement = true;
    movement.prescription_group_id = crypto.randomUUID();
    movement.recipe_code = recipeData.recipeCode || null;
    movement.recipe_date = recipeData.recipeDate || null;
    movement.patient_name = recipeData.patientName || null;
    movement.prescribed_by = recipeData.prescribedBy || null;
    movement.cie_code = recipeData.cieCode || null;
    movement.recipe_notes = recipeData.recipeNotes || null;
  }

  const { data, error } = await supabase
    .from("inventory_movements")
    .insert([movement])
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  // Para entradas, registrar la relación con el lote si se proporciona entryBatchId
  if (movementType === "entrada" && entryBatchId && data && data.length > 0) {
    // El lote debe tener stock = cantidad (es un lote nuevo)
    const { data: batchData, error: batchError } = await supabase
      .from("product_batches")
      .select("stock")
      .eq("id", entryBatchId)
      .single();

    if (!batchError && batchData) {
      // Registrar relación en movement_batch_details
      // batch_stock_before = 0 porque es un lote nuevo
      // batch_stock_after = quantity (la cantidad agregada es el stock total del lote nuevo)
      await supabase.from("movement_batch_details").insert([{
        movement_id: data[0].id,
        batch_id: entryBatchId,
        quantity: quantity,
        batch_stock_before: 0, // El lote es nuevo
        batch_stock_after: quantity,
      }]);
    }
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
    // ID de lote existente para salidas (cuando se especifica un lote particular)
    batch_id?: string;
    // Campos de receta médica
    prescription_group_id?: string;
    recipe_code?: string;
    recipe_date?: string;
    patient_name?: string;
    prescribed_by?: string;
    cie_code?: string;
    recipe_notes?: string;
    patient_identification?: string;
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

    // Procesar cada movimiento individualmente para rastrear IDs
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
      const movementData = {
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
        patient_identification: movement.patient_identification || null,
      };

      // Insertar movimiento y obtener su ID
      const { data: insertedMovement, error: movementError } = await supabase
        .from("inventory_movements")
        .insert([movementData])
        .select("id")
        .single();

      if (movementError || !insertedMovement) {
        return { success: false, error: movementError?.message || "Error al insertar movimiento" };
      }

      // Si es salida y tiene batch_id especificado, procesar el lote
      if (movement.type === "salida" && movement.batch_id) {
        const { data: batch, error: batchError } = await supabase
          .from("product_batches")
          .select("id, stock")
          .eq("id", movement.batch_id)
          .eq("is_active", true)
          .single();

        if (batch && !batchError) {
          // Actualizar stock del lote
          const newBatchStock = Math.max(0, batch.stock - movement.quantity);
          await supabase
            .from("product_batches")
            .update({
              stock: newBatchStock,
              updated_at: new Date().toISOString(),
              updated_by: movement.user_id || "Sistema"
            })
            .eq("id", movement.batch_id);

          // Registrar relación en movement_batch_details
          await supabase.from("movement_batch_details").insert([{
            movement_id: insertedMovement.id,
            batch_id: movement.batch_id,
            quantity: movement.quantity,
            batch_stock_before: batch.stock,
            batch_stock_after: newBatchStock,
          }]);
        } else {
          // El lote no existe o está inactivo, solo registrar en notas
          console.warn(`Lote no encontrado o inactivo para movimiento ${insertedMovement.id}`);
        }
      }
      // Si es entrada y tienen datos de lote, crear el batch
      else if (movement.type === "entrada" && movement.batch_number) {
        const batchData = {
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
          created_by: movement.user_id || "Sistema",
          updated_by: movement.user_id || "Sistema",
        };

        // Insertar lote y obtener su ID
        const { data: insertedBatch, error: batchError } = await supabase
          .from("product_batches")
          .insert([batchData])
          .select("id")
          .single();

        if (batchError || !insertedBatch) {
          return { success: false, error: batchError?.message || "Error al insertar lote" };
        }

        // Registrar relación en movement_batch_details
        await supabase.from("movement_batch_details").insert([{
          movement_id: insertedMovement.id,
          batch_id: insertedBatch.id,
          quantity: movement.quantity,
          batch_stock_before: 0, // Para entradas, el lote se crea nuevo
          batch_stock_after: movement.quantity,
        }]);
      }

      // Actualizar stock del producto
      await supabase
        .from("products")
        .update({
          stock: newStock,
          updated_at: new Date().toISOString(),
          updated_by: movement.user_id || "Sistema",
        })
        .eq("id", movement.product_id);
    }

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

async function recordBatchDetails(
  movementId: string,
  batchChanges: Map<string, { before: number; after: number; quantity: number }>
) {
  const batchDetailsToInsert = [];

  for (const [batchId, change] of batchChanges.entries()) {
    batchDetailsToInsert.push({
      movement_id: movementId,
      batch_id: batchId,
      quantity: change.quantity,
      batch_stock_before: change.before,
      batch_stock_after: change.after,
    });
  }

  if (batchDetailsToInsert.length > 0) {
    await supabase.from("movement_batch_details").insert(batchDetailsToInsert);
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
  options?: {
    limit?: number;
    offset?: number;
    movementType?: "all" | "entrada" | "salida";
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const pageSize = options?.limit ?? 10;
  const offset = options?.offset ?? 0;
  const trimmedSearch = options?.search?.trim().toLowerCase();

  let baseQuery = supabase
    .from("inventory_movements")
    .select(
      "*, movement_batch_details(quantity, product_batches(batch_number))",
      { count: "exact" }
    )
    .eq("product_id", productId);

  if (options?.movementType && options.movementType !== "all") {
    baseQuery = baseQuery.eq("movement_type", options.movementType);
  }

  if (options?.dateFrom) {
    baseQuery = baseQuery.gte("recipe_date", options.dateFrom);
  }

  if (options?.dateTo) {
    baseQuery = baseQuery.lte("recipe_date", options.dateTo);
  }

  if (trimmedSearch) {
    const { data: allData, error } = await baseQuery.order("created_at", { ascending: false });

    if (error) {
      return { data: [], error: error.message, count: 0, hasMore: false };
    }

    const filtered = (allData || []).filter((movement: any) => {
      const byReason = (movement.reason || "").toLowerCase().includes(trimmedSearch);
      const byNotes = (movement.notes || "").toLowerCase().includes(trimmedSearch);
      const byRecipeCode = (movement.recipe_code || "").toLowerCase().includes(trimmedSearch);
      const byPatient = (movement.patient_name || "").toLowerCase().includes(trimmedSearch);
      const byBatchCode = (movement.movement_batch_details || []).some((detail: any) =>
        (detail.product_batches?.batch_number || "").toLowerCase().includes(trimmedSearch)
      );

      return byReason || byNotes || byRecipeCode || byPatient || byBatchCode;
    });

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + pageSize);

    return {
      data: paginated,
      error: null,
      count: total,
      hasMore: offset + paginated.length < total,
    };
  }

  const { data, error, count } = await baseQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    return { data: [], error: error.message, count: 0, hasMore: false };
  }

  const total = count ?? 0;
  const loaded = offset + (data?.length ?? 0);

  return {
    data: data || [],
    error: null,
    count: total,
    hasMore: loaded < total,
  };
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

  const { data: insertedBatch, error } = await supabase
    .from("product_batches")
    .insert([batch])
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, batchId: insertedBatch?.id };
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

