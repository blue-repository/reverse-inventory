"use client";

import { Button } from "@/app/components/ui/button";
import { BatchProcessingProgress } from "@/app/components/RecipeUploadQueue";

interface ImportActionsFooterProps {
  totalReady: number;
  unresolvedMissing: number;
  unapprovedNegative: number;
  processing: boolean;
  batchProgress: BatchProcessingProgress | null;
  onCancel: () => void;
  onProcess: () => void;
}

export function ImportActionsFooter({
  totalReady,
  unresolvedMissing,
  unapprovedNegative,
  processing,
  batchProgress,
  onCancel,
  onProcess,
}: ImportActionsFooterProps) {
  const blocked = unresolvedMissing > 0 || unapprovedNegative > 0 || processing;

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      {/* Progress bar — shown only while batch processing */}
      {processing && batchProgress && (
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="truncate max-w-[70%] font-medium">
              {batchProgress.currentStepLabel}
            </span>
            <span className="flex-shrink-0 tabular-nums font-semibold text-blue-600">
              {batchProgress.percent}%
            </span>
          </div>

          {/* Progress bar track */}
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${batchProgress.percent}%` }}
            />
            {/* Animated shimmer on active bar */}
            <div
              className="absolute inset-y-0 left-0 rounded-full animate-pulse bg-white/20"
              style={{ width: `${batchProgress.percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>
              {batchProgress.totalPdfs > 1
                ? `PDF ${batchProgress.currentPdf}/${batchProgress.totalPdfs} \u2014 `
                : ""}
              Paso {batchProgress.currentStep}/{batchProgress.totalSteps}
            </span>
            <span className="truncate max-w-[50%]" title={batchProgress.currentPdfName}>
              {batchProgress.currentPdfName}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-600">
          {processing && batchProgress
            ? batchProgress.phase === "creating-products"
              ? "Creando productos faltantes\u2026 no cierres esta ventana."
              : "Registrando egreso\u2026 no cierres esta ventana."
            : `${totalReady} productos listos. ${unresolvedMissing} faltantes sin resolver. ${unapprovedNegative} requieren aprobacion.`}
        </p>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={processing}>
            Cancelar
          </Button>
          <Button type="button" onClick={onProcess} disabled={blocked}>
            {processing ? "Procesando\u2026" : "Procesar egreso"}
          </Button>
        </div>
      </div>
    </div>
  );
}
