/**
 * API Route para procesar PDFs de recetas
 * POST /api/process-recipe
 *
 * Acepta dos formatos:
 * 1. JSON con recipeData (NUEVO - datos ya procesados en el cliente)
 * 2. FormData con archivo PDF o JSON con pdfBase64/pdfText (LEGACY)
 *
 * Procesa:
 * 1. Si recibe recipeData: lo valida y guarda directamente
 * 2. Si recibe PDF/pdfBase64: lo parsea y luego guarda
 * 3. Valida que sea un egreso de receta
 * 4. Guarda en la base de datos
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  validateRecipeDocument, 
  parseRecipeData,
  parseRecipeDataFromPDF,
} from "@/app/lib/pdf-utils";
import { createRecipeEgress, createMissingProductsAndRegisterRecipeEgress, createSingleMissingProduct } from "@/app/actions/recipes";
import { RecipeData } from "@/app/types/recipe";

interface ProcessRecipeRequest {
  action?: "process" | "previewRecipeEgress" | "retryRecipeEgress" | "createMissingOnly" | "createMissingAndRetry";
  recipeData?: RecipeData; // NUEVO: datos ya procesados
  pdfText?: string;
  pdfBase64?: string;
  fileName?: string;
  allowedNegativeSkus?: string[];
  productsToCreate?: Array<{
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
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let recipeData: RecipeData | undefined;
    let fileName = "unknown.pdf";

    // Opción 1: JSON con recipeData ya procesada en el cliente (NUEVO - RECOMENDADO)
    if (contentType.includes("application/json")) {
      try {
        const body: ProcessRecipeRequest = await request.json();
        fileName = body.fileName || "unknown.pdf";

        // Si viene recipeData ya procesada, usarla directamente
        if (body.recipeData) {
          // Validación básica
          if (!body.recipeData.medicaments || !Array.isArray(body.recipeData.medicaments)) {
            return NextResponse.json(
              {
                success: false,
                message: "recipeData inválida: falta campo 'medicaments'",
                error: "INVALID_RECIPE_DATA",
              },
              { status: 400 }
            );
          }
          recipeData = body.recipeData;

          if (body.action === "previewRecipeEgress") {
            const previewResult = await createRecipeEgress(recipeData, {
              allowedNegativeSkus: body.allowedNegativeSkus || [],
              dryRun: true,
            });

            const previewStatusCode = previewResult.success ? 200 : 400;
            return NextResponse.json(previewResult, { status: previewStatusCode });
          }

          if (body.action === "retryRecipeEgress") {
            const retryResult = await createRecipeEgress(recipeData, {
              allowedNegativeSkus: body.allowedNegativeSkus || [],
            });

            const retryStatusCode = retryResult.success ? 200 : 400;
            return NextResponse.json(retryResult, { status: retryStatusCode });
          }

          if (body.action === "createMissingAndRetry") {
            const productsToCreate = body.productsToCreate || [];
            const createAndRetryResult = await createMissingProductsAndRegisterRecipeEgress(
              recipeData,
              productsToCreate,
              body.allowedNegativeSkus || []
            );

            const createAndRetryStatusCode = createAndRetryResult.success ? 200 : 400;
            return NextResponse.json(createAndRetryResult, { status: createAndRetryStatusCode });
          }

          if (body.action === "createSingleProduct") {
            const productDraft = body.productsToCreate?.[0];
            if (!productDraft) {
              return NextResponse.json(
                { success: false, message: "No se proporcionaron datos del producto", error: "MISSING_PRODUCT_DATA" },
                { status: 400 }
              );
            }
            const singleResult = await createSingleMissingProduct(recipeData, productDraft);
            return NextResponse.json(singleResult, { status: singleResult.success ? 200 : 400 });
          }

          if (body.action === "createMissingOnly") {
            const productsToCreate = body.productsToCreate || [];
            const createOnlyResult = await createMissingProductsAndRegisterRecipeEgress(
              recipeData,
              productsToCreate,
              body.allowedNegativeSkus || [],
              false
            );

            const createOnlyStatusCode = createOnlyResult.success ? 200 : 400;
            return NextResponse.json(createOnlyResult, { status: createOnlyStatusCode });
          }
        }
        // Sub-opción: PDF en base64 (LEGACY)
        else if (body.pdfBase64) {
          const base64Data = body.pdfBase64.replace(/^data:application\/pdf;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const arrayBuffer = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
          );
          const result = await parseRecipeDataFromPDF(arrayBuffer);
          
          // Verificar si es un error de validación
          if (result && typeof result === 'object' && 'success' in result && result.success === false) {
            return NextResponse.json(
              {
                success: false,
                message: (result as { success: false; error: string }).error || 'Documento no válido',
                error: "INVALID_DOCUMENT_TYPE",
              },
              { status: 400 }
            );
          }
          recipeData = result as RecipeData;
        }
        // Sub-opción: Texto ya extraído (LEGACY)
        else if (body.pdfText) {
          if (!validateRecipeDocument(body.pdfText)) {
            return NextResponse.json(
              {
                success: false,
                message: 'Documento no válido: no es una "Nota de Egreso - Dispensación A Pacientes"',
                error: "INVALID_DOCUMENT_TYPE",
              },
              { status: 400 }
            );
          }
          const result = parseRecipeData(body.pdfText);
          
          // Verificar si es un error de validación
          if (result && typeof result === 'object' && 'success' in result && result.success === false) {
            return NextResponse.json(
              {
                success: false,
                message: (result as { success: false; error: string }).error || 'Documento no válido',
                error: "INVALID_DOCUMENT_TYPE",
              },
              { status: 400 }
            );
          }
          recipeData = result as RecipeData;
        } else {
          return NextResponse.json(
            {
              success: false,
              message: "Se requiere 'recipeData', 'pdfBase64' o 'pdfText' en el body",
              error: "MISSING_DATA",
            },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error("Error procesando JSON:", error);
        
        if (error instanceof SyntaxError) {
          return NextResponse.json(
            {
              success: false,
              message: "El cuerpo de la solicitud no es un JSON válido",
              error: "INVALID_JSON",
            },
            { status: 400 }
          );
        }
        
        throw error;
      }
    }
    // Opción 2: FormData con archivo PDF (LEGACY)
    else if (contentType.includes("multipart/form-data")) {
      try {
        const formData = await request.formData();
        const file = formData.get("pdf") as File;
        
        if (!file) {
          return NextResponse.json(
            {
              success: false,
              message: "No se encontró archivo PDF en la solicitud",
              error: "NO_PDF_FILE",
            },
            { status: 400 }
          );
        }

        fileName = file.name;
        const arrayBuffer = await file.arrayBuffer();
        const result = await parseRecipeDataFromPDF(arrayBuffer);
        
        // Verificar si es un error de validación
        if (result && typeof result === 'object' && 'success' in result && result.success === false) {
          return NextResponse.json(
            {
              success: false,
              message: (result as { success: false; error: string }).error || 'Documento no válido',
              error: "INVALID_DOCUMENT_TYPE",
            },
            { status: 400 }
          );
        }
        recipeData = result as RecipeData;
        
      } catch (error) {
        console.error("Error procesando FormData:", error);
        return NextResponse.json(
          {
            success: false,
            message: `Error al leer el archivo PDF: ${error instanceof Error ? error.message : "Error desconocido"}`,
            error: "FILE_READ_ERROR",
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Content-Type no soportado. Use 'application/json' o 'multipart/form-data'",
          error: "UNSUPPORTED_CONTENT_TYPE",
        },
        { status: 400 }
      );
    }

    // Validar que se haya parseado la receta
    if (!recipeData) {
      return NextResponse.json(
        {
          success: false,
          message: "No se pudo parsear la receta del PDF",
          error: "PARSING_FAILED",
        },
        { status: 400 }
      );
    }

    // Guardar en la base de datos
    const result = await createRecipeEgress(recipeData);

    // Retornar resultado
    const statusCode = result.success ? 200 : 400;
    return NextResponse.json(result, { status: statusCode });

  } catch (error) {
    console.error("Error procesando receta:", error);

    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log detallado del error para debugging
    console.error("Stack trace:", errorStack);

    return NextResponse.json(
      {
        success: false,
        message: `Error al procesar la receta: ${errorMessage}`,
        error: "PROCESSING_ERROR",
        details: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Opcional: GET endpoint para obtener el estado de procesamiento
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const egressNumber = searchParams.get("egressNumber");

  if (!egressNumber) {
    return NextResponse.json(
      {
        success: false,
        message: "Parámetro 'egressNumber' requerido",
      },
      { status: 400 }
    );
  }

  try {
    const { getEgressStatus } = await import("@/app/actions/recipes");
    const status = await getEgressStatus(egressNumber);

    return NextResponse.json({
      success: status.found,
      data: status.data || { error: status.error },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al consultar estado",
      },
      { status: 500 }
    );
  }
}
