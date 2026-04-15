"use server";

import { supabase } from "@/app/lib/conections/supabase";
import {
  RecipeData,
  ProcessingResult,
  MissingRecipeMedicament,
  InsufficientStockItem,
  AlreadyProcessedRecipeMedicament,
} from "@/app/types/recipe";
import { createProduct, recordMovementsWithBatchHandling } from "@/app/actions/products";
import { revalidatePath } from "next/cache";

interface CreateRecipeEgressOptions {
  targetSkus?: string[];
  allowedNegativeSkus?: string[];
  skipDuplicateCheck?: boolean;
  dryRun?: boolean;
  justCreatedSkus?: string[];
}

interface MissingProductDraft {
  sku: string;
  batch_number?: string;
  name: string;
  stock: number;
  description?: string;
  unit_of_measure?: string;
  administration_route?: string;
  notes?: string;
  issue_date?: string;
  expiration_date?: string;
  shelf?: string;
  drawer?: string;
  section?: string;
  location_notes?: string;
  category?: string;
  specialty?: string;
  reporting_unit?: string;
}

/**
 * Crea un egreso en la base de datos basado en datos de receta extraída del PDF
 * 
 * Utiliza la misma lógica que BulkMovementModal para garantizar consistencia
 * en cómo se manejan los movimientos de inventario
 */
