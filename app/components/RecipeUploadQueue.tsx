"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/app/types/product";
import {
  MissingRecipeMedicament,
  ProcessingResult,
  RecipeData,
  UploadQueueItem,
} from "@/app/types/recipe";
import ProductForm from "@/app/components/ProductForm";
import { ImportPdfWidget } from "@/app/components/import-pdf-widget/ImportPdfWidget";
import {
  MissingProductDraft,
  PdfSummary,
  TableProductRow,
} from "@/app/components/import-pdf-widget/types";

interface RecipeUploadQueueProps {
  onProcessingComplete?: (results: UploadQueueItem[]) => void;
}

interface QueueItemWithDetails extends UploadQueueItem {
  previewUrl?: string;
  pdfUrl?: string;
  extractedRecipeData?: RecipeData;
  result?: ProcessingResult;
}

interface UploadResultWithDetails extends ProcessingResult {
  extractedRecipeData?: RecipeData;
}

interface ActiveMissingProductForm {
  itemId: string;
  sku: string;
}

export interface BatchProcessingProgress {
  phase: 'creating-products' | 'registering-egress';
  currentPdf: number;
  totalPdfs: number;
  currentPdfName: string;
  currentStep: number;
  totalSteps: number;
  currentStepLabel: string;
  /** 0-100 overall percentage */
  percent: number;
}

/**
 * Componente para subir y procesar múltiples PDFs de recetas
 * Muestra una cola visual que se puede minimizar/maximizar
 * El procesamiento ocurre en segundo plano sin bloquear la UI
 */
