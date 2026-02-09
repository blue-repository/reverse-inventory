"use client";

/**
 * Componente de ejemplo para probar la extracción de PDFs
 * Muestra cómo usar las nuevas funciones basadas en coordenadas
 */

import { useState } from "react";
import {
  extractKeyValuesFromPDF,
  extractTextFromPDF,
  parseRecipeDataFromPDF,
} from "@/app/lib/pdf-utils";
import { RecipeData } from "@/app/types/recipe";

type ViewMode = "keyValues" | "text" | "recipe";

export default function PDFExtractionDemo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("keyValues");

  // Resultados
  const [keyValues, setKeyValues] = useState<Record<string, string> | null>(
    null
  );
  const [text, setText] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<RecipeData | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Por favor selecciona un archivo PDF");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();

      // Extraer en los 3 formatos
      const [kvResult, textResult, recipeResult] = await Promise.all([
        extractKeyValuesFromPDF(buffer),
        extractTextFromPDF(buffer),
        parseRecipeDataFromPDF(buffer),
      ]);

      // Verificar si hubo un error de validación en recipeResult
      if (recipeResult && typeof recipeResult === 'object' && 'success' in recipeResult && recipeResult.success === false) {
        // Mostrar el error de validación sin lanzar excepción
        const validationError = (recipeResult as { success: false; error: string }).error || 'Documento no válido';
        setError(validationError);
        setKeyValues(kvResult);
        setText(textResult);
        setRecipe(null); // No hay datos de receta válidos
        return;
      }

      setKeyValues(kvResult);
      setText(textResult);
      setRecipe(recipeResult as RecipeData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(`Error procesando PDF: ${errorMessage}`);
      // Solo log para errores inesperados, no de validación
      console.error("Error inesperado:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    // Simular evento de input
    const input = document.getElementById("file-input") as HTMLInputElement;
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;

    // Disparar cambio
    const event = new Event("change", { bubbles: true });
    input.dispatchEvent(event);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Demo: Extracción de PDFs con Coordenadas
        </h1>
        <p className="text-gray-600">
          Sube un PDF de receta para ver cómo el sistema extrae información
          usando coordenadas (x, y) de pdfjs-dist
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
      >
        <div className="space-y-4">
          <div className="text-4xl">📄</div>
          <div>
            <label
              htmlFor="file-input"
              className="cursor-pointer text-blue-500 hover:text-blue-600 font-semibold"
            >
              Seleccionar archivo PDF
            </label>
            <span className="text-gray-500"> o arrastrar aquí</span>
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-blue-700">Procesando PDF...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {/* Results */}
      {(keyValues || text || recipe) && !loading && (
        <div className="space-y-4">
          {/* View Mode Selector */}
          <div className="flex gap-2 border-b pb-2">
            <button
              onClick={() => setViewMode("keyValues")}
              className={`px-4 py-2 rounded ${
                viewMode === "keyValues"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Key-Values
            </button>
            <button
              onClick={() => setViewMode("text")}
              className={`px-4 py-2 rounded ${
                viewMode === "text"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Texto Extraído
            </button>
            <button
              onClick={() => setViewMode("recipe")}
              className={`px-4 py-2 rounded ${
                viewMode === "recipe"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Receta Completa
            </button>
          </div>

          {/* Key-Values View */}
          {viewMode === "keyValues" && keyValues && (
            <div className="bg-white border rounded-lg p-4">
              <h2 className="text-xl font-bold mb-4">
                📊 Pares Key-Value Extraídos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(keyValues).map(([key, value]) => (
                  <div key={key} className="border rounded p-3">
                    <div className="text-sm text-gray-500 font-semibold">
                      {key}
                    </div>
                    <div className="mt-1">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Text View */}
          {viewMode === "text" && text && (
            <div className="bg-white border rounded-lg p-4">
              <h2 className="text-xl font-bold mb-4">📝 Texto Extraído</h2>
              <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96 text-sm">
                {text}
              </pre>
            </div>
          )}

          {/* Recipe View */}
          {viewMode === "recipe" && recipe && (
            <div className="bg-white border rounded-lg p-4 space-y-4">
              <h2 className="text-xl font-bold">🏥 Receta Completa</h2>

              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard label="Entidad" value={recipe.entityOrigin} />
                <InfoCard label="Bodega" value={recipe.warehouseOrigin} />
                <InfoCard label="Fecha Egreso" value={recipe.egressDate} />
                <InfoCard label="Número Egreso" value={recipe.egressNumber} />
                <InfoCard label="Tipo Documento" value={recipe.documentType} />
                <InfoCard label="Nro. Documento" value={recipe.documentNumber} />
                {recipe.patientName && (
                  <InfoCard label="Paciente" value={recipe.patientName} />
                )}
                {recipe.patientIdentifier && (
                  <InfoCard
                    label="Identificación"
                    value={recipe.patientIdentifier}
                  />
                )}
              </div>

              {/* Medicamentos */}
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Medicamentos ({recipe.medicaments.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border p-2 text-left">SKU</th>
                        <th className="border p-2 text-left">Nombre</th>
                        <th className="border p-2 text-right">Cantidad</th>
                        <th className="border p-2 text-right">Precio Unit.</th>
                        <th className="border p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipe.medicaments.map((med, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border p-2 text-sm">{med.sku}</td>
                          <td className="border p-2">{med.name}</td>
                          <td className="border p-2 text-right">
                            {med.quantity}
                          </td>
                          <td className="border p-2 text-right">
                            ${med.unitCost.toFixed(2)}
                          </td>
                          <td className="border p-2 text-right">
                            ${med.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold">
                      <tr>
                        <td colSpan={4} className="border p-2 text-right">
                          TOTAL:
                        </td>
                        <td className="border p-2 text-right">
                          ${recipe.total.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Debug Info */}
          <details className="bg-gray-50 border rounded-lg p-4">
            <summary className="cursor-pointer font-semibold">
              🔍 Debug Info (JSON completo)
            </summary>
            <pre className="mt-4 text-xs overflow-auto max-h-96">
              {JSON.stringify({ keyValues, recipe }, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Instructions */}
      {!keyValues && !text && !recipe && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold mb-2">ℹ️ Cómo usar:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Sube un PDF de receta médica</li>
            <li>
              El sistema extraerá automáticamente key-values usando coordenadas
              (x, y)
            </li>
            <li>Navega entre las pestañas para ver diferentes vistas</li>
            <li>Revisa el JSON completo en "Debug Info"</li>
          </ol>
        </div>
      )}
    </div>
  );
}

// Helper Component
function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded p-3">
      <div className="text-sm text-gray-500 font-semibold">{label}</div>
      <div className="mt-1">{value || "-"}</div>
    </div>
  );
}
