"use client";

import React, { useState, useRef, useEffect } from "react";
import { UploadQueueItem } from "@/app/types/recipe";

interface RecipeUploadQueueProps {
  onProcessingComplete?: (results: UploadQueueItem[]) => void;
}

/**
 * Componente para subir y procesar múltiples PDFs de recetas
 * Muestra una cola visual que se puede minimizar/maximizar
 * El procesamiento ocurre en segundo plano sin bloquear la UI
 */
export const RecipeUploadQueue: React.FC<RecipeUploadQueueProps> = ({ onProcessingComplete }) => {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef<boolean>(false);
  const filesMapRef = useRef<Map<string, File>>(new Map()); // Guardar archivos aquí

  /**
   * Maneja la selección de archivos
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (!files) return;

    const newItems: UploadQueueItem[] = Array.from(files).map((file, index) => {
      const itemId = `${Date.now()}-${index}`;
      // Guardar el archivo en el Map para acceso posterior
      filesMapRef.current.set(itemId, file);
      return {
        id: itemId,
        fileName: file.name,
        status: "pending",
        progress: 0,
      };
    });

    setQueue((prev) => [...prev, ...newItems]);

    // Limpiar el input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Iniciar procesamiento
    setTimeout(() => processQueue([...queue, ...newItems]), 100);
  };

  /**
   * Procesa la cola de archivos de forma secuencial
   */
  const processQueue = async (items: UploadQueueItem[]) => {
    if (processingRef.current) return;

    processingRef.current = true;
    setIsProcessing(true);

    for (const item of items) {
      if (item.status !== "pending") continue;

      // Actualizar estado a procesando
      setQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "processing", progress: 0 } : i))
      );

      try {
        // Obtener el archivo del Map donde se guardó al seleccionar
        let file = filesMapRef.current.get(item.id);

        if (!file) {
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    status: "error",
                    error: "Archivo no encontrado",
                    progress: 0,
                  }
                : i
            )
          );
          continue;
        }

        // Procesar el archivo
        const result = await uploadAndProcessFile(file, item.id);

        if (result.success) {
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    status: "success",
                    progress: 100,
                    result,
                  }
                : i
            )
          );
        } else {
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    status: "error",
                    error: result.message,
                    progress: 0,
                  }
                : i
            )
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "error",
                  error: errorMessage,
                  progress: 0,
                }
              : i
          )
        );
      }

      // Pequeña pausa entre archivos
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    processingRef.current = false;
    setIsProcessing(false);

    // Llamar callback si está definido
    if (onProcessingComplete) {
      onProcessingComplete(queue);
    }
  };

  /**
   * Lee un archivo como ArrayBuffer
   */
  const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsArrayBuffer(file);
    });
  };

  /**
   * Procesa un PDF en el cliente y envía los datos al servidor
   */
  const uploadAndProcessFile = async (file: File, itemId: string) => {
    try {
      // Paso 1: Leer el archivo como ArrayBuffer
      setQueue((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, progress: 25 } : i))
      );

      const buffer = await fileToArrayBuffer(file);

      // Paso 2: Procesar el PDF en el cliente con pdfjs-dist
      setQueue((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, progress: 50 } : i))
      );

      // Importar dinámicamente para procesar en el cliente
      const { parseRecipeDataFromPDF } = await import("@/app/lib/pdf-utils");
      
      const parseResult = await parseRecipeDataFromPDF(buffer);
      
      // Verificar si hubo un error de validación
      if (parseResult && typeof parseResult === 'object' && 'success' in parseResult && parseResult.success === false) {
        // Error de validación - retornar mensaje informativo sin lanzar excepción
        return {
          success: false,
          message: (parseResult as { success: false; error: string }).error || 'Documento no válido',
          error: 'VALIDATION_ERROR'
        };
      }
      
      const recipeData = parseResult;

      // Paso 3: Enviar los datos procesados al servidor
      setQueue((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, progress: 75 } : i))
      );

      const response = await fetch("/api/process-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          recipeData,
        }),
      });

      // Verificar si la respuesta es HTML (error del servidor)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        const htmlText = await response.text();
        console.error("Servidor devolvió HTML:", htmlText.substring(0, 500));
        return {
          success: false,
          message: "El servidor devolvió HTML en lugar de JSON. Probablemente hay un error en el servidor.",
          error: 'SERVER_ERROR'
        };
      }

      if (!contentType || !contentType.includes("application/json")) {
        return {
          success: false,
          message: `Tipo de respuesta inesperado: ${contentType}. Se esperaba application/json`,
          error: 'INVALID_RESPONSE'
        };
      }

      const data = await response.json();

      // Actualizar progreso al 100%
      setQueue((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, progress: 100 } : i))
      );

      // Retornar el resultado (exitoso o no)
      return data;
    } catch (error) {
      // Solo log de errores realmente inesperados (no de validación)
      console.error("Error inesperado en uploadAndProcessFile:", error);
      
      // Retornar error en lugar de lanzar excepción
      return {
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido al procesar archivo",
        error: 'UNEXPECTED_ERROR'
      };
    }
  };

  /**
   * Calcula el porcentaje general de progreso
   */
  const getOverallProgress = (): number => {
    if (queue.length === 0) return 0;
    const totalProgress = queue.reduce((sum, item) => sum + item.progress, 0);
    return Math.round((totalProgress / (queue.length * 100)) * 100);
  };

  /**
   * Cuenta de ítems por estado
   */
  const getStatus = () => {
    const completed = queue.filter((i) => i.status === "success").length;
    const processing = queue.filter((i) => i.status === "processing").length;
    const errors = queue.filter((i) => i.status === "error").length;

    return { completed, processing, errors, total: queue.length };
  };

  const status = getStatus();
  const overallProgress = getOverallProgress();

  // No mostrar nada si no hay items
  if (queue.length === 0) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg text-sm sm:text-base"
          title="Cargar recetas en PDF"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="hidden sm:inline">Cargar Recetas</span>
          <span className="sm:hidden">Recetas</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  // Versión minimizada (círculo de progreso)
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-center gap-2 cursor-pointer"
        onClick={() => setIsMinimized(false)}
        title="Click para expandir"
      >
        <div className="relative w-14 h-14 sm:w-16 sm:h-16">
          {/* Círculo de fondo */}
          <svg className="w-14 h-14 sm:w-16 sm:h-16 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="white"
              stroke="#e5e7eb"
              strokeWidth="2"
            />
            {/* Círculo de progreso */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray={`${45 * 2 * Math.PI}`}
              strokeDashoffset={`${45 * 2 * Math.PI * (1 - overallProgress / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>

          {/* Porcentaje en el centro */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs sm:text-sm font-bold text-gray-800">{overallProgress}%</span>
          </div>
        </div>

        {/* Tooltip con info */}
        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {status.processing > 0
            ? `Procesando... ${status.completed}/${status.total}`
            : `${status.completed}✓ ${status.errors > 0 ? `${status.errors}✗` : ""}`}
        </div>
      </div>
    );
  }

  // Versión expandida (lista)
  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 md:w-[28rem] bg-white rounded-lg shadow-xl border border-gray-200 max-h-[70vh] sm:max-h-96 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Procesando Recetas</h3>
          <p className="text-xs text-gray-600">
            {status.completed + status.processing} de {status.total} completados
          </p>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-gray-500 hover:text-gray-700 p-1"
          title="Minimizar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>

      {/* Barra de progreso general */}
      <div className="px-3 sm:px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-1 text-center">{overallProgress}% General</p>
      </div>

      {/* Lista de archivos */}
      <div className="overflow-y-auto flex-1 p-3 sm:p-4 space-y-2">
        {queue.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gray-50 border border-gray-200"
          >
            {/* Icono de estado */}
            <div className="flex-shrink-0 mt-0.5">
              {item.status === "processing" && (
                <div className="animate-spin">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
              )}
              {item.status === "success" && (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {item.status === "error" && (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>

            {/* Info del archivo */}
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-800 truncate" title={item.fileName}>
                {item.fileName}
              </p>
              {item.error && (
                <p 
                  className="text-xs text-red-600 mt-1 break-words line-clamp-2" 
                  title={item.error}
                >
                  {item.error}
                </p>
              )}
              {item.result && (
                <p className="text-xs text-green-600 mt-1">
                  {item.result.medicamentCount} medicamentos
                </p>
              )}
            </div>

            {/* Progreso */}
            {item.status === "processing" && (
              <div className="text-xs font-medium text-gray-600 flex-shrink-0">
                {item.progress}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-xs sm:text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isProcessing}
        >
          + Añadir más
        </button>
        <button
          onClick={() => {
            setQueue([]);
            filesMapRef.current.clear(); // Limpiar también el Map de archivos
          }}
          className="flex-1 bg-gray-300 text-gray-800 px-3 py-2 rounded text-xs sm:text-sm hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isProcessing}
        >
          Limpiar
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
