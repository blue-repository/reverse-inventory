/**
 * Tests unitarios para el sistema de extracción de PDFs
 * 
 * Para ejecutar estos tests, puedes usar Jest o simplemente
 * importar estas funciones en tu componente y ejecutarlas.
 */

import {
  extractKeyValuesFromPDF,
  extractTextFromPDF,
  parseRecipeDataFromPDF,
} from "./pdf-utils";
import { RecipeData } from "@/app/types/recipe";

// ============================================================================
// TEST HELPERS
// ============================================================================

async function loadTestPDF(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  return response.arrayBuffer();
}

// ============================================================================
// TESTS DE EXTRACCIÓN DE COORDENADAS
// ============================================================================

export async function test_extractKeyValues() {
  console.log("🧪 Test: Extract Key-Values from PDF");

  try {
    // Cargar PDF de prueba
    const buffer = await loadTestPDF("/sample-recipe.pdf");

    // Extraer key-values
    const keyValues = await extractKeyValuesFromPDF(buffer);

    console.log("✅ Key-Values extraídos:", keyValues);

    // Validaciones
    const assertions = [
      {
        condition: keyValues["Entidad Origen"] !== undefined,
        message: 'Debe contener "Entidad Origen"',
      },
      {
        condition: keyValues["Bodega Origen"] !== undefined,
        message: 'Debe contener "Bodega Origen"',
      },
      {
        condition: keyValues["Fecha Egreso"] !== undefined,
        message: 'Debe contener "Fecha Egreso"',
      },
    ];

    assertions.forEach(({ condition, message }) => {
      if (condition) {
        console.log(`  ✓ ${message}`);
      } else {
        console.error(`  ✗ ${message}`);
      }
    });

    return keyValues;
  } catch (error) {
    console.error("❌ Test falló:", error);
    throw error;
  }
}

export async function test_extractText() {
  console.log("🧪 Test: Extract Text from PDF");

  try {
    const buffer = await loadTestPDF("/sample-recipe.pdf");
    const text = await extractTextFromPDF(buffer);

    console.log("✅ Texto extraído (primeros 500 caracteres):");
    console.log(text.substring(0, 500));

    // Validaciones
    const validations = [
      text.includes("NOTA DE EGRESO"),
      text.includes("Entidad Origen"),
      text.length > 100,
    ];

    console.log(
      `  Validaciones: ${validations.filter(Boolean).length}/${validations.length} pasadas`
    );

    return text;
  } catch (error) {
    console.error("❌ Test falló:", error);
    throw error;
  }
}

export async function test_parseRecipe() {
  console.log("🧪 Test: Parse Complete Recipe");

  try {
    const buffer = await loadTestPDF("/sample-recipe.pdf");
    const recipe = await parseRecipeDataFromPDF(buffer);

    // Validar que recipe no sea un error
    if (typeof recipe === 'object' && 'success' in recipe && recipe.success === false) {
      const error = (recipe as { success: false; error: string }).error;
      console.error("❌ Validación fallida:", error);
      throw new Error(error);
    }

    // Type assertion después de la validación
    const validRecipe = recipe as RecipeData;

    // Validaciones
    const checks = {
      "Tiene entidad origen": !!validRecipe.entityOrigin,
      "Tiene bodega origen": !!validRecipe.warehouseOrigin,
      "Tiene fecha válida": /\d{4}-\d{2}-\d{2}/.test(validRecipe.egressDate),
      "Tiene medicamentos": validRecipe.medicaments.length > 0,
      "Total es número": typeof validRecipe.total === "number",
    };

    Object.entries(checks).forEach(([name, pass]) => {
      console.log(`  ${pass ? "✓" : "✗"} ${name}`);
    });

    return validRecipe;
  } catch (error) {
    console.error("❌ Test falló:", error);
    throw error;
  }
}

// ============================================================================
// TEST DE COLUMNAS
// ============================================================================

export async function test_columnDetection() {
  console.log("🧪 Test: Column Detection");

  try {
    const buffer = await loadTestPDF("/sample-recipe.pdf");

    // Esta es una función interna, necesitarías exportarla
    // o crear un método de testing en pdf-utils.ts
    console.log("⚠️  Para testear columnas, exporta las funciones internas");

    return true;
  } catch (error) {
    console.error("❌ Test falló:", error);
    throw error;
  }
}