export const RecipeUploadQueue: React.FC<RecipeUploadQueueProps> = ({ onProcessingComplete }) => {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItemWithDetails[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmittingEgress, setIsSubmittingEgress] = useState(false);
  const [activePdfId, setActivePdfId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [openedPdfId, setOpenedPdfId] = useState<string | null>(null);
  const [itemBusy, setItemBusy] = useState<Record<string, boolean>>({});
  const [selectedMissingByItem, setSelectedMissingByItem] = useState<Record<string, Record<string, boolean>>>({});
  const [missingDraftsByItem, setMissingDraftsByItem] = useState<Record<string, Record<string, MissingProductDraft>>>({});
  const [selectedNegativeByItem, setSelectedNegativeByItem] = useState<Record<string, Record<string, boolean>>>({});
  const [manualResolvedMissingByItem, setManualResolvedMissingByItem] = useState<Record<string, Record<string, boolean>>>({});
  const [activeMissingProductForm, setActiveMissingProductForm] = useState<ActiveMissingProductForm | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProcessingProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef<boolean>(false);
  const filesMapRef = useRef<Map<string, File>>(new Map());
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<QueueItemWithDetails[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    };
  }, []);

  const buildDraftFromMissing = (med: MissingRecipeMedicament): MissingProductDraft => {
    const today = new Date().toISOString().split("T")[0];
    return {
      sku: med.sku,
      batch_number: med.batch || "",
      name: med.name || med.sku,
      stock: String(med.quantity || 1),
      description: med.name || "",
      unit_of_measure: med.unit || "unidades",
      administration_route: "",
      notes: med.reason || "Creado desde carga de receta PDF",
      issue_date: today,
      expiration_date: med.expirationDate || "",
      shelf: "",
      drawer: "",
      section: "",
      location_notes: "",
      category: "Medicamentos",
      specialty: "",
      reporting_unit: "",
    };
  };

  const initializeItemDecisionState = (itemId: string, result?: UploadResultWithDetails) => {
    if (!result) return;

    if (result.missingMedicaments && result.missingMedicaments.length > 0) {
      setSelectedMissingByItem((prev) => {
        const nextSelections: Record<string, boolean> = {};
        result.missingMedicaments?.forEach((med) => {
          nextSelections[med.sku] = false;
        });
        return { ...prev, [itemId]: nextSelections };
      });

      setMissingDraftsByItem((prev) => {
        const nextDrafts: Record<string, MissingProductDraft> = {};
        result.missingMedicaments?.forEach((med) => {
          nextDrafts[med.sku] = buildDraftFromMissing(med);
        });
        return { ...prev, [itemId]: nextDrafts };
      });
    }

    if (result.insufficientStockItems && result.insufficientStockItems.length > 0) {
      setSelectedNegativeByItem((prev) => {
        const nextSelections: Record<string, boolean> = {};
        result.insufficientStockItems?.forEach((stockItem) => {
          nextSelections[stockItem.sku] = false;
        });
        return { ...prev, [itemId]: nextSelections };
      });
    }
  };

  const generatePdfThumbnail = async (file: File): Promise<string | undefined> => {
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.js";

      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.45 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return undefined;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      await page.render({ canvasContext: context, viewport, canvas }).promise;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.82)
      );

      await pdf.destroy();

      if (!blob) return undefined;
      const thumbnailUrl = URL.createObjectURL(blob);
      previewUrlsRef.current.add(thumbnailUrl);
      return thumbnailUrl;
    } catch (error) {
      console.warn("No se pudo generar miniatura del PDF:", error);
      return undefined;
    }
  };

  /**
   * Procesa una lista de archivos (usado desde input y drag & drop)
   */
  const processFileList = async (filesList: File[]) => {
    if (filesList.length === 0) return;

    const previewUrls = await Promise.all(filesList.map((file) => generatePdfThumbnail(file)));

    const newItems: QueueItemWithDetails[] = filesList.map((file, index) => {
      const itemId = `${Date.now()}-${index}`;
      const pdfUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(pdfUrl);
      filesMapRef.current.set(itemId, file);
      return {
        id: itemId,
        fileName: file.name,
        previewUrl: previewUrls[index],
        pdfUrl,
        status: "pending",
        progress: 0,
      };
    });

    setQueue((prev) => [...prev, ...newItems]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const itemsToProcess = [...queueRef.current, ...newItems];
    setTimeout(() => processQueue(itemsToProcess), 100);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (!files) return;
    await processFileList(Array.from(files));
  };

  const handleFilesDropped = async (files: File[]) => {
    const pdfFiles = files.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    await processFileList(pdfFiles);
  };

  const processQueue = async (items: QueueItemWithDetails[]) => {
    if (processingRef.current) return;

    processingRef.current = true;
    setIsProcessing(true);
    let hasSuccessfulUpload = false;

    for (const item of items) {
      if (item.status !== "pending") continue;

      setQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "processing", progress: 0 } : i))
      );

      try {
        const file = filesMapRef.current.get(item.id);

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

        const result = await uploadAndProcessFile(file, item.id);

        if (result.success) {
          hasSuccessfulUpload = true;
          initializeItemDecisionState(item.id, result);
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    status: "success",
                    progress: 100,
                    result: {
                      success: true,
                      message: result.message,
                      didExecuteEgress: result.didExecuteEgress,
                      egressNumber: result.egressNumber,
                      medicamentCount: result.medicamentCount,
                      total: result.total,
                      error: result.error,
                      missingMedicaments: result.missingMedicaments,
                      insufficientStockItems: result.insufficientStockItems,
                      alreadyProcessedMedicaments: result.alreadyProcessedMedicaments,
                    },
                    extractedRecipeData: result.extractedRecipeData,
                  }
                : i
            )
          );
        } else {
          initializeItemDecisionState(item.id, result);
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    status: "error",
                    error: result.message,
                    progress: 0,
                    result: {
                      success: false,
                      message: result.message,
                      didExecuteEgress: result.didExecuteEgress,
                      error: result.error,
                      egressNumber: result.egressNumber,
                      medicamentCount: result.medicamentCount,
                      total: result.total,
                      missingMedicaments: result.missingMedicaments,
                      insufficientStockItems: result.insufficientStockItems,
                      alreadyProcessedMedicaments: result.alreadyProcessedMedicaments,
                    },
                    extractedRecipeData: result.extractedRecipeData,
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

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    processingRef.current = false;
    setIsProcessing(false);

    if (hasSuccessfulUpload) {
      router.refresh();
    }

    if (onProcessingComplete) {
      onProcessingComplete(queueRef.current);
    }
  };

  const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsArrayBuffer(file);
    });
  };

  const uploadAndProcessFile = async (file: File, itemId: string): Promise<UploadResultWithDetails> => {
    try {
      setQueue((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, progress: 25 } : i))
      );

      const buffer = await fileToArrayBuffer(file);

      setQueue((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, progress: 50 } : i))
      );

      const { parseRecipeDataFromPDF } = await import("@/app/lib/pdf-utils");

      const parseResult = await parseRecipeDataFromPDF(buffer);

      if (parseResult && typeof parseResult === "object" && "success" in parseResult && parseResult.success === false) {
        return {
          success: false,
          message: (parseResult as { success: false; error: string }).error || "Documento no valido",
          error: "VALIDATION_ERROR",
        };
      }

      const recipeData = parseResult as RecipeData;

      // Validar duplicados por número de egreso
      if (recipeData.egressNumber) {
        const existingEgress = queueRef.current.find(
          (i) =>
            i.id !== itemId &&
            i.extractedRecipeData?.egressNumber === recipeData.egressNumber
        );
        if (existingEgress) {
          return {
            success: false,
            message: `Este documento ya fue cargado (Egreso: ${recipeData.egressNumber}). Archivo: ${existingEgress.fileName}`,
            error: "DUPLICATE_EGRESS",
          };
        }
      }

      setQueue((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, progress: 75 } : i))
      );

      const response = await fetch("/api/process-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "previewRecipeEgress",
          fileName: file.name,
          recipeData,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        const htmlText = await response.text();
        console.error("Servidor devolvió HTML:", htmlText.substring(0, 500));
        return {
          success: false,
          message: "El servidor devolvio HTML en lugar de JSON. Probablemente hay un error en el servidor.",
          error: "SERVER_ERROR",
        };
      }

      if (!contentType || !contentType.includes("application/json")) {
        return {
          success: false,
          message: `Tipo de respuesta inesperado: ${contentType}. Se esperaba application/json`,
          error: "INVALID_RESPONSE",
        };
      }

      const data = await response.json();

      setQueue((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, progress: 100 } : i))
      );

      return {
        ...data,
        extractedRecipeData: recipeData,
      };
    } catch (error) {
      console.error("Error inesperado en uploadAndProcessFile:", error);

      return {
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido al procesar archivo",
        error: "UNEXPECTED_ERROR",
      };
    }
  };

  const toggleGroupCollapsed = (itemId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const toggleNegativeSelection = (itemId: string, sku: string, checked: boolean) => {
    setSelectedNegativeByItem((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [sku]: checked,
      },
    }));
  };

  const applyItemResultUpdate = (
    itemId: string,
    result: UploadResultWithDetails,
    fallbackError?: string
  ) => {
    initializeItemDecisionState(itemId, result);

    setQueue((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: result.success ? "success" : "error",
              progress: result.success ? 100 : item.progress,
              error: result.success ? undefined : result.message || fallbackError,
              result: {
                success: result.success,
                message: result.message,
                didExecuteEgress: result.didExecuteEgress,
                error: result.error,
                egressNumber: result.egressNumber,
                medicamentCount: result.medicamentCount,
                total: result.total,
                missingMedicaments: result.missingMedicaments,
                insufficientStockItems: result.insufficientStockItems,
                alreadyProcessedMedicaments: result.alreadyProcessedMedicaments,
              },
              extractedRecipeData: result.extractedRecipeData || item.extractedRecipeData,
            }
          : item
      )
    );
  };

  const applyDecisionsAndProcessAll = async (
    item: QueueItemWithDetails,
    createdSkus: Set<string> | undefined,
    pdfIndex: number,
    totalPdfs: number
  ) => {
    if (!item.extractedRecipeData) return;

    const selections = selectedMissingByItem[item.id] || {};
    const drafts = missingDraftsByItem[item.id] || {};
    const selectedSkus = Object.keys(selections).filter(
      (sku) => selections[sku] && !manualResolvedMissingByItem[item.id]?.[sku]
    );

    // Deduplicate: skip SKUs already sent from a previous item with the SAME batch_number.
    const productsToCreate = selectedSkus
      .map((sku) => drafts[sku])
      .filter(Boolean)
      .filter((draft) => {
        if (!createdSkus) return true;
        const key = `${draft.sku}::${(draft.batch_number || "").trim()}`;
        if (createdSkus.has(key)) return false;
        return true;
      });
    const invalidStock = productsToCreate.find((draft) => Number(draft.stock) <= 0);

    if (invalidStock) {
      applyItemResultUpdate(item.id, {
        success: false,
        message: `El stock inicial de ${invalidStock.sku} debe ser mayor a 0.`,
        error: "INVALID_STOCK",
      });
      return;
    }

    const allowedNegativeSkus = Object.entries(selectedNegativeByItem[item.id] || {})
      .filter(([, checked]) => checked)
      .map(([sku]) => sku);

    // Total steps: 1 per product to create + 1 for egress registration
    const totalSteps = productsToCreate.length + 1;

    setItemBusy((prev) => ({ ...prev, [item.id]: true }));

    const justCreatedSkusList: string[] = [];

    try {
      // ── Phase 1: Create missing products one by one ──
      for (let i = 0; i < productsToCreate.length; i++) {
        const draft = productsToCreate[i];
        const fullName = getFullMedicamentName(item, draft.sku, draft.name);
        const currentStep = i + 1;
        const overallDone = ((pdfIndex * totalSteps + currentStep) / (totalPdfs * totalSteps)) * 100;

        setBatchProgress({
          phase: 'creating-products',
          currentPdf: pdfIndex + 1,
          totalPdfs,
          currentPdfName: item.fileName,
          currentStep,
          totalSteps,
          currentStepLabel: `Creando: ${fullName}`,
          percent: Math.round(Math.min(overallDone, 99)),
        });

        const response = await fetch("/api/process-recipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createSingleProduct",
            recipeData: item.extractedRecipeData,
            productsToCreate: [
              {
                ...draft,
                name: fullName,
                description: draft.description || fullName,
                stock: Number(draft.stock),
              },
            ],
          }),
        });

        const productResult = await response.json();

        if (!productResult.success) {
          applyItemResultUpdate(item.id, {
            success: false,
            message: productResult.message || `Error al crear producto ${draft.sku}`,
            error: productResult.error || "CREATE_PRODUCT_FAILED",
            extractedRecipeData: item.extractedRecipeData,
          });
          return;
        }

        // Track created SKU for justCreatedSkus (avoid duplicate entrada in egress)
        justCreatedSkusList.push(draft.sku);

        // Track created SKU+batch combos to prevent duplicates in subsequent items
        if (createdSkus) {
          createdSkus.add(`${draft.sku}::${(draft.batch_number || "").trim()}`);
        }
      }

      // ── Phase 2: Register the egress ──
      const egressStep = totalSteps;
      const overallDone = ((pdfIndex * totalSteps + egressStep) / (totalPdfs * totalSteps)) * 100;

      setBatchProgress({
        phase: 'registering-egress',
        currentPdf: pdfIndex + 1,
        totalPdfs,
        currentPdfName: item.fileName,
        currentStep: egressStep,
        totalSteps,
        currentStepLabel: 'Registrando egreso en inventario…',
        percent: Math.round(Math.min(overallDone, 99)),
      });

      const egressResponse = await fetch("/api/process-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "retryRecipeEgress",
          recipeData: item.extractedRecipeData,
          allowedNegativeSkus,
          justCreatedSkus: justCreatedSkusList,
        }),
      });

      const data = (await egressResponse.json()) as UploadResultWithDetails;
      applyItemResultUpdate(item.id, { ...data, extractedRecipeData: item.extractedRecipeData });

      const stillMissing = new Set((data.missingMedicaments || []).map((med) => med.sku));
      const manuallyResolved = manualResolvedMissingByItem[item.id] || {};
      const nextResolved: Record<string, boolean> = { ...manuallyResolved };
      Object.keys(nextResolved).forEach((sku) => {
        if (stillMissing.has(sku)) {
          delete nextResolved[sku];
        }
      });
      setManualResolvedMissingByItem((prev) => ({
        ...prev,
        [item.id]: nextResolved,
      }));

      if (data.success) {
        router.refresh();
      }
    } catch (error) {
      applyItemResultUpdate(item.id, {
        success: false,
        message: error instanceof Error ? error.message : "Error al aplicar decisiones y procesar receta",
        error: "REQUEST_ERROR",
      });
    } finally {
      setItemBusy((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const openMissingProductForm = (itemId: string, sku: string) => {
    setActiveMissingProductForm({ itemId, sku });
  };

  const getFullMedicamentName = (
    item: QueueItemWithDetails | undefined,
    sku: string,
    fallbackName: string
  ): string => {
    if (!item?.extractedRecipeData?.medicaments) return fallbackName;
    const source = item.extractedRecipeData.medicaments.find((med) => med.sku === sku);
    const fullName = source?.name?.trim();
    return fullName && fullName.length > 0 ? fullName : fallbackName;
  };

  const getInitialProductValuesForActiveForm = (): Partial<Product> | undefined => {
    if (!activeMissingProductForm) return undefined;
    const draft = missingDraftsByItem[activeMissingProductForm.itemId]?.[activeMissingProductForm.sku];
    if (!draft) return undefined;
    const item = queue.find((q) => q.id === activeMissingProductForm.itemId);
    const fullName = getFullMedicamentName(item, activeMissingProductForm.sku, draft.name);

    return {
      name: fullName,
      barcode: draft.sku,
      batch_number: draft.batch_number || "",
      stock: Number(draft.stock) || 0,
      description: draft.description || fullName,
      unit_of_measure: (draft.unit_of_measure as Product["unit_of_measure"]) || null,
      administration_route: draft.administration_route || null,
      notes: draft.notes || "",
      issue_date: draft.issue_date || "",
      expiration_date: draft.expiration_date || "",
      shelf: draft.shelf || "",
      drawer: draft.drawer || "",
      section: draft.section || "",
      location_notes: draft.location_notes || "",
      category: draft.category || "Medicamentos",
      specialty: draft.specialty || "",
      reporting_unit: draft.reporting_unit || "",
    };
  };

  const getOverallProgress = (): number => {
    if (queue.length === 0) return 0;

    const completedCount = queue.filter(
      (item) => item.status === "success" || item.status === "error"
    ).length;
    const inFlightProgress = queue
      .filter((item) => item.status === "processing")
      .reduce((sum, item) => sum + item.progress / 100, 0);

    const normalized = (completedCount + inFlightProgress) / queue.length;
    return Math.max(0, Math.min(100, Math.round(normalized * 100)));
  };

  const getStatus = () => {
    const completed = queue.filter((i) => i.status === "success").length;
    const processing = queue.filter((i) => i.status === "processing").length;
    const errors = queue.filter((i) => i.status === "error").length;

    return { completed, processing, errors, total: queue.length };
  };

  const pdfSummaries = useMemo<PdfSummary[]>(() => {
    return queue.map((item) => {
      const totalProducts = item.extractedRecipeData?.medicaments?.length || 0;
      const missingProducts = item.result?.missingMedicaments?.length || 0;
      const negativeStockProducts = item.result?.insufficientStockItems?.length || 0;

      return {
        id: item.id,
        name: item.fileName,
        previewUrl: item.previewUrl,
        pdfUrl: item.pdfUrl,
        status: item.status,
        didExecuteEgress: item.result?.didExecuteEgress,
        totalProducts,
        missingProducts,
        negativeStockProducts,
        isProcessing: item.status === "processing",
        hasError: item.status === "error",
      };
    });
  }, [queue]);

  const tableRows = useMemo<TableProductRow[]>(() => {
    const rows: TableProductRow[] = [];

    queue.forEach((item) => {
      if (!item.extractedRecipeData) return;
      const didExecuteEgress = !!item.result?.didExecuteEgress && !!item.result?.success;

      const missingBySku = new Map(
        (item.result?.missingMedicaments || []).map((med) => [med.sku, med])
      );
      const insufficientBySku = new Map(
        (item.result?.insufficientStockItems || []).map((stockItem) => [stockItem.sku, stockItem])
      );
      const alreadyProcessedBySku = new Map(
        (item.result?.alreadyProcessedMedicaments || []).map((processedMed) => [processedMed.sku, processedMed])
      );

      item.extractedRecipeData.medicaments.forEach((med, index) => {
        const missingMedicament = missingBySku.get(med.sku);
        const insufficientItem = insufficientBySku.get(med.sku);
        const alreadyProcessedItem = alreadyProcessedBySku.get(med.sku);

        let status: TableProductRow["status"] = "ok";
  if (didExecuteEgress) status = "processed";
  else if (missingMedicament) status = "missing";
        else if (insufficientItem) status = "negative";
        else if (alreadyProcessedItem) status = "processed";

        rows.push({
          id: `${item.id}-${med.sku}-${index}`,
          pdfId: item.id,
          pdfName: item.fileName,
          sku: med.sku,
          name: med.name || missingMedicament?.name || med.sku,
          quantity: med.quantity,
          status,
          currentStock: insufficientItem?.currentStock,
          requestedQuantity: insufficientItem?.requestedQuantity,
          negativeResult:
            typeof insufficientItem?.currentStock === "number" && typeof insufficientItem?.requestedQuantity === "number"
              ? insufficientItem.currentStock - insufficientItem.requestedQuantity
              : undefined,
          missingMedicament,
          isNewlyCreated: !!manualResolvedMissingByItem[item.id]?.[med.sku],
        });
      });
    });

    return rows;
  }, [manualResolvedMissingByItem, queue]);

  const unresolvedMissingCount = useMemo(() => {
    return tableRows.filter((row) => {
      if (row.status !== "missing") return false;
      const manuallyResolved = !!manualResolvedMissingByItem[row.pdfId]?.[row.sku];
      const selectedToCreate = !!selectedMissingByItem[row.pdfId]?.[row.sku];
      return !manuallyResolved && !selectedToCreate;
    }).length;
  }, [manualResolvedMissingByItem, selectedMissingByItem, tableRows]);

  const unapprovedNegativeCount = useMemo(() => {
    return tableRows.filter(
      (row) => row.status === "negative" && !selectedNegativeByItem[row.pdfId]?.[row.sku]
    ).length;
  }, [selectedNegativeByItem, tableRows]);

  const approvedNegativeCount = useMemo(() => {
    return tableRows.filter(
      (row) => row.status === "negative" && !!selectedNegativeByItem[row.pdfId]?.[row.sku]
    ).length;
  }, [selectedNegativeByItem, tableRows]);

  const quickCreateMissingRow = (row: TableProductRow) => {
    if (!row.missingMedicament) return;
    if (manualResolvedMissingByItem[row.pdfId]?.[row.sku]) return;

    const existingDraft = missingDraftsByItem[row.pdfId]?.[row.sku];
    const draft = existingDraft || buildDraftFromMissing(row.missingMedicament);

    if (Number(draft.stock) <= 0) {
      applyItemResultUpdate(row.pdfId, {
        success: false,
        message: `El stock inicial de ${draft.sku} debe ser mayor a 0.`,
        error: "INVALID_STOCK",
      });
      return;
    }

    const newValue = !selectedMissingByItem[row.pdfId]?.[row.sku];

    // Auto-select/deselect ALL rows with the same SKU across all PDFs
    const matchingRows = tableRows.filter(
      (r) => r.sku === row.sku && r.status === "missing" && !manualResolvedMissingByItem[r.pdfId]?.[r.sku]
    );

    setSelectedMissingByItem((prev) => {
      const next = { ...prev };
      for (const match of matchingRows) {
        next[match.pdfId] = {
          ...(next[match.pdfId] || {}),
          [match.sku]: newValue,
        };
      }
      return next;
    });
  };

  const bulkCreateMissingForGroup = (pdfId: string) => {
    // Find all unresolved missing rows for this PDF group
    const missingRows = tableRows.filter(
      (r) =>
        r.pdfId === pdfId &&
        r.status === "missing" &&
        !manualResolvedMissingByItem[r.pdfId]?.[r.sku] &&
        !selectedMissingByItem[r.pdfId]?.[r.sku]
    );

    if (missingRows.length === 0) return;

    // Collect all unique SKUs to select (across all PDFs for dedup)
    const skusToSelect = new Set(missingRows.map((r) => r.sku));
    const allMatchingRows = tableRows.filter(
      (r) =>
        skusToSelect.has(r.sku) &&
        r.status === "missing" &&
        !manualResolvedMissingByItem[r.pdfId]?.[r.sku]
    );

    setSelectedMissingByItem((prev) => {
      const next = { ...prev };
      for (const match of allMatchingRows) {
        next[match.pdfId] = {
          ...(next[match.pdfId] || {}),
          [match.sku]: true,
        };
      }
      return next;
    });
  };

  const processAll = async () => {
    if (unresolvedMissingCount > 0 || unapprovedNegativeCount > 0 || isSubmittingEgress) return;

    const itemsToProcess = queue.filter((item) => item.extractedRecipeData);

    // Track SKUs already created across items to avoid duplicates
    const createdSkus = new Set<string>();

    setIsSubmittingEgress(true);
    setBatchProgress(null);
    try {
      for (let i = 0; i < itemsToProcess.length; i++) {
        await applyDecisionsAndProcessAll(itemsToProcess[i], createdSkus, i, itemsToProcess.length);
      }
    } finally {
      setBatchProgress(null);
      setIsSubmittingEgress(false);
    }
  };

  const approveAllNegative = () => {
    const grouped: Record<string, Record<string, boolean>> = {};
    tableRows.forEach((row) => {
      if (row.status !== "negative") return;
      grouped[row.pdfId] = grouped[row.pdfId] || {};
      grouped[row.pdfId][row.sku] = true;
    });
    setSelectedNegativeByItem((prev) => ({ ...prev, ...grouped }));
  };

  const clearNegativeApprovals = () => {
    const grouped: Record<string, Record<string, boolean>> = {};
    tableRows.forEach((row) => {
      if (row.status !== "negative") return;
      grouped[row.pdfId] = grouped[row.pdfId] || {};
      grouped[row.pdfId][row.sku] = false;
    });
    setSelectedNegativeByItem((prev) => ({ ...prev, ...grouped }));
  };

  const removeQueueItem = (itemId: string) => {
    const target = queueRef.current.find((item) => item.id === itemId);
    if (!target || target.status === "processing") return;

    if (target.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
      previewUrlsRef.current.delete(target.previewUrl);
    }

    if (target.pdfUrl) {
      URL.revokeObjectURL(target.pdfUrl);
      previewUrlsRef.current.delete(target.pdfUrl);
    }

    filesMapRef.current.delete(itemId);
    setQueue((prev) => prev.filter((item) => item.id !== itemId));
    setItemBusy((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setSelectedMissingByItem((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setMissingDraftsByItem((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setSelectedNegativeByItem((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setManualResolvedMissingByItem((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setCollapsedGroups((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    if (activePdfId === itemId) {
      setActivePdfId(null);
    }

    if (openedPdfId === itemId) {
      setOpenedPdfId(null);
    }
  };

  const openedPdf = useMemo(
    () => (openedPdfId ? queue.find((item) => item.id === openedPdfId) : undefined),
    [openedPdfId, queue]
  );

  const resetWidget = () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
    setQueue([]);
    filesMapRef.current.clear();
    setItemBusy({});
    setSelectedMissingByItem({});
    setMissingDraftsByItem({});
    setSelectedNegativeByItem({});
    setManualResolvedMissingByItem({});
    setActivePdfId(null);
    setSearch("");
    setCollapsedGroups({});
  };

  const status = getStatus();
  const overallProgress = getOverallProgress();

  if (queue.length === 0) {
    return (
      <div
        className="fixed right-0 bottom-24 z-40 group flex items-stretch"
        style={{ transform: 'translateX(calc(100% - 36px))', transition: 'transform 0.25s ease' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateX(0)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'translateX(calc(100% - 36px))')}
        onFocus={e => (e.currentTarget.style.transform = 'translateX(0)')}
        onBlur={e => (e.currentTarget.style.transform = 'translateX(calc(100% - 36px))')}
      >
        {/* Pestaña + botón como un solo bloque unificado */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2.5 text-sm font-medium whitespace-nowrap hover:bg-blue-700 transition-colors shadow-lg rounded-l-lg"
          title="Cargar recetas en PDF"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="hidden group-hover:inline">Cargar Recetas</span>
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

  if (isMinimized) {
    return (
      <div
        className="fixed right-0 bottom-24 z-40 flex items-center cursor-pointer"
        style={{ transform: 'translateX(calc(100% - 36px))', transition: 'transform 0.25s ease' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateX(0)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'translateX(calc(100% - 36px))')}
        onClick={() => setIsMinimized(false)}
        title="Click para expandir la cola de recetas"
      >
        {/* Pestaña con anillo de progreso */}
        <div className="flex-shrink-0 relative flex items-center justify-center w-9 h-14 bg-white border border-slate-200 rounded-l-lg shadow-lg">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 36 56" fill="none">
            <rect x="1" y="1" width="34" height="54" rx="7" ry="7" stroke="#e5e7eb" strokeWidth="1.5" fill="white" />
            <rect
              x="1" y="1" width="34" height="54" rx="7" ry="7"
              stroke="#3b82f6" strokeWidth="2"
              strokeDasharray={`${2 * (34 + 54)}`}
              strokeDashoffset={`${2 * (34 + 54) * (1 - overallProgress / 100)}`}
              fill="none"
              className="transition-all duration-300"
            />
          </svg>
          <span className="relative z-10 text-[10px] font-bold text-blue-600 leading-none">{overallProgress}%</span>
        </div>
        {/* Panel expandido */}
        <div className="flex flex-col justify-center gap-0.5 bg-white border-y border-l-0 border-r-0 border-slate-200 shadow-lg px-3 py-2.5 min-w-[140px]">
          <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
            {status.processing > 0 ? 'Procesando recetas…' : 'Cola de recetas'}
          </span>
          <span className="text-[10px] text-slate-500 whitespace-nowrap">
            {status.completed}/{status.total} · {status.errors > 0 ? `${status.errors} error(es)` : 'sin errores'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <ImportPdfWidget
        pdfs={pdfSummaries}
        rows={tableRows}
        activePdfId={activePdfId}
        collapsedGroups={collapsedGroups}
        search={search}
        missingSelections={selectedMissingByItem}
        negativeSelections={selectedNegativeByItem}
        manualResolvedMissing={manualResolvedMissingByItem}
        itemBusy={itemBusy}
        isProcessing={isProcessing || isSubmittingEgress}
        batchProgress={batchProgress}
        unresolvedMissingCount={unresolvedMissingCount}
        unapprovedNegativeCount={unapprovedNegativeCount}
        approvedNegativeCount={approvedNegativeCount}
        isExpanded={isExpanded}
        onSelectPdf={setActivePdfId}
        onRemovePdf={removeQueueItem}
        onOpenPdf={setOpenedPdfId}
        onToggleExpanded={() => setIsExpanded((prev) => !prev)}
        onMinimize={() => setIsMinimized(true)}
        onSearchChange={setSearch}
        onToggleGroup={toggleGroupCollapsed}
        onToggleNegative={toggleNegativeSelection}
        onQuickCreateMissing={quickCreateMissingRow}
        onBulkCreateMissing={bulkCreateMissingForGroup}
        onOpenMissingForm={(row) => openMissingProductForm(row.pdfId, row.sku)}
        onApproveAllNegative={approveAllNegative}
        onClearNegativeApprovals={clearNegativeApprovals}
        onCancel={resetWidget}
        onProcessAll={processAll}
        onAddMore={() => fileInputRef.current?.click()}
        onFilesDropped={handleFilesDropped}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {activeMissingProductForm && (
        <ProductForm
          initialValues={getInitialProductValuesForActiveForm()}
          onSuccess={() => {
            const active = activeMissingProductForm;
            if (!active) return;

            setManualResolvedMissingByItem((prev) => ({
              ...prev,
              [active.itemId]: {
                ...(prev[active.itemId] || {}),
                [active.sku]: true,
              },
            }));

            setSelectedMissingByItem((prev) => ({
              ...prev,
              [active.itemId]: {
                ...(prev[active.itemId] || {}),
                [active.sku]: false,
              },
            }));

            setActiveMissingProductForm(null);
            router.refresh();
          }}
          onClose={() => setActiveMissingProductForm(null)}
        />
      )}

      {openedPdf?.pdfUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-3 sm:p-6">
          <div className="relative h-[90vh] w-[92vw] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
              <p className="truncate text-sm font-semibold text-slate-900" title={openedPdf.fileName}>
                {openedPdf.fileName}
              </p>
              <button
                type="button"
                onClick={() => setOpenedPdfId(null)}
                className="rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
            <iframe
              title={`PDF ${openedPdf.fileName}`}
              src={openedPdf.pdfUrl}
              className="h-[calc(90vh-44px)] w-full"
            />
          </div>
        </div>
      )}
    </>
  );
};
