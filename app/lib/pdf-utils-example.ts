/**
 * Ejemplos de uso para las utilidades de PDF mejoradas
 * 
 * Este archivo muestra cómo usar las nuevas funciones basadas en coordenadas
 * para extraer datos de PDFs de recetas.
 */

import {
  extractKeyValuesFromPDF,
  extractTextFromPDF,
  parseRecipeDataFromPDF,
  parseRecipeData, // Legacy: para texto plano
} from "./pdf-utils";

// ============================================================================
// EJEMPLO 1: Extraer key-values genéricos desde cualquier PDF
// ============================================================================

export async function example1_ExtractKeyValues(file: File) {
  try {
    // Leer el archivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Extraer todos los pares key-value del PDF
    const keyValues = await extractKeyValuesFromPDF(arrayBuffer);

    /*
    Resultado esperado:
    {
      "Entidad Origen": "BAGATELA",
      "Bodega Origen": "BODEGA DE FARMACIA BAGATELA",
      "Fecha Egreso": "2026-01-30",
      "Número Egreso": "001204-2026-EGR-001204MD1-93",
      ...
    }
    */

    return keyValues;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// EJEMPLO 2: Extraer datos completos de receta usando coordenadas
// ============================================================================

export async function example2_ParseRecipeWithCoordinates(file: File) {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // Parsear receta completa (header + medicamentos)
    const recipeData = await parseRecipeDataFromPDF(arrayBuffer);

    // Validar que recipeData no sea un error
    if (typeof recipeData === 'object' && 'success' in recipeData && recipeData.success === false) {
      const error = (recipeData as { success: false; error: string }).error;
      console.error("Error en validación de receta:", error);
      throw new Error(error);
    }

    return recipeData;
  } catch (error) {
    console.error("Error parseando receta:", error);
    throw error;
  }
}

// ============================================================================
// EJEMPLO 3: Extraer solo texto (útil para debugging)
// ============================================================================

export async function example3_ExtractTextOnly(file: File) {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // Extraer texto completo respetando el layout visual
    const text = await extractTextFromPDF(arrayBuffer);

    return text;
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// EJEMPLO 4: Usar en un componente React/Next.js
// ============================================================================

export function useRecipePDFParser() {
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const recipeData = await parseRecipeDataFromPDF(arrayBuffer);

      return recipeData;
    } catch (error) {
      alert("Error procesando PDF: " + (error as Error).message);
    }
  };

  return { handleFileUpload };
}

// ============================================================================
// EJEMPLO 5: Comparación entre método antiguo y nuevo
// ============================================================================

export async function example5_CompareOldVsNew(file: File) {
  const arrayBuffer = await file.arrayBuffer();

  // MÉTODO NUEVO (coordenadas)
  console.time("Método con coordenadas");
  const newResult = await parseRecipeDataFromPDF(arrayBuffer);
  console.timeEnd("Método con coordenadas");

  // MÉTODO ANTIGUO (texto plano) - requiere pre-extraer el texto
  console.time("Método legacy");
  const text = await extractTextFromPDF(arrayBuffer);
  const oldResult = parseRecipeData(text);

  // El método nuevo debería ser más preciso
  return { newResult, oldResult };
}

// ============================================================================
// EJEMPLO 6: Uso en API Route de Next.js
// ============================================================================

/**
 * Ejemplo de API route para procesar PDFs
 * Archivo: app/api/process-pdf/route.ts
 */
export const API_ROUTE_EXAMPLE = `
import { NextRequest, NextResponse } from "next/server";
import { parseRecipeDataFromPDF } from "@/app/lib/pdf-utils";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("pdf") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó archivo PDF" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const recipeData = await parseRecipeDataFromPDF(arrayBuffer);

    return NextResponse.json({
      success: true,
      data: recipeData,
    });
  } catch (error) {
    console.error("Error procesando PDF:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
`;

// ============================================================================
// EJEMPLO 7: Uso con drag & drop
// ============================================================================

export function usePDFDropzone() {
  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const files = Array.from(event.dataTransfer.files);
    const pdfFiles = files.filter((f) => f.type === "application/pdf");

    for (const file of pdfFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const recipeData = await parseRecipeDataFromPDF(arrayBuffer);

      } catch (error) {
        console.error(`Error en ${file.name}:`, error);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return { handleDrop, handleDragOver };
}