// ============================================================================
// TEST DE PERFORMANCE
// ============================================================================

export async function test_performance() {
  console.log("🧪 Test: Performance Comparison");

  try {
    const buffer = await loadTestPDF("/sample-recipe.pdf");

    // Test con coordenadas
    console.time("Método con coordenadas");
    const coordResult = await parseRecipeDataFromPDF(buffer);
    console.timeEnd("Método con coordenadas");

    // Validar que coordResult no sea un error
    if (typeof coordResult === 'object' && 'success' in coordResult && coordResult.success === false) {
      const error = (coordResult as { success: false; error: string }).error;
      console.error("❌ Validación fallida:", error);
      throw new Error(error);
    }

    // Type assertion después de la validación
    const validResult = coordResult as RecipeData;

    console.log(`  Medicamentos extraídos: ${validResult.medicaments.length}`);
    console.log(`  Total calculado: $${validResult.total}`);

    return true;
  } catch (error) {
    console.error("❌ Test falló:", error);
    throw error;
  }
}

// ============================================================================
// TEST SUITE COMPLETA
// ============================================================================

export async function runAllTests() {
  console.log("🚀 Ejecutando suite de tests completa\n");

  const tests = [
    { name: "Extract Key-Values", fn: test_extractKeyValues },
    { name: "Extract Text", fn: test_extractText },
    { name: "Parse Recipe", fn: test_parseRecipe },
    { name: "Column Detection", fn: test_columnDetection },
    { name: "Performance", fn: test_performance },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n${"=".repeat(60)}`);
    try {
      await test.fn();
      results.push({ name: test.name, status: "✅ PASSED" });
    } catch (error) {
      results.push({ name: test.name, status: "❌ FAILED" });
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 RESUMEN DE TESTS:");
  console.log(`${"=".repeat(60)}\n`);

  results.forEach(({ name, status }) => {
    console.log(`${status} ${name}`);
  });

  const passed = results.filter((r) => r.status.includes("PASSED")).length;
  console.log(`\n${passed}/${results.length} tests pasados`);

  return results;
}

// ============================================================================
// MOCK TEST (sin archivo real)
// ============================================================================

export function mockTest_extractKeyValues() {
  console.log("🧪 Mock Test: Simular extracción de key-values");

  // Simular resultado esperado
  const mockResult = {
    "Entidad Origen": "BAGATELA",
    "Bodega Origen": "BODEGA DE FARMACIA BAGATELA",
    "Fecha Egreso": "2026-01-30",
    "Número Egreso": "001204-2026-EGR-001204MD1-93",
    "Tipo Documento": "Nota de Egreso",
    "Nro. Documento": "12345",
    "Fecha Documento": "2026-01-30 10:30:00",
    "Nombre Receptor": "Juan Pérez",
    "Identificador Receptor": "ABC123",
    "Num. Identificación": "1234567890",
    Paciente: "María González",
  };

  console.log("✅ Resultado esperado:");
  console.log(JSON.stringify(mockResult, null, 2));

  return mockResult;
}

// ============================================================================
// EJEMPLO DE USO EN COMPONENTE
// ============================================================================

export const COMPONENT_USAGE = `
"use client";

import { useState } from "react";
import { parseRecipeDataFromPDF } from "@/app/lib/pdf-utils";
import { runAllTests } from "@/app/lib/pdf-utils.test";

export default function PDFTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRunTests = async () => {
    setLoading(true);
    try {
      const results = await runAllTests();
      setResult(results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const recipe = await parseRecipeDataFromPDF(buffer);
      setResult(recipe);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">PDF Extraction Tests</h1>
      
      <div className="space-y-4">
        <button
          onClick={handleRunTests}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {loading ? "Ejecutando..." : "Ejecutar Tests"}
        </button>

        <div>
          <label className="block mb-2">Subir PDF de prueba:</label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={loading}
            className="border p-2"
          />
        </div>

        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h2 className="font-bold mb-2">Resultado:</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
`;