export async function createRecipeEgress(
  recipeData: RecipeData,
  options: CreateRecipeEgressOptions = {}
): Promise<ProcessingResult> {
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

    const targetSkuSet = new Set(options.targetSkus || recipeData.medicaments.map((m) => m.sku));
    const allowedNegativeSkuSet = new Set(options.allowedNegativeSkus || []);
    const justCreatedSkuSet = new Set(options.justCreatedSkus || []);
    const medicamentsToProcess = recipeData.medicaments.filter((m) => targetSkuSet.has(m.sku));

    if (medicamentsToProcess.length === 0) {
      return {
        success: false,
        message: "No hay medicamentos seleccionados para procesar",
        error: "NO_SELECTED_MEDICAMENTS",
      };
    }

    // Generar ID único para agrupar todos los medicamentos de la misma receta
    const prescriptionGroupId = crypto.randomUUID();

    // Transformar medicamentos a movimientos con la estructura esperada
    const movements = [];
    const missingMedicaments: MissingRecipeMedicament[] = [];
    const insufficientStockItems: InsufficientStockItem[] = [];
    const alreadyProcessedMedicaments: AlreadyProcessedRecipeMedicament[] = [];
    const resolvedMedicaments: Array<{
      medicament: (typeof medicamentsToProcess)[number];
      product: { id: string; name: string | null; stock: number | null };
    }> = [];

    for (const medicament of medicamentsToProcess) {
      try {
        // Buscar el producto por barcode (equivalente al SKU del PDF)
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("id, name, stock")
          .eq("barcode", medicament.sku)
          .is("deleted_at", null)
          .single();

        if (productError || !product) {
          missingMedicaments.push({
            ...medicament,
            reason: "",
          });
          continue;
        }

        resolvedMedicaments.push({
          medicament,
          product: {
            id: product.id as string,
            name: product.name || null,
            stock: product.stock ?? 0,
          },
        });
      } catch (error) {
        console.error(`Error procesando medicamento ${medicament.sku}:`, error);
        missingMedicaments.push({
          ...medicament,
          reason: `Error al buscar producto: ${error instanceof Error ? error.message : "desconocido"}`,
        });
      }
    }

    // Validar duplicados por recipe_code + product_id para permitir reprocesamiento parcial.
    let existingByProductId = new Set<string>();
    if (!options.skipDuplicateCheck && resolvedMedicaments.length > 0) {
      const uniqueProductIds = Array.from(new Set(resolvedMedicaments.map((item) => item.product.id)));
      const { data: existingMovements, error: existingError } = await supabase
        .from("inventory_movements")
        .select("id, product_id")
        .eq("recipe_code", recipeData.egressNumber)
        .in("product_id", uniqueProductIds);

      if (existingError) {
        console.error("Error al verificar productos ya procesados en receta:", existingError);
        return {
          success: false,
          message: "Error al validar productos ya procesados en la receta",
          error: "VALIDATION_ERROR",
        };
      }

      existingByProductId = new Set(
        (existingMovements || [])
          .map((movement) => movement.product_id)
          .filter((productId): productId is string => typeof productId === "string" && productId.length > 0)
      );
    }

    for (const item of resolvedMedicaments) {
      const { medicament, product } = item;
      const hasBatchNumber = !!(medicament.batch && medicament.batch.trim());
      const fallbackExpirationDate = new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      )
        .toISOString()
        .split("T")[0];
      const batchExpirationDate =
        (medicament.expirationDate || "").trim() || fallbackExpirationDate;

      if (existingByProductId.has(product.id)) {
        alreadyProcessedMedicaments.push({
          ...medicament,
          productId: product.id,
        });
        continue;
      }

      if (
        !hasBatchNumber &&
        (product.stock ?? 0) < medicament.quantity &&
        !allowedNegativeSkuSet.has(medicament.sku)
      ) {
        insufficientStockItems.push({
          sku: medicament.sku,
          productId: product.id,
          productName: product.name || medicament.name || medicament.sku,
          requestedQuantity: medicament.quantity,
          currentStock: product.stock ?? 0,
        });
        continue;
      }

      if (hasBatchNumber && !justCreatedSkuSet.has(medicament.sku)) {
        movements.push({
          product_id: product.id,
          quantity: medicament.quantity,
          type: "entrada" as const,
          reason: "Sincronizacion de lote desde PDF",
          notes: `Ingreso automatico previo a egreso | Lote: ${medicament.batch} | Vencimiento: ${batchExpirationDate}`,
          recorded_by: "Sistema",
          movement_group_id: prescriptionGroupId,
          movement_date: recipeData.egressDate,
          is_recipe_movement: true,
          prescription_group_id: prescriptionGroupId,
          recipe_code: recipeData.egressNumber,
          recipe_date: recipeData.egressDate,
          patient_name: recipeData.patientName || recipeData.recipientName,
          prescribed_by: undefined,
          cie_code: undefined,
          recipe_notes: `Paciente ID: ${recipeData.patientIdentifier} | Receptor: ${recipeData.recipientName}`,
          patient_identification: recipeData.patientIdentifier,
          batchHandling: {
            batchInfo: {
              batch_number: medicament.batch,
              issue_date: recipeData.egressDate,
              expiration_date: batchExpirationDate,
            },
          },
        });
      }

      const movement = {
        product_id: product.id,
        quantity: medicament.quantity,
        type: "salida" as const,
        reason: recipeData.egressSubtype || "Entrega de receta",
        notes: `Lote: ${medicament.batch || "No especificado"} | Vencimiento: ${medicament.expirationDate}`,
        recorded_by: "Sistema",

        movement_group_id: prescriptionGroupId,
        movement_date: recipeData.egressDate,

        is_recipe_movement: true,
        prescription_group_id: prescriptionGroupId,
        recipe_code: recipeData.egressNumber,
        recipe_date: recipeData.egressDate,
        patient_name: recipeData.patientName || recipeData.recipientName,
        prescribed_by: undefined,
        cie_code: undefined,
        recipe_notes: `Paciente ID: ${recipeData.patientIdentifier} | Receptor: ${recipeData.recipientName}`,
        patient_identification: recipeData.patientIdentifier,
        allowNegativeStock: allowedNegativeSkuSet.has(medicament.sku),

        batchHandling: hasBatchNumber
          ? {
              batchSearchNumber: medicament.batch,
              expirationDate: medicament.expirationDate,
            }
          : undefined,
      };

      movements.push(movement);
    }

    if (insufficientStockItems.length > 0) {
      return {
        success: false,
        message: "Stock insuficiente en uno o mas productos. Selecciona cuales deseas procesar permitiendo stock negativo.",
        error: "STOCK_INSUFFICIENT",
        missingMedicaments,
        insufficientStockItems,
        alreadyProcessedMedicaments,
      };
    }

    // Si hay productos faltantes, no registrar parcialmente.
    // El usuario debe resolver creación/selección y luego procesar todo en una sola ejecución.
    if (missingMedicaments.length > 0) {
      return {
        success: false,
        message: `Productos pendientes por crear: ${missingMedicaments.map((m) => m.sku).join(", ")}`,
        error: "MISSING_PRODUCTS_PENDING",
        missingMedicaments,
        insufficientStockItems,
        alreadyProcessedMedicaments,
      };
    }

    // Validar que al menos uno de los medicamentos se encontró
    if (movements.length === 0) {
      if (alreadyProcessedMedicaments.length > 0) {
        return {
          success: false,
          message: `Esta receta ya fue procesada para los productos del PDF (Codigo: ${recipeData.egressNumber}).`,
          error: "DUPLICATE_RECIPE",
          alreadyProcessedMedicaments,
        };
      }

      const notFoundMessage = missingMedicaments.length > 0 
        ? `Productos no encontrados: ${missingMedicaments.map((m) => m.sku).join(", ")}`
        : "No se pudieron procesar los medicamentos";
      
      return {
        success: false,
        message: notFoundMessage,
        error: "NO_PRODUCTS_FOUND",
        missingMedicaments,
        alreadyProcessedMedicaments,
      };
    }

    if (options.dryRun) {
      const egressCount = movements.filter((movement) => movement.type === "salida").length;
      let previewMessage = `Egreso listo para procesar: ${egressCount} medicamentos validados`;
      if (alreadyProcessedMedicaments.length > 0) {
        previewMessage += ` | ${alreadyProcessedMedicaments.length} ya estaban procesados y se omitiran`;
      }
      if (egressCount !== movements.length) {
        previewMessage += " | Incluye sincronizacion automatica de lote antes del egreso";
      }

      return {
        success: true,
        message: previewMessage,
        didExecuteEgress: false,
        egressNumber: recipeData.egressNumber,
        medicamentCount: egressCount,
        total: recipeData.total,
        missingMedicaments,
        alreadyProcessedMedicaments,
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
    const egressCount = movements.filter((movement) => movement.type === "salida").length;
    let successMessage = `Egreso creado exitosamente: ${egressCount} medicamentos registrados`;
    if (egressCount !== movements.length) {
      successMessage += " (con sincronizacion automatica de lote previa)";
    }
    if (alreadyProcessedMedicaments.length > 0) {
      successMessage += ` | ${alreadyProcessedMedicaments.length} ya estaban procesados y se omitieron`;
    }
    if (missingMedicaments.length > 0) {
      successMessage += ` (${missingMedicaments.length} medicamentos no encontrados: ${missingMedicaments.map((m) => m.sku).join(", ")})`;
    }
    if (result.batchIssues && result.batchIssues.length > 0) {
      successMessage += ` | Advertencias de lotes: ${result.batchIssues.join("; ")}`;
    }

    revalidatePath("/");

    return {
      success: true,
      message: successMessage,
      didExecuteEgress: true,
      egressNumber: recipeData.egressNumber,
      medicamentCount: egressCount,
      total: recipeData.total,
      missingMedicaments,
      alreadyProcessedMedicaments,
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

export async function createMissingProductsAndRegisterRecipeEgress(
  recipeData: RecipeData,
  productsToCreate: MissingProductDraft[],
  allowedNegativeSkus: string[] = [],
  executeEgress: boolean = true
): Promise<ProcessingResult> {
  try {
    const products = productsToCreate || [];
    const recipeNameBySku = new Map(
      (recipeData.medicaments || []).map((med) => [med.sku, (med.name || "").trim()])
    );

    for (const productDraft of products) {
      const stock = Number(productDraft.stock || 0);
      const fullRecipeName = recipeNameBySku.get(productDraft.sku) || "";
      const normalizedName =
        (productDraft.name || "").trim() ||
        fullRecipeName ||
        productDraft.sku;

      if (!normalizedName || !productDraft.sku || !Number.isFinite(stock) || stock <= 0) {
        return {
          success: false,
          message: `Datos invalidos para SKU ${productDraft.sku}. Nombre y stock inicial (>0) son obligatorios.`,
          error: "INVALID_PRODUCT_DATA",
        };
      }

      const { data: existingProduct } = await supabase
        .from("products")
        .select("id")
        .eq("barcode", productDraft.sku)
        .is("deleted_at", null)
        .maybeSingle();

      if (!existingProduct) {
        const formData = new FormData();
        formData.set("name", normalizedName);
        formData.set("barcode", productDraft.sku);
        formData.set("stock", String(stock));

        const optionalFields: Array<keyof MissingProductDraft> = [
          "batch_number",
          "description",
          "unit_of_measure",
          "administration_route",
          "notes",
          "issue_date",
          "expiration_date",
          "shelf",
          "drawer",
          "section",
          "location_notes",
          "category",
          "specialty",
          "reporting_unit",
        ];

        optionalFields.forEach((field) => {
          const value = productDraft[field];
          if (typeof value === "string" && value.trim()) {
            formData.set(field, value.trim());
          }
        });

        // Si no llegó descripción usable, usar el nombre completo de receta.
        if (!formData.get("description") && fullRecipeName) {
          formData.set("description", fullRecipeName);
        }

        const createResult = await createProduct(formData, "Sistema");
        if (!createResult.success) {
          return {
            success: false,
            message: `No se pudo crear producto SKU ${productDraft.sku}: ${createResult.error || "Error desconocido"}`,
            error: "CREATE_PRODUCT_FAILED",
          };
        }
      } else if (productDraft.batch_number && productDraft.batch_number.trim()) {
        // Product already exists — create additional batch if batch_number is provided
        const today = new Date().toISOString().split("T")[0];
        const batchResult = await recordMovementsWithBatchHandling([
          {
            product_id: existingProduct.id,
            quantity: stock,
            type: "entrada",
            reason: "Lote adicional desde carga de receta PDF",
            recorded_by: "Sistema",
            movement_date: productDraft.issue_date || today,
            batchHandling: {
              batchInfo: {
                batch_number: productDraft.batch_number.trim(),
                issue_date: productDraft.issue_date || today,
                expiration_date: productDraft.expiration_date || "",
                shelf: productDraft.shelf || "",
                drawer: productDraft.drawer || "",
                section: productDraft.section || "",
                location_notes: productDraft.location_notes || "",
              },
            },
          },
        ]);
        if (!batchResult.success) {
          console.warn(
            `No se pudo crear lote adicional para SKU ${productDraft.sku}: ${batchResult.error}`
          );
        }
      }
    }

    const createdSkus = products
      .map((p) => p.sku)
      .filter((sku) => sku && sku.trim().length > 0);

    const egressResult = await createRecipeEgress(recipeData, {
      allowedNegativeSkus,
      dryRun: !executeEgress,
      justCreatedSkus: createdSkus,
    });

    if (!egressResult.success) {
      return egressResult;
    }

    return {
      ...egressResult,
      message: products.length > 0
        ? executeEgress
          ? `Productos creados y egreso registrado. ${egressResult.message}`
          : `Productos creados. ${egressResult.message}`
        : egressResult.message,
    };
  } catch (error) {
    console.error("Error en createMissingProductsAndRegisterRecipeEgress:", error);
    return {
      success: false,
      message: `Error inesperado: ${error instanceof Error ? error.message : "Desconocido"}`,
      error: "UNEXPECTED_ERROR",
    };
  }
}

/**
 * Crea un SOLO producto faltante de forma ligera, sin ejecutar lógica de egreso.
 * Diseñado para ser llamado individualmente desde el cliente para evitar timeouts
 * al procesar muchos productos en una sola petición.
 */
export async function createSingleMissingProduct(
  recipeData: RecipeData,
  productDraft: MissingProductDraft
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const stock = Number(productDraft.stock || 0);
    const recipeNameBySku = new Map(
      (recipeData.medicaments || []).map((med) => [med.sku, (med.name || "").trim()])
    );
    const fullRecipeName = recipeNameBySku.get(productDraft.sku) || "";
    const normalizedName =
      (productDraft.name || "").trim() ||
      fullRecipeName ||
      productDraft.sku;

    if (!normalizedName || !productDraft.sku || !Number.isFinite(stock) || stock <= 0) {
      return {
        success: false,
        message: `Datos invalidos para SKU ${productDraft.sku}. Nombre y stock inicial (>0) son obligatorios.`,
        error: "INVALID_PRODUCT_DATA",
      };
    }

    const { data: existingProduct } = await supabase
      .from("products")
      .select("id")
      .eq("barcode", productDraft.sku)
      .is("deleted_at", null)
      .maybeSingle();

    if (!existingProduct) {
      const formData = new FormData();
      formData.set("name", normalizedName);
      formData.set("barcode", productDraft.sku);
      formData.set("stock", String(stock));

      const optionalFields: Array<keyof MissingProductDraft> = [
        "batch_number",
        "description",
        "unit_of_measure",
        "administration_route",
        "notes",
        "issue_date",
        "expiration_date",
        "shelf",
        "drawer",
        "section",
        "location_notes",
        "category",
        "specialty",
        "reporting_unit",
      ];

      optionalFields.forEach((field) => {
        const value = productDraft[field];
        if (typeof value === "string" && value.trim()) {
          formData.set(field, value.trim());
        }
      });

      if (!formData.get("description") && fullRecipeName) {
        formData.set("description", fullRecipeName);
      }

      const createResult = await createProduct(formData, "Sistema");
      if (!createResult.success) {
        return {
          success: false,
          message: `No se pudo crear producto SKU ${productDraft.sku}: ${createResult.error || "Error desconocido"}`,
          error: "CREATE_PRODUCT_FAILED",
        };
      }

      return {
        success: true,
        message: `Producto ${productDraft.sku} creado exitosamente`,
      };
    } else if (productDraft.batch_number && productDraft.batch_number.trim()) {
      const today = new Date().toISOString().split("T")[0];
      const batchResult = await recordMovementsWithBatchHandling([
        {
          product_id: existingProduct.id,
          quantity: stock,
          type: "entrada",
          reason: "Lote adicional desde carga de receta PDF",
          recorded_by: "Sistema",
          movement_date: productDraft.issue_date || today,
          batchHandling: {
            batchInfo: {
              batch_number: productDraft.batch_number.trim(),
              issue_date: productDraft.issue_date || today,
              expiration_date: productDraft.expiration_date || "",
              shelf: productDraft.shelf || "",
              drawer: productDraft.drawer || "",
              section: productDraft.section || "",
              location_notes: productDraft.location_notes || "",
            },
          },
        },
      ]);
      if (!batchResult.success) {
        return {
          success: false,
          message: `No se pudo crear lote adicional para SKU ${productDraft.sku}: ${batchResult.error}`,
          error: "BATCH_CREATION_FAILED",
        };
      }

      return {
        success: true,
        message: `Lote adicional para ${productDraft.sku} creado exitosamente`,
      };
    }

    return {
      success: true,
      message: `Producto ${productDraft.sku} ya existe, no se requiere creación`,
    };
  } catch (error) {
    console.error("Error en createSingleMissingProduct:", error);
    return {
      success: false,
      message: `Error inesperado al crear ${productDraft.sku}: ${error instanceof Error ? error.message : "Desconocido"}`,
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
