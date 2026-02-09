"use server";

import { supabase } from "@/app/lib/conections/supabase";
import { RecipeData, ProcessingResult } from "@/app/types/recipe";
import { recordMovementsWithBatchHandling } from "@/app/actions/products";
import { revalidatePath } from "next/cache";

/**
 * Crea un egreso en la base de datos basado en datos de receta extraída del PDF
 * 
 * Utiliza la misma lógica que BulkMovementModal para garantizar consistencia
 * en cómo se manejan los movimientos de inventario
 */
export async function createRecipeEgress(recipeData: RecipeData): Promise<ProcessingResult> {
  try {
    // Validación de datos obligatorios
    if (!recipeData.recipientName || !recipeData.egressNumber) {
      return {
        success: false,
        message: "Datos incompletos: falta nombre del receptor o número de egreso",
        error: "MISSING_DATA",
      };
    }

    // Validar que la receta no haya sido cargada previamente
    const { data: existingRecipe, error: checkError } = await supabase
      .from("inventory_movements")
      .select("id, recipe_code, created_at")
      .eq("recipe_code", recipeData.egressNumber)
      .limit(1);

    if (checkError) {
      console.error("Error al verificar receta duplicada:", checkError);
      return {
        success: false,
        message: "Error al validar la receta",
        error: "VALIDATION_ERROR",
      };
    }

    if (existingRecipe && existingRecipe.length > 0) {
      return {
        success: false,
        message: `Esta receta ya fue cargada previamente (Código: ${recipeData.egressNumber}). No se puede cargar la misma receta dos veces.`,
        error: "DUPLICATE_RECIPE",
      };
    }

    if (recipeData.medicaments.length === 0) {
      return {
        success: false,
        message: "No se encontraron medicamentos en el egreso",
        error: "NO_MEDICAMENTS",
      };
    }

    // Generar ID único para agrupar todos los medicamentos de la misma receta
    const prescriptionGroupId = crypto.randomUUID();

    // Transformar medicamentos a movimientos con la estructura esperada
    const movements = [];
    const productsNotFound: string[] = [];

    for (const medicament of recipeData.medicaments) {
      try {
        // Buscar el producto por barcode (equivalente al SKU del PDF)
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("id, name")
          .eq("barcode", medicament.sku)
          .is("deleted_at", null)
          .single();

        if (productError || !product) {
          productsNotFound.push(`SKU ${medicament.sku}`);
          continue;
        }

        // Construir el objeto de movimiento con información del lote para búsqueda
        const movement = {
          product_id: product.id as string,
          quantity: medicament.quantity,
          type: "salida" as const,
          reason: "Entrega de receta",
          notes: `Lote: ${medicament.batch || "No especificado"} | Vencimiento: ${medicament.expirationDate}`,
          recorded_by: "Sistema",
          
          // Campos de agrupación
          movement_group_id: prescriptionGroupId,
          movement_date: recipeData.egressDate,
          
          // Datos de receta médica
          is_recipe_movement: true,
          prescription_group_id: prescriptionGroupId,
          recipe_code: recipeData.egressNumber,
          recipe_date: recipeData.egressDate,
          patient_name: recipeData.patientName || recipeData.recipientName,
          prescribed_by: undefined,
          cie_code: undefined,
          recipe_notes: `Paciente ID: ${recipeData.patientIdentifier} | Receptor: ${recipeData.recipientName}`,
          patient_identification: recipeData.patientIdentifier,
          
          // Manejo de lote: buscar por número si está disponible
          batchHandling: medicament.batch && medicament.batch.trim()
            ? {
                batchSearchNumber: medicament.batch,
                expirationDate: medicament.expirationDate,
              }
            : undefined,
        };

        movements.push(movement);
      } catch (error) {
        console.error(`Error procesando medicamento ${medicament.sku}:`, error);
        productsNotFound.push(`${medicament.sku} (error: ${error instanceof Error ? error.message : "desconocido"})`);
      }
    }

    // Validar que al menos uno de los medicamentos se encontró
    if (movements.length === 0) {
      const notFoundMessage = productsNotFound.length > 0 
        ? `Productos no encontrados: ${productsNotFound.join(", ")}`
        : "No se pudieron procesar los medicamentos";
      
      return {
        success: false,
        message: notFoundMessage,
        error: "NO_PRODUCTS_FOUND",
      };
    }

    // Usar la función centralizada para guardar los movimientos
    const result = await recordMovementsWithBatchHandling(movements);

    if (!result.success) {
      return {
        success: false,
        message: result.error || "Error al registrar los movimientos",
        error: "MOVEMENT_CREATION_FAILED",
      };
    }

    // Preparar mensaje con información de medicamentos no procesados y advertencias de lotes
    let successMessage = `Egreso creado exitosamente: ${movements.length} medicamentos registrados`;
    if (productsNotFound.length > 0) {
      successMessage += ` (${productsNotFound.length} medicamentos no encontrados: ${productsNotFound.join(", ")})`;
    }
    if (result.batchIssues && result.batchIssues.length > 0) {
      successMessage += ` | Advertencias de lotes: ${result.batchIssues.join("; ")}`;
    }

    revalidatePath("/");

    return {
      success: true,
      message: successMessage,
      egressNumber: recipeData.egressNumber,
      medicamentCount: movements.length,
      total: recipeData.total,
    };
  } catch (error) {
    console.error("Error en createRecipeEgress:", error);
    return {
      success: false,
      message: `Error inesperado: ${error instanceof Error ? error.message : "Desconocido"}`,
      error: "UNEXPECTED_ERROR",
    };
  }
}

/**
 * Obtiene el estado de un egreso por su código de receta
 */
export async function getEgressStatus(recipeCode: string) {
  try {
    const { data, error } = await supabase
      .from("inventory_movements")
      .select("id, recipe_code, movement_date, patient_name, created_at")
      .eq("recipe_code", recipeCode)
      .single();

    if (error) {
      return { found: false, error: error.message };
    }

    return { found: true, data };
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
