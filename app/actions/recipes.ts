"use server";

import { supabase } from "@/app/lib/conections/supabase";
import { RecipeData, ProcessingResult } from "@/app/types/recipe";
import { recordBulkInventoryMovements } from "@/app/actions/products";
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

        // Construir el objeto de movimiento con la estructura de BulkMovementModal
        const movement = {
          product_id: product.id as string,
          quantity: medicament.quantity,
          type: "salida" as const,
          reason: "Entrega de receta", // Usa el mismo texto que BulkMovementModal
          notes: `Lote: ${medicament.batch} | Vencimiento: ${medicament.expirationDate}`,
          user_id: "Sistema", // Registrado automáticamente desde el sistema
          // Campos automáticos
          movement_group_id: prescriptionGroupId,
          movement_date: recipeData.egressDate,
          is_recipe_movement: true,
          // Datos de receta médica (compatible con RecipeMedicament)
          prescription_group_id: prescriptionGroupId,
          recipe_code: recipeData.egressNumber,
          recipe_date: recipeData.egressDate,
          patient_name: recipeData.patientName || recipeData.recipientName, // Prioriza patientName si existe
          prescribed_by: undefined, // Número del documento del prescriptor
          cie_code: undefined, // No está disponible en RecipeData actual
          recipe_notes: `Paciente ID: ${recipeData.patientIdentifier} | Receptor: ${recipeData.recipientName}`,
          patient_identification: recipeData.patientIdentifier,
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

    // Usar la misma función que BulkMovementModal para guardar los movimientos
    const result = await recordBulkInventoryMovements(movements);

    if (!result.success) {
      return {
        success: false,
        message: result.error || "Error al registrar los movimientos",
        error: "MOVEMENT_CREATION_FAILED",
      };
    }

    // Preparar mensaje con información de medicamentos no procesados
    let successMessage = `Egreso creado exitosamente: ${movements.length} medicamentos registrados`;
    if (productsNotFound.length > 0) {
      successMessage += ` (${productsNotFound.length} medicamentos no encontrados: ${productsNotFound.join(", ")})`;
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
