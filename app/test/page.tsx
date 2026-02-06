"use client";

/**
 * Página de prueba para subir y procesar PDFs de recetas
 * Ruta: /test
 */

import React, { useState } from "react";

type ViewMode = "upload" | "processing" | "success" | "error";

export default function TestPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("upload");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const handleDiagnosis = async () => {
    try {
      const response = await fetch("/api/pdf-diagnosis");
      const data = await response.json();
      setDiagnostics(data);
    } catch (err) {
      console.error("Error:", err);
      setError("Error obteniendo diagnóstico");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError("");
    } else {
      setError("Por favor selecciona un archivo PDF válido");
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor selecciona un archivo PDF");
      return;
    }

    setLoading(true);
    setViewMode("processing");
    setProgress(25);

    try {
      // Crear FormData
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("fileName", file.name);

      setProgress(50);

      // Enviar al servidor
      const response = await fetch("/api/process-recipe", {
        method: "POST",
        body: formData,
      });

      setProgress(75);

      // Verificar Content-Type
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        const htmlText = await response.text();
        throw new Error(
          `El servidor devolvió HTML: ${htmlText.substring(0, 200)}`
        );
      }

      const data = await response.json();
      setProgress(100);

      if (data.success) {
        setResult(data);
        setViewMode("success");
      } else {
        setError(data.message || "Error desconocido");
        setViewMode("error");
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setViewMode("error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError("");
    setProgress(0);
    setViewMode("upload");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🧪 Test: Subida de PDFs
          </h1>
          <p className="text-gray-600">
            Prueba el sistema de extracción de PDFs con coordenadas
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Upload View */}
          {viewMode === "upload" && (
            <div className="p-8">
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
                <div className="text-5xl mb-4">📄</div>

                <h2 className="text-2xl font-bold text-gray-700 mb-2">
                  Selecciona un PDF
                </h2>

                <p className="text-gray-600 mb-6">
                  Sube un PDF de receta médica para procesar
                </p>

                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-input"
                  disabled={loading}
                />

                <label
                  htmlFor="pdf-input"
                  className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg cursor-pointer transition-colors"
                >
                  Seleccionar PDF
                </label>

                {file && (
                  <div className="mt-4">
                    <p className="text-green-600 font-semibold">
                      ✓ Archivo seleccionado:
                    </p>
                    <p className="text-gray-700">
                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </p>

                    <button
                      onClick={handleUpload}
                      disabled={loading}
                      className="mt-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                    >
                      {loading ? "Procesando..." : "Procesar PDF"}
                    </button>
                  </div>
                )}

                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Processing View */}
          {viewMode === "processing" && (
            <div className="p-8 text-center">
              <div className="mb-6">
                <div className="inline-block animate-spin">
                  <div className="text-4xl">⏳</div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-700 mb-4">
                Procesando PDF...
              </h2>

              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-3 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <p className="text-gray-600 mt-4">{progress}% completado</p>

              {file && (
                <p className="text-sm text-gray-500 mt-2">{file.name}</p>
              )}
            </div>
          )}

          {/* Success View */}
          {viewMode === "success" && result && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">✅</div>
                <h2 className="text-2xl font-bold text-green-600">
                  ¡PDF Procesado Correctamente!
                </h2>
              </div>

              <div className="space-y-4">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Entidad Origen</p>
                    <p className="font-semibold text-gray-800">
                      {result.data?.entityOrigin || "-"}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Bodega Origen</p>
                    <p className="font-semibold text-gray-800">
                      {result.data?.warehouseOrigin || "-"}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Fecha Egreso</p>
                    <p className="font-semibold text-gray-800">
                      {result.data?.egressDate || "-"}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-gray-600">Número Egreso</p>
                    <p className="font-semibold text-gray-800">
                      {result.data?.egressNumber || "-"}
                    </p>
                  </div>
                </div>

                {/* Medicamentos */}
                {result.data?.medicaments && result.data.medicaments.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-bold text-gray-700 mb-3">
                      📦 Medicamentos ({result.data.medicaments.length})
                    </h3>
                    <div className="max-h-48 overflow-y-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="p-2 text-left">SKU</th>
                            <th className="p-2 text-left">Nombre</th>
                            <th className="p-2 text-right">Cantidad</th>
                            <th className="p-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.data.medicaments.map(
                            (med: any, idx: number) => (
                              <tr
                                key={idx}
                                className="border-t hover:bg-gray-50"
                              >
                                <td className="p-2 text-xs">{med.sku}</td>
                                <td className="p-2">{med.name}</td>
                                <td className="p-2 text-right">{med.quantity}</td>
                                <td className="p-2 text-right">
                                  ${med.total.toFixed(2)}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 bg-green-50 p-3 rounded flex justify-between items-center">
                      <span className="font-bold text-gray-700">TOTAL:</span>
                      <span className="text-lg font-bold text-green-600">
                        ${result.data.total?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                  </div>
                )}

                {/* JSON Raw */}
                <details className="bg-gray-50 p-3 rounded">
                  <summary className="cursor-pointer font-semibold text-gray-700">
                    📋 Ver JSON completo
                  </summary>
                  <pre className="mt-3 text-xs overflow-auto max-h-40 bg-white p-3 rounded border">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>

                <button
                  onClick={handleReset}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  Procesar Otro PDF
                </button>
              </div>
            </div>
          )}

          {/* Error View */}
          {viewMode === "error" && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">❌</div>
                <h2 className="text-2xl font-bold text-red-600">
                  Error al Procesar PDF
                </h2>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 font-semibold mb-2">Mensaje de error:</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>

              {result && (
                <details className="bg-gray-50 p-3 rounded mb-6">
                  <summary className="cursor-pointer font-semibold text-gray-700">
                    📋 Ver detalles de la respuesta del servidor
                  </summary>
                  <pre className="mt-3 text-xs overflow-auto max-h-40 bg-white p-3 rounded border">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              )}

              <button
                onClick={handleReset}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Intentar de Nuevo
              </button>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>
            Este test demuestra el sistema de extracción de PDFs basado en
            coordenadas
          </p>
          <p className="mt-2">
            📖{" "}
            <a
              href="/docs/pdf-extraction"
              className="text-blue-500 hover:underline"
            >
              Ver documentación completa
            </a>
          </p>
          <div className="mt-4">
            <button
              onClick={handleDiagnosis}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs"
            >
              🔍 Diagnóstico del Servidor
            </button>
          </div>
        </div>

        {/* Diagnostics */}
        {diagnostics && (
          <div className="mt-8 bg-gray-50 border rounded-lg p-4">
            <h3 className="font-bold text-gray-700 mb-2">🔍 Diagnóstico del Servidor</h3>
            <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
